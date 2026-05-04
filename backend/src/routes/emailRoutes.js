const express = require('express');

const { httpError } = require('../services/authService');
const { sendEmail } = require('../services/emailService');
const ClientEmailData = require('../models/ClientEmailData');
const { listSenderKeys, normalizeSenderKey } = require('../utils/transporterFactory');

const emailRouter = express.Router();

function normalizeRecipients(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

emailRouter.post('/send-email', async (req, res, next) => {
  try {
    const sender = normalizeSenderKey(req.body?.sender || '');
    const allowedSenders = new Set(listSenderKeys());

    if (!allowedSenders.has(sender)) {
      throw httpError(400, 'sender must be henry, david, or john', 'VALIDATION');
    }

    const to = normalizeRecipients(req.body?.to);
    const subject = String(req.body?.subject || '').trim();
    const html = String(req.body?.html || '').trim();
    const body = String(req.body?.body || '').trim();
    const text = String(req.body?.text || '').trim();

    if (!to.length) {
      throw httpError(400, 'to is required', 'VALIDATION');
    }

    if (!subject) {
      throw httpError(400, 'subject is required', 'VALIDATION');
    }

    if (!html && !body && !text) {
      throw httpError(400, 'html or body is required', 'VALIDATION');
    }

    const result = await sendEmail({
      sender,
      to,
      subject,
      html: html || undefined,
      body: body || undefined,
      text: text || undefined,
    });

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
});

emailRouter.get('/client-email-data/:clientKey', async (req, res, next) => {
  try {
    const clientKey = String(req.params?.clientKey || '').trim();
    if (!clientKey) {
      throw httpError(400, 'clientKey is required', 'VALIDATION');
    }

    const entry = await ClientEmailData.findOne({ clientKey }).lean();
    res.status(200).json({ ok: true, data: entry || null });
  } catch (error) {
    next(error);
  }
});

emailRouter.put('/client-email-data', async (req, res, next) => {
  try {
    const clientKey = String(req.body?.clientKey || '').trim();
    if (!clientKey) {
      throw httpError(400, 'clientKey is required', 'VALIDATION');
    }

    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};

    const updated = await ClientEmailData.findOneAndUpdate(
      { clientKey },
      { $set: { data } },
      { upsert: true, new: true }
    ).lean();

    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = { emailRouter };