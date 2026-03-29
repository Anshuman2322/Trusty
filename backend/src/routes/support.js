const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');

const Vendor = require('../models/Vendor');
const Message = require('../models/Message');
const Ticket = require('../models/Ticket');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { httpError } = require('../services/authService');
const { withMongoReadRetry } = require('../services/mongoReadRetry');
const { sendEmail } = require('../services/emailService');
const { extractClientIp } = require('../services/ipIntelService');

const supportRouter = express.Router();

const ISSUE_TYPES = new Set([
  'Trust Score',
  'Feedback Issue',
  'Vendor Response Delay',
  'Account Access',
  'Billing',
  'Bug Report',
  'Privacy & Security',
  'Other',
]);

const STATUS_FILTERS = new Set(['open', 'in-progress', 'resolved']);
const MESSAGE_STATUSES = new Set(['open', 'replied', 'closed']);
const MESSAGE_WINDOW_MS = 45 * 1000;
const TICKET_WINDOW_MS = 60 * 1000;
const publicRateWindow = new Map();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isValidPhone(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  return /^\+?[0-9()\-\.\s]{7,20}$/.test(text);
}

function sanitizeText(value, maxLen = 2000) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function getIpHash(req) {
  const ip = extractClientIp(req) || req.ip || '';
  const salt = String(process.env.IP_HASH_SALT || process.env.JWT_SECRET || 'trusty-ip-salt');
  return crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}

function ensureRateLimit({ key, windowMs }) {
  const now = Date.now();
  const prevAt = publicRateWindow.get(key);

  if (prevAt && now - prevAt < windowMs) {
    const waitSec = Math.ceil((windowMs - (now - prevAt)) / 1000);
    throw httpError(429, `Please wait ${waitSec}s before sending another request`, 'RATE_LIMIT');
  }

  publicRateWindow.set(key, now);

  if (publicRateWindow.size > 3000) {
    const cutoff = now - Math.max(windowMs, 5 * 60 * 1000);
    for (const [cacheKey, ts] of publicRateWindow.entries()) {
      if (ts < cutoff) publicRateWindow.delete(cacheKey);
    }
  }
}

