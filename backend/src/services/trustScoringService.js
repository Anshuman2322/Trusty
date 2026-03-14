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

function formatIpLocation({ city, region, country }) {
  return [city, region, country].filter(Boolean).join(', ');
}

// 5) IP Pattern Check (max 10)
// Soft signal only: 6/10 is neutral to avoid penalizing international customers.
function scoreIpPattern({
  hasIpHash,
  isPublicIp,
  ipFeedbackCount,
  networkType = 'UNKNOWN',
  riskLevel = 'UNKNOWN',
  vpn = false,
  proxy = false,
  tor = false,
  hosting = false,
  datacenter = false,
  fraudScore = null,
  country = null,
  region = null,
  city = null,
  countryRelation = 'UNKNOWN',
  lookupFailed = false,
}) {
  const maxScore = 10;

  if (!hasIpHash) {
    return {
      score: 6,
      maxScore,
      explanation: 'Client IP unavailable; IP signal treated as neutral.',
      riskLevel: 'UNKNOWN',
    };
  }

  if (!isPublicIp) {
    return {
      score: 6,
      maxScore,
      explanation: 'Private or local network detected; IP signal treated as neutral.',
      riskLevel: 'UNKNOWN',
    };
  }

  if (lookupFailed) {
    return {
      score: 6,
      maxScore,
      explanation: 'IP intelligence lookup unavailable; IP signal treated as neutral.',
      riskLevel: 'UNKNOWN',
    };
  }

  const normalizedNetworkType = tor
    ? 'TOR'
    : vpn || proxy
      ? 'VPN'
      : datacenter || hosting
        ? 'DATACENTER'
        : networkType || 'UNKNOWN';

  const location = formatIpLocation({ city, region, country });
  const reasons = [];
  let score = 6;

  if (normalizedNetworkType === 'RESIDENTIAL') {
    score = 10;
    reasons.push(location ? `Feedback submitted from a residential network in ${location}.` : 'Feedback submitted from a residential network.');
  } else if (normalizedNetworkType === 'MOBILE') {
    score = 8;
    reasons.push(location ? `Feedback submitted from a mobile network in ${location}.` : 'Feedback submitted from a mobile network.');
  } else if (normalizedNetworkType === 'BUSINESS') {
    score = 7;
    reasons.push(location ? `Feedback submitted from a business network in ${location}.` : 'Feedback submitted from a business network.');
  } else if (normalizedNetworkType === 'DATACENTER') {
    score = 4;
    reasons.push(location ? `IP detected as datacenter or hosting infrastructure near ${location}.` : 'IP detected as datacenter or hosting infrastructure.');
  } else if (normalizedNetworkType === 'VPN') {
    score = 2;
    reasons.push(location ? `IP detected as a VPN or proxy network near ${location}.` : 'IP detected as a VPN or proxy network.');
  } else if (normalizedNetworkType === 'TOR') {
    score = 0;
    reasons.push(location ? `IP detected as a TOR exit node near ${location}.` : 'IP detected as a TOR exit node.');
  } else {
    reasons.push(location ? `IP resolved near ${location}, but the network type could not be classified with confidence.` : 'Network type could not be classified with confidence.');
  }

  if (fraudScore !== null && fraudScore !== undefined) {
    reasons.push(`Fraud score ${Math.round(fraudScore)}/100.`);
  }

  if (ipFeedbackCount === null || ipFeedbackCount === undefined) {
    reasons.push('Recent hashed-network repetition data was unavailable.');
  } else if (ipFeedbackCount >= 3) {
    score = Math.max(0, score - 2);
    reasons.push(`Multiple recent reviews (${ipFeedbackCount + 1} total in 24h) came from the same hashed network.`);
  } else if (ipFeedbackCount >= 1) {
    reasons.push(`A small number of recent reviews (${ipFeedbackCount + 1} total in 24h) came from the same hashed network.`);
  } else {
    reasons.push('No recent repetition detected from the same hashed network.');
  }

  if (countryRelation === 'MATCH') {
    reasons.push('IP country matches the order or payment location.');
  } else if (countryRelation === 'MISMATCH') {
    reasons.push('Location differs from the order location but may represent travel or an international customer.');
  }

  return {
    score,
    maxScore,
    explanation: reasons.join(' '),
    riskLevel,
  };
}

