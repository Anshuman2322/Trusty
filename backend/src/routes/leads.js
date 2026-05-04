const express = require('express');
const mongoose = require('mongoose');

const Lead = require('../models/Lead');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { httpError } = require('../services/authService');
const { sendEmail } = require('../services/emailService');
const { buildLeadTemplateData, renderTemplate } = require('../services/templateRenderer');

const leadsRouter = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9()\-\s.]{7,20}$/;
const LEAD_STATUS = new Set(['new', 'contacted', 'converted']);
const PRIORITY_VALUES = new Set(['low', 'medium', 'high']);
const PAYMENT_VALUES = new Set(['not_started', 'pending', 'paid']);
const DELIVERY_VALUES = new Set([
  'not_started',
  'processing',
  'dispatched',
  'in_transit',
  'in_customs',
  'out_of_customs',
  'out_for_delivery',
  'delivered',
]);
const SENTIMENT_VALUES = new Set(['positive', 'neutral', 'negative', '']);
const CRM_STAGE_VALUES = new Set([
  'new_lead',
  'contacted',
  'negotiation_follow_up',
  'invoice_sent',
  'payment_pending',
  'payment_received',
  'order_processing',
  'shipped',
  'delivered',
  'feedback_retention',
]);

function normalizeText(value, maxLen = 200) {
  return String(value || '').trim().slice(0, maxLen);
}

function normalizeStatus(value, fallback = 'new') {
  const status = String(value || '').trim().toLowerCase();
  if (LEAD_STATUS.has(status)) return status;
  return fallback;
}

function normalizePriority(value, fallback = 'medium') {
  const priority = String(value || '').trim().toLowerCase();
  if (PRIORITY_VALUES.has(priority)) return priority;
  return fallback;
}

function normalizePaymentStatus(value, fallback = 'not_started') {
  const status = String(value || '').trim().toLowerCase();
  if (PAYMENT_VALUES.has(status)) return status;
  return fallback;
}

function normalizeDeliveryStatus(value, fallback = 'not_started') {
  const status = String(value || '').trim().toLowerCase();
  if (DELIVERY_VALUES.has(status)) return status;
  return fallback;
}

function normalizeSentiment(value, fallback = '') {
  const sentiment = String(value || '').trim().toLowerCase();
  if (SENTIMENT_VALUES.has(sentiment)) return sentiment;
  return fallback;
}

function normalizeCrmStage(value, fallback = 'new_lead') {
  const stage = String(value || '').trim().toLowerCase();
  if (CRM_STAGE_VALUES.has(stage)) return stage;
  return fallback;
}

function normalizePercentage(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) throw httpError(400, 'Invalid percentage value', 'VALIDATION');
  return Math.max(0, Math.min(100, num));
}

function normalizeOptionalDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return normalizeDate(value);
}

function normalizeOptionalNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) throw httpError(400, 'Invalid numeric value', 'VALIDATION');
  return num;
}

function normalizeObjectId(value) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (!mongoose.Types.ObjectId.isValid(str)) {
    throw httpError(400, 'Invalid linked order id', 'VALIDATION');
  }
  return str;
}

function ensureActivityLog(lead) {
  if (!Array.isArray(lead.activityLog)) lead.activityLog = [];
}

