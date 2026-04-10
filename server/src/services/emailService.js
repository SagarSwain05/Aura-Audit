const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  // Explicit Gmail SMTP config — more reliable than service:'gmail' shorthand
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,         // STARTTLS on port 587
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s+/g, ''), // strip spaces just in case
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  return transporter;
}

/**
 * Send an OTP email for email verification during signup.
 * Throws if email credentials are not configured or send fails.
 */
exports.sendOTPEmail = async (toEmail, name, otp) => {
  const t = getTransporter();

  if (!t) {
    console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — OTP logged to console only');
    console.info(`📧  OTP for ${toEmail}: ${otp}`);
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  try {
    await t.sendMail({
      from: '"Aura-Audit" <' + process.env.EMAIL_USER + '>',
      to: toEmail,
      subject: 'Your Aura-Audit verification code: ' + otp,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f0f1a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(124,58,237,0.3);">
          <div style="background: linear-gradient(135deg, #7C3AED, #06b6d4); padding: 32px 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Aura-Audit ⚡</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Career Intelligence Platform</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #e5e7eb; font-size: 15px; margin: 0 0 8px;">Hi <strong>${name}</strong>,</p>
            <p style="color: #9ca3af; font-size: 14px; margin: 0 0 28px;">Use the code below to verify your email address and complete your signup.</p>
            <div style="background: rgba(124,58,237,0.12); border: 2px solid rgba(124,58,237,0.4); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
              <span style="font-size: 40px; font-weight: 900; letter-spacing: 16px; color: #a78bfa; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 13px; margin: 0; text-align: center;">This code expires in <strong style="color: #9ca3af;">10 minutes</strong>. Do not share it with anyone.</p>
          </div>
          <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="color: #4b5563; font-size: 12px; margin: 0;">If you didn't create an account, ignore this email.</p>
          </div>
        </div>
      `,
    });
  } catch (smtpErr) {
    console.error('📧 SMTP Error:', smtpErr.message, '| code:', smtpErr.code, '| response:', smtpErr.response);
    // Reset transporter so next attempt creates a fresh one
    transporter = null;
    throw smtpErr;
  }
};