// 6) Context Depth Score (max 15)
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
      signal: 'IP Pattern Check',
      maxPoints: trustBreakdown.ipPattern.maxScore,
      points: trustBreakdown.ipPattern.score,
      reason: trustBreakdown.ipPattern.explanation,
    },
    {
      signal: 'Context Depth Score',
      maxPoints: trustBreakdown.contextDepth.maxScore,
      points: trustBreakdown.contextDepth.score,
      reason: trustBreakdown.contextDepth.explanation,
    },
  ];
}

function computeDuplicateAdjustment({
  maxSim = 0,
  exactDupDifferentDevice = false,
  exactDupRecentCount = 0,
  embeddingAvailable = true,
}) {
  const repeatCount = Number.isFinite(exactDupRecentCount) ? Math.max(0, Math.trunc(exactDupRecentCount)) : 0;

  if (exactDupDifferentDevice) {
    return { adj: -12, reason: 'Exact text hash seen from a different device.' };
  }
  if (maxSim >= 0.95) return { adj: -12, reason: `Near-duplicate similarity ${maxSim.toFixed(3)}.` };
  if (maxSim >= 0.92) return { adj: -8, reason: `Likely duplicate similarity ${maxSim.toFixed(3)}.` };
  if (maxSim >= 0.88) return { adj: -4, reason: `Possible reuse similarity ${maxSim.toFixed(3)}.` };

  if (repeatCount >= 5) {
    return { adj: -8, reason: `Exact text hash repeated ${repeatCount} previous time(s).` };
  }
  if (repeatCount >= 2) {
    return { adj: -5, reason: `Exact text hash repeated ${repeatCount} previous time(s).` };
  }
  if (repeatCount >= 1) {
    return { adj: -3, reason: `Exact text hash repeated ${repeatCount} previous time(s).` };
  }

  if (!embeddingAvailable) {
    return { adj: 0, reason: 'No exact duplicate hash found; semantic duplicate service unavailable.' };
  }

  return { adj: 0, reason: 'No near-duplicate detected.' };
}

function computeTypingVarianceAdjustment({
  varianceZ,
  editCount,
  typingTimeMs,
  typingIntervalsCount = 0,
  baselineSampleCount = 0,
  hasTypingSignal = true,
}) {
  const baselineTarget = 5;
  const baselineCount = Number.isFinite(baselineSampleCount) ? Math.max(0, Math.trunc(baselineSampleCount)) : 0;

  if (varianceZ === null || varianceZ === undefined || Number.isNaN(varianceZ)) {
    if (!hasTypingSignal || typingIntervalsCount < 2 || typingTimeMs <= 0) {
      return { adj: 0, reason: 'Typing signal insufficient; adjustment kept neutral.' };
    }

    if (editCount <= 0 && typingTimeMs < 4000) {
      return { adj: -2, reason: 'Fast submission with no edits; small penalty while typing baseline builds.' };
    }

    if (editCount >= 3 && typingTimeMs >= 10000) {
      return { adj: 1, reason: 'Edits and longer typing suggest human input; small bonus while typing baseline builds.' };
    }

    return {
      adj: 0,
      reason: `Typing baseline building (${Math.min(baselineCount, baselineTarget)}/${baselineTarget} samples); adjustment kept neutral.`,
    };
  }
  if (varianceZ <= -2.0 && editCount <= 1 && typingTimeMs < 4000) {
    return { adj: -5, reason: `Very low variance (z=${varianceZ.toFixed(2)}), fast and low edits.` };
  }
  if (varianceZ <= -1.0 && editCount <= 1) {
    return { adj: -3, reason: `Low variance (z=${varianceZ.toFixed(2)}) with minimal edits.` };
  }
  if (varianceZ >= 1.0 && editCount >= 2) {
    return { adj: 2, reason: `High variance (z=${varianceZ.toFixed(2)}) with edits (human-like).` };
  }
  return { adj: 0, reason: 'Typing variance within normal range.' };
}

module.exports = {
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
};
