const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');

const { sha256Hex, generateTxRef } = require('./cryptoService');
const {
  clamp,
  normalizeTextForHash,
  scoreTokenVerification,
  scorePaymentProof,
  scoreAiBehavior,
  scoreDevicePattern,
  scoreContextDepth,
  computeTrustLevel,
  trustBreakdownToLegacyList,
} = require('./trustScoringService');

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

async function submitFeedback({ vendorId, payload }) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw httpError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');

  const text = String(payload?.text || '').trim();
  if (!text) throw httpError(400, 'Feedback text is required', 'VALIDATION');

  const typingTimeMs = Number(payload?.behavior?.typingTimeMs || 0);
  const editCount = Number(payload?.behavior?.editCount || 0);
  const maxDeltaChars = Number(payload?.behavior?.maxDeltaChars || 0);
  const firstInputGapMs = Number(payload?.behavior?.firstInputGapMs || 0);

  const sessionIdRaw = String(payload?.sessionId || payload?.behavior?.sessionId || '').trim();
  const sessionIdHash = sessionIdRaw ? sha256Hex(sessionIdRaw) : undefined;

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
  // --- Fixed-weight trust model (0–100) ---
  // Five independent signals with fixed weights. Never score by sentiment.

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
  const contextDepth = scoreContextDepth(text);

  const trustBreakdown = { tokenVerification, paymentProof, aiBehavior, devicePattern, contextDepth };
  const finalTrustScore = clamp(
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
  const trustLevel = computeTrustLevel(finalTrustScore);

  // Auto-generated badges (derived only from signals).
  const tags = [];
  if (trustBreakdown.tokenVerification.score > 0) tags.push('Verified');
  if (trustBreakdown.paymentProof.score > 0) tags.push('Payment Verified');
  if (trustBreakdown.aiBehavior.score >= 15) tags.push('AI Verified');

  const txRef = generateTxRef();
  tags.push('Blockchain Anchored');

  // Blockchain anchoring (DEMO): hash metadata only; never anchor text or payment data.
  const anchorPayload = {
    vendorId: String(vendorId),
    orderId: order?._id ? String(order._id) : null,
    createdAt: new Date().toISOString(),
    finalTrustScore,
    trustLevel,
    trustBreakdown,
    textHash,
    deviceFingerprintHash: deviceFingerprintHash || null,
    sessionIdHash: sessionIdHash || null,
  };
  const hash = sha256Hex(JSON.stringify(anchorPayload));

  const explanation =
    'Trust score is computed from five independent signals (Token Verification, Payment Proof, AI Behavior, Device Pattern, Context Depth) with fixed weights. ' +
    'Feedback is always accepted even without token/payment. ' +
    'No identity/IP/GPS is stored; only privacy-safe hashes are used for repetition/duplication checks. ' +
    'Blockchain anchoring stores only a hash of metadata + tx reference (no feedback text on-chain).';

  const feedback = await Feedback.create({
    vendorId,
    orderId: order?._id,
    codeProvided: codeProvided || undefined,
    codeValid,
    text,
    textHash,
    deviceHash: deviceFingerprintHash,
    deviceFingerprintHash,
    sessionIdHash,
    typingTimeMs,
    editCount,
    notReceived,
    trustScore: finalTrustScore,
    finalTrustScore,
    trustLevel,
    trustBreakdown,
    breakdown: trustBreakdownToLegacyList(trustBreakdown),
    explanation,
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
  });

  return {
    feedbackId: feedback._id,
    trustScore: finalTrustScore,
    finalTrustScore,
    trustLevel,
    trustBreakdown,
    trustBreakdownList: trustBreakdownToLegacyList(trustBreakdown),
    explanation,
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
