const express = require('express');
const mongoose = require('mongoose');

const Lead = require('../models/Lead');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { httpError } = require('../services/authService');
const { sendEmail } = require('../services/emailService');

const leadsRouter = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9()\-\s.]{7,20}$/;
const LEAD_STATUS = new Set(['new', 'contacted', 'converted']);

function normalizeText(value, maxLen = 200) {
  return String(value || '').trim().slice(0, maxLen);
}

function normalizeStatus(value, fallback = 'new') {
  const status = String(value || '').trim().toLowerCase();
  if (LEAD_STATUS.has(status)) return status;
  return fallback;
}

function normalizeDate(value) {
  if (!value) return new Date();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw httpError(400, 'Invalid lead date', 'VALIDATION');
  return d;
}

function buildLeadPayload(body = {}, options = {}) {
  const requireAll = Boolean(options.requireAll);
  const payload = {};

  if (requireAll || body.name !== undefined) {
    const name = normalizeText(body.name, 120);
    if (!name) throw httpError(400, 'Lead name is required', 'VALIDATION');
    payload.name = name;
  }

  if (requireAll || body.email !== undefined) {
    const email = normalizeText(body.email, 160).toLowerCase();
    if (!email) throw httpError(400, 'Lead email is required', 'VALIDATION');
    if (!EMAIL_REGEX.test(email)) throw httpError(400, 'Invalid lead email', 'VALIDATION');
    payload.email = email;
  }

  if (requireAll || body.phone !== undefined) {
    const phone = normalizeText(body.phone, 40);
    if (phone && !PHONE_REGEX.test(phone)) {
      throw httpError(400, 'Invalid lead phone number', 'VALIDATION');
    }
    payload.phone = phone;
  }

  if (requireAll || body.country !== undefined) {
    payload.country = normalizeText(body.country, 80);
  }

  if (requireAll || body.product !== undefined) {
    payload.product = normalizeText(body.product, 160);
  }

  if (requireAll || body.date !== undefined) {
    payload.date = normalizeDate(body.date);
  }

  if (requireAll || body.status !== undefined) {
    payload.status = normalizeStatus(body.status, 'new');
  }

  return payload;
}

function parseLeadFilters(query = {}) {
  const filter = {};
  const country = normalizeText(query.country, 80);
  const product = normalizeText(query.product, 160);
  const status = normalizeStatus(query.status, '');

  if (country) filter.country = country;
  if (product) filter.product = product;
  if (status) filter.status = status;

  return filter;
}

leadsRouter.use(requireAuth);
leadsRouter.use(requireRole('VENDOR'));

leadsRouter.post('/', async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
      throw httpError(403, 'Vendor access required', 'FORBIDDEN');
    }

    const payload = buildLeadPayload(req.body, { requireAll: true });
    const lead = await Lead.create({
      vendorId,
      ...payload,
    });

    res.status(201).json({ ok: true, lead });
  } catch (err) {
    next(err);
  }
});

leadsRouter.get('/', async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
      throw httpError(403, 'Vendor access required', 'FORBIDDEN');
    }

    const filter = parseLeadFilters(req.query || {});
    const leads = await Lead.find({ vendorId, ...filter }).sort({ createdAt: -1 }).lean();

    res.json({ ok: true, leads });
  } catch (err) {
    next(err);
  }
});

leadsRouter.put('/:id', async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    const id = String(req.params.id || '');

    if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
      throw httpError(403, 'Vendor access required', 'FORBIDDEN');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const payload = buildLeadPayload(req.body, { requireAll: false });
    if (!Object.keys(payload).length) {
      throw httpError(400, 'No valid lead fields to update', 'VALIDATION');
    }

    const lead = await Lead.findOneAndUpdate({ _id: id, vendorId }, { $set: payload }, { new: true });
    if (!lead) throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');

    res.json({ ok: true, lead });
  } catch (err) {
    next(err);
  }
});

leadsRouter.delete('/:id', async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    const id = String(req.params.id || '');

    if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
      throw httpError(403, 'Vendor access required', 'FORBIDDEN');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const deleted = await Lead.findOneAndDelete({ _id: id, vendorId });
    if (!deleted) throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');

    res.json({ ok: true, deletedId: id });
  } catch (err) {
    next(err);
  }
});

leadsRouter.post('/:id/send-email', async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    const id = String(req.params.id || '');
    if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
      throw httpError(403, 'Vendor access required', 'FORBIDDEN');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const lead = await Lead.findOne({ _id: id, vendorId });
    if (!lead) throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');

    const subject = normalizeText(req.body?.subject, 180);
    const message = normalizeText(req.body?.message, 10000);

    if (!subject) throw httpError(400, 'Email subject is required', 'VALIDATION');
    if (!message || message.length < 6) {
      throw httpError(400, 'Email message must be at least 6 characters', 'VALIDATION');
    }

    const delivery = await sendEmail({
      to: lead.email,
      subject,
      body: message,
    });

    const nextStatus = lead.status === 'new' ? 'contacted' : lead.status;
    if (nextStatus !== lead.status) {
      lead.status = nextStatus;
      await lead.save();
    }

    res.json({ ok: true, delivery, lead });
  } catch (err) {
    next(err);
  }
});

module.exports = { leadsRouter };
