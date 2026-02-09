const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    contactEmail: { type: String, trim: true },
    category: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', VendorSchema);
