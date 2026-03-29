const mongoose = require('mongoose');

const AdminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    trustThresholds: {
      trustedMin: { type: Number, default: 71, min: 0, max: 100 },
      mediumMin: { type: Number, default: 40, min: 0, max: 100 },
    },
    fraudSensitivity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    alerts: {
      repeatedDeviceMin: { type: Number, default: 3, min: 2, max: 20 },
      networkReviewMin: { type: Number, default: 3, min: 2, max: 20 },
      duplicateClusterMin: { type: Number, default: 2, min: 2, max: 20 },
      vendorSpikeMin: { type: Number, default: 8, min: 2, max: 100 },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSettings', AdminSettingsSchema);
