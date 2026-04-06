const Feedback = require('../models/Feedback');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const User = require('../models/User');
const AdminSettings = require('../models/AdminSettings');
const AdminActionLog = require('../models/AdminActionLog');
const { withMongoReadRetry } = require('./mongoReadRetry');

async function safeRead(label, work, fallback) {
  try {
    return await work();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Admin service fallback for ${label}:`, error?.message || error);
    return fallback;
  }
}

const DEFAULT_SETTINGS = {
  trustThresholds: {
    trustedMin: 71,
    mediumMin: 40,
  },
  fraudSensitivity: 'MEDIUM',
  alerts: {
    repeatedDeviceMin: 3,
    networkReviewMin: 3,
    duplicateClusterMin: 2,
    vendorSpikeMin: 8,
  },
};

function toVendorStatus(avgTrustScore, isTerminated) {
  if (isTerminated) return 'Terminated';
  if (avgTrustScore >= 71) return 'Trusted';
  if (avgTrustScore >= 40) return 'Medium';
  return 'Risky';
}

function normalizeSeverity(value) {
  const level = String(value || '').toUpperCase();
  if (level === 'HIGH' || level === 'MEDIUM' || level === 'LOW') return level;
  return 'MEDIUM';
}

function toSignalScore({ lowTrustCount, duplicateCount, suspiciousTagsCount, fastTypingCount }) {
  return Math.min(100, lowTrustCount * 5 + duplicateCount * 8 + suspiciousTagsCount * 4 + fastTypingCount * 3);
}

function normalizeCategoryForProfileView(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Other';
  if (raw === 'Home Goods') return 'Retail';
  if (raw === 'Food & Restaurant') return 'Food';
  return raw;
}

async function getAdminSettings() {
  return withMongoReadRetry('admin settings', async () => {
    const doc = await AdminSettings.findOne({ key: 'global' }).lean();
    if (!doc) {
      return {
        key: 'global',
        ...DEFAULT_SETTINGS,
        updatedAt: null,
      };
    }
    return {
      key: doc.key,
      trustThresholds: doc.trustThresholds || DEFAULT_SETTINGS.trustThresholds,
      fraudSensitivity: doc.fraudSensitivity || DEFAULT_SETTINGS.fraudSensitivity,
      alerts: doc.alerts || DEFAULT_SETTINGS.alerts,
      updatedAt: doc.updatedAt,
    };
  });
}

async function updateAdminSettings({ payload, actorUserId }) {
  const trustThresholds = payload?.trustThresholds || {};
  const alerts = payload?.alerts || {};
  const fraudSensitivity = String(payload?.fraudSensitivity || '').toUpperCase();

  const trustedMin = Number.isFinite(Number(trustThresholds.trustedMin))
    ? Math.max(0, Math.min(100, Math.round(Number(trustThresholds.trustedMin))))
    : DEFAULT_SETTINGS.trustThresholds.trustedMin;
  const mediumMin = Number.isFinite(Number(trustThresholds.mediumMin))
    ? Math.max(0, Math.min(100, Math.round(Number(trustThresholds.mediumMin))))
    : DEFAULT_SETTINGS.trustThresholds.mediumMin;

  const normalized = {
    trustThresholds: {
      trustedMin,
      mediumMin: Math.min(mediumMin, trustedMin),
    },
    fraudSensitivity:
      fraudSensitivity === 'HIGH' || fraudSensitivity === 'LOW' || fraudSensitivity === 'MEDIUM'
        ? fraudSensitivity
        : DEFAULT_SETTINGS.fraudSensitivity,
    alerts: {
      repeatedDeviceMin: Number.isFinite(Number(alerts.repeatedDeviceMin))
        ? Math.max(2, Math.min(20, Math.round(Number(alerts.repeatedDeviceMin))))
        : DEFAULT_SETTINGS.alerts.repeatedDeviceMin,
      networkReviewMin: Number.isFinite(Number(alerts.networkReviewMin))
        ? Math.max(2, Math.min(20, Math.round(Number(alerts.networkReviewMin))))
        : DEFAULT_SETTINGS.alerts.networkReviewMin,
      duplicateClusterMin: Number.isFinite(Number(alerts.duplicateClusterMin))
        ? Math.max(2, Math.min(20, Math.round(Number(alerts.duplicateClusterMin))))
        : DEFAULT_SETTINGS.alerts.duplicateClusterMin,
      vendorSpikeMin: Number.isFinite(Number(alerts.vendorSpikeMin))
        ? Math.max(2, Math.min(100, Math.round(Number(alerts.vendorSpikeMin))))
        : DEFAULT_SETTINGS.alerts.vendorSpikeMin,
    },
  };

  const doc = await AdminSettings.findOneAndUpdate(
    { key: 'global' },
    {
      $set: {
        key: 'global',
        ...normalized,
        updatedBy: actorUserId || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    key: doc.key,
    trustThresholds: doc.trustThresholds,
    fraudSensitivity: doc.fraudSensitivity,
    alerts: doc.alerts,
    updatedAt: doc.updatedAt,
  };
}

async function computeAdminOverview() {
  return withMongoReadRetry('admin overview', async () => {
    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const since14d = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const [vendorCount, feedbackCount, orderCount, avgAgg, suspiciousFeedbackCount, repeatedDeviceCount, duplicateClusterRows, weeklyTrend] =
      await Promise.all([
        safeRead('overview.vendorCount', () => Vendor.countDocuments({}).read('secondaryPreferred'), 0),
        safeRead('overview.feedbackCount', () => Feedback.countDocuments({}).read('secondaryPreferred'), 0),
        safeRead('overview.orderCount', () => Order.countDocuments({}).read('secondaryPreferred'), 0),
        safeRead('overview.avgAgg', () => Feedback.aggregate([{ $group: { _id: null, avgTrust: { $avg: '$trustScore' } } }]).option({
          readPreference: 'secondaryPreferred',
        }), []),
        safeRead('overview.suspiciousFeedbackCount', () => Feedback.countDocuments({
          $or: [{ trustLevel: 'LOW' }, { tags: { $in: ['duplicate', 'suspicious', 'ai-flag'] } }],
        }).read('secondaryPreferred'), 0),
        safeRead('overview.repeatedDeviceCount', () => Feedback.aggregate([
          { $match: { deviceHash: { $exists: true, $ne: null, $ne: '' } } },
          { $group: { _id: '$deviceHash', count: { $sum: 1 } } },
          { $match: { count: { $gte: 2 } } },
          { $count: 'total' },
        ]).option({ readPreference: 'secondaryPreferred' }), []),
        safeRead('overview.duplicateClusterRows', () => Feedback.aggregate([
          { $match: { textHash: { $exists: true, $ne: null, $ne: '' } } },
          { $group: { _id: '$textHash', count: { $sum: 1 } } },
          { $match: { count: { $gte: 2 } } },
          { $project: { duplicateCount: { $subtract: ['$count', 1] } } },
        ]).option({ readPreference: 'secondaryPreferred' }), []),
        safeRead('overview.weeklyTrend', () => Feedback.aggregate([
          { $match: { createdAt: { $gte: since14d, $type: 'date' } } },
          {
            $group: {
              _id: {
                y: { $year: '$createdAt' },
                m: { $month: '$createdAt' },
                d: { $dayOfMonth: '$createdAt' },
              },
              avgTrust: { $avg: '$trustScore' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
        ]).option({ readPreference: 'secondaryPreferred' }), []),
      ]);

    const averageTrustScore = avgAgg.length ? Math.round(avgAgg[0].avgTrust) : 0;
    const repeatedDeviceCountValue = repeatedDeviceCount.length ? repeatedDeviceCount[0].total : 0;
    const duplicateReviewsDetected = duplicateClusterRows.reduce((sum, item) => sum + Number(item.duplicateCount || 0), 0);

    const last7 = weeklyTrend.filter((item) => {
      const dt = new Date(item._id.y, item._id.m - 1, item._id.d);
      return dt >= since7d;
    });
    const previous7 = weeklyTrend.filter((item) => {
      const dt = new Date(item._id.y, item._id.m - 1, item._id.d);
      return dt < since7d;
    });

    const avgLast7 = last7.length ? last7.reduce((sum, item) => sum + Number(item.avgTrust || 0), 0) / last7.length : 0;
    const avgPrevious7 = previous7.length
      ? previous7.reduce((sum, item) => sum + Number(item.avgTrust || 0), 0) / previous7.length
      : 0;

    const weeklyTrendChange = Number((avgLast7 - avgPrevious7).toFixed(2));

    const topAlerts = await safeRead('overview.topAlerts', () => computeAlerts({ limitPerType: 5 }), []);
    const highAlerts = topAlerts.filter((item) => item.severity === 'HIGH').length;
    const mediumAlerts = topAlerts.filter((item) => item.severity === 'MEDIUM').length;
    const lowAlerts = topAlerts.filter((item) => item.severity === 'LOW').length;

    const riskyVendorsAgg = await safeRead(
      'overview.riskyVendorsAgg',
      () =>
        Feedback.aggregate([
          { $group: { _id: '$vendorId', avgTrust: { $avg: '$trustScore' } } },
          { $match: { avgTrust: { $lt: 40 } } },
          { $count: 'total' },
        ]).option({ readPreference: 'secondaryPreferred' }),
      []
    );

    return {
      vendorCount,
      orderCount,
      feedbackCount,
      averageTrustScore,
      suspiciousFeedbackCount,
      repeatedDeviceCount: repeatedDeviceCountValue,
      duplicateReviewsDetected,
      weeklyTrendChange,
      riskyVendorCount: riskyVendorsAgg.length ? riskyVendorsAgg[0].total : 0,
      alertsSummary: {
        total: topAlerts.length,
        high: highAlerts,
        medium: mediumAlerts,
        low: lowAlerts,
      },
    };
  });
}

async function listAdminVendors() {
  return withMongoReadRetry('admin vendors', async () => {
    const [vendors, feedbackAgg, orderAgg, suspiciousAgg] = await Promise.all([
      safeRead('vendors.vendors', () => Vendor.find({}).sort({ createdAt: -1 }).read('secondaryPreferred').lean(), []),
      safeRead('vendors.feedbackAgg', () => Feedback.aggregate([
        {
          $group: {
            _id: '$vendorId',
            avgTrust: { $avg: '$trustScore' },
            totalFeedbacks: { $sum: 1 },
          },
        },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('vendors.orderAgg', () => Order.aggregate([
        {
          $group: {
            _id: '$vendorId',
            ordersCount: { $sum: 1 },
          },
        },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('vendors.suspiciousAgg', () => Feedback.aggregate([
        {
          $match: {
            $or: [
              { trustLevel: 'LOW' },
              { tags: { $in: ['duplicate', 'suspicious', 'ai-flag'] } },
              { typingTimeMs: { $gt: 0, $lt: 1200 } },
            ],
          },
        },
        { $group: { _id: '$vendorId', suspiciousCount: { $sum: 1 } } },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
    ]);

    const feedbackByVendor = new Map(feedbackAgg.map((item) => [String(item._id), item]));
    const ordersByVendor = new Map(orderAgg.map((item) => [String(item._id), item.ordersCount]));
    const suspiciousByVendor = new Map(
      suspiciousAgg.map((item) => [String(item._id), Number(item.suspiciousCount || 0)])
    );

    return vendors.map((vendor) => {
      const feedback = feedbackByVendor.get(String(vendor._id));
      const averageTrustScore = feedback ? Math.round(feedback.avgTrust) : 0;
      const totalFeedbacks = feedback ? feedback.totalFeedbacks : 0;

      return {
        vendorId: String(vendor._id),
        name: vendor.name,
        category: vendor.category || 'Uncategorized',
        averageTrustScore,
        totalFeedbacks,
        statusBadge: toVendorStatus(averageTrustScore, vendor.isTerminated),
        contactEmail: vendor.contactEmail || vendor.email || null,
        joinedAt: vendor.createdAt ? vendor.createdAt.toISOString() : null,
        ordersCount: ordersByVendor.get(String(vendor._id)) || 0,
        suspiciousActivityCount: suspiciousByVendor.get(String(vendor._id)) || 0,
        isFlagged: Boolean(vendor.isFlagged),
        isTerminated: Boolean(vendor.isTerminated),
      };
    });
  });
}

async function computeAlerts({ limitPerType = 20 } = {}) {
  return withMongoReadRetry('admin alerts', async () => {
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000);

    const vendors = await safeRead('alerts.vendors', () => Vendor.find({}).select({ _id: 1, name: 1 }).lean(), []);
    const vendorNameMap = new Map(vendors.map((item) => [String(item._id), item.name]));

    const alerts = [];

    const [deviceAgg, ipAgg, duplicateAgg, vendorAgg, fastAgg] = await Promise.all([
      safeRead('alerts.deviceAgg', () => Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h }, deviceHash: { $exists: true, $ne: '' } } },
        { $group: { _id: '$deviceHash', count: { $sum: 1 }, vendors: { $addToSet: '$vendorId' } } },
        { $match: { count: { $gte: 3 } } },
        { $sort: { count: -1 } },
        { $limit: limitPerType },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('alerts.ipAgg', () => Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h }, ipHash: { $exists: true, $ne: '' } } },
        { $group: { _id: '$ipHash', count: { $sum: 1 }, vendors: { $addToSet: '$vendorId' } } },
        { $match: { count: { $gte: 3 }, 'vendors.1': { $exists: true } } },
        { $sort: { count: -1 } },
        { $limit: limitPerType },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('alerts.duplicateAgg', () => Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h }, textHash: { $exists: true, $ne: '' } } },
        { $group: { _id: '$textHash', count: { $sum: 1 }, vendors: { $addToSet: '$vendorId' } } },
        { $match: { count: { $gte: 2 } } },
        { $sort: { count: -1 } },
        { $limit: limitPerType },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('alerts.vendorAgg', () => Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        { $group: { _id: '$vendorId', count: { $sum: 1 } } },
        { $match: { count: { $gte: 8 } } },
        { $sort: { count: -1 } },
        { $limit: limitPerType },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('alerts.fastAgg', () => Feedback.aggregate([
        { $match: { createdAt: { $gte: since24h }, typingTimeMs: { $gt: 0, $lt: 1500 } } },
        { $group: { _id: '$vendorId', count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
        { $sort: { count: -1 } },
        { $limit: limitPerType },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
    ]);

    for (const d of deviceAgg) {
      alerts.push({
        id: `device:${String(d._id)}`,
        severity: normalizeSeverity(d.count >= 6 ? 'HIGH' : 'MEDIUM'),
        type: 'REPEATED_DEVICE_ACTIVITY',
        detectedAt: new Date().toISOString(),
        description: `Same device hash submitted ${d.count} feedback(s) in last 24h`,
        relatedVendor: d.vendors.length === 1 ? vendorNameMap.get(String(d.vendors[0])) || null : 'Multiple vendors',
        evidence: { deviceHash: d._id, vendorCount: d.vendors.length },
      });
    }

    for (const ip of ipAgg) {
      alerts.push({
        id: `ip:${String(ip._id)}`,
        severity: normalizeSeverity(ip.count >= 7 ? 'HIGH' : 'MEDIUM'),
        type: 'MULTIPLE_REVIEWS_SAME_NETWORK',
        detectedAt: new Date().toISOString(),
        description: `Network hash generated ${ip.count} cross-vendor feedback(s) in last 24h`,
        relatedVendor: 'Multiple vendors',
        evidence: { ipHash: ip._id, vendorCount: ip.vendors.length },
      });
    }

    for (const dup of duplicateAgg) {
      alerts.push({
        id: `duplicate:${String(dup._id)}`,
        severity: normalizeSeverity(dup.count >= 4 ? 'HIGH' : 'MEDIUM'),
        type: 'DUPLICATE_CONTENT_CLUSTER',
        detectedAt: new Date().toISOString(),
        description: `Duplicate content cluster detected (${dup.count} similar submissions)`,
        relatedVendor: dup.vendors.length === 1 ? vendorNameMap.get(String(dup.vendors[0])) || null : 'Multiple vendors',
        evidence: { textHash: dup._id, vendorCount: dup.vendors.length },
      });
    }

    for (const v of vendorAgg) {
      alerts.push({
        id: `spike:${String(v._id)}`,
        severity: normalizeSeverity(v.count >= 15 ? 'HIGH' : 'MEDIUM'),
        type: 'SUSPICIOUS_BEHAVIOR_PATTERN',
        detectedAt: new Date().toISOString(),
        description: `High feedback volume for vendor in 24h (${v.count})`,
        relatedVendor: vendorNameMap.get(String(v._id)) || String(v._id),
        evidence: { vendorId: String(v._id), count: v.count },
      });
    }

    for (const f of fastAgg) {
      alerts.push({
        id: `typing:${String(f._id)}`,
        severity: 'MEDIUM',
        type: 'SUSPICIOUS_BEHAVIOR_PATTERN',
        detectedAt: new Date().toISOString(),
        description: `Fast typing cluster detected for vendor (${f.count} feedbacks under 1.5s)`,
        relatedVendor: vendorNameMap.get(String(f._id)) || String(f._id),
        evidence: { vendorId: String(f._id), count: f.count },
      });
    }

    return alerts.sort((a, b) => {
      const weight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (weight[b.severity] || 0) - (weight[a.severity] || 0);
    });
  });
}

async function getVendorDetail(vendorId) {
  return withMongoReadRetry('admin vendor detail', async () => {
    const [vendor, feedbacks, orders] = await Promise.all([
      Vendor.findById(vendorId).lean(),
      Feedback.find({ vendorId }).sort({ createdAt: -1 }).read('secondaryPreferred').lean(),
      Order.find({ vendorId }).sort({ createdAt: -1 }).read('secondaryPreferred').lean(),
    ]);

    if (!vendor) return null;

    const trustTrendMap = new Map();
    const feedbackDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const deviceMap = new Map();
    const duplicateMap = new Map();
    const locationMap = new Map();

    let lowTrustCount = 0;
    let suspiciousTagsCount = 0;
    let fastTypingCount = 0;

    for (const feedback of feedbacks) {
      const dayKey = new Date(feedback.createdAt).toISOString().slice(0, 10);
      const current = trustTrendMap.get(dayKey) || { total: 0, count: 0 };
      current.total += Number(feedback.trustScore || 0);
      current.count += 1;
      trustTrendMap.set(dayKey, current);

      if (feedback.trustLevel && feedbackDistribution[feedback.trustLevel] !== undefined) {
        feedbackDistribution[feedback.trustLevel] += 1;
      }

      if (feedback.trustLevel === 'LOW') lowTrustCount += 1;
      if ((feedback.tags || []).some((tag) => ['suspicious', 'duplicate', 'ai-flag'].includes(String(tag)))) {
        suspiciousTagsCount += 1;
      }
      if (Number(feedback.typingTimeMs || 0) > 0 && Number(feedback.typingTimeMs || 0) < 1500) {
        fastTypingCount += 1;
      }

      if (feedback.deviceHash) {
        deviceMap.set(feedback.deviceHash, (deviceMap.get(feedback.deviceHash) || 0) + 1);
      }
      if (feedback.textHash) {
        duplicateMap.set(feedback.textHash, (duplicateMap.get(feedback.textHash) || 0) + 1);
      }

      const locationKey = `${feedback.ipCountry || 'Unknown'} / ${feedback.ipCity || 'Unknown'}`;
      locationMap.set(locationKey, (locationMap.get(locationKey) || 0) + 1);
    }

    const trustTrend = Array.from(trustTrendMap.entries())
      .map(([date, stat]) => ({
        date,
        averageTrust: Number((stat.total / Math.max(stat.count, 1)).toFixed(2)),
        volume: stat.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const duplicateCount = Array.from(duplicateMap.values()).filter((count) => count > 1).length;

    const deviceClusters = Array.from(deviceMap.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hash, count]) => ({ hash, count }));

    const duplicateClusters = Array.from(duplicateMap.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hash, count]) => ({ hash, count }));

    const locationClusters = Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([location, count]) => ({ location, count }));

    const averageTrustScore = feedbacks.length
      ? Math.round(feedbacks.reduce((sum, item) => sum + Number(item.trustScore || 0), 0) / feedbacks.length)
      : 0;

    return {
      vendor: {
        vendorId: String(vendor._id),
        name: vendor.name,
        email: vendor.contactEmail || vendor.email || null,
        isTerminated: Boolean(vendor.isTerminated),
        isFlagged: Boolean(vendor.isFlagged),
        statusBadge: toVendorStatus(averageTrustScore, vendor.isTerminated),
        averageTrustScore,
      },
      totals: {
        orders: orders.length,
        feedbacks: feedbacks.length,
        lowTrustCount,
      },
      trustTrend,
      feedbackDistribution,
      riskSignals: {
        lowTrustCount,
        duplicateCount,
        suspiciousTagsCount,
        fastTypingCount,
        signalScore: toSignalScore({ lowTrustCount, duplicateCount, suspiciousTagsCount, fastTypingCount }),
      },
      deviceClusters,
      duplicateClusters,
      locationClusters,
    };
  });
}

async function getVendorProfile(vendorId) {
  return withMongoReadRetry('admin vendor profile', async () => {
    const [vendor, user, feedbackAgg, lowTrustCount, totalOrders] = await Promise.all([
      Vendor.findById(vendorId).lean(),
      User.findOne({ vendorId, role: 'VENDOR' })
        .select({ _id: 1, email: 1, createdAt: 1, lastLoginAt: 1 })
        .lean(),
      Feedback.aggregate([
        { $match: { vendorId } },
        {
          $group: {
            _id: '$vendorId',
            avgTrust: { $avg: '$trustScore' },
            totalFeedbacks: { $sum: 1 },
          },
        },
      ]).option({ readPreference: 'secondaryPreferred' }),
      Feedback.countDocuments({ vendorId, trustLevel: 'LOW' }).read('secondaryPreferred'),
      Order.countDocuments({ vendorId }).read('secondaryPreferred'),
    ]);

    if (!vendor) return null;

    const feedbackStat = feedbackAgg?.[0] || null;
    const averageTrustScore = feedbackStat ? Math.round(Number(feedbackStat.avgTrust || 0)) : 0;
    const totalFeedbacks = feedbackStat ? Number(feedbackStat.totalFeedbacks || 0) : 0;

    return {
      vendorId: String(vendor._id),
      status: {
        isFlagged: Boolean(vendor.isFlagged),
        isTerminated: Boolean(vendor.isTerminated),
        statusBadge: toVendorStatus(averageTrustScore, vendor.isTerminated),
      },
      profile: {
        businessName: String(vendor.name || ''),
        businessEmail: String(vendor.email || ''),
        businessCategory: normalizeCategoryForProfileView(vendor.category),
        businessWebsite: String(vendor.website || ''),
        businessId: String(vendor.gstBusinessId || ''),
        country: String(vendor.country || ''),
        state: String(vendor.state || ''),
        city: String(vendor.city || ''),
        contactPersonName: String(vendor.contactName || ''),
        phoneNumber: String(vendor.phone || ''),
        supportEmail: String(vendor.supportEmail || vendor.contactEmail || ''),
        description: String(vendor.description || ''),
        additionalInfoHeading: String(vendor.additionalInfoHeading || ''),
        additionalInfoResult: String(vendor.additionalInfoResult || ''),
        publicVisibility: vendor.profileVisibility || {},
      },
      account: {
        loginEmail: user?.email || String(vendor.email || ''),
        vendorCreatedAt: vendor.createdAt || null,
        vendorUpdatedAt: vendor.updatedAt || null,
        userCreatedAt: user?.createdAt || null,
        lastLoginAt: user?.lastLoginAt || null,
      },
      metrics: {
        averageTrustScore,
        totalFeedbacks,
        lowTrustCount: Number(lowTrustCount || 0),
        totalOrders: Number(totalOrders || 0),
      },
    };
  });
}

async function getAnalyticsSnapshot() {
  return withMongoReadRetry('admin analytics', async () => {
    const [trendRows, distributionRows, vendorPerfRows] = await Promise.all([
      safeRead('analytics.trendRows', () => Feedback.aggregate([
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
              d: { $dayOfMonth: '$createdAt' },
            },
            averageTrust: { $avg: '$trustScore' },
            totalFeedbacks: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('analytics.distributionRows', () => Feedback.aggregate([
        { $group: { _id: '$trustLevel', count: { $sum: 1 } } },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('analytics.vendorPerfRows', () => Feedback.aggregate([
        {
          $group: {
            _id: '$vendorId',
            averageTrust: { $avg: '$trustScore' },
            totalFeedbacks: { $sum: 1 },
          },
        },
        { $sort: { averageTrust: -1 } },
        { $limit: 12 },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
    ]);

    const vendors = await safeRead(
      'analytics.vendors',
      () =>
        Vendor.find({ _id: { $in: vendorPerfRows.map((item) => item._id) } })
          .select({ _id: 1, name: 1, category: 1 })
          .lean(),
      []
    );
    const vendorMap = new Map(vendors.map((item) => [String(item._id), item]));

    return {
      trustScoreTrend: trendRows.map((row) => ({
        date: `${row._id.y}-${String(row._id.m).padStart(2, '0')}-${String(row._id.d).padStart(2, '0')}`,
        averageTrust: Number(Number(row.averageTrust || 0).toFixed(2)),
        totalFeedbacks: row.totalFeedbacks,
      })),
      feedbackDistribution: distributionRows.map((row) => ({
        level: row._id || 'UNKNOWN',
        count: row.count,
      })),
      vendorPerformance: vendorPerfRows.map((row) => ({
        vendorId: String(row._id),
        vendorName: vendorMap.get(String(row._id))?.name || String(row._id),
        category: vendorMap.get(String(row._id))?.category || 'Uncategorized',
        averageTrust: Number(Number(row.averageTrust || 0).toFixed(2)),
        totalFeedbacks: row.totalFeedbacks,
      })),
    };
  });
}

async function getPatternClusters() {
  return withMongoReadRetry('admin patterns', async () => {
    const [similarFeedbackClusters, deviceClusters, locationClusters] = await Promise.all([
      safeRead('patterns.similarFeedbackClusters', () => Feedback.aggregate([
        { $match: { textHash: { $exists: true, $ne: '' } } },
        { $group: { _id: '$textHash', count: { $sum: 1 }, vendors: { $addToSet: '$vendorId' } } },
        { $match: { count: { $gte: 2 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('patterns.deviceClusters', () => Feedback.aggregate([
        { $match: { deviceHash: { $exists: true, $ne: '' } } },
        { $group: { _id: '$deviceHash', count: { $sum: 1 }, vendors: { $addToSet: '$vendorId' } } },
        { $match: { count: { $gte: 2 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
      safeRead('patterns.locationClusters', () => Feedback.aggregate([
        {
          $group: {
            _id: { country: '$ipCountry', city: '$ipCity' },
            count: { $sum: 1 },
            vendors: { $addToSet: '$vendorId' },
          },
        },
        { $match: { count: { $gte: 2 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]).option({ readPreference: 'secondaryPreferred' }), []),
    ]);

    return {
      similarFeedbackClusters: similarFeedbackClusters.map((item) => ({
        clusterId: String(item._id),
        volume: item.count,
        vendorsInvolved: item.vendors.length,
      })),
      deviceClusters: deviceClusters.map((item) => ({
        clusterId: String(item._id),
        volume: item.count,
        vendorsInvolved: item.vendors.length,
      })),
      locationClusters: locationClusters.map((item) => ({
        clusterId: `${item._id.country || 'Unknown'} / ${item._id.city || 'Unknown'}`,
        volume: item.count,
        vendorsInvolved: item.vendors.length,
      })),
    };
  });
}

async function logAdminAction({ actionType, actorUserId, actorEmail, vendorId, reason, metadata }) {
  await AdminActionLog.create({
    actionType,
    actorUserId,
    actorEmail,
    vendorId,
    reason: reason || null,
    metadata: metadata || {},
  });
}

async function flagVendor({ vendorId, actorUserId, actorEmail, reason }) {
  const vendor = await Vendor.findByIdAndUpdate(
    vendorId,
    {
      $set: {
        isFlagged: true,
        flaggedAt: new Date(),
        flaggedBy: actorUserId || null,
        flaggedReason: reason ? String(reason).trim().slice(0, 500) : null,
      },
    },
    { new: true }
  ).lean();

  if (!vendor) return null;

  await logAdminAction({
    actionType: 'FLAG_VENDOR',
    actorUserId,
    actorEmail,
    vendorId,
    reason,
  });

  return vendor;
}

async function unflagVendor({ vendorId, actorUserId, actorEmail, reason }) {
  const vendor = await Vendor.findByIdAndUpdate(
    vendorId,
    {
      $set: {
        isFlagged: false,
        flaggedAt: null,
        flaggedBy: null,
        flaggedReason: null,
      },
    },
    { new: true }
  ).lean();

  if (!vendor) return null;

  await logAdminAction({
    actionType: 'UNFLAG_VENDOR',
    actorUserId,
    actorEmail,
    vendorId,
    reason,
  });

  return vendor;
}

async function terminateVendor({ vendorId, actorUserId, actorEmail, reason }) {
  const vendor = await Vendor.findByIdAndUpdate(
    vendorId,
    {
      $set: {
        isTerminated: true,
        terminatedAt: new Date(),
        terminatedBy: actorUserId || null,
        terminationReason: reason ? String(reason).trim().slice(0, 500) : null,
      },
    },
    { new: true }
  ).lean();

  if (!vendor) return null;

  await logAdminAction({
    actionType: 'TERMINATE_VENDOR',
    actorUserId,
    actorEmail,
    vendorId,
    reason,
  });

  return vendor;
}

async function reactivateVendor({ vendorId, actorUserId, actorEmail, reason }) {
  const vendor = await Vendor.findByIdAndUpdate(
    vendorId,
    {
      $set: {
        isTerminated: false,
        terminatedAt: null,
        terminatedBy: null,
        terminationReason: null,
      },
    },
    { new: true }
  ).lean();

  if (!vendor) return null;

  await logAdminAction({
    actionType: 'REACTIVATE_VENDOR',
    actorUserId,
    actorEmail,
    vendorId,
    reason,
  });

  return vendor;
}

async function getActionLogs({ limit = 100 } = {}) {
  return withMongoReadRetry('admin action logs', async () => {
    return AdminActionLog.find({})
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(500, Math.trunc(Number(limit) || 100))))
      .read('secondaryPreferred')
      .lean();
  });
}

module.exports = {
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
  unflagVendor,
  terminateVendor,
  reactivateVendor,
  getActionLogs,
};