function appendActivity(lead, activity) {
  ensureActivityLog(lead);
  lead.activityLog.push({
    type: String(activity?.type || 'update').slice(0, 80),
    message: String(activity?.message || 'Updated record').slice(0, 240),
    createdAt: new Date(),
    meta: activity?.meta || {},
  });
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

  if (requireAll || body.address !== undefined) {
    payload.address = normalizeText(body.address, 240);
  }

  if (requireAll || body.country !== undefined) {
    payload.country = normalizeText(body.country, 80);
  }

  if (requireAll || body.product !== undefined) {
    payload.product = normalizeText(body.product, 160);
  }

  if (requireAll || body.dosage !== undefined) {
    payload.dosage = normalizeText(body.dosage, 120);
  }

  const quantity = normalizeOptionalNumber(body.quantity);
  if (requireAll || quantity !== undefined) {
    payload.quantity = quantity;
  }

  const price = normalizeOptionalNumber(body.price);
  if (requireAll || price !== undefined) {
    payload.price = price;
  }

  if (requireAll || body.city !== undefined) {
    payload.city = normalizeText(body.city, 120);
  }

  if (requireAll || body.postalCode !== undefined || body.postal_code !== undefined) {
    payload.postalCode = normalizeText(body.postalCode ?? body.postal_code, 40);
  }

  if (requireAll || body.paymentLink !== undefined || body.payment_link !== undefined) {
    payload.paymentLink = normalizeText(body.paymentLink ?? body.payment_link, 320);
  }

  if (requireAll || body.invoiceId !== undefined || body.invoice_id !== undefined) {
    payload.invoiceId = normalizeText(body.invoiceId ?? body.invoice_id, 120);
  }

  if (requireAll || body.trackingId !== undefined || body.tracking_id !== undefined) {
    payload.trackingId = normalizeText(body.trackingId ?? body.tracking_id, 120);
  }

  if (requireAll || body.trackingLink !== undefined || body.tracking_link !== undefined) {
    payload.trackingLink = normalizeText(body.trackingLink ?? body.tracking_link, 320);
  }

  if (requireAll || body.date !== undefined) {
    payload.date = normalizeDate(body.date);
  }

  if (requireAll || body.status !== undefined) {
    payload.status = normalizeStatus(body.status, 'new');
  }

  if (requireAll || body.crmStage !== undefined) {
    payload.crmStage = normalizeCrmStage(body.crmStage, 'new_lead');
  }

  if (requireAll || body.priority !== undefined) {
    payload.priority = normalizePriority(body.priority, 'medium');
  }

  const followUpAt = normalizeOptionalDate(body.followUpAt);
  if (requireAll || followUpAt !== undefined) {
    payload.followUpAt = followUpAt === undefined ? null : followUpAt;
  }

  if (requireAll || body.paymentStatus !== undefined) {
    payload.paymentStatus = normalizePaymentStatus(body.paymentStatus, 'not_started');
  }

  if (requireAll || body.deliveryStatus !== undefined) {
    payload.deliveryStatus = normalizeDeliveryStatus(body.deliveryStatus, 'not_started');
  }

  if (requireAll || body.trackingRef !== undefined) {
    payload.trackingRef = normalizeText(body.trackingRef, 120);
  }

  const trustScore = normalizePercentage(body.trustScore, null);
  if (requireAll || body.trustScore !== undefined) {
    payload.trustScore = trustScore;
  }

  if (requireAll || body.sentiment !== undefined) {
    payload.sentiment = normalizeSentiment(body.sentiment, '');
  }

  const nextPurchaseProbability = normalizePercentage(body.nextPurchaseProbability, null);
  if (requireAll || body.nextPurchaseProbability !== undefined) {
    payload.nextPurchaseProbability = nextPurchaseProbability;
  }

  const linkedOrderId = normalizeObjectId(body.linkedOrderId);
  if (requireAll || linkedOrderId !== undefined) {
    payload.linkedOrderId = linkedOrderId;
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
  if (!String(query.includeDeleted || '').trim()) {
    filter.deletedAt = null;
  }

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
      activityLog: [{ type: 'created', message: 'Lead created', createdAt: new Date(), meta: {} }],
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

    const lead = await Lead.findOne({ _id: id, vendorId, deletedAt: null });
    if (!lead) throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');

    for (const [field, nextValue] of Object.entries(payload)) {
      const prevValue = lead[field];
      const changed = String(prevValue ?? '') !== String(nextValue ?? '');
      if (changed) {
        appendActivity(lead, {
          type: 'field_update',
          message: `Updated ${field}`,
          meta: { field, from: prevValue ?? null, to: nextValue ?? null },
        });
      }
      lead[field] = nextValue;
    }

    await lead.save();

    res.json({ ok: true, lead });
  } catch (err) {
    next(err);
  }
});

