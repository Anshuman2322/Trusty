const mongoose = require('mongoose');

const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');

const { sha256Hex, generateTxRef } = require('./cryptoService');
const { inspectClientIp } = require('./ipIntelService');
const { upsertAndSearch } = require('./embeddingService');
const {
  clamp,
  normalizeTextForHash,
  scoreTokenVerification,
  scorePaymentProof,
  scoreAiBehavior,
  scoreDevicePattern,
  scoreIpPattern,
  scoreContextDepth,
  computeTrustLevel,
  trustBreakdownToLegacyList,
  computeDuplicateAdjustment,
  computeTypingVarianceAdjustment,
} = require('./trustScoringService');

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

const COUNTRY_CODE_ALIASES = {
  gb: ['united kingdom', 'uk', 'great britain', 'britain'],
  in: ['india'],
  us: ['united states', 'united states of america', 'usa'],
};

function matchCountryCandidate(candidate, ipCountryCode, ipCountryName) {
  const normalizedCandidate = String(candidate || '').trim().toLowerCase();
  if (!normalizedCandidate) return false;

  if (ipCountryCode && (normalizedCandidate === ipCountryCode || normalizedCandidate.includes(ipCountryCode))) {
    return true;
  }

  if (ipCountryName && normalizedCandidate.includes(ipCountryName)) {
    return true;
  }

  return (COUNTRY_CODE_ALIASES[ipCountryCode] || []).some((alias) => normalizedCandidate.includes(alias));
}

function computeCountryRelation({ order, payload, ipMeta }) {
  const ipCountryCode = String(ipMeta?.ipCountry || '').trim().toLowerCase();
  const ipCountryName = String(ipMeta?.ipCountryName || '').trim().toLowerCase();
  if (!ipCountryCode && !ipCountryName) return 'UNKNOWN';

  const candidates = [
    payload?.orderCountry,
    payload?.country,
    order?.createdLocation?.countryCode,
    order?.createdLocation?.country,
    order?.paymentLocation?.countryCode,
    order?.paymentLocation?.country,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  if (!candidates.length) return 'UNKNOWN';

  return candidates.some((candidate) => matchCountryCandidate(candidate, ipCountryCode, ipCountryName))
    ? 'MATCH'
    : 'MISMATCH';
}

function normalizeFeedbackRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const roundedHalf = Math.round(n * 2) / 2;
  return clamp(roundedHalf, 1, 5);
}

function coerceBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const text = String(value || '').trim().toLowerCase();
  if (text === 'true' || text === '1' || text === 'yes' || text === 'on') return true;
  if (text === 'false' || text === '0' || text === 'no' || text === 'off') return false;

  return fallback;
}

function normalizeOptionalText(value, maxLength) {
  const text = String(value || '').trim();
  if (!text) return undefined;
  return text.slice(0, maxLength);
}

function normalizeServiceHighlights(rawHighlights = {}) {
  const source =
    rawHighlights && typeof rawHighlights === 'object' && !Array.isArray(rawHighlights)
      ? rawHighlights
      : {};

  return {
    response: coerceBoolean(source.response, false),
    quality: coerceBoolean(source.quality, false),
    delivery: coerceBoolean(source.delivery, false),
  };
}

