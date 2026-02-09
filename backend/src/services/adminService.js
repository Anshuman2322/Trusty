const Feedback = require('../models/Feedback');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');

async function computeAdminOverview() {
  const [vendorCount, feedbackCount, orderCount] = await Promise.all([
    Vendor.countDocuments({}),
    Feedback.countDocuments({}),
    Order.countDocuments({}),
  ]);

  const avgAgg = await Feedback.aggregate([{ $group: { _id: null, avgTrust: { $avg: '$trustScore' } } }]);
  const averageTrustScore = avgAgg.length ? Math.round(avgAgg[0].avgTrust) : 0;

  return {
    vendorCount,
    orderCount,
    feedbackCount,
    averageTrustScore,
  };
}

async function computeAlerts() {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);

  const alerts = [];

  // Multiple feedbacks from same device (platform-wide)
  const deviceAgg = await Feedback.aggregate([
    { $match: { createdAt: { $gte: since24h } } },
    { $group: { _id: '$deviceHash', count: { $sum: 1 }, vendors: { $addToSet: '$vendorId' } } },
    { $match: { count: { $gte: 3 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  for (const d of deviceAgg) {
    alerts.push({
      severity: d.count >= 6 ? 'High' : 'Medium',
      type: 'DEVICE_REPETITION',
      message: `Same device hash submitted ${d.count} feedback(s) in last 24h`,
      evidence: { deviceHash: d._id, vendorCount: d.vendors.length },
    });
  }

  // High feedback volume for same vendor
  const vendorAgg = await Feedback.aggregate([
    { $match: { createdAt: { $gte: since24h } } },
    { $group: { _id: '$vendorId', count: { $sum: 1 } } },
    { $match: { count: { $gte: 8 } } },
    { $sort: { count: -1 } },
  ]);
  for (const v of vendorAgg) {
    alerts.push({
      severity: v.count >= 15 ? 'High' : 'Medium',
      type: 'VENDOR_SPIKE',
      message: `High feedback volume for a vendor (${v.count} in last 24h)`,
      evidence: { vendorId: String(v._id) },
    });
  }

  // Suspicious behavior patterns: very fast typing clusters
  const fastAgg = await Feedback.aggregate([
    { $match: { createdAt: { $gte: since24h }, typingTimeMs: { $gt: 0, $lt: 1500 } } },
    { $group: { _id: '$vendorId', count: { $sum: 1 } } },
    { $match: { count: { $gte: 3 } } },
  ]);
  for (const f of fastAgg) {
    alerts.push({
      severity: 'Medium',
      type: 'FAST_TYPING_CLUSTER',
      message: 'Multiple feedbacks submitted extremely fast for a vendor',
      evidence: { vendorId: String(f._id), count: f.count },
    });
  }

  return alerts;
}

module.exports = { computeAdminOverview, computeAlerts };
