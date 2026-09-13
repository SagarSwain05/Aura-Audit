const axios = require('axios');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getSender = () => ({
  name: process.env.EMAIL_FROM_NAME || 'Aura-Audit',
  email: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
});

const getConfiguredProvider = () => {
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  return null;
};

// ── Concurrency + retry infrastructure ──────────────────────────────────────
// Under a burst (many signups/OTP-resends at once) an unbounded flood of
// simultaneous provider calls both risks the provider's own rate limit
// (Resend's free tier is 2 req/s) and holds open a pile of HTTP connections
// for no benefit. Cap how many sends run at once and queue the rest instead
// of firing everything simultaneously.
const MAX_CONCURRENT_EMAIL_SENDS = Number(process.env.MAX_CONCURRENT_EMAIL_SENDS) || 5;
const SEND_TIMEOUT_MS = Number(process.env.EMAIL_SEND_TIMEOUT_MS) || 12000;

let activeSends = 0;
const sendQueue = [];

const acquireSendSlot = () => new Promise((resolve) => {
  const tryAcquire = () => {
    if (activeSends < MAX_CONCURRENT_EMAIL_SENDS) {
      activeSends++;
      resolve();
    } else {
      sendQueue.push(tryAcquire);
    }
  };
  tryAcquire();
});

const releaseSendSlot = () => {
  activeSends--;
  const next = sendQueue.shift();
  if (next) next();
};

const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms)),
]);

// Only retry failures that are plausibly transient — a provider-side rate
// limit, a 5xx, or a network hiccup. Retrying a permanent rejection (bad
// recipient, sandbox restriction, auth failure) just wastes the same time
// three times over and delays the caller for no benefit.
const isRetryable = (err) => {
  const status = err.response?.status || err.statusCode;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') return true;
  if (err.message?.endsWith('_TIMEOUT')) return true;
  return false;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetry = async (fn, { attempts = 3, baseDelayMs = 400 } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) throw err;
      await sleep(baseDelayMs * 2 ** i + Math.random() * 100);
    }
  }
  throw lastErr;
};

// ── Providers ────────────────────────────────────────────────────────────

const _sendBrevo = async (toEmail, name, subject, htmlContent) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }
  const sender = getSender();
  if (!sender.email) throw new Error('EMAIL_FROM_NOT_CONFIGURED');
  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender,
      to: [{ email: toEmail, name }],
      subject,
      htmlContent,
    },
    {
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      timeout: SEND_TIMEOUT_MS,
    }
  );
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`BREVO_SEND_FAILED:${response.status}`);
  }
};

const _sendResend = async (toEmail, name, subject, htmlContent) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const sender = getSender();
  if (!sender.email) throw new Error('EMAIL_FROM_NOT_CONFIGURED');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await withTimeout(
    resend.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: [toEmail],
      subject,
      html: htmlContent,
    }),
    SEND_TIMEOUT_MS,
    'RESEND'
  );

  if (error) {
    // Resend's sandbox-domain restriction surfaces as a validation_error
    // with this exact wording — call it out explicitly so it's diagnosable
    // from logs in seconds instead of looking like a generic failure.
    if (error.name === 'validation_error' && /own email address/i.test(error.message || '')) {
      const e = new Error(`RESEND_SANDBOX_RESTRICTED: ${error.message} — verify a domain at resend.com/domains or switch provider.`);
      e.statusCode = 403;
      throw e;
    }
    const e = new Error(`RESEND_SEND_FAILED:${error.message || 'unknown'}`);
    e.statusCode = error.statusCode;
    throw e;
  }
};

const _sendSmtp = async (toEmail, name, subject, htmlContent) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const sender = getSender();
  if (!sender.email) throw new Error('EMAIL_FROM_NOT_CONFIGURED');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: SEND_TIMEOUT_MS,
  });

  await transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to: `"${name}" <${toEmail}>`,
    subject,
    html: htmlContent,
  });
};

const sendEmail = async (toEmail, name, subject, htmlContent) => {
  const provider = getConfiguredProvider();

  if (!provider) {
    console.warn('Email provider not configured. Set BREVO_API_KEY, RESEND_API_KEY, or SMTP_* env vars.');
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  await acquireSendSlot();
  try {
    await withRetry(async () => {
      if (provider === 'brevo') await _sendBrevo(toEmail, name, subject, htmlContent);
      else if (provider === 'resend') await _sendResend(toEmail, name, subject, htmlContent);
      else await _sendSmtp(toEmail, name, subject, htmlContent);
    });

    console.log(`Email sent via ${provider}: ${subject}`);
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    console.error(`Email send failed via ${provider} (to ${toEmail}):`, message);
    throw err;
  } finally {
    releaseSendSlot();
  }
};

const _otpHtml = (name, otp, title, subtitle) => {
  const safeName = escapeHtml(name || 'there');
  const safeOtp = escapeHtml(otp);
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);

  return `
  <div style="font-family:Inter,'Segoe UI',Arial,sans-serif;max-width:504px;margin:0 auto;background:#0d0d18;border-radius:14px;overflow:hidden;border:1px solid rgba(124,58,237,0.25);box-shadow:0 24px 70px rgba(15,15,26,0.18);">
    <div style="background:linear-gradient(135deg,#7C3AED 0%,#1d9bf0 58%,#06b6d4 100%);padding:36px 24px 34px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:900;line-height:1.2;">Aura-Audit ⚡</h1>
      <p style="color:rgba(255,255,255,0.82);margin:14px 0 0;font-size:16px;font-weight:500;">Career Intelligence Platform</p>
    </div>
    <div style="padding:34px 26px 32px;">
      <p style="color:#f3f4f6;font-size:16px;margin:0 0 14px;">Hi <strong>${safeName}</strong>,</p>
      <p style="color:#a7a7b8;font-size:15px;line-height:1.55;margin:0 0 32px;">${safeSubtitle}</p>
      <div style="background:#1d1435;border:2px solid rgba(124,58,237,0.72);border-radius:10px;padding:28px 16px;text-align:center;margin-bottom:32px;">
        <span style="display:inline-block;font-size:42px;font-weight:900;letter-spacing:18px;color:#a78bfa;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;line-height:1;">${safeOtp}</span>
      </div>
      <p style="color:#6b7280;font-size:14px;margin:0;text-align:center;">This code expires in <strong style="color:#9ca3af;">10 minutes</strong>. Do not share it with anyone.</p>
    </div>
    <div style="padding:18px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#4b5563;font-size:13px;margin:0;">${safeTitle}</p>
    </div>
  </div>
`;
};

exports.sendOTPEmail = async (toEmail, name, otp) => {
  await sendEmail(
    toEmail, name,
    `Your Aura-Audit verification code: ${otp}`,
    _otpHtml(
      name, otp,
      "If you didn't create an account, ignore this email.",
      'Use the code below to verify your email address and complete your signup.'
    )
  );
};

exports.sendResetPasswordEmail = async (toEmail, name, otp) => {
  await sendEmail(
    toEmail, name,
    `Reset your Aura-Audit password: ${otp}`,
    _otpHtml(
      name, otp,
      "If you didn't request a password reset, you can safely ignore this email.",
      'Use the code below to reset your password. This code is valid for 10 minutes.'
    )
  );
};

exports.getEmailProviderStatus = () => ({
  configured: Boolean(getConfiguredProvider() && getSender().email),
  provider: getConfiguredProvider() || 'none',
  senderConfigured: Boolean(getSender().email),
  activeSends,
  queuedSends: sendQueue.length,
});
