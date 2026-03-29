const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    purpose: {
      type: String,
      required: true,
      enum: ['SIGNUP', 'RESET_PASSWORD', 'LOGIN', 'ADMIN_LOGIN'],
      default: 'SIGNUP',
    },
    // Stored as a hash; never persist raw OTP.
    otp: { type: String, required: true },
    attemptsLeft: { type: Number, required: true, default: 3, min: 0, max: 3 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

OTPSchema.index({ email: 1, purpose: 1 }, { unique: true });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', OTPSchema);