async function submitFeedback({ vendorId, payload, requestMeta = {} }) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const text = String(payload?.text || '').trim();
  if (!text) throw httpError(400, 'Feedback text is required', 'VALIDATION');

  const typingTimeMs = Number(payload?.behavior?.typingTimeMs || 0);
  const editCount = Number(payload?.behavior?.editCount || 0);
  const maxDeltaChars = Number(payload?.behavior?.maxDeltaChars || 0);
  const firstInputGapMs = Number(payload?.behavior?.firstInputGapMs || 0);
  const typingIntervalsCount = Number(payload?.behavior?.typingIntervalsCount || 0);
  const typingIntervalMeanMs = Number(payload?.behavior?.typingIntervalMeanMs || 0);
  const typingIntervalVarianceMs2 = Number(payload?.behavior?.typingIntervalVarianceMs2 || 0);

  const sessionIdRaw = String(payload?.sessionId || payload?.behavior?.sessionId || '').trim();
  const sessionIdHash = sessionIdRaw ? sha256Hex(sessionIdRaw) : undefined;
  const ipMeta = await inspectClientIp(requestMeta?.clientIp, { headers: requestMeta?.headers });

  // Privacy-safe device fingerprint hash. Do NOT collect IP/GPS/hardware IDs.
  const deviceHash = String(payload?.deviceHash || '').trim();
  const deviceFingerprintHash = deviceHash || undefined;

  const codeProvided = String(payload?.code || '').trim();
  const orderIdProvided = String(payload?.orderId || '').trim();

  let order = null;
  let codeValid = false;

  // Token verification channel.
  if (codeProvided) {
    order = await Order.findOne({ feedbackCode: codeProvided, vendorId }).lean();
    codeValid = Boolean(order);
  }

  // Payment proof can also come from an explicit orderId reference (without a token).
  if (!order && orderIdProvided) {
    try {
      order = await Order.findOne({ _id: orderIdProvided, vendorId }).lean();
    } catch {
      // Ignore invalid ObjectId; feedback is still accepted.
      order = null;
    }
  }

  const notReceived = Boolean(payload?.notReceived);
  const providedRating = normalizeFeedbackRating(payload?.rating);
  const displayName = normalizeOptionalText(payload?.displayName, 80);
  const displayCountry = normalizeOptionalText(payload?.displayCountry, 80);
  const productName = normalizeOptionalText(payload?.productName, 140);
  const serviceHighlights = normalizeServiceHighlights(payload?.serviceHighlights);
  // --- Fixed-weight trust model (0–100) ---
  // Core signals use fixed weights. IP is applied as a soft adjustment around a neutral baseline.

  // Token used-before check (only when token is valid).
  let tokenUsedBefore = false;
  if (codeProvided && codeValid) {
    const priorCount = await Feedback.countDocuments({ vendorId, codeProvided, codeValid: true });
    tokenUsedBefore = priorCount > 0;
  }

  const tokenVerification = scoreTokenVerification({
    feedbackTokenProvided: Boolean(codeProvided),
    tokenValid: codeValid,
    tokenUsedBefore,
  });

  const paymentProof = scorePaymentProof({
    orderExists: Boolean(order),
    paymentStatus: order?.paymentStatus,
  });

  const normalizedText = normalizeTextForHash(text);
  const textHash = sha256Hex(normalizedText);

  // Duplicate text check is privacy-safe (uses only textHash).
  const dupSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const duplicateTextCount = await Feedback.countDocuments({ vendorId, textHash, createdAt: { $gte: dupSince } });

  const aiBehavior = scoreAiBehavior({
    textLength: text.length,
    typingTimeMs,
    editCount,
    maxDeltaChars,
    firstInputGapMs,
    duplicateTextCount,
  });

  // Device repetition check (privacy-safe: hashed only).
  let deviceFeedbackCount = null;
  if (deviceFingerprintHash) {
    const deviceSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    deviceFeedbackCount = await Feedback.countDocuments({
      vendorId,
      $or: [{ deviceFingerprintHash }, { deviceHash: deviceFingerprintHash }],
      createdAt: { $gte: deviceSince },
    });
  }

  const devicePattern = scoreDevicePattern({ deviceFeedbackCount });

  const ipSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ipFeedbackCount = ipMeta.ipHash
    ? await Feedback.countDocuments({ vendorId, ipHash: ipMeta.ipHash, createdAt: { $gte: ipSince } })
    : null;

  const countryRelation = computeCountryRelation({ order, payload, ipMeta });

  const ipPattern = scoreIpPattern({
    hasIpHash: Boolean(ipMeta.ipHash),
    isPublicIp: ipMeta.isPublicIp,
    ipFeedbackCount,
    networkType: ipMeta.networkType,
    riskLevel: ipMeta.ipRiskLevel,
    vpn: ipMeta.vpn,
    proxy: ipMeta.proxy,
    tor: ipMeta.tor,
    hosting: ipMeta.hosting,
    datacenter: ipMeta.datacenter,
    fraudScore: ipMeta.fraudScore,
    country: ipMeta.ipCountryName,
    region: ipMeta.ipState || ipMeta.ipRegion,
    city: ipMeta.ipCity,
    countryRelation,
    lookupFailed: ipMeta.lookupFailed,
  });
  const contextDepth = scoreContextDepth(text);

  const trustBreakdown = { tokenVerification, paymentProof, aiBehavior, devicePattern, ipPattern, contextDepth };
  const baseTrustScore = clamp(
    Math.round(
      trustBreakdown.tokenVerification.score +
        trustBreakdown.paymentProof.score +
        trustBreakdown.aiBehavior.score +
        trustBreakdown.devicePattern.score +
        trustBreakdown.contextDepth.score
    ),
    0,
    100
  );

  let embeddingAudit = null;
  let dupAdj = 0;
  let dupReason = 'No near-duplicate detected.';
  const ipAdj = ipPattern.score - 6;
  let typingAdj = 0;
  let typingReason = 'Typing signal insufficient; adjustment kept neutral.';
  let typingVarianceZ = null;
  let typingBaselineSamples = 0;
  let embeddingAvailable = false;
  let maxSim = 0;
  let exactDupDifferentDevice = false;

  const feedbackId = new mongoose.Types.ObjectId();

  if (deviceFingerprintHash && duplicateTextCount > 0) {
    const dupDifferentDeviceCount = await Feedback.countDocuments({
      vendorId,
      textHash,
      deviceFingerprintHash: { $ne: deviceFingerprintHash },
      createdAt: { $gte: dupSince },
    });
    exactDupDifferentDevice = dupDifferentDeviceCount > 0;
  }

  try {
    const embedResult = await upsertAndSearch({
      feedbackId,
      vendorId,
      text,
      topK: 5,
    });
    embeddingAvailable = true;

    const neighbors = Array.isArray(embedResult?.neighbors) ? embedResult.neighbors : [];
    const filtered = neighbors.filter((n) => n.id !== String(feedbackId));
    maxSim = filtered.length ? Math.max(...filtered.map((n) => Number(n.score) || 0)) : 0;

    embeddingAudit = {
      modelVersion: embedResult?.modelVersion || 'unknown',
      maxSim,
      neighborCount: filtered.length,
      neighbors: filtered,
    };
  } catch (err) {
    embeddingAudit = {
      error: 'Embedding service unavailable',
    };
  }

  const dupResult = computeDuplicateAdjustment({
    maxSim,
    exactDupDifferentDevice,
    exactDupRecentCount: duplicateTextCount,
    embeddingAvailable,
  });
  dupAdj = dupResult.adj;
  dupReason = dupResult.reason;

  const hasTypingSignal = typingIntervalsCount >= 2 && typingIntervalVarianceMs2 > 0;

  if (deviceFingerprintHash && hasTypingSignal) {
    const recent = await Feedback.find({
      vendorId,
      $or: [{ deviceFingerprintHash }, { deviceHash: deviceFingerprintHash }],
      typingIntervalVarianceMs2: { $gt: 0 },
      createdAt: { $gte: dupSince },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (recent.length >= 5) {
      const values = recent.map((r) => Number(r.typingIntervalVarianceMs2) || 0).filter((v) => v > 0);
      typingBaselineSamples = values.length;
      if (values.length >= 5) {
        const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
        const variance =
          values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        if (std > 0) typingVarianceZ = (typingIntervalVarianceMs2 - mean) / std;
      }
    }
  }

  const typingResult = computeTypingVarianceAdjustment({
    varianceZ: typingVarianceZ,
    editCount,
    typingTimeMs,
    typingIntervalsCount,
    baselineSampleCount: typingBaselineSamples,
    hasTypingSignal,
  });
  typingAdj = typingResult.adj;
  typingReason = typingResult.reason;

  const finalTrustScore = clamp(Math.round(baseTrustScore + ipAdj + dupAdj + typingAdj), 0, 100);
  const trustLevel = computeTrustLevel(finalTrustScore);
  const persistedRating =
    providedRating != null
      ? providedRating
      : clamp(Math.round((finalTrustScore / 20) * 2) / 2, 1, 5);

  // Auto-generated badges (derived only from signals).
  const tags = [];
  if (codeValid) tags.push('Verified');
  if (order?.paymentStatus === 'PAID') tags.push('Payment Verified');
  if (trustBreakdown.aiBehavior.score >= 15) tags.push('AI Verified');

  const txRef = generateTxRef();
  tags.push('Blockchain Anchored');

  // Blockchain anchoring (DEMO): hash metadata only; never anchor text or payment data.
  const anchorPayload = {
    vendorId: String(vendorId),
    orderId: order?._id ? String(order._id) : null,
    createdAt: new Date().toISOString(),
    rating: persistedRating,
    productName: productName || null,
    serviceHighlights,
    finalTrustScore,
    trustLevel,
    trustBreakdown,
    textHash,
    deviceFingerprintHash: deviceFingerprintHash || null,
    sessionIdHash: sessionIdHash || null,
  };
  const hash = sha256Hex(JSON.stringify(anchorPayload));

  const explanation =
    'Trust score is computed from fixed trust signals (Token Verification, Payment Proof, AI Behavior, Device Pattern, IP Pattern Check, Context Depth). ' +
    'Feedback is always accepted even without token/payment. ' +
    'Raw IP is never stored; only a hashed network signal plus coarse country/state/city and an IP risk level are kept for explainability. ' +
    'MaxMind GeoLite2 and IPQualityScore are used when available, and the IP signal falls back to neutral if either lookup is unavailable. ' +
    'International customers remain supported because location mismatches are treated as a soft explanatory signal rather than an automatic penalty. ' +
    'Blockchain anchoring stores only a hash of metadata + tx reference (no feedback text on-chain).';
  const fullExplanation = `${explanation} IP pattern adjustment: ${ipPattern.explanation} Duplicate adjustment: ${dupReason} Typing variance adjustment: ${typingReason}`;

  const feedback = await Feedback.create({
    _id: feedbackId,
    vendorId,
    orderId: order?._id,
    codeProvided: codeProvided || undefined,
    codeValid,
    text,
    textHash,
    deviceHash: deviceFingerprintHash,
    deviceFingerprintHash,
    sessionIdHash,
    ipHash: ipMeta.ipHash,
    ipCountry: ipMeta.ipCountry,
    ipCountryName: ipMeta.ipCountryName,
    ipRegion: ipMeta.ipRegion,
    ipState: ipMeta.ipState,
    ipCity: ipMeta.ipCity,
    ipTimezone: ipMeta.ipTimezone,
    locationSource: ipMeta.locationSource,
    ipRiskLevel: ipPattern.riskLevel,
    typingTimeMs,
    editCount,
    typingIntervalsCount,
    typingIntervalMeanMs,
    typingIntervalVarianceMs2,
    typingVarianceZ,
    notReceived,
    displayName,
    displayCountry,
    productName,
    serviceHighlights,
    rating: persistedRating,
    trustScore: finalTrustScore,
    baseTrustScore,
    finalTrustScore,
    trustLevel,
    trustBreakdown,
    breakdown: trustBreakdownToLegacyList(trustBreakdown),
    explanation: fullExplanation,
    dupAdj,
    typingAdj,
    embeddingAudit,
    tags,
    blockchain: { hash, txRef },
  });

  // Audit log (demo): store in DB + log to server console.
  // This is explainable and rule-based; no identity information is logged.
  console.info('[TrustLens] feedback trust audit', {
    vendorId: String(vendorId),
    feedbackId: String(feedback._id),
    orderId: order?._id ? String(order._id) : null,
    finalTrustScore,
    trustLevel,
    trustBreakdown,
    ipHash: ipMeta.ipHash,
    ipCountry: ipMeta.ipCountry,
    ipCountryName: ipMeta.ipCountryName,
    ipState: ipMeta.ipState,
    ipCity: ipMeta.ipCity,
    ipRiskLevel: ipPattern.riskLevel,
    ipNetworkType: ipMeta.networkType,
    ipFraudScore: ipMeta.fraudScore,
    ipVpn: ipMeta.vpn,
    ipProxy: ipMeta.proxy,
    ipTor: ipMeta.tor,
    ipHosting: ipMeta.hosting,
    ipDatacenter: ipMeta.datacenter,
    ipAdjustment: ipAdj,
    dupAdj,
    dupReason,
    typingAdj,
    typingReason,
    typingVarianceZ,
    embeddingAudit,
  });

  return {
    feedbackId: feedback._id,
    displayName,
    displayCountry,
    productName,
    serviceHighlights,
    rating: persistedRating,
    trustScore: finalTrustScore,
    baseTrustScore,
    finalTrustScore,
    trustLevel,
    trustBreakdown,
    trustBreakdownList: trustBreakdownToLegacyList(trustBreakdown),
    location: {
      countryCode: ipMeta.ipCountry,
      country: ipMeta.ipCountryName,
      state: ipMeta.ipState || ipMeta.ipRegion,
      city: ipMeta.ipCity,
      timezone: ipMeta.ipTimezone,
      source: ipMeta.locationSource,
    },
    ipCountry: ipMeta.ipCountry,
    ipCountryName: ipMeta.ipCountryName,
    ipState: ipMeta.ipState,
    ipCity: ipMeta.ipCity,
    ipRiskLevel: ipPattern.riskLevel,
    dupAdj,
    dupReason,
    typingAdj,
    typingReason,
    typingVarianceZ,
    embeddingAudit,
    explanation: fullExplanation,
    blockchain: { txRef, hash },
    order: codeValid
      ? {
          orderId: String(order._id),
          productDetails: order.productDetails,
          price: order.price,
          paymentStatus: order.paymentStatus,
          deliveryStatus: order.deliveryStatus,
        }
      : null,
    code: { provided: Boolean(codeProvided), valid: codeValid },
  };
}

module.exports = { submitFeedback };
