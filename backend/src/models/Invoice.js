const mongoose = require('mongoose');

const EmailEventSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    bodyPreview: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['ISSUED', 'PAID'], default: 'ISSUED', index: true },
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    emails: { type: [EmailEventSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', InvoiceSchema);
