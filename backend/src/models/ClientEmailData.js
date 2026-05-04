const mongoose = require('mongoose');

const ClientEmailDataSchema = new mongoose.Schema(
  {
    clientKey: { type: String, required: true, trim: true, unique: true, index: true },
    data: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientEmailData', ClientEmailDataSchema);
