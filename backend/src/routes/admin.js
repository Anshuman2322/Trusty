const express = require('express');

const Vendor = require('../models/Vendor');
const Feedback = require('../models/Feedback');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { computeVendorAdminProfile } = require('../services/vendorService');
const { computeAdminOverview, computeAlerts } = require('../services/adminService');
const { sendEmail } = require('../services/emailService');

const adminRouter = express.Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole('ADMIN'));

adminRouter.get('/overview', async (req, res) => {
  const overview = await computeAdminOverview();
  res.json({ ok: true, overview });
});

adminRouter.get('/vendors', async (req, res, next) => {
  try {
    const vendors = await Vendor.find({}).sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(vendors.map((v) => computeVendorAdminProfile(v._id)));
    res.json({ ok: true, vendors: enriched });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/feedbacks', async (req, res) => {
  const feedbacks = await Feedback.find({}).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, feedbacks });
});

adminRouter.get('/alerts', async (req, res) => {
  const alerts = await computeAlerts();
  res.json({ ok: true, alerts });
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