function publicTicketView(ticket) {
  const referenceId = String(ticket?.referenceId || String(ticket?._id || '').slice(-6)).toUpperCase();

  return {
    _id: String(ticket._id),
    referenceId,
    issueType: ticket.issueType,
    name: ticket.name,
    email: ticket.email,
    phone: ticket.phone || '',
    status: ticket.status,
    adminReply: ticket.adminReply || '',
    priority: ticket.priority || 'normal',
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function detailedTicketView(ticket) {
  const referenceId = String(ticket?.referenceId || String(ticket?._id || '').slice(-6)).toUpperCase();

  return {
    _id: String(ticket._id),
    referenceId,
    issueType: ticket.issueType,
    name: ticket.name,
    email: ticket.email,
    phone: ticket.phone || '',
    status: ticket.status,
    priority: ticket.priority || 'normal',
    description: ticket.description,
    customerSatisfaction: ticket.customerSatisfaction || 'pending',
    customerClosedAt: ticket.customerClosedAt || null,
    customerCloseNote: ticket.customerCloseNote || '',
    adminReply: ticket.adminReply || '',
    replies: (ticket.replies || []).map((item) => ({
      body: item.body,
      repliedBy: item.repliedBy,
      at: item.at,
    })),
    customerFollowUps: (ticket.customerFollowUps || []).map((item) => ({
      message: item.message,
      email: item.email,
      at: item.at,
    })),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    source: ticket.source || 'chatbot',
  };
}

async function resolveTicketForPublicAction({ ticketId, referenceId, email }) {
  if (!mongoose.Types.ObjectId.isValid(String(ticketId || ''))) {
    throw httpError(404, 'Ticket not found', 'NOT_FOUND');
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedRef = String(referenceId || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!isValidEmail(normalizedEmail)) {
    throw httpError(400, 'Valid email is required', 'VALIDATION');
  }
  if (!normalizedRef) {
    throw httpError(400, 'Reference ID is required', 'VALIDATION');
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw httpError(404, 'Ticket not found', 'NOT_FOUND');

  const ticketRef = String(ticket.referenceId || String(ticket._id).slice(-6)).toUpperCase();
  if (ticketRef !== normalizedRef || normalizeEmail(ticket.email) !== normalizedEmail) {
    throw httpError(403, 'Reference ID and email do not match this ticket', 'FORBIDDEN');
  }

  return ticket;
}

function publicMessageView(message) {
  const referenceId = String(message?.referenceId || String(message?._id || '').slice(-6)).toUpperCase();

  return {
    _id: String(message._id),
    referenceId,
    vendorId: String(message.vendorId || ''),
    vendorName: String(message?.vendorId?.name || message?.vendorName || ''),
    userName: message.userName || '',
    userEmail: message.userEmail || '',
    userPhone: message.userPhone || '',
    message: message.message || '',
    status: message.status,
    reply: message.reply || '',
    replies: (message.replies || []).map((item) => ({
      body: item.body,
      repliedBy: item.repliedBy,
      at: item.at,
    })),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

function detailedMessageView(message) {
  const referenceId = String(message?.referenceId || String(message?._id || '').slice(-6)).toUpperCase();

  return {
    _id: String(message._id),
    referenceId,
    vendorId: String(message.vendorId?._id || message.vendorId || ''),
    vendorName: String(message?.vendorId?.name || message?.vendorName || ''),
    userName: message.userName || '',
    userEmail: message.userEmail || '',
    userPhone: message.userPhone || '',
    message: message.message || '',
    status: message.status,
    reply: message.reply || '',
    replies: (message.replies || []).map((item) => ({
      body: item.body,
      repliedBy: item.repliedBy,
      at: item.at,
    })),
    source: message.source || 'chatbot',
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function sendSupportEmailSafe({ to, subject, body }) {
  try {
    const info = await sendEmail({ to, subject, body });
    return { attempted: true, delivered: true, info };
  } catch (error) {
    return {
      attempted: true,
      delivered: false,
      error: error?.message || 'EMAIL_DELIVERY_FAILED',
    };
  }
}

supportRouter.get('/meta', async (req, res, next) => {
  try {
    const vendors = await withMongoReadRetry('support vendors list', async () =>
      Vendor.find(
        {},
        {
          name: 1,
          category: 1,
          email: 1,
          supportEmail: 1,
          phone: 1,
          website: 1,
          city: 1,
          state: 1,
          country: 1,
        }
      )
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
    );

    res.json({
      ok: true,
      issueTypes: Array.from(ISSUE_TYPES),
      vendors: vendors.map((item) => ({
        _id: item._id,
        name: item.name,
        category: item.category || '',
        email: item.email || '',
        supportEmail: item.supportEmail || '',
        phone: item.phone || '',
        website: item.website || '',
        city: item.city || '',
        state: item.state || '',
        country: item.country || '',
      })),
    });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/messages', async (req, res, next) => {
  try {
    const vendorId = String(req.body?.vendorId || '').trim();
    const messageText = sanitizeText(req.body?.message, 2000);
    const userName = sanitizeText(req.body?.userName, 120);
    const userEmail = normalizeEmail(req.body?.userEmail);
    const userPhone = sanitizeText(req.body?.userPhone, 40);
    const source = sanitizeText(req.body?.source || 'chatbot', 40).toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      throw httpError(400, 'Please select a valid vendor', 'VALIDATION');
    }
    if (messageText.length < 12) {
      throw httpError(400, 'Message should be at least 12 characters', 'VALIDATION');
    }
    if (userName.length < 2) {
      throw httpError(400, 'Please provide your full name', 'VALIDATION');
    }
    if (!isValidEmail(userEmail)) {
      throw httpError(400, 'Please provide a valid email address', 'VALIDATION');
    }
    if (!isValidPhone(userPhone)) {
      throw httpError(400, 'Please provide a valid phone number', 'VALIDATION');
    }

    const vendor = await withMongoReadRetry('support message vendor lookup', async () => Vendor.findById(vendorId).lean());
    if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

    const ipHash = getIpHash(req);
    ensureRateLimit({ key: `msg:${ipHash}:${userEmail}`, windowMs: MESSAGE_WINDOW_MS });

    const recentDuplicate = await withMongoReadRetry('support message dedupe', async () =>
      Message.findOne({
        vendorId,
        userEmail,
        message: messageText,
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }).lean()
    );

    if (recentDuplicate) {
      throw httpError(409, 'This message was already submitted recently', 'DUPLICATE');
    }

    const messageId = new mongoose.Types.ObjectId();
    const referenceId = String(messageId).slice(-6).toUpperCase();

    const created = await Message.create({
      _id: messageId,
      referenceId,
      vendorId,
      message: messageText,
      userName,
      userEmail,
      userPhone: userPhone || undefined,
      status: 'open',
      source: source === 'public-page' ? 'public-page' : source === 'manual' ? 'manual' : 'chatbot',
      ipHash,
    });

    const notification = await sendSupportEmailSafe({
      to: userEmail,
      subject: `Trusty Support Request Received - Ref ${referenceId}`,
      body: `Hello ${userName},\n\nWe received your vendor support request.\n\nReference ID: ${referenceId}\nStatus: open\nVendor ID: ${vendorId}\n\nPlease save this reference for future follow-up. You can also track updates from chatbot using your email.`,
    });

    res.status(201).json({ ok: true, message: publicMessageView(created), referenceId, notification });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/messages/public', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.query?.email);
    if (!isValidEmail(email)) throw httpError(400, 'Valid email is required', 'VALIDATION');

    const rows = await withMongoReadRetry('support public messages by email', async () =>
      Message.find({ userEmail: email })
        .populate('vendorId', 'name')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    );

    res.json({ ok: true, messages: rows.map(publicMessageView) });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/messages/track', async (req, res, next) => {
  try {
    const referenceId = String(req.query?.referenceId || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const email = normalizeEmail(req.query?.email);

    if (!referenceId && !email) {
      throw httpError(400, 'Provide reference ID or email to track vendor query', 'VALIDATION');
    }

    if (email && !isValidEmail(email)) {
      throw httpError(400, 'Valid email is required', 'VALIDATION');
    }

    const filter = {};
    if (email) filter.userEmail = email;
    if (referenceId) filter.referenceId = referenceId;

    let messages = await withMongoReadRetry('support message tracking primary lookup', async () =>
      Message.find(filter)
        .populate('vendorId', 'name')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(20)
        .lean()
    );

    // Legacy fallback for records without referenceId.
    if (referenceId && messages.length === 0) {
      const legacyPool = await withMongoReadRetry('support message tracking legacy lookup', async () =>
        Message.find(email ? { userEmail: email } : {})
          .populate('vendorId', 'name')
          .sort({ createdAt: -1 })
          .limit(400)
          .lean()
      );

      messages = legacyPool.filter(
        (item) => String(item?._id || '').slice(-6).toUpperCase() === referenceId
      );
    }

    return res.json({
      ok: true,
      query: { referenceId: referenceId || '', email: email || '' },
      count: messages.length,
      messages: messages.map(detailedMessageView),
    });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets', async (req, res, next) => {
  try {
    const issueTypeRaw = sanitizeText(req.body?.issueType, 120);
    const description = sanitizeText(req.body?.description, 3000);
    const name = sanitizeText(req.body?.name, 120);
    const email = normalizeEmail(req.body?.email);
    const phone = sanitizeText(req.body?.phone, 40);
    const source = sanitizeText(req.body?.source || 'chatbot', 40).toLowerCase();

    if (!ISSUE_TYPES.has(issueTypeRaw)) {
      throw httpError(400, 'Please choose a valid issue type', 'VALIDATION');
    }
    if (description.length < 20) {
      throw httpError(400, 'Description should be at least 20 characters', 'VALIDATION');
    }
    if (name.length < 2) {
      throw httpError(400, 'Please provide your full name', 'VALIDATION');
    }
    if (!isValidEmail(email)) {
      throw httpError(400, 'A valid email is required', 'VALIDATION');
    }
    if (!isValidPhone(phone)) {
      throw httpError(400, 'Please provide a valid phone number', 'VALIDATION');
    }

    const ipHash = getIpHash(req);
    ensureRateLimit({ key: `ticket:${ipHash}:${email}`, windowMs: TICKET_WINDOW_MS });

    const duplicate = await withMongoReadRetry('support ticket dedupe', async () =>
      Ticket.findOne({
        email,
        issueType: issueTypeRaw,
        description,
        createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
      }).lean()
    );
    if (duplicate) {
      throw httpError(409, 'A similar ticket was submitted recently', 'DUPLICATE');
    }

    const ticketId = new mongoose.Types.ObjectId();
    const referenceId = String(ticketId).slice(-6).toUpperCase();

    const ticket = await Ticket.create({
      _id: ticketId,
      referenceId,
      issueType: issueTypeRaw,
      description,
      name,
      email,
      phone: phone || undefined,
      status: 'open',
      source: source === 'vendor-escalation' ? 'vendor-escalation' : source === 'public-page' ? 'public-page' : 'chatbot',
      priority: issueTypeRaw === 'Privacy & Security' || issueTypeRaw === 'Account Access' ? 'high' : 'normal',
      ipHash,
    });

    const notification = await sendSupportEmailSafe({
      to: email,
      subject: `Trusty Ticket Created - Ref ${referenceId}`,
      body: `Hello ${name},\n\nYour support ticket has been created successfully.\n\nReference ID: ${referenceId}\nIssue Type: ${issueTypeRaw}\nStatus: open\n\nPlease note this reference ID for future tracking. You will receive email updates whenever support replies.`,
    });

    res.status(201).json({ ok: true, ticket: publicTicketView(ticket), referenceId, notification });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/tickets/public', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.query?.email);
    if (!isValidEmail(email)) throw httpError(400, 'Valid email is required', 'VALIDATION');

    const rows = await withMongoReadRetry('support public tickets by email', async () =>
      Ticket.find({ email }).sort({ createdAt: -1 }).limit(20).lean()
    );

    res.json({ ok: true, tickets: rows.map(publicTicketView) });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/tickets/track', async (req, res, next) => {
  try {
    const referenceId = String(req.query?.referenceId || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const email = normalizeEmail(req.query?.email);

    if (!referenceId && !email) {
      throw httpError(400, 'Provide reference ID or email to track ticket', 'VALIDATION');
    }

    if (email && !isValidEmail(email)) {
      throw httpError(400, 'Valid email is required', 'VALIDATION');
    }

    const filter = {};
    if (email) filter.email = email;
    if (referenceId) filter.referenceId = referenceId;

    let tickets = await withMongoReadRetry('support ticket tracking primary lookup', async () =>
      Ticket.find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(20).lean()
    );

    // Legacy fallback for tickets created before referenceId field existed.
    if (referenceId && tickets.length === 0) {
      const legacyPool = await withMongoReadRetry('support ticket tracking legacy lookup', async () =>
        Ticket.find(email ? { email } : {}).sort({ createdAt: -1 }).limit(400).lean()
      );

      tickets = legacyPool.filter(
        (item) => String(item?._id || '').slice(-6).toUpperCase() === referenceId
      );
    }

    return res.json({
      ok: true,
      query: { referenceId: referenceId || '', email: email || '' },
      count: tickets.length,
      tickets: tickets.map(detailedTicketView),
    });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets/:ticketId/follow-up', async (req, res, next) => {
  try {
    const ticket = await resolveTicketForPublicAction({
      ticketId: req.params.ticketId,
      referenceId: req.body?.referenceId,
      email: req.body?.email,
    });

    const message = sanitizeText(req.body?.message, 3000);
    if (message.length < 6) {
      throw httpError(400, 'Follow-up message should be at least 6 characters', 'VALIDATION');
    }

    ticket.customerFollowUps = Array.isArray(ticket.customerFollowUps) ? ticket.customerFollowUps : [];
    ticket.customerFollowUps.push({ message, email: normalizeEmail(req.body?.email), at: new Date() });
    ticket.status = ticket.status === 'resolved' ? 'in-progress' : ticket.status;
    ticket.customerSatisfaction = 'pending';
    await ticket.save();

    const referenceId = String(ticket.referenceId || String(ticket._id).slice(-6)).toUpperCase();
    const notification = await sendSupportEmailSafe({
      to: ticket.email,
      subject: `Trusty Follow-up Received - Ticket ${referenceId}`,
      body: `Hello ${ticket.name || ''},\n\nWe received your follow-up for ticket ${referenceId}.\n\nMessage: ${message}\nCurrent Status: ${ticket.status}\n\nOur team will review and update you soon.`,
    });

    res.json({ ok: true, ticket: detailedTicketView(ticket), notification });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets/:ticketId/email-update', async (req, res, next) => {
  try {
    const ticket = await resolveTicketForPublicAction({
      ticketId: req.params.ticketId,
      referenceId: req.body?.referenceId,
      email: req.body?.email,
    });

    const referenceId = String(ticket.referenceId || String(ticket._id).slice(-6)).toUpperCase();
    const notification = await sendSupportEmailSafe({
      to: ticket.email,
      subject: `Trusty Ticket Update Summary - ${referenceId}`,
      body: `Hello ${ticket.name || ''},\n\nHere is your latest ticket summary.\n\nReference ID: ${referenceId}\nIssue: ${ticket.issueType}\nStatus: ${ticket.status}\nPriority: ${ticket.priority}\nLast Admin Reply: ${ticket.adminReply || 'No reply yet'}\nLast Updated: ${new Date(ticket.updatedAt).toLocaleString()}\n\nThank you for using Trusty support.`,
    });

    res.json({ ok: true, notification, ticket: detailedTicketView(ticket) });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets/:ticketId/close', async (req, res, next) => {
  try {
    const ticket = await resolveTicketForPublicAction({
      ticketId: req.params.ticketId,
      referenceId: req.body?.referenceId,
      email: req.body?.email,
    });

    const satisfaction = String(req.body?.satisfaction || '').trim().toLowerCase();
    const closeNote = sanitizeText(req.body?.closeNote, 600);

    if (satisfaction !== 'satisfied' && satisfaction !== 'not-satisfied') {
      throw httpError(400, 'satisfaction must be satisfied or not-satisfied', 'VALIDATION');
    }

    ticket.customerSatisfaction = satisfaction;
    ticket.customerCloseNote = closeNote;
    ticket.customerClosedAt = new Date();
    ticket.status = satisfaction === 'satisfied' ? 'resolved' : 'in-progress';
    await ticket.save();

    const referenceId = String(ticket.referenceId || String(ticket._id).slice(-6)).toUpperCase();
    const notification = await sendSupportEmailSafe({
      to: ticket.email,
      subject: `Trusty Ticket Feedback Saved - ${referenceId}`,
      body: `Hello ${ticket.name || ''},\n\nYour feedback was saved for ticket ${referenceId}.\n\nSatisfaction: ${satisfaction}\nStatus now: ${ticket.status}\nNote: ${closeNote || 'No note provided'}\n\nThank you for helping us improve support quality.`,
    });

    res.json({ ok: true, ticket: detailedTicketView(ticket), notification });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/vendor/messages', requireAuth, requireRole('VENDOR'), async (req, res, next) => {
  try {
    const vendorId = String(req.user?.vendorId || '');
    if (!mongoose.Types.ObjectId.isValid(vendorId)) throw httpError(403, 'Vendor access required', 'FORBIDDEN');

    const statusFilter = String(req.query?.status || '').trim().toLowerCase();
    const filter = { vendorId };
    if (MESSAGE_STATUSES.has(statusFilter)) filter.status = statusFilter;

    const messages = await withMongoReadRetry('vendor support messages', async () =>
      Message.find(filter).sort({ createdAt: -1 }).limit(200).lean()
    );

    res.json({ ok: true, messages });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/vendor/messages/:messageId/reply', requireAuth, requireRole('VENDOR'), async (req, res, next) => {
  try {
    const vendorId = String(req.user?.vendorId || '');
    const messageId = String(req.params.messageId || '');
    const reply = sanitizeText(req.body?.reply, 2000);

    if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      throw httpError(404, 'Message not found', 'NOT_FOUND');
    }
    if (reply.length < 6) throw httpError(400, 'Reply should be at least 6 characters', 'VALIDATION');

    const updated = await Message.findOneAndUpdate(
      { _id: messageId, vendorId },
      {
        $set: { reply, status: 'replied' },
        $push: { replies: { body: reply, repliedBy: 'VENDOR', at: new Date() } },
      },
      { new: true }
    );

    if (!updated) throw httpError(404, 'Message not found', 'NOT_FOUND');

    let notification = { attempted: false, delivered: false };
    if (updated.userEmail && isValidEmail(updated.userEmail)) {
      notification = await sendSupportEmailSafe({
        to: updated.userEmail,
        subject: `Trusty Vendor Reply - Ref ${String(updated._id).slice(-6).toUpperCase()}`,
        body: `Hello,\n\nYou received a new vendor reply.\n\nMessage Reference: ${String(updated._id)}\nStatus: ${updated.status}\nReply: ${reply}\n\nIf your issue is still unresolved, you can raise a Trusty support ticket from chatbot.`,
      });
    }

    res.json({ ok: true, message: updated, notification });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/vendor/messages/:messageId/status', requireAuth, requireRole('VENDOR'), async (req, res, next) => {
  try {
    const vendorId = String(req.user?.vendorId || '');
    const messageId = String(req.params.messageId || '');
    const status = String(req.body?.status || '').trim().toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      throw httpError(404, 'Message not found', 'NOT_FOUND');
    }
    if (!MESSAGE_STATUSES.has(status)) throw httpError(400, 'Invalid status', 'VALIDATION');

    const updated = await Message.findOneAndUpdate(
      { _id: messageId, vendorId },
      { $set: { status } },
      { new: true }
    );

    if (!updated) throw httpError(404, 'Message not found', 'NOT_FOUND');

    res.json({ ok: true, message: updated });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/admin/tickets', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const status = String(req.query?.status || '').trim().toLowerCase();
    const priority = String(req.query?.priority || '').trim().toLowerCase();

    const filter = {};
    if (STATUS_FILTERS.has(status)) filter.status = status;
    if (['low', 'normal', 'high', 'urgent'].includes(priority)) filter.priority = priority;

    const tickets = await withMongoReadRetry('admin support tickets', async () =>
      Ticket.find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(300).lean()
    );

    res.json({ ok: true, tickets });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/admin/tickets/:ticketId/reply', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const ticketId = String(req.params.ticketId || '');
    const reply = sanitizeText(req.body?.reply, 3000);

    if (!mongoose.Types.ObjectId.isValid(ticketId)) throw httpError(404, 'Ticket not found', 'NOT_FOUND');
    if (reply.length < 6) throw httpError(400, 'Reply should be at least 6 characters', 'VALIDATION');

    const updated = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        $set: { adminReply: reply, status: 'in-progress' },
        $push: { replies: { body: reply, repliedBy: 'ADMIN', at: new Date() } },
      },
      { new: true }
    );

    if (!updated) throw httpError(404, 'Ticket not found', 'NOT_FOUND');

    const referenceId = String(updated.referenceId || String(updated._id).slice(-6)).toUpperCase();
    const notification = await sendSupportEmailSafe({
      to: updated.email,
      subject: `Trusty Support Update - Ticket ${referenceId}`,
      body: `Hello ${updated.name || ''},\n\nOur support team replied to your ticket.\n\nReference ID: ${referenceId}\nIssue: ${updated.issueType}\nStatus: ${updated.status}\nReply: ${reply}\n\nThank you for using Trusty.`,
    });

    res.json({ ok: true, ticket: updated, notification });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/admin/tickets/:ticketId/status', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const ticketId = String(req.params.ticketId || '');
    const status = String(req.body?.status || '').trim().toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(ticketId)) throw httpError(404, 'Ticket not found', 'NOT_FOUND');
    if (!STATUS_FILTERS.has(status)) throw httpError(400, 'Invalid status', 'VALIDATION');

    const updated = await Ticket.findByIdAndUpdate(ticketId, { $set: { status } }, { new: true });
    if (!updated) throw httpError(404, 'Ticket not found', 'NOT_FOUND');

    res.json({ ok: true, ticket: updated });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/admin/messages', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const statusFilter = String(req.query?.status || '').trim().toLowerCase();
    const filter = {};
    if (MESSAGE_STATUSES.has(statusFilter)) filter.status = statusFilter;

    const messages = await withMongoReadRetry('admin support messages', async () =>
      Message.find(filter).sort({ createdAt: -1 }).limit(300).lean()
    );

    res.json({ ok: true, messages });
  } catch (err) {
    next(err);
  }
});

module.exports = { supportRouter };
