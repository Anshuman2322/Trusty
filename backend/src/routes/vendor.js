const express = require('express');

const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const { requireAuth, requireRole, requireVendorParamMatch } = require('../middleware/authMiddleware');
const {
  createOrder,
  confirmPayment,
  updateDeliveryStatus,
  getVendorOverview,
} = require('../services/vendorService');

const vendorRouter = express.Router();

vendorRouter.use(requireAuth);
vendorRouter.use(requireRole('VENDOR'));
vendorRouter.use('/:vendorId', requireVendorParamMatch);

vendorRouter.get('/:vendorId/overview', async (req, res, next) => {
  try {
    const overview = await getVendorOverview(req.params.vendorId);
    res.json({ ok: true, overview });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:vendorId/orders', async (req, res) => {
  const orders = await Order.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, orders });
});

vendorRouter.post('/:vendorId/orders', async (req, res, next) => {
  try {
    const created = await createOrder({ vendorId: req.params.vendorId, payload: req.body });
    res.status(201).json({ ok: true, created });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/orders/:orderId/confirm-payment', async (req, res, next) => {
  try {
    const updated = await confirmPayment({ vendorId: req.params.vendorId, orderId: req.params.orderId });
    res.json({ ok: true, updated });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/orders/:orderId/delivery-status', async (req, res, next) => {
  try {
    const updated = await updateDeliveryStatus({
      vendorId: req.params.vendorId,
      orderId: req.params.orderId,
      payload: req.body,
    });
    res.json({ ok: true, updated });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:vendorId/feedbacks', async (req, res) => {
  const feedbacks = await Feedback.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, feedbacks });
});

module.exports = { vendorRouter };
