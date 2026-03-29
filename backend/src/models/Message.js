const mongoose = require('mongoose');

const MessageReplySchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    repliedBy: { type: String, enum: ['VENDOR', 'ADMIN'], default: 'VENDOR' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    referenceId: { type: String, trim: true, uppercase: true, maxlength: 20, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    userName: { type: String, required: true, trim: true, maxlength: 120 },
    userEmail: { type: String, trim: true, lowercase: true, maxlength: 200 },
    userPhone: { type: String, trim: true, maxlength: 40 },
    reply: { type: String, trim: true, maxlength: 2000, default: '' },
    replies: { type: [MessageReplySchema], default: [] },
    status: {
      type: String,
      enum: ['open', 'replied', 'closed'],
      default: 'open',
      index: true,
    },
    source: { type: String, enum: ['chatbot', 'public-page', 'manual'], default: 'chatbot' },
    ipHash: { type: String, index: true },
  },
  { timestamps: true }
);

MessageSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
MessageSchema.index({ userEmail: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
