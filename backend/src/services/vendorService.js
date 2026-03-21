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

const VENDOR_PROFILE_VISIBILITY_DEFAULTS = {
  businessName: true,
  businessEmail: false,
  businessCategory: true,
  businessWebsite: false,
  businessId: false,
  country: true,
  state: false,
  city: false,
  contactPersonName: false,
  phoneNumber: false,
  supportEmail: false,
  description: false,
  trustScore: true,
};

function coerceBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const text = String(value || '').trim().toLowerCase();
  if (text === 'true' || text === '1' || text === 'yes' || text === 'on') return true;
  if (text === 'false' || text === '0' || text === 'no' || text === 'off') return false;

  return fallback;
}

function normalizeProfileVisibility(rawVisibility = {}) {
  const source =
    rawVisibility && typeof rawVisibility === 'object' && !Array.isArray(rawVisibility)
      ? rawVisibility
      : {};

  return {
    businessName: coerceBoolean(source.businessName, VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessName),
    businessEmail: coerceBoolean(source.businessEmail, VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessEmail),
    businessCategory: coerceBoolean(
      source.businessCategory,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessCategory
    ),
    businessWebsite: coerceBoolean(
      source.businessWebsite,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessWebsite
    ),
    businessId: coerceBoolean(source.businessId, VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessId),
    country: coerceBoolean(source.country, VENDOR_PROFILE_VISIBILITY_DEFAULTS.country),
    state: coerceBoolean(source.state, VENDOR_PROFILE_VISIBILITY_DEFAULTS.state),
    city: coerceBoolean(source.city, VENDOR_PROFILE_VISIBILITY_DEFAULTS.city),
    contactPersonName: coerceBoolean(
      source.contactPersonName,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.contactPersonName
    ),
    phoneNumber: coerceBoolean(source.phoneNumber, VENDOR_PROFILE_VISIBILITY_DEFAULTS.phoneNumber),
    supportEmail: coerceBoolean(source.supportEmail, VENDOR_PROFILE_VISIBILITY_DEFAULTS.supportEmail),
    description: coerceBoolean(source.description, VENDOR_PROFILE_VISIBILITY_DEFAULTS.description),
    trustScore: coerceBoolean(source.trustScore, VENDOR_PROFILE_VISIBILITY_DEFAULTS.trustScore),
  };
}

function toPublicText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function getVisibleField(visibility, key, value) {
  if (!visibility?.[key]) return null;
  return toPublicText(value);
}

function buildVisibleLocation(vendor, visibility) {
  return {
    country: getVisibleField(visibility, 'country', vendor?.country),
    state: getVisibleField(visibility, 'state', vendor?.state),
    city: getVisibleField(visibility, 'city', vendor?.city),
  };
}

async function buildVendorPublicDisplayProfile(vendorId) {
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const { averageTrustScore, totalFeedbacks } = await loadVendorTrustStats(vendor._id);
  const visibility = normalizeProfileVisibility(vendor?.profileVisibility || {});

  const advancedSettings = vendor?.settings?.advanced || {};
  const settings = {
    showTrustScorePublicly: coerceBoolean(advancedSettings.showTrustScorePublicly, true),
    showLocationInFeedback: coerceBoolean(advancedSettings.showLocationInFeedback, true),
    enableFeedbackLabels: coerceBoolean(advancedSettings.enableFeedbackLabels, true),
  };

  const trustVisible = settings.showTrustScorePublicly && visibility.trustScore;
  const publicName = getVisibleField(visibility, 'businessName', vendor?.name) || 'Private Vendor';

  return {
    vendorId: String(vendor._id),
    name: publicName,
    businessCategory: getVisibleField(visibility, 'businessCategory', vendor?.category),
    businessEmail: getVisibleField(visibility, 'businessEmail', vendor?.email || vendor?.contactEmail),
    supportEmail: getVisibleField(
      visibility,
      'supportEmail',
      vendor?.supportEmail || vendor?.contactEmail || vendor?.email
    ),
    phoneNumber: getVisibleField(visibility, 'phoneNumber', vendor?.phone),
    businessWebsite: getVisibleField(visibility, 'businessWebsite', vendor?.website),
    businessId: getVisibleField(visibility, 'businessId', vendor?.gstBusinessId),
    contactPersonName: getVisibleField(visibility, 'contactPersonName', vendor?.contactName),
    description: getVisibleField(visibility, 'description', vendor?.description),
    location: buildVisibleLocation(vendor, visibility),
    averageTrustScore: trustVisible ? averageTrustScore : null,
    totalFeedbacks,
    statusBadge: trustVisible ? computeStatusBadge(averageTrustScore) : 'Private',
    visibility,
    settings,
  };
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
  return withMongoReadRetry('vendor public profile', async () =>
    buildVendorPublicDisplayProfile(vendorId)
  );
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
