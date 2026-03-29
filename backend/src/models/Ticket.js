const mongoose = require('mongoose');

const TicketReplySchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    repliedBy: { type: String, enum: ['ADMIN', 'SYSTEM'], default: 'ADMIN' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerFollowUpSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TicketSchema = new mongoose.Schema(
  {
    referenceId: { type: String, trim: true, uppercase: true, maxlength: 20, index: true },
    issueType: { type: String, required: true, trim: true, maxlength: 120, index: true },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200, index: true },
    phone: { type: String, trim: true, maxlength: 40 },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved'],
      default: 'open',
      index: true,
    },
    adminReply: { type: String, trim: true, maxlength: 3000, default: '' },
    replies: { type: [TicketReplySchema], default: [] },
    customerFollowUps: { type: [CustomerFollowUpSchema], default: [] },
    customerSatisfaction: {
      type: String,
      enum: ['pending', 'satisfied', 'not-satisfied'],
      default: 'pending',
      index: true,
    },
    customerClosedAt: { type: Date, default: null },
    customerCloseNote: { type: String, trim: true, maxlength: 600, default: '' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },
    source: { type: String, enum: ['chatbot', 'public-page', 'vendor-escalation', 'manual'], default: 'chatbot' },
    ipHash: { type: String, index: true },
  },
  { timestamps: true }
);

TicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', TicketSchema);
