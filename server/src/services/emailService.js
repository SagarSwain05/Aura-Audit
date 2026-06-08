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
      timeout: 10000,
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
  const { error } = await resend.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: [toEmail],
    subject,
    html: htmlContent,
  });

  if (error) {
    throw new Error(`RESEND_SEND_FAILED:${error.message || 'unknown'}`);
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

  try {
    if (provider === 'brevo') await _sendBrevo(toEmail, name, subject, htmlContent);
    else if (provider === 'resend') await _sendResend(toEmail, name, subject, htmlContent);
    else await _sendSmtp(toEmail, name, subject, htmlContent);

    console.log(`Email sent via ${provider}: ${subject}`);
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    console.error(`Email send failed via ${provider}:`, message);
    throw err;
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
});
