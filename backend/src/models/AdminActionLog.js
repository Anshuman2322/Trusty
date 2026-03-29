const mongoose = require('mongoose');

const AdminActionLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      required: true,
      enum: ['FLAG_VENDOR', 'UNFLAG_VENDOR', 'TERMINATE_VENDOR', 'REACTIVATE_VENDOR'],
    },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorEmail: { type: String, required: true, trim: true, lowercase: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    reason: { type: String, trim: true, maxlength: 500, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminActionLog', AdminActionLogSchema);
