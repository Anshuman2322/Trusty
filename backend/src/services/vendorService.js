const crypto = require('crypto');

const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Feedback = require('../models/Feedback');
const { sendEmail } = require('./emailService');
const { inspectClientIp, toLocationSnapshot } = require('./ipIntelService');
const { withMongoReadRetry } = require('./mongoReadRetry');

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function computeStatusBadge(avgTrustScore) {
  if (avgTrustScore >= 71) return 'Trusted';
  if (avgTrustScore >= 40) return 'Medium';
  return 'Risky';
}

async function loadVendorTrustStats(vendorObjectId) {
  const agg = await Feedback.aggregate([
    { $match: { vendorId: vendorObjectId } },
    {
      $group: {
        _id: '$vendorId',
        avgTrust: { $avg: '$trustScore' },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    averageTrustScore: agg.length ? Math.round(agg[0].avgTrust) : 0,
    totalFeedbacks: agg.length ? agg[0].count : 0,
  };
}

async function buildVendorPublicProfile(vendorId) {
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const { averageTrustScore, totalFeedbacks } = await loadVendorTrustStats(vendor._id);

  return {
    vendorId: String(vendor._id),
    name: vendor.name,
    averageTrustScore,
    totalFeedbacks,
    statusBadge: computeStatusBadge(averageTrustScore),
  };
}

async function computeVendorPublicProfile(vendorId) {
  return withMongoReadRetry('vendor public profile', async () => buildVendorPublicProfile(vendorId));
}

async function computeVendorAdminProfile(vendorId) {
  return withMongoReadRetry('vendor admin profile', async () => {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

    const [{ averageTrustScore, totalFeedbacks }, ordersCount] = await Promise.all([
      loadVendorTrustStats(vendor._id),
      Order.countDocuments({ vendorId }),
    ]);

    return {
      vendorId: String(vendor._id),
      name: vendor.name,
      averageTrustScore,
      totalFeedbacks,
      statusBadge: computeStatusBadge(averageTrustScore),
      contactEmail: vendor.contactEmail || vendor.email || null,
      joinedAt: vendor.createdAt ? vendor.createdAt.toISOString() : null,
      ordersCount,
    };
  });
}

function generateFeedbackCode() {
  return `TL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

async function createOrder({ vendorId, payload, requestMeta = {} }) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const required = ['customerName', 'email', 'phone', 'address', 'productDetails', 'price'];
  for (const k of required) {
    if (payload?.[k] === undefined || payload?.[k] === null || String(payload[k]).trim() === '') {
      throw httpError(400, `Missing field: ${k}`, 'VALIDATION');
    }
  }

  const feedbackCode = generateFeedbackCode();
  const requestLocation = await inspectClientIp(requestMeta?.clientIp, { headers: requestMeta?.headers });

  const order = await Order.create({
    vendorId,
    customerName: payload.customerName,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    productDetails: payload.productDetails,
    price: Number(payload.price),
    feedbackCode,
    createdLocation: toLocationSnapshot(requestLocation),
    deliveryHistory: [{ status: 'CREATED', note: 'Order created', at: new Date() }],
  });

  const invoice = await Invoice.create({
    vendorId,
    orderId: order._id,
    amount: order.price,
    status: 'ISSUED',
    invoiceNumber: generateInvoiceNumber(),
  });

  const email = await sendEmail({
    to: order.email,
    subject: `Invoice ${invoice.invoiceNumber} - ${vendor.name}`,
    body: `Hello ${order.customerName}, your invoice amount is ₹${order.price}. This is a demo email.`,
  });
  await Invoice.updateOne({ _id: invoice._id }, { $push: { emails: email } });

  return { order: await Order.findById(order._id).lean(), invoice: await Invoice.findById(invoice._id).lean() };
}

async function confirmPayment({ vendorId, orderId, requestMeta = {} }) {
  const order = await Order.findOne({ _id: orderId, vendorId });
  if (!order) throw httpError(404, 'Order not found', 'ORDER_NOT_FOUND');
  if (order.paymentStatus === 'PAID') return { order: order.toObject() };

  const requestLocation = await inspectClientIp(requestMeta?.clientIp, { headers: requestMeta?.headers });
  order.paymentStatus = 'PAID';
  order.locked = true;
  order.paymentLocation = toLocationSnapshot(requestLocation);
  await order.save();

  const invoice = await Invoice.findOne({ orderId: order._id, vendorId });
  if (invoice) {
    invoice.status = 'PAID';
    const email = await sendEmail({
      to: order.email,
      subject: `Payment confirmed - ${invoice.invoiceNumber}`,
      body: `Payment confirmed for your order. This is a demo email.`,
    });
    invoice.emails.push(email);
    await invoice.save();
  }

  return { order: order.toObject(), invoice: invoice ? invoice.toObject() : null };
}

async function updateDeliveryStatus({ vendorId, orderId, payload }) {
  const order = await Order.findOne({ _id: orderId, vendorId });
  if (!order) throw httpError(404, 'Order not found', 'ORDER_NOT_FOUND');

  const status = String(payload?.status || '').trim();
  if (!status) throw httpError(400, 'status is required', 'VALIDATION');

  order.deliveryStatus = status;
  order.deliveryHistory.push({ status, note: payload?.note, trackingRef: payload?.trackingRef, at: new Date() });
  await order.save();

  const invoice = await Invoice.findOne({ orderId: order._id, vendorId });

  if (payload?.shareTracking && payload?.trackingRef) {
    const email = await sendEmail({
      to: order.email,
      subject: `Tracking update` ,
      body: `Tracking status: ${status}. Tracking reference: ${payload.trackingRef}. This is a demo email.`,
    });
    if (invoice) {
      invoice.emails.push(email);
      await invoice.save();
    }
  }

  if (status === 'DELIVERED') {
    const publicUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    const feedbackLink = `${publicUrl}/public?code=${encodeURIComponent(order.feedbackCode)}&vendor=${encodeURIComponent(
      String(order.vendorId)
    )}`;
    const email = await sendEmail({
      to: order.email,
      subject: 'Delivery successful - feedback requested',
      body: `Your item is delivered. Share feedback: ${feedbackLink} (code: ${order.feedbackCode}). This is a demo email.`,
    });
    if (invoice) {
      invoice.emails.push(email);
      await invoice.save();
    }
  }

  return { order: order.toObject(), invoice: invoice ? invoice.toObject() : null };
}

async function getVendorOverview(vendorId) {
  return withMongoReadRetry('vendor overview', async () => {
    const [profile, totalOrders, pendingPayments, deliveredOrders] = await Promise.all([
      buildVendorPublicProfile(vendorId),
      Order.countDocuments({ vendorId }),
      Order.countDocuments({ vendorId, paymentStatus: 'PENDING' }),
      Order.countDocuments({ vendorId, deliveryStatus: 'DELIVERED' }),
    ]);

    return {
      totalOrders,
      pendingPayments,
      deliveredOrders,
      averageTrustScore: profile.averageTrustScore,
      totalFeedbackCount: profile.totalFeedbacks,
    };
  });
}

module.exports = {
  computeVendorPublicProfile,
  computeVendorAdminProfile,
  createOrder,
  confirmPayment,
  updateDeliveryStatus,
  getVendorOverview,
};
