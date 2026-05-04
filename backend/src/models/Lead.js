const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: 240,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
      index: true,
    },
    product: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
      index: true,
    },
    dosage: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    quantity: {
      type: Number,
      default: null,
    },
    price: {
      type: Number,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    paymentLink: {
      type: String,
      trim: true,
      maxlength: 320,
      default: '',
    },
    invoiceId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    trackingId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    trackingLink: {
      type: String,
      trim: true,
      maxlength: 320,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted'],
      default: 'new',
      index: true,
    },
    crmStage: {
      type: String,
      enum: [
        'new_lead',
        'contacted',
        'negotiation_follow_up',
        'invoice_sent',
        'payment_pending',
        'payment_received',
        'order_processing',
        'shipped',
        'delivered',
        'feedback_retention',
      ],
      default: 'new_lead',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    followUpAt: {
      type: Date,
      default: null,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['not_started', 'pending', 'paid'],
      default: 'not_started',
      index: true,
    },
    deliveryStatus: {
      type: String,
      enum: [
        'not_started',
        'processing',
        'dispatched',
        'in_transit',
        'in_customs',
        'out_of_customs',
        'out_for_delivery',
        'delivered',
      ],
      default: 'not_started',
      index: true,
    },
    trackingRef: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', ''],
      default: '',
    },
    nextPurchaseProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    linkedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    notes: [
      {
        text: { type: String, trim: true, maxlength: 2000, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: String, trim: true, maxlength: 160, default: 'vendor' },
      },
    ],
    activityLog: [
      {
        type: { type: String, trim: true, maxlength: 80, default: 'update' },
        message: { type: String, trim: true, maxlength: 240, required: true },
        createdAt: { type: Date, default: Date.now },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

LeadSchema.index({ vendorId: 1, createdAt: -1 });
LeadSchema.index({ vendorId: 1, country: 1, product: 1, status: 1 });
LeadSchema.index({ vendorId: 1, crmStage: 1, deletedAt: 1, followUpAt: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
