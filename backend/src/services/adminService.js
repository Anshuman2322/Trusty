const Feedback = require('../models/Feedback');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const { withMongoReadRetry } = require('./mongoReadRetry');

function computeStatusBadge(avgTrustScore) {
  if (avgTrustScore >= 71) return 'Trusted';
  if (avgTrustScore >= 40) return 'Medium';
  return 'Risky';
}

async function computeAdminOverview() {
  return withMongoReadRetry('admin overview', async () => {
    const [vendorCount, feedbackCount, orderCount, avgAgg] = await Promise.all([
      Vendor.countDocuments({}).read('secondaryPreferred'),
      Feedback.countDocuments({}).read('secondaryPreferred'),
      Order.countDocuments({}).read('secondaryPreferred'),
      Feedback.aggregate([{ $group: { _id: null, avgTrust: { $avg: '$trustScore' } } }]).option({
        readPreference: 'secondaryPreferred',
      }),
    ]);

    const averageTrustScore = avgAgg.length ? Math.round(avgAgg[0].avgTrust) : 0;

    return {
      vendorCount,
      orderCount,
      feedbackCount,
      averageTrustScore,
    };
  });
}

async function listAdminVendors() {
  return withMongoReadRetry('admin vendors', async () => {
    const [vendors, feedbackAgg, orderAgg] = await Promise.all([
      Vendor.find({}).sort({ createdAt: -1 }).read('secondaryPreferred').lean(),
      Feedback.aggregate([
        {
          $group: {
            _id: '$vendorId',
            avgTrust: { $avg: '$trustScore' },
            totalFeedbacks: { $sum: 1 },
          },
        },
      ]).option({ readPreference: 'secondaryPreferred' }),
      Order.aggregate([
        {
          $group: {
            _id: '$vendorId',
            ordersCount: { $sum: 1 },
          },
        },
      ]).option({ readPreference: 'secondaryPreferred' }),
    ]);

    const feedbackByVendor = new Map(feedbackAgg.map((item) => [String(item._id), item]));
    const ordersByVendor = new Map(orderAgg.map((item) => [String(item._id), item.ordersCount]));

    return vendors.map((vendor) => {
      const feedback = feedbackByVendor.get(String(vendor._id));
      const averageTrustScore = feedback ? Math.round(feedback.avgTrust) : 0;
      const totalFeedbacks = feedback ? feedback.totalFeedbacks : 0;

      return {
        vendorId: String(vendor._id),
        name: vendor.name,
        averageTrustScore,
        totalFeedbacks,
        statusBadge: computeStatusBadge(averageTrustScore),
        contactEmail: vendor.contactEmail || vendor.email || null,
        joinedAt: vendor.createdAt ? vendor.createdAt.toISOString() : null,
        ordersCount: ordersByVendor.get(String(vendor._id)) || 0,
      };
    });
  });
}

async function computeAlerts() {
  return withMongoReadRetry('admin alerts', async () => {
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000);

    const alerts = [];

    const [deviceAgg, vendorAgg, fastAgg] = await Promise.all([
      Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        { $group: { _id: '$deviceHash', count: { $sum: 1 }, vendors: { $addToSet: '$vendorId' } } },
        { $match: { count: { $gte: 3 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).option({ readPreference: 'secondaryPreferred' }),
      Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        { $group: { _id: '$vendorId', count: { $sum: 1 } } },
        { $match: { count: { $gte: 8 } } },
        { $sort: { count: -1 } },
      ]).option({ readPreference: 'secondaryPreferred' }),
      Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h }, typingTimeMs: { $gt: 0, $lt: 1500 } } },
        { $group: { _id: '$vendorId', count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
      ]).option({ readPreference: 'secondaryPreferred' }),
    ]);

    for (const d of deviceAgg) {
      alerts.push({
        severity: d.count >= 6 ? 'High' : 'Medium',
        type: 'DEVICE_REPETITION',
        message: `Same device hash submitted ${d.count} feedback(s) in last 24h`,
        evidence: { deviceHash: d._id, vendorCount: d.vendors.length },
      });
    }

    for (const v of vendorAgg) {
      alerts.push({
        severity: v.count >= 15 ? 'High' : 'Medium',
        type: 'VENDOR_SPIKE',
        message: `High feedback volume for a vendor (${v.count} in last 24h)`,
        evidence: { vendorId: String(v._id) },
      });
    }

    for (const f of fastAgg) {
      alerts.push({
        severity: 'Medium',
        type: 'FAST_TYPING_CLUSTER',
        message: 'Multiple feedbacks submitted extremely fast for a vendor',
        evidence: { vendorId: String(f._id), count: f.count },
      });
    }

    return alerts;
  });
}

module.exports = { computeAdminOverview, listAdminVendors, computeAlerts };
