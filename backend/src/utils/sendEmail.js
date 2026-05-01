const nodemailer = require('nodemailer');
const { getDefaultSenderKey, normalizeSenderKey, resolveSenderConfig } = require('./transporterFactory');

let cachedTransport = null;

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function isSmtpAuthError(err) {
  const code = String(err?.code || '').toUpperCase();
  const responseCode = Number(err?.responseCode || 0);
  const message = String(err?.message || '').toLowerCase();

  return (
    code === 'EAUTH' ||
    responseCode === 535 ||
    message.includes('badcredentials') ||
    message.includes('username and password not accepted')
  );
}

function getEmailConfig() {
  const user = String(process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '')
    .replace(/\s+/g, '')
    .trim();
  const from = String(process.env.SMTP_FROM || user || '').trim();

  if (user && pass) {
    return {
      user,
      pass,
      from,
      isConfigured: true,
      source: 'legacy',
    };
  }

  try {
    const senderConfig = resolveSenderConfig(normalizeSenderKey(process.env.SMTP_DEFAULT_SENDER || getDefaultSenderKey()));
    return {
      user: senderConfig.user,
      pass: senderConfig.pass,
      from: senderConfig.from,
      isConfigured: true,
      source: 'sender',
    };
  } catch (error) {
    return {
      user: '',
      pass: '',
      from: '',
      isConfigured: false,
      source: 'missing',
      error,
    };
  }
}

function getTransporter() {
  if (cachedTransport) return cachedTransport;

  const cfg = getEmailConfig();

  if (!cfg.isConfigured) {
    const err = new Error(
      'Email credentials are required. Set GMAIL_USER/GMAIL_APP_PASSWORD or SMTP_USER/SMTP_PASSWORD.'
    );
    err.statusCode = 500;
    err.code = 'CONFIG';
    throw err;
  }

  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: cfg.user, pass: cfg.pass },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  });

  return cachedTransport;
}

async function sendVerificationOtpEmail({ toEmail, otp }) {
  const cfg = getEmailConfig();

  if (!cfg.isConfigured) {
    if (!isProduction()) {
      // eslint-disable-next-line no-console
      console.warn(`[DEV OTP] Email config missing. OTP for ${toEmail}: ${otp}`);
      return { delivered: false, channel: 'console' };
    }

    const err = new Error(
      'Email OTP is not configured. Set GMAIL_USER/GMAIL_APP_PASSWORD or SMTP_USER/SMTP_PASSWORD.'
    );
    err.statusCode = 503;
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const transporter = getTransporter();

  try {
    await transporter.sendMail({
      from: cfg.from,
      to: toEmail,
      subject: 'Your Trusty Verification Code',
      text: `Your OTP is ${otp}\nThis code is valid for 5 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.6;">
        <p>Your OTP is <strong style="font-size:18px;letter-spacing:2px;">${otp}</strong></p>
        <p>This code is valid for 5 minutes.</p>
      </div>`,
    });
  } catch (err) {
    if (!isProduction() && isSmtpAuthError(err)) {
      // Reset cached transport so new credentials can be picked up after restart.
      cachedTransport = null;
      // eslint-disable-next-line no-console
      console.warn(`[DEV OTP] SMTP auth failed. OTP for ${toEmail}: ${otp}`);
      return { delivered: false, channel: 'console', reason: 'SMTP_AUTH_FAILED' };
    }

    if (!isProduction()) {
      // eslint-disable-next-line no-console
      console.warn(`[DEV OTP] SMTP delivery failed. OTP for ${toEmail}: ${otp}`);
      return { delivered: false, channel: 'console', reason: 'SMTP_DELIVERY_FAILED' };
    }

    const emailErr = new Error('Unable to send OTP email right now. Please try again shortly.');
    emailErr.statusCode = 503;
    emailErr.code = isSmtpAuthError(err) ? 'EMAIL_AUTH_FAILED' : 'EMAIL_DELIVERY_FAILED';
    throw emailErr;
  }

  return { delivered: true, channel: 'email' };
}

module.exports = { sendVerificationOtpEmail };
