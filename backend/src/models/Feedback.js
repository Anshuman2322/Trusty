const mongoose = require('mongoose');

const BreakdownItemSchema = new mongoose.Schema(
  {
    signal: { type: String, required: true },
    maxPoints: { type: Number, required: true },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const TrustComponentSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const TrustBreakdownSchema = new mongoose.Schema(
  {
    tokenVerification: { type: TrustComponentSchema, required: true },
    paymentProof: { type: TrustComponentSchema, required: true },
    aiBehavior: { type: TrustComponentSchema, required: true },
    devicePattern: { type: TrustComponentSchema, required: true },
    ipPattern: { type: TrustComponentSchema, required: true },
    contextDepth: { type: TrustComponentSchema, required: true },
  },
  { _id: false }
);

const EmbeddingNeighborSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    score: { type: Number, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const EmbeddingAuditSchema = new mongoose.Schema(
  {
    modelVersion: { type: String },
    maxSim: { type: Number },
    neighborCount: { type: Number },
    neighbors: { type: [EmbeddingNeighborSchema], default: [] },
    error: { type: String },
  },
  { _id: false }
);

const BlockchainSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true },
    txRef: { type: String, required: true },
  },
  { _id: false }
);

const ServiceHighlightsSchema = new mongoose.Schema(
  {
    response: { type: Boolean, default: false },
    quality: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },
  },
  { _id: false }
);

const FeedbackSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    codeProvided: { type: String },
    codeValid: { type: Boolean, default: false },

    text: { type: String, required: true, trim: true, maxlength: 2000 },

    // Privacy-safe: hash of normalized text (used only for duplicate detection).
    // Not used to identify a user.
    textHash: { type: String, index: true },

    // Privacy-safe fingerprint hashes only. Never store IP/GPS/device hardware IDs.
    deviceHash: { type: String, index: true },
    deviceFingerprintHash: { type: String, index: true },
    sessionIdHash: { type: String, index: true },
    ipHash: { type: String, index: true },
    ipCountry: { type: String },
    ipCountryName: { type: String },
    ipRegion: { type: String },
    ipState: { type: String },
    ipCity: { type: String },
    ipTimezone: { type: String },
    locationSource: { type: String, default: 'unknown' },
    ipRiskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'], default: 'UNKNOWN' },
    typingTimeMs: { type: Number, default: 0 },
    editCount: { type: Number, default: 0 },
    typingIntervalsCount: { type: Number, default: 0 },
    typingIntervalMeanMs: { type: Number, default: 0 },
    typingIntervalVarianceMs2: { type: Number, default: 0 },
    typingVarianceZ: { type: Number },

    notReceived: { type: Boolean, default: false },
  displayName: { type: String, trim: true, maxlength: 80 },
  displayCountry: { type: String, trim: true, maxlength: 80 },
  productName: { type: String, trim: true, maxlength: 140 },
  serviceHighlights: { type: ServiceHighlightsSchema, default: () => ({}) },
    rating: { type: Number, min: 1, max: 5 },

    // Stored for backward compatibility with existing UI.
    trustScore: { type: Number, required: true, min: 0, max: 100, index: true },
    // Base score before adjustments (optional for legacy).
    baseTrustScore: { type: Number, min: 0, max: 100 },
    // Mandatory new structure.
    finalTrustScore: { type: Number, required: true, min: 0, max: 100, index: true },
    trustLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true, index: true },

    trustBreakdown: { type: TrustBreakdownSchema, required: true },

    // Legacy list breakdown for older views.
    breakdown: { type: [BreakdownItemSchema], default: [] },
    explanation: { type: String, required: true },

    // Adjustment signals (optional; explainable).
    dupAdj: { type: Number, default: 0 },
    typingAdj: { type: Number, default: 0 },
    embeddingAudit: { type: EmbeddingAuditSchema },

    tags: { type: [String], default: [] },
    blockchain: { type: BlockchainSchema, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', FeedbackSchema);
