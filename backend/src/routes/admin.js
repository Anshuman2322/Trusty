const express = require('express');
const mongoose = require('mongoose');

const Feedback = require('../models/Feedback');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { withMongoReadRetry } = require('../services/mongoReadRetry');
const {
  computeAdminOverview,
  listAdminVendors,
  computeAlerts,
  getVendorDetail,
  getVendorProfile,
  getAnalyticsSnapshot,
  getPatternClusters,
  getAdminSettings,
  updateAdminSettings,
  flagVendor,
  terminateVendor,
  reactivateVendor,
  getActionLogs,
} = require('../services/adminService');
const { sendEmail } = require('../services/emailService');

const adminRouter = express.Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole('ADMIN'));

adminRouter.get('/overview', async (req, res, next) => {
  try {
    const overview = await computeAdminOverview();
    res.json({ ok: true, overview });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/vendors', async (req, res, next) => {
  try {
    const vendors = await listAdminVendors();
    res.json({ ok: true, vendors });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/feedbacks', async (req, res, next) => {
  try {
    const rawLimit = Number(req.query?.limit || 0);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 500) : 0;
    const trustFilter = String(req.query?.trust || '').trim().toUpperCase();
    const duplicateOnly = String(req.query?.duplicate || '').trim().toLowerCase() === 'true';
    const anonymousOnly = String(req.query?.anonymous || '').trim().toLowerCase() === 'true';

    const filter = {};
    if (trustFilter === 'HIGH' || trustFilter === 'MEDIUM' || trustFilter === 'LOW') {
      filter.trustLevel = trustFilter;
    }

    if (duplicateOnly) {
      filter.$or = [
        { tags: { $in: ['duplicate'] } },
        { dupAdj: { $lt: 0 } },
      ];
    }

    if (anonymousOnly) {
      filter.displayName = { $in: [null, '', 'Anonymous'] };
    }

    const feedbacks = await withMongoReadRetry('admin feedbacks', async () => {
      const query = Feedback.find(filter).sort({ createdAt: -1 }).read('secondaryPreferred').lean();
      if (limit > 0) query.limit(limit);
      return query;
    });

    res.json({ ok: true, feedbacks });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/alerts', async (req, res, next) => {
  try {
    const alerts = await computeAlerts();
    res.json({ ok: true, alerts });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/vendors/:vendorId/details', async (req, res, next) => {
  try {
    const vendorId = String(req.params.vendorId || '');
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    const detail = await getVendorDetail(vendorId);
    if (!detail) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    res.json({ ok: true, detail });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/vendors/:vendorId/profile', async (req, res, next) => {
  try {
    const vendorId = String(req.params.vendorId || '');
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    const profile = await getVendorProfile(vendorId);
    if (!profile) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vendors/:vendorId/flag', async (req, res, next) => {
  try {
    const vendorId = String(req.params.vendorId || '');
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    const reason = String(req.body?.reason || '').trim();
    const vendor = await flagVendor({
      vendorId,
      actorUserId: req.user.userId,
      actorEmail: req.user.email,
      reason,
    });

    if (!vendor) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    res.json({ ok: true, vendor });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vendors/:vendorId/terminate', async (req, res, next) => {
  try {
    const vendorId = String(req.params.vendorId || '');
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    const reason = String(req.body?.reason || '').trim();
    const vendor = await terminateVendor({
      vendorId,
      actorUserId: req.user.userId,
      actorEmail: req.user.email,
      reason,
    });

    if (!vendor) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    res.json({ ok: true, vendor });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/vendors/:vendorId/reactivate', async (req, res, next) => {
  try {
    const vendorId = String(req.params.vendorId || '');
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    const reason = String(req.body?.reason || '').trim();
    const vendor = await reactivateVendor({
      vendorId,
      actorUserId: req.user.userId,
      actorEmail: req.user.email,
      reason,
    });

    if (!vendor) {
      return res.status(404).json({ ok: false, error: { message: 'Vendor not found' } });
    }

    res.json({ ok: true, vendor });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/analytics', async (req, res, next) => {
  try {
    const analytics = await getAnalyticsSnapshot();
    res.json({ ok: true, analytics });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/patterns', async (req, res, next) => {
  try {
    const patterns = await getPatternClusters();
    res.json({ ok: true, patterns });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/settings', async (req, res, next) => {
  try {
    const settings = await getAdminSettings();
    res.json({ ok: true, settings });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/settings', async (req, res, next) => {
  try {
    const settings = await updateAdminSettings({ payload: req.body, actorUserId: req.user.userId });
    res.json({ ok: true, settings });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/logs', async (req, res, next) => {
  try {
    const rawLimit = Number(req.query?.limit || 100);
    const logs = await getActionLogs({ limit: rawLimit });
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
});

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','));
  }
  return lines.join('\n');
}

adminRouter.get('/reports/export', async (req, res, next) => {
  try {
    const type = String(req.query?.type || 'feedback').trim().toLowerCase();

    if (type === 'vendor' || type === 'vendors') {
      const vendors = await listAdminVendors();
      const rows = vendors.map((vendor) => ({
        vendorId: vendor.vendorId,
        name: vendor.name,
        email: vendor.contactEmail || '',
        trustScore: vendor.averageTrustScore,
        status: vendor.statusBadge,
        orders: vendor.ordersCount,
        feedbacks: vendor.totalFeedbacks,
        suspiciousActivityCount: vendor.suspiciousActivityCount,
      }));
      const csv = toCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="vendor-report.csv"');
      return res.send(csv);
    }

    if (type === 'analytics') {
      const analytics = await getAnalyticsSnapshot();
      const rows = analytics.trustScoreTrend.map((item) => ({
        date: item.date,
        averageTrust: item.averageTrust,
        totalFeedbacks: item.totalFeedbacks,
      }));
      const csv = toCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-report.csv"');
      return res.send(csv);
    }

    const feedbacks = await withMongoReadRetry('admin feedback report', async () => {
      return Feedback.find({}).sort({ createdAt: -1 }).limit(5000).read('secondaryPreferred').lean();
    });

    const rows = feedbacks.map((feedback) => ({
      id: String(feedback._id),
      vendorId: String(feedback.vendorId || ''),
      trustScore: feedback.trustScore,
      trustLevel: feedback.trustLevel,
      rating: feedback.rating ?? '',
      tags: (feedback.tags || []).join('|'),
      createdAt: feedback.createdAt ? new Date(feedback.createdAt).toISOString() : '',
      text: feedback.text,
    }));

    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback-report.csv"');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

// Sends a test email to the configured SMTP_FROM address to validate SMTP settings.
adminRouter.post('/test-email', async (req, res, next) => {
  try {
    const fromAddr = process.env.SMTP_FROM;
    if (!fromAddr) {
      return res.status(400).json({ ok: false, error: 'SMTP_FROM is not configured.' });
    }
    const info = await sendEmail({
      to: fromAddr,
      subject: 'TrustLens SMTP test',
      body: 'This is a test email from the TrustLens backend to confirm SMTP settings.',
    });
    res.json({ ok: true, info });
  } catch (err) {
    next(err);
  }
});

module.exports = { adminRouter };
