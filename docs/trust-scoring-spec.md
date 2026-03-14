# Trust Scoring Spec (v2 Draft)

Goal: increase detection accuracy with explainable, CPU-only signals. AI assists but never decides.

## Summary

- Base score remains fully explainable and rule-based.
- New signals add small, bounded adjustments.
- Every adjustment logs exact reasons and numeric evidence.
- IP is handled as a privacy-safe soft signal: raw IP is never stored.

## Score Formula

Base score is computed from rule-based signals (0-100).

Final score:

- finalScore = clamp(baseScore + ipAdj + dupAdj + typingAdj + aiAdj, 0, 100)

Constraints:

- ipAdj is centered on a neutral baseline and should stay small.
- dupAdj is negative or zero only.
- typingAdj is negative, zero, or small positive.
- aiAdj is positive only and capped.
- Logs must include all component scores and raw metrics.

## Base Signals (unchanged)

Total = 100 points

- Token verification: 0-25
- Payment proof: 0-20
- Behavior (copy/paste): 0-25
- Device pattern: 0-15
- Context depth: 0-15

## New Signals and Adjustments

### 1) IP pattern adjustment (ipAdj)

Purpose: add a privacy-safe network signal without blocking feedback or unfairly penalizing international customers.

Data inputs:

- `x-forwarded-for` or `req.socket.remoteAddress`
- hashed IP only (`ipHash`)
- MaxMind GeoLite2 City + ASN lookups (`ipCountry`, `ipRegion`, `ipCity`, `isp`, `asn`)
- IPQualityScore VPN / proxy / TOR / hosting / datacenter signals
- recent feedback count from the same hashed IP for the same vendor
- fraud score and network classification derived from the lookup results

Storage rules:

- never store raw IP permanently
- store only `ipHash`, `ipCountry`, `ipRegion`, `ipCity`, and `ipRiskLevel`
- private / loopback / local IPs stay neutral

Default scoring:

- residential network -> `scoreIpPattern = 10`
- mobile network -> `scoreIpPattern = 8`
- business network -> `scoreIpPattern = 7`
- datacenter / hosting IP -> `scoreIpPattern = 4`
- VPN / proxy IP -> `scoreIpPattern = 2`
- TOR exit node -> `scoreIpPattern = 0`
- lookup failure on MaxMind or IPQualityScore -> `scoreIpPattern = 6` (neutral)
- repeated hashed-network submissions only make a small secondary reduction after several reviews in a short window
- explicit country mismatch with the order location is explanatory, not an automatic penalty

Adjustment formula:

- `ipAdj = scoreIpPattern - 6`

Explainability log fields:

- `ipCountry`, `ipRegion`, `ipCity`, `ipRiskLevel`, `networkType`, `fraudScore`, `ipFeedbackCount`, `countryRelation`, `ipAdj`

### 2) Embedding near-duplicate adjustment (dupAdj)

Purpose: reduce trust when feedback is near-duplicate of prior text.

Data inputs:

- embedding vector for current feedback
- top-K nearest neighbors (K=5 default)
- cosine similarity to nearest neighbor
- neighbor ids and timestamps

Default thresholds:

- maxSim >= 0.95 -> dupAdj = -12 (strong near-duplicate)
- 0.92 <= maxSim < 0.95 -> dupAdj = -8 (likely near-duplicate)
- 0.88 <= maxSim < 0.92 -> dupAdj = -4 (possible reuse)
- maxSim < 0.88 -> dupAdj = 0

Additional rule:

- If exact text hash match exists from a different device or session, apply dupAdj = min(dupAdj, -12).

Explainability log fields:

- maxSim, neighborIds, neighborSimilarityList, thresholdHit, dupAdj

### 3) Typing variance adjustment (typingAdj)

Purpose: weak signal to detect synthetic or mass-generated input. This must not decide.

Data inputs:

- inter-key interval stats (mean, variance)
- edit count
- typing duration
- device baseline window (last 20 entries on same device hash)

Default thresholds:

- If variance z-score <= -2.0 and editCount <= 1 and typingTimeMs < 4000 -> typingAdj = -5
- If variance z-score <= -1.0 and editCount <= 1 -> typingAdj = -3
- If variance z-score >= 1.0 and editCount >= 2 -> typingAdj = +2
- Missing baseline or insufficient history -> typingAdj = 0

Explainability log fields:

- typingVariance, varianceZ, editCount, typingTimeMs, typingAdj

### 4) Optional AI classifier bonus (aiAdj)

Purpose: small positive bonus from an interpretable classifier.

Model: logistic regression over engineered features (NOT raw text). CPU-only, ONNX or scikit-learn.

Input features (example):

- maxSim, meanSim, dupAdj
- typingVariance, varianceZ
- editCount, typingTimeMs
- contextDepthScore
- deviceFeedbackCount
- tokenValid, paymentStatus

Scoring:

- aiAdj = round(5 * pAuthentic) capped to [0, 5]
- No negative penalty from the model

Explainability log fields:

- pAuthentic, topWeightedFeatures, aiAdj

## Logging Requirements (mandatory)

Each feedback must store:

- baseScore and per-signal breakdown
- ipAdj, dupAdj, typingAdj, aiAdj
- finalScore and trustLevel
- raw metrics used to compute adjustments
- model version hash (for embeddings and classifier)

## Rollout Plan

1) Implement embeddings + near-duplicate detection, log only (no score change) for 2 weeks.
2) Enable ipAdj with a neutral baseline and watch international traffic for bias.
3) Enable dupAdj with conservative thresholds, monitor false positives.
4) Add typingAdj as weak signal, monitor drift and appeals.
5) Add AI classifier bonus and keep max +5.

## Safety and Governance

- No external AI API required.
- All models are self-hosted and versioned.
- Any model update requires a new version hash in logs.

## Open Configuration

These should be defined in config and not hard-coded:

- `MAXMIND_CITY_DB_PATH`
- `MAXMIND_ASN_DB_PATH`
- `IPQUALITYSCORE_API_KEY`
- `IPQUALITYSCORE_TIMEOUT_MS`
- `IPQUALITYSCORE_RETRY_ATTEMPTS`
- `IPQUALITYSCORE_STRICTNESS`
- K for nearest neighbors
- similarity thresholds
- typing variance thresholds
- aiAdj max bonus