leadsRouter.post('/:id/notes', async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    const id = String(req.params.id || '');

    if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
      throw httpError(403, 'Vendor access required', 'FORBIDDEN');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const text = normalizeText(req.body?.text, 2000);
    if (!text) throw httpError(400, 'Note text is required', 'VALIDATION');

    const createdBy = normalizeText(req.body?.createdBy, 160) || 'vendor';
    const lead = await Lead.findOne({ _id: id, vendorId, deletedAt: null });
    if (!lead) throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');

    if (!Array.isArray(lead.notes)) lead.notes = [];
    lead.notes.push({ text, createdBy, createdAt: new Date() });
    appendActivity(lead, { type: 'note_added', message: 'Added note', meta: { noteLength: text.length } });

    await lead.save();
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

    const lead = await Lead.findOne({ _id: id, vendorId, deletedAt: null });
    if (!lead) throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');

    lead.deletedAt = new Date();
    appendActivity(lead, { type: 'soft_deleted', message: 'Record moved to archive', meta: {} });
    await lead.save();

    res.json({ ok: true, deletedId: id });
  } catch (err) {
    next(err);
  }
});

leadsRouter.post('/:id/unarchive', async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    const id = String(req.params.id || '');

    if (!vendorId || !mongoose.Types.ObjectId.isValid(String(vendorId))) {
      throw httpError(403, 'Vendor access required', 'FORBIDDEN');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const lead = await Lead.findOne({ _id: id, vendorId, deletedAt: { $ne: null } });
    if (!lead) throw httpError(404, 'Archived lead not found', 'LEAD_NOT_FOUND');

    lead.deletedAt = null;
    appendActivity(lead, { type: 'unarchived', message: 'Record restored from archive', meta: {} });
    await lead.save();

    res.json({ ok: true, lead });
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

    const lead = await Lead.findOne({ _id: id, vendorId, deletedAt: null });
    if (!lead) throw httpError(404, 'Lead not found', 'LEAD_NOT_FOUND');

    const subject = normalizeText(req.body?.subject, 180);
    const message = normalizeText(req.body?.message, 10000);
    const templateDataInput = req.body?.templateData;
    const templateData = templateDataInput && typeof templateDataInput === 'object' && !Array.isArray(templateDataInput)
      ? templateDataInput
      : {};

    const templateValues = buildLeadTemplateData({
      lead,
      user: req.user,
      extraData: templateData,
    });

    const resolvedSubject = normalizeText(renderTemplate(subject, templateValues, { keepUnknown: true }), 180);
    const resolvedMessage = normalizeText(renderTemplate(message, templateValues, { keepUnknown: true }), 10000);

    if (!resolvedSubject) throw httpError(400, 'Email subject is required', 'VALIDATION');
    if (!resolvedMessage || resolvedMessage.length < 6) {
      throw httpError(400, 'Email message must be at least 6 characters', 'VALIDATION');
    }

    const delivery = await sendEmail({
      to: lead.email,
      subject: resolvedSubject,
      body: resolvedMessage,
    });

    const nextStatus = lead.status === 'new' ? 'contacted' : lead.status;
    if (nextStatus !== lead.status) {
      lead.status = nextStatus;
    }

    if (lead.crmStage === 'new_lead') {
      lead.crmStage = 'contacted';
    }

    appendActivity(lead, {
      type: 'email_sent',
      message: 'Email sent to lead',
      meta: { subject: resolvedSubject },
    });
    await lead.save();

    res.json({ ok: true, delivery, lead });
  } catch (err) {
    next(err);
  }
});

module.exports = { leadsRouter };
