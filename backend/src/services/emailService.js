const { httpError } = require('./authService');
const { getDefaultSenderKey, getTransporter, resolveSenderConfig } = require('../utils/transporterFactory');

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRecipients(input) {
  if (Array.isArray(input)) {
    return input.map((item) => compactText(item)).filter(Boolean);
  }

  return String(input || '')
    .split(',')
    .map((item) => compactText(item))
    .filter(Boolean);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMailOptions({ from, to, subject, html, text, cc, bcc }) {
  const mailOptions = {
    from,
    to: to.length > 1 ? to.join(', ') : to[0],
    subject,
  };

  if (html) mailOptions.html = html;
  if (text) mailOptions.text = text;
  if (cc?.length) mailOptions.cc = cc.length > 1 ? cc.join(', ') : cc[0];
  if (bcc?.length) mailOptions.bcc = bcc.length > 1 ? bcc.join(', ') : bcc[0];

  return mailOptions;
}

async function sendWithRetry(transporter, mailOptions, retries) {
  let lastError = null;
  const maxAttempts = Math.max(1, Number(retries) || 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { info, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(Math.min(1500 * attempt, 5000));
      }
    }
  }

  throw lastError;
}

function normalizeEmailError(error) {
  if (error?.statusCode) return error;

  const responseCode = Number(error?.responseCode || 0);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || 'Unable to send email').trim();

  if (code === 'EAUTH' || responseCode === 535) {
    return httpError(503, 'SMTP authentication failed for the selected sender', 'EMAIL_AUTH_FAILED');
  }

  return httpError(503, message, 'EMAIL_DELIVERY_FAILED');
}

async function sendEmail({ sender, to, subject, html, body, text, cc, bcc, retries = 2 }) {
  const senderConfig = resolveSenderConfig(sender || getDefaultSenderKey());
  const recipients = normalizeRecipients(to);
  const ccRecipients = normalizeRecipients(cc);
  const bccRecipients = normalizeRecipients(bcc);
  const resolvedSubject = compactText(subject);
  const resolvedHtml = String(html || '').trim();
  const resolvedText = compactText(text) || compactText(body) || (resolvedHtml ? stripHtml(resolvedHtml) : '');

  if (!recipients.length) throw httpError(400, 'At least one recipient is required', 'VALIDATION');
  if (!resolvedSubject) throw httpError(400, 'Subject is required', 'VALIDATION');
  if (!resolvedHtml && !resolvedText) throw httpError(400, 'Email body is required', 'VALIDATION');

  const transporter = getTransporter(senderConfig.key);
  const mailOptions = buildMailOptions({
    from: senderConfig.from,
    to: recipients,
    subject: resolvedSubject,
    html: resolvedHtml || undefined,
    text: resolvedText || undefined,
    cc: ccRecipients,
    bcc: bccRecipients,
  });

  try {
    const { info, attempts } = await sendWithRetry(transporter, mailOptions, retries);

    // eslint-disable-next-line no-console
    console.info('[mail:sent]', {
      sender: senderConfig.key,
      to: recipients,
      subject: resolvedSubject,
      messageId: info?.messageId,
      attempts,
    });

    return {
      ok: true,
      sender: senderConfig.key,
      from: senderConfig.from,
      to: recipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: resolvedSubject,
      messageId: info?.messageId,
      accepted: info?.accepted || [],
      rejected: info?.rejected || [],
      envelope: info?.envelope || null,
      response: info?.response || null,
      attempts,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[mail:failed]', {
      sender: senderConfig.key,
      to: recipients,
      subject: resolvedSubject,
      error: error?.message,
    });
    throw normalizeEmailError(error);
  }
}

module.exports = { sendEmail };
