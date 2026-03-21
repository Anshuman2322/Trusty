const mongoose = require('mongoose');

const VendorSettingsSchema = new mongoose.Schema(
  {
    feedback: {
      enableFeedbackCollection: { type: Boolean, default: true },
      autoGenerateFeedbackTokens: { type: Boolean, default: true },
      allowAnonymousFeedback: { type: Boolean, default: true },
      requirePaymentVerification: { type: Boolean, default: true },
      requireDeliveryCompletion: { type: Boolean, default: true },
    },
    trustFraud: {
      highlightLowTrustReviews: { type: Boolean, default: true },
      autoFlagSuspiciousFeedback: { type: Boolean, default: true },
      fraudSensitivityLevel: { type: String, trim: true, default: 'Medium' },
      minimumTrustThreshold: { type: Number, default: 40 },
    },
    notifications: {
      newFeedbackAlert: { type: Boolean, default: true },
      lowTrustAlert: { type: Boolean, default: true },
      fraudAlert: { type: Boolean, default: true },
      paymentUpdateAlert: { type: Boolean, default: true },
      deliveryUpdateAlert: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },
    system: {
      darkMode: { type: Boolean, default: false },
      defaultDashboardView: { type: String, trim: true, default: 'Dashboard' },
      currencyFormat: { type: String, trim: true, default: 'INR' },
      language: { type: String, trim: true, default: 'English' },
    },
    advanced: {
      showTrustScorePublicly: { type: Boolean, default: true },
      showLocationInFeedback: { type: Boolean, default: true },
      enableFeedbackLabels: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const VendorPublicVisibilitySchema = new mongoose.Schema(
  {
    businessName: { type: Boolean, default: true },
    businessEmail: { type: Boolean, default: false },
    businessCategory: { type: Boolean, default: true },
    businessWebsite: { type: Boolean, default: false },
    businessId: { type: Boolean, default: false },
    country: { type: Boolean, default: true },
    state: { type: Boolean, default: false },
    city: { type: Boolean, default: false },
    contactPersonName: { type: Boolean, default: false },
    phoneNumber: { type: Boolean, default: false },
    supportEmail: { type: Boolean, default: false },
    description: { type: Boolean, default: false },
    trustScore: { type: Boolean, default: true },
  },
  { _id: false }
);

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    contactEmail: { type: String, trim: true },
    supportEmail: { type: String, trim: true, lowercase: true },
    category: { type: String, trim: true },
    website: { type: String, trim: true },
    gstBusinessId: { type: String, trim: true },
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    contactName: { type: String, trim: true },
    phone: { type: String, trim: true },
    description: { type: String, trim: true },
    profileVisibility: { type: VendorPublicVisibilitySchema, default: () => ({}) },
    settings: { type: VendorSettingsSchema, default: () => ({}) },
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', VendorSchema);
