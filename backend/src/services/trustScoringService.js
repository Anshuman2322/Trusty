function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeTextForHash(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1) Token Verification (max 25)
// NOTE: Feedback is always accepted even when token is invalid/missing.
function scoreTokenVerification({ feedbackTokenProvided, tokenValid, tokenUsedBefore }) {
  const maxScore = 25;
  if (!feedbackTokenProvided) {
    return { score: 0, maxScore, explanation: 'No feedback token provided (anonymous channel).' };
  }
  if (!tokenValid) {
    return { score: 5, maxScore, explanation: 'Token provided but invalid (not linked to a vendor-issued order).' };
  }
  if (tokenUsedBefore) {
    return { score: 10, maxScore, explanation: 'Token is valid but has been used before (possible reuse).' };
  }
  return { score: 25, maxScore, explanation: 'Token is valid and unused (vendor-issued feedback channel).' };
}

// 2) Payment Proof (max 20)
function scorePaymentProof({ orderExists, paymentStatus }) {
  const maxScore = 20;
  if (!orderExists) {
    return { score: 0, maxScore, explanation: 'No payment reference (no order linked).' };
  }
  if (paymentStatus === 'PAID') {
    return { score: 20, maxScore, explanation: 'Paid order verified (paymentStatus=PAID).' };
  }
  return { score: 8, maxScore, explanation: 'Order exists but is not paid (paymentStatus not PAID).' };
}

// 3) AI Behavior Score (max 25; natural capped at 24 unless ideal baseline)
// Multi-signal copy/paste detection: timing + edits + sudden injection + first-input gap.
function scoreAiBehavior({
  textLength = 0,
  typingTimeMs = 0,
  editCount = 0,
  maxDeltaChars = 0,
  firstInputGapMs = 0,
  duplicateTextCount = 0,
}) {
  const maxScore = 25;
  const reasons = [];

  const typingSeconds = typingTimeMs > 0 ? typingTimeMs / 1000 : 0;
  const charsPerSecond = typingSeconds > 0 ? textLength / typingSeconds : 0;
  const suddenInjection = maxDeltaChars >= 200;
  const firstInputGapSec = firstInputGapMs > 0 ? firstInputGapMs / 1000 : 0;

  let pasteConfidence = 0;
  if (charsPerSecond > 40) pasteConfidence += 1;
  if (editCount === 0 && textLength > 200) pasteConfidence += 1;
  if (suddenInjection) pasteConfidence += 1;
  if (firstInputGapSec > 0 && firstInputGapSec < 2) pasteConfidence += 1;
  if (duplicateTextCount > 0) pasteConfidence += 1; // reuse of exact text hash is strong paste/duplication evidence

  const pasteDetected = pasteConfidence >= 2;

  // Banding targets:
  // - Full paste/no edits: 0–8
  // - Mixed: 12–18
  // - Natural typing: 22–24 (25 only ideal)

  if (pasteDetected) {
    // Strong paste signal
    const penaltyReason = [];
    if (charsPerSecond > 40) penaltyReason.push(`High typing speed ${charsPerSecond.toFixed(1)} cps`);
    if (editCount === 0 && textLength > 200) penaltyReason.push('Long text with zero edits');
    if (suddenInjection) penaltyReason.push(`Sudden length jump (${maxDeltaChars} chars)`);
    if (firstInputGapSec > 0 && firstInputGapSec < 2) penaltyReason.push(`Submitted ${firstInputGapSec.toFixed(2)}s after first input`);
    if (duplicateTextCount > 0) penaltyReason.push(`Duplicate text seen ${duplicateTextCount} time(s)`);
    const score = clamp(8 - pasteConfidence * 2, 0, 8);
    return {
      score,
      maxScore,
      explanation: `Copy-paste suspected: ${penaltyReason.join('; ')}`,
    };
  }

  // Mixed signals (some human signs but also mild suspicion)
  let mixedSuspicion = 0;
  if (charsPerSecond > 20 && charsPerSecond <= 40) mixedSuspicion += 1;
  if (editCount === 0 && textLength > 80) mixedSuspicion += 1;
  if (firstInputGapSec > 0 && firstInputGapSec < 4) mixedSuspicion += 1;

  if (mixedSuspicion > 0) {
    const score = clamp(18 - mixedSuspicion * 2, 12, 18);
    reasons.push('Mixed typing signals (partially human-like, some fast or low-edit patterns).');
    return { score, maxScore, explanation: reasons.join(' ') };
  }

  // Natural typing band.
  let score = 22;
  const naturalReasons = [];

  if (typingSeconds > 0) {
    if (charsPerSecond <= 15) {
      score += 1;
      naturalReasons.push('Calm typing pace');
    } else if (charsPerSecond <= 25) {
      score += 2;
      naturalReasons.push('Natural typing pace');
    } else {
      naturalReasons.push('Fast but not paste-like pace');
    }
  } else {
    naturalReasons.push('Typing duration missing; treating as neutral.');
  }

  if (editCount >= 3) {
    score += 1;
    naturalReasons.push('Multiple edits (human-like).');
  } else if (editCount >= 1) {
    naturalReasons.push('Some edits observed.');
  } else {
    naturalReasons.push('No edits; still allowed but lowers confidence.');
    score -= 2;
  }

  score = clamp(score, 12, 25);

  // Cap typical maximum at 24; reserve 25 for ideal baseline (clean signals, lengthy text, time spent).
  const ideal =
    score >= 24 &&
    charsPerSecond > 0 &&
    charsPerSecond <= 20 &&
    editCount >= 3 &&
    textLength >= 120 &&
    typingSeconds >= 8 &&
    firstInputGapSec >= 4;

  if (!ideal && score > 24) score = 24;
  if (ideal) score = 25;

  return { score, maxScore, explanation: naturalReasons.join(' ') };
}

