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
  },
  { timestamps: true }
);

LeadSchema.index({ vendorId: 1, createdAt: -1 });
LeadSchema.index({ vendorId: 1, country: 1, product: 1, status: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
