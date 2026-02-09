const nodemailer = require('nodemailer');

function preview(text, maxLen = 140) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length <= maxLen ? clean : `${clean.slice(0, maxLen - 1)}…`;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) return null;

  // STARTTLS on port 587 (secure=false, will upgrade).
  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      tls: {
        minVersion: 'TLSv1.2',
        // Reject self-signed by default; set to false only if you know you need it.
        rejectUnauthorized: true,
      },
    }),
  };
}

async function sendEmail({ to, subject, body }) {
  const cfg = getSmtpConfig();
  if (!cfg) {
    // Fallback: simulate only when SMTP is not configured.
    // eslint-disable-next-line no-console
    console.log('[Email simulated]', { to, subject, bodyPreview: preview(body) });
    return { to, subject, bodyPreview: preview(body), at: new Date(), simulated: true };
  }

  const info = await cfg.transport.sendMail({
    from: cfg.from,
    to,
    subject,
    text: body,
  });

  return {
    to,
    subject,
    bodyPreview: preview(body),
    at: new Date(),
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    envelope: info.envelope,
  };
}

module.exports = { sendEmail };
