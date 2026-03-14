const mongoose = require('mongoose');

const DeliveryEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String },
    trackingRef: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RequestLocationSchema = new mongoose.Schema(
  {
    ipHash: { type: String },
    countryCode: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    timezone: { type: String },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'], default: 'UNKNOWN' },
    source: { type: String, default: 'unknown' },
    isPublicIp: { type: Boolean, default: false },
    lookupFailed: { type: Boolean, default: false },
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },

    customerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    productDetails: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },

    paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING', index: true },
    locked: { type: Boolean, default: false },

    deliveryStatus: {
      type: String,
      enum: [
        'CREATED',
        'DISPATCHED',
        'IN_TRANSIT',
        'IN_CUSTOMS',
        'OUT_OF_CUSTOMS',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ],
      default: 'CREATED',
      index: true,
    },
    deliveryHistory: { type: [DeliveryEventSchema], default: [] },

    feedbackCode: { type: String, required: true, unique: true, index: true },
    createdLocation: { type: RequestLocationSchema },
    paymentLocation: { type: RequestLocationSchema },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
