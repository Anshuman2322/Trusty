const express = require('express');

const Feedback = require('../models/Feedback');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { withMongoReadRetry } = require('../services/mongoReadRetry');
const { computeAdminOverview, listAdminVendors, computeAlerts } = require('../services/adminService');
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

    const feedbacks = await withMongoReadRetry('admin feedbacks', async () => {
      const query = Feedback.find({}).sort({ createdAt: -1 }).read('secondaryPreferred').lean();
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
