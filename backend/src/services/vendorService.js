const crypto = require('crypto');

const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Feedback = require('../models/Feedback');
const { sendEmail } = require('./emailService');

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

async function computeVendorPublicProfile(vendorId) {
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const agg = await Feedback.aggregate([
    { $match: { vendorId: vendor._id } },
    {
      $group: {
        _id: '$vendorId',
        avgTrust: { $avg: '$trustScore' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avgTrustScore = agg.length ? Math.round(agg[0].avgTrust) : 0;
  const totalFeedbacks = agg.length ? agg[0].count : 0;

  return {
    vendorId: String(vendor._id),
    name: vendor.name,
    averageTrustScore: avgTrustScore,
    totalFeedbacks,
    statusBadge: computeStatusBadge(avgTrustScore),
  };
}

async function computeVendorAdminProfile(vendorId) {
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const [publicProfile, ordersCount] = await Promise.all([
    computeVendorPublicProfile(vendorId),
    Order.countDocuments({ vendorId }),
  ]);

  return {
    ...publicProfile,
    contactEmail: vendor.contactEmail || vendor.email || null,
    joinedAt: vendor.createdAt ? vendor.createdAt.toISOString() : null,
    ordersCount,
  };
}

function generateFeedbackCode() {
  return `TL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

async function createOrder({ vendorId, payload }) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const required = ['customerName', 'email', 'phone', 'address', 'productDetails', 'price'];
  for (const k of required) {
    if (payload?.[k] === undefined || payload?.[k] === null || String(payload[k]).trim() === '') {
      throw httpError(400, `Missing field: ${k}`, 'VALIDATION');
    }
  }

  const feedbackCode = generateFeedbackCode();

  const order = await Order.create({
    vendorId,
    customerName: payload.customerName,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    productDetails: payload.productDetails,
    price: Number(payload.price),
    feedbackCode,
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

async function confirmPayment({ vendorId, orderId }) {
  const order = await Order.findOne({ _id: orderId, vendorId });
  if (!order) throw httpError(404, 'Order not found', 'ORDER_NOT_FOUND');
  if (order.paymentStatus === 'PAID') return { order: order.toObject() };

  order.paymentStatus = 'PAID';
  order.locked = true;
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
  const [totalOrders, pendingPayments, deliveredOrders] = await Promise.all([
    Order.countDocuments({ vendorId }),
    Order.countDocuments({ vendorId, paymentStatus: 'PENDING' }),
    Order.countDocuments({ vendorId, deliveryStatus: 'DELIVERED' }),
  ]);

  const profile = await computeVendorPublicProfile(vendorId);
  return {
    totalOrders,
    pendingPayments,
    deliveredOrders,
    averageTrustScore: profile.averageTrustScore,
    totalFeedbackCount: profile.totalFeedbacks,
  };
}

module.exports = {
  computeVendorPublicProfile,
  computeVendorAdminProfile,
  createOrder,
  confirmPayment,
  updateDeliveryStatus,
  getVendorOverview,
};
