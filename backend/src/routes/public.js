const express = require('express');

const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const { submitFeedback } = require('../services/feedbackService');
const { extractClientIp } = require('../services/ipIntelService');
const { withMongoReadRetry } = require('../services/mongoReadRetry');
const { computeVendorPublicProfile } = require('../services/vendorService');

const publicRouter = express.Router();

const VENDOR_PROFILE_VISIBILITY_DEFAULTS = {
  businessName: true,
  businessCategory: true,
};

function coerceBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const text = String(value || '').trim().toLowerCase();
  if (text === 'true' || text === '1' || text === 'yes' || text === 'on') return true;
  if (text === 'false' || text === '0' || text === 'no' || text === 'off') return false;

  return fallback;
}

function normalizeListVisibility(rawVisibility = {}) {
  const source =
    rawVisibility && typeof rawVisibility === 'object' && !Array.isArray(rawVisibility)
      ? rawVisibility
      : {};

  return {
    businessName: coerceBoolean(source.businessName, VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessName),
    businessCategory: coerceBoolean(
      source.businessCategory,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessCategory
    ),
  };
}

function resolveFeedbackPublicRules(vendor) {
  const advanced = vendor?.settings?.advanced || {};
  return {
    showTrustScorePublicly: coerceBoolean(advanced.showTrustScorePublicly, true),
    showLocationInFeedback: coerceBoolean(advanced.showLocationInFeedback, true),
    enableFeedbackLabels: coerceBoolean(advanced.enableFeedbackLabels, true),
  };
}

function sanitizeFeedbackForPublic(feedback, rules) {
  const item = { ...feedback };

  if (!rules.showTrustScorePublicly) {
    delete item.trustScore;
    delete item.baseTrustScore;
    delete item.finalTrustScore;
    delete item.trustLevel;
    delete item.trustBreakdown;
    delete item.trustBreakdownList;
    delete item.breakdown;
    delete item.explanation;
    delete item.dupAdj;
    delete item.dupReason;
    delete item.typingAdj;
    delete item.typingReason;
    delete item.typingVarianceZ;
  }

  if (!rules.showLocationInFeedback) {
    delete item.ipCountry;
    delete item.ipCountryName;
    delete item.ipRegion;
    delete item.ipState;
    delete item.ipCity;
    delete item.ipTimezone;
    delete item.locationSource;
    delete item.ipRiskLevel;
  }

  if (!rules.enableFeedbackLabels) {
    item.tags = [];
  }

  return item;
}

publicRouter.get('/vendors', async (req, res, next) => {
  try {
    const vendors = await withMongoReadRetry('public vendors', async () =>
      Vendor.find(
        {},
        {
          name: 1,
          category: 1,
          profileVisibility: 1,
        }
      )
        .sort({ createdAt: -1 })
        .lean()
    );

    const sanitized = vendors.map((vendor) => {
      const visibility = normalizeListVisibility(vendor?.profileVisibility || {});
      return {
        _id: vendor._id,
        name: visibility.businessName ? String(vendor?.name || '').trim() || 'Private Vendor' : 'Private Vendor',
        category: visibility.businessCategory ? String(vendor?.category || '').trim() : '',
      };
    });

    res.json({ ok: true, vendors: sanitized });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/vendor/:vendorId', async (req, res, next) => {
  try {
    const profile = await computeVendorPublicProfile(req.params.vendorId);
    res.json({ ok: true, vendor: profile });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/vendor/:vendorId/feedbacks', async (req, res, next) => {
  try {
    const vendor = await withMongoReadRetry('public vendor lookup', async () =>
      Vendor.findById(req.params.vendorId).lean()
    );

    if (!vendor) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Vendor not found' },
      });
    }

    const rules = resolveFeedbackPublicRules(vendor);

    const feedbacks = await withMongoReadRetry('public vendor feedbacks', async () =>
      Feedback.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 }).lean()
    );

    const sanitized = feedbacks.map((feedback) => sanitizeFeedbackForPublic(feedback, rules));
    res.json({ ok: true, feedbacks: sanitized, visibilityRules: rules });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/vendor/:vendorId/verify-code/:code', async (req, res, next) => {
  try {
    const { vendorId, code } = req.params;
    const order = await withMongoReadRetry('feedback code verification', async () =>
      Order.findOne({ vendorId, feedbackCode: code }).lean()
    );
    if (!order) {
      return res.json({ ok: true, valid: false });
    }

    return res.json({
      ok: true,
      valid: true,
      order: {
        orderId: String(order._id),
        customerName: order.customerName,
        country:
          order?.paymentLocation?.country ||
          order?.createdLocation?.country ||
          order?.paymentLocation?.countryCode ||
          order?.createdLocation?.countryCode ||
          '',
        productDetails: order.productDetails,
        price: order.price,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/vendor/:vendorId/feedbacks', async (req, res, next) => {
  try {
    const result = await submitFeedback({
      vendorId: req.params.vendorId,
      payload: req.body,
      requestMeta: { clientIp: extractClientIp(req), headers: req.headers },
    });
    res.status(201).json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

module.exports = { publicRouter };
