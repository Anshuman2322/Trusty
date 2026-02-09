const express = require('express');

const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const { submitFeedback } = require('../services/feedbackService');
const { computeVendorPublicProfile } = require('../services/vendorService');

const publicRouter = express.Router();

publicRouter.get('/vendors', async (req, res) => {
  const vendors = await Vendor.find({}).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, vendors });
});

publicRouter.get('/vendor/:vendorId', async (req, res, next) => {
  try {
    const profile = await computeVendorPublicProfile(req.params.vendorId);
    res.json({ ok: true, vendor: profile });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/vendor/:vendorId/feedbacks', async (req, res) => {
  const feedbacks = await Feedback.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, feedbacks });
});

publicRouter.get('/vendor/:vendorId/verify-code/:code', async (req, res) => {
  const { vendorId, code } = req.params;
  const order = await Order.findOne({ vendorId, feedbackCode: code }).lean();
  if (!order) {
    return res.json({ ok: true, valid: false });
  }

  return res.json({
    ok: true,
    valid: true,
    order: {
      orderId: String(order._id),
      productDetails: order.productDetails,
      price: order.price,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
    },
  });
});

publicRouter.post('/vendor/:vendorId/feedbacks', async (req, res, next) => {
  try {
    const result = await submitFeedback({ vendorId: req.params.vendorId, payload: req.body });
    res.status(201).json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

module.exports = { publicRouter };