// 4) Device Pattern Score (max 15)
function scoreDevicePattern({ deviceFeedbackCount }) {
  const maxScore = 15;
  if (deviceFeedbackCount === null || deviceFeedbackCount === undefined) {
    return { score: 0, maxScore, explanation: 'No device fingerprint provided (cannot detect repetition).' };
  }
  if (deviceFeedbackCount <= 0) {
    return { score: 15, maxScore, explanation: 'First feedback from this device fingerprint.' };
  }
  if (deviceFeedbackCount <= 2) {
    const score = deviceFeedbackCount === 1 ? 12 : 9;
    return { score, maxScore, explanation: `Repeated device fingerprint (${deviceFeedbackCount + 1} total feedbacks).` };
  }
  if (deviceFeedbackCount <= 5) {
    return { score: 5, maxScore, explanation: `High repetition from same device fingerprint (${deviceFeedbackCount + 1} total feedbacks).` };
  }
  return { score: 2, maxScore, explanation: `Very high repetition from same device fingerprint (${deviceFeedbackCount + 1} total feedbacks).` };
}

// 5) Context Depth Score (max 15)
// Measures specificity/authenticity, not positivity.
function scoreContextDepth(text) {
  const maxScore = 15;
  const t = String(text || '').trim();
  if (!t) return { score: 0, maxScore, explanation: 'Empty feedback.' };

  const reasons = [];
  let score = 0;

  const length = t.length;
  const hasNumbers = /\d/.test(t);
  const hasTimeline = /\b(today|yesterday|tomorrow|week|month|hour|day|date|\d{1,2}[/-]\d{1,2})\b/i.test(t);
  const hasProductOrService = /\b(product|service|delivery|packing|quality|price|refund|support|invoice|order)\b/i.test(t);
  const hasSequence = /\b(then|after|before|when|because|so that)\b/i.test(t);
  const hasBalancedStructure = /\b(but|however|although)\b/i.test(t);
  const genericTemplate = /\b(good service|nice|awesome|bad service|worst|very good|very bad)\b/i.test(t) && length < 80;

  if (length >= 180) {
    score += 6;
    reasons.push('Detailed description.');
  } else if (length >= 90) {
    score += 4;
    reasons.push('Moderate detail length.');
  } else if (length >= 30) {
    score += 2;
    reasons.push('Some detail.');
  } else {
    reasons.push('Very short / generic length.');
  }

  if (hasProductOrService) {
    score += 4;
    reasons.push('Mentions product/service context.');
  }
  if (hasTimeline) {
    score += 3;
    reasons.push('Includes timeline/events.');
  }
  if (hasNumbers) {
    score += 2;
    reasons.push('Includes specific numbers/details.');
  }
  if (hasSequence) {
    score += 1;
    reasons.push('Describes sequence/cause.');
  }
  if (hasBalancedStructure) {
    score += 1;
    reasons.push('Balanced structure markers present.');
  }

  if (genericTemplate) {
    score = Math.min(score, 6);
    reasons.push('Template-like phrasing detected.');
  }

  score = clamp(score, 0, maxScore);

  // Map to the expected bands.
  if (score >= 13) {
    return { score, maxScore, explanation: `Highly specific: ${reasons.join(' ')}` };
  }
  if (score >= 7) {
    return { score, maxScore, explanation: `Moderate context: ${reasons.join(' ')}` };
  }
  return { score, maxScore, explanation: `Generic/vague: ${reasons.join(' ')}` };
}

function computeTrustLevel(score) {
  if (score >= 71) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function trustBreakdownToLegacyList(trustBreakdown) {
  if (!trustBreakdown) return [];
  return [
    {
      signal: 'Token Verification',
      maxPoints: trustBreakdown.tokenVerification.maxScore,
      points: trustBreakdown.tokenVerification.score,
      reason: trustBreakdown.tokenVerification.explanation,
    },
    {
      signal: 'Payment Proof',
      maxPoints: trustBreakdown.paymentProof.maxScore,
      points: trustBreakdown.paymentProof.score,
      reason: trustBreakdown.paymentProof.explanation,
    },
    {
      signal: 'AI Behavior Score',
      maxPoints: trustBreakdown.aiBehavior.maxScore,
      points: trustBreakdown.aiBehavior.score,
      reason: trustBreakdown.aiBehavior.explanation,
    },
    {
      signal: 'Device Pattern Score',
      maxPoints: trustBreakdown.devicePattern.maxScore,
      points: trustBreakdown.devicePattern.score,
      reason: trustBreakdown.devicePattern.explanation,
    },
    {
      signal: 'Context Depth Score',
      maxPoints: trustBreakdown.contextDepth.maxScore,
      points: trustBreakdown.contextDepth.score,
      reason: trustBreakdown.contextDepth.explanation,
    },
  ];
}

module.exports = {
  clamp,
  normalizeTextForHash,
  scoreTokenVerification,
  scorePaymentProof,
  scoreAiBehavior,
  scoreDevicePattern,
  scoreContextDepth,
  computeTrustLevel,
  trustBreakdownToLegacyList,
};
