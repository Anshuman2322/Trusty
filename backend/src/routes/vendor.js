const express = require('express');
const crypto = require('crypto');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const OTP = require('../models/OTP');
const { requireAuth, requireRole, requireVendorParamMatch } = require('../middleware/authMiddleware');
const { hashPassword, signToken, verifyPassword, httpError } = require('../services/authService');
const { sendVerificationOtpEmail } = require('../utils/sendEmail');
const { extractClientIp } = require('../services/ipIntelService');
const { withMongoReadRetry } = require('../services/mongoReadRetry');
const {
  createOrder,
  confirmPayment,
  updateDeliveryStatus,
  getVendorOverview,
} = require('../services/vendorService');

const vendorRouter = express.Router();

const VENDOR_ALLOWED_CATEGORIES = new Set([
  'Electronics',
  'Home Goods',
  'Services',
  'Food & Restaurant',
  'Retail',
  'Food',
  'Pharmaceutical Exporter',
  'General Store',
  'Pharmacy',
  'Healthcare',
  'AI Engineer',
  'Developer',
  'DevOps Engineer',
  'Freelancer',
  'Other',
]);

const VENDOR_PROFILE_CATEGORIES = new Set([
  'Electronics',
  'Services',
  'Retail',
  'Food',
  'Pharmaceutical Exporter',
  'General Store',
  'Pharmacy',
  'Healthcare',
  'AI Engineer',
  'Developer',
  'DevOps Engineer',
  'Freelancer',
  'Other',
]);

const VENDOR_FRAUD_SENSITIVITY_LEVELS = new Set(['Low', 'Medium', 'High']);
const VENDOR_DASHBOARD_DEFAULT_VIEWS = new Set(['Dashboard', 'Orders', 'Analytics']);
const VENDOR_CURRENCY_FORMATS = new Set(['INR', 'USD']);

const VENDOR_SETTINGS_DEFAULTS = {
  feedback: {
    enableFeedbackCollection: true,
    autoGenerateFeedbackTokens: true,
    allowAnonymousFeedback: true,
    requirePaymentVerification: true,
    requireDeliveryCompletion: true,
  },
  trustFraud: {
    highlightLowTrustReviews: true,
    autoFlagSuspiciousFeedback: true,
    fraudSensitivityLevel: 'Medium',
    minimumTrustThreshold: 40,
  },
  notifications: {
    newFeedbackAlert: true,
    lowTrustAlert: true,
    fraudAlert: true,
    paymentUpdateAlert: true,
    deliveryUpdateAlert: true,
    emailNotifications: true,
    weeklyReportEmail: false,
    newFeedbackPush: false,
    riskAlertsPush: true,
  },
  security: {
    twoFactorAuthEnabled: false,
  },
  privacy: {
    showEmailPublicly: false,
    showPhonePublicly: false,
    allowUsageAnalytics: true,
  },
  system: {
    darkMode: false,
    defaultDashboardView: 'Dashboard',
    currencyFormat: 'INR',
    language: 'English',
  },
  advanced: {
    showTrustScorePublicly: true,
    showLocationInFeedback: true,
    enableFeedbackLabels: true,
  },
};

const VENDOR_PROFILE_VISIBILITY_DEFAULTS = {
  businessName: true,
  businessEmail: false,
  businessCategory: true,
  businessWebsite: false,
  businessId: false,
  country: true,
  state: false,
  city: false,
  contactPersonName: false,
  phoneNumber: false,
  supportEmail: false,
  description: false,
  additionalInfo: false,
  trustScore: true,
};

function cloneVendorSettingsDefaults() {
  return JSON.parse(JSON.stringify(VENDOR_SETTINGS_DEFAULTS));
}

function coerceBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const text = String(value || '').trim().toLowerCase();
  if (text === 'true' || text === '1' || text === 'yes' || text === 'on') return true;
  if (text === 'false' || text === '0' || text === 'no' || text === 'off') return false;

  return fallback;
}

function clampThreshold(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeEnum(value, allowed, fallback) {
  const raw = String(value || '').trim();
  if (allowed.has(raw)) return raw;
  return fallback;
}

function normalizeLanguage(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw.slice(0, 40);
}

function normalizeProfileVisibility(rawVisibility = {}) {
  const source =
    rawVisibility && typeof rawVisibility === 'object' && !Array.isArray(rawVisibility)
      ? rawVisibility
      : {};

  return {
    businessName: coerceBoolean(source.businessName, VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessName),
    businessEmail: coerceBoolean(
      source.businessEmail,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessEmail
    ),
    businessCategory: coerceBoolean(
      source.businessCategory,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessCategory
    ),
    businessWebsite: coerceBoolean(
      source.businessWebsite,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessWebsite
    ),
    businessId: coerceBoolean(source.businessId, VENDOR_PROFILE_VISIBILITY_DEFAULTS.businessId),
    country: coerceBoolean(source.country, VENDOR_PROFILE_VISIBILITY_DEFAULTS.country),
    state: coerceBoolean(source.state, VENDOR_PROFILE_VISIBILITY_DEFAULTS.state),
    city: coerceBoolean(source.city, VENDOR_PROFILE_VISIBILITY_DEFAULTS.city),
    contactPersonName: coerceBoolean(
      source.contactPersonName,
      VENDOR_PROFILE_VISIBILITY_DEFAULTS.contactPersonName
    ),
    phoneNumber: coerceBoolean(source.phoneNumber, VENDOR_PROFILE_VISIBILITY_DEFAULTS.phoneNumber),
    supportEmail: coerceBoolean(source.supportEmail, VENDOR_PROFILE_VISIBILITY_DEFAULTS.supportEmail),
    description: coerceBoolean(source.description, VENDOR_PROFILE_VISIBILITY_DEFAULTS.description),
    additionalInfo: coerceBoolean(source.additionalInfo, VENDOR_PROFILE_VISIBILITY_DEFAULTS.additionalInfo),
    trustScore: coerceBoolean(source.trustScore, VENDOR_PROFILE_VISIBILITY_DEFAULTS.trustScore),
  };
}

function normalizeVendorSettings(rawSettings = {}) {
  const defaults = cloneVendorSettingsDefaults();

  const feedback = rawSettings?.feedback || {};
  const trustFraud = rawSettings?.trustFraud || {};
  const notifications = rawSettings?.notifications || {};
  const security = rawSettings?.security || {};
  const privacy = rawSettings?.privacy || {};
  const system = rawSettings?.system || {};
  const advanced = rawSettings?.advanced || {};

  return {
    feedback: {
      enableFeedbackCollection: coerceBoolean(
        feedback.enableFeedbackCollection,
        defaults.feedback.enableFeedbackCollection
      ),
      autoGenerateFeedbackTokens: coerceBoolean(
        feedback.autoGenerateFeedbackTokens,
        defaults.feedback.autoGenerateFeedbackTokens
      ),
      allowAnonymousFeedback: coerceBoolean(
        feedback.allowAnonymousFeedback,
        defaults.feedback.allowAnonymousFeedback
      ),
      requirePaymentVerification: coerceBoolean(
        feedback.requirePaymentVerification,
        defaults.feedback.requirePaymentVerification
      ),
      requireDeliveryCompletion: coerceBoolean(
        feedback.requireDeliveryCompletion,
        defaults.feedback.requireDeliveryCompletion
      ),
    },
    trustFraud: {
      highlightLowTrustReviews: coerceBoolean(
        trustFraud.highlightLowTrustReviews,
        defaults.trustFraud.highlightLowTrustReviews
      ),
      autoFlagSuspiciousFeedback: coerceBoolean(
        trustFraud.autoFlagSuspiciousFeedback,
        defaults.trustFraud.autoFlagSuspiciousFeedback
      ),
      fraudSensitivityLevel: normalizeEnum(
        trustFraud.fraudSensitivityLevel,
        VENDOR_FRAUD_SENSITIVITY_LEVELS,
        defaults.trustFraud.fraudSensitivityLevel
      ),
      minimumTrustThreshold: clampThreshold(
        trustFraud.minimumTrustThreshold,
        defaults.trustFraud.minimumTrustThreshold
      ),
    },
    notifications: {
      newFeedbackAlert: coerceBoolean(
        notifications.newFeedbackAlert,
        defaults.notifications.newFeedbackAlert
      ),
      lowTrustAlert: coerceBoolean(notifications.lowTrustAlert, defaults.notifications.lowTrustAlert),
      fraudAlert: coerceBoolean(notifications.fraudAlert, defaults.notifications.fraudAlert),
      paymentUpdateAlert: coerceBoolean(
        notifications.paymentUpdateAlert,
        defaults.notifications.paymentUpdateAlert
      ),
      deliveryUpdateAlert: coerceBoolean(
        notifications.deliveryUpdateAlert,
        defaults.notifications.deliveryUpdateAlert
      ),
      emailNotifications: coerceBoolean(
        notifications.emailNotifications,
        defaults.notifications.emailNotifications
      ),
      weeklyReportEmail: coerceBoolean(
        notifications.weeklyReportEmail,
        defaults.notifications.weeklyReportEmail
      ),
      newFeedbackPush: coerceBoolean(
        notifications.newFeedbackPush,
        defaults.notifications.newFeedbackPush
      ),
      riskAlertsPush: coerceBoolean(
        notifications.riskAlertsPush,
        defaults.notifications.riskAlertsPush
      ),
    },
    security: {
      twoFactorAuthEnabled: coerceBoolean(
        security.twoFactorAuthEnabled,
        defaults.security.twoFactorAuthEnabled
      ),
    },
    privacy: {
      showEmailPublicly: coerceBoolean(
        privacy.showEmailPublicly,
        defaults.privacy.showEmailPublicly
      ),
      showPhonePublicly: coerceBoolean(
        privacy.showPhonePublicly,
        defaults.privacy.showPhonePublicly
      ),
      allowUsageAnalytics: coerceBoolean(
        privacy.allowUsageAnalytics,
        defaults.privacy.allowUsageAnalytics
      ),
    },
    system: {
      darkMode: coerceBoolean(system.darkMode, defaults.system.darkMode),
      defaultDashboardView: normalizeEnum(
        system.defaultDashboardView,
        VENDOR_DASHBOARD_DEFAULT_VIEWS,
        defaults.system.defaultDashboardView
      ),
      currencyFormat: normalizeEnum(
        system.currencyFormat,
        VENDOR_CURRENCY_FORMATS,
        defaults.system.currencyFormat
      ),
      language: normalizeLanguage(system.language, defaults.system.language),
    },
    advanced: {
      showTrustScorePublicly: coerceBoolean(
        advanced.showTrustScorePublicly,
        defaults.advanced.showTrustScorePublicly
      ),
      showLocationInFeedback: coerceBoolean(
        advanced.showLocationInFeedback,
        defaults.advanced.showLocationInFeedback
      ),
      enableFeedbackLabels: coerceBoolean(
        advanced.enableFeedbackLabels,
        defaults.advanced.enableFeedbackLabels
      ),
    },
  };
}

function buildVendorSettingsPayload(rawSettings = {}) {
  return normalizeVendorSettings(rawSettings);
}

function normalizeCategoryForProfileView(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Other';
  if (raw === 'Home Goods') return 'Retail';
  if (raw === 'Food & Restaurant') return 'Food';
  if (VENDOR_PROFILE_CATEGORIES.has(raw)) return raw;
  return 'Other';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(email, otp) {
  const pepper = String(process.env.OTP_PEPPER || '').trim();
  const payload = `${normalizeEmail(email)}:${String(otp || '').trim()}:${pepper}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function sanitizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  return raw.replace(/\s+/g, ' ');
}

function isValidPhone(value) {
  return /^\+?[0-9()\-.\s]{7,20}$/.test(String(value || '').trim());
}

function normalizeWebsite(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function isValidWebsite(value) {
  if (!value) return true;
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidLogoDataUrl(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  return /^data:image\/(png|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(text);
}

function estimateDataUrlBytes(value) {
  const text = String(value || '').trim();
  const commaIndex = text.indexOf(',');
  if (commaIndex < 0) return 0;
  const base64Payload = text.slice(commaIndex + 1).replace(/\s+/g, '');
  const padding = base64Payload.endsWith('==') ? 2 : base64Payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64Payload.length * 3) / 4) - padding);
}

function buildVendorProfilePayload(vendor, trustScore = null) {
  return {
    businessName: String(vendor?.name || ''),
    businessEmail: String(vendor?.email || ''),
    businessLogo: String(vendor?.businessLogo || ''),
    businessCategory: normalizeCategoryForProfileView(vendor?.category),
    businessWebsite: String(vendor?.website || ''),
    businessId: String(vendor?.gstBusinessId || ''),
    country: String(vendor?.country || ''),
    state: String(vendor?.state || ''),
    city: String(vendor?.city || ''),
    contactPersonName: String(vendor?.contactName || ''),
    phoneNumber: String(vendor?.phone || ''),
    supportEmail: String(vendor?.supportEmail || vendor?.contactEmail || ''),
    description: String(vendor?.description || ''),
    additionalInfoHeading: String(vendor?.additionalInfoHeading || ''),
    additionalInfoResult: String(vendor?.additionalInfoResult || ''),
    publicVisibility: normalizeProfileVisibility(vendor?.profileVisibility || {}),
    trustScore: Number.isFinite(Number(trustScore)) ? Math.max(0, Math.min(100, Math.round(Number(trustScore)))) : null,
  };
}

function buildVendorAuthPayload({ user, vendor }) {
  const vendorId = String(vendor._id);
  const token = signToken({
    userId: String(user._id),
    role: 'VENDOR',
    email: user.email,
    vendorId,
  });

  return {
    token,
    user: {
      role: 'VENDOR',
      email: user.email,
      vendorId,
      vendorName: vendor.name,
    },
  };
}

vendorRouter.post('/signup', async (req, res, next) => {
  try {
    throw httpError(
      410,
      'Direct signup is disabled. Use /api/auth/send-otp, /api/auth/verify-otp, and /api/auth/vendor-signup.',
      'DEPRECATED'
    );
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const otpInput = String(req.body?.otp || '').trim();

    if (!email || !password) throw httpError(400, 'email and password are required', 'VALIDATION');
    if (!isValidEmail(email)) throw httpError(400, 'Please provide a valid email address', 'VALIDATION');

    const user = await withMongoReadRetry('vendor login user lookup', async () =>
      User.findOne({ email, role: 'VENDOR' })
    );
    if (!user) throw httpError(401, 'Invalid credentials', 'AUTH');

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) throw httpError(401, 'Invalid credentials', 'AUTH');

    if (!user.vendorId) throw httpError(403, 'Vendor account is not linked', 'FORBIDDEN');

    const vendor = await withMongoReadRetry('vendor login profile lookup', async () =>
      Vendor.findById(user.vendorId)
    );
    if (!vendor) throw httpError(403, 'Vendor profile not found', 'FORBIDDEN');
    if (vendor.isTerminated) {
      throw httpError(
        403,
        'Vendor account is terminated. Contact platform admin for review.',
        'VENDOR_TERMINATED'
      );
    }

    if (!otpInput) {
      const otpCode = generateOtpCode();
      const otpHash = hashOtp(email, otpCode);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await OTP.findOneAndUpdate(
        { email, purpose: 'LOGIN' },
        {
          $set: {
            otp: otpHash,
            attemptsLeft: 3,
            expiresAt,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      let delivery = { delivered: false, reason: 'EMAIL_SEND_SKIPPED' };
      try {
        const timeoutMs = 5000;
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ delivered: false, reason: 'EMAIL_TIMEOUT' }), timeoutMs);
        });

        delivery = await Promise.race([
          sendVerificationOtpEmail({ toEmail: email, otp: otpCode }),
          timeoutPromise,
        ]);
      } catch (err) {
        console.error('Email failed:', err.message);
        delivery = { delivered: false, reason: 'EMAIL_ERROR' };
      }

      if (delivery?.delivered === false) {
        console.error('Email failed:', delivery?.reason || 'EMAIL_SEND_FAILED');
      }

      res.json({
        ok: true,
        requiresOtp: true,
        message: 'OTP sent (or fallback)',
      });
      return;
    }

    const otpDoc = await OTP.findOne({ email, purpose: 'LOGIN' });
    if (!otpDoc) throw httpError(400, 'Invalid OTP. Please request a new code.', 'OTP_INVALID');

    if (new Date(otpDoc.expiresAt).getTime() <= Date.now()) {
      await OTP.deleteOne({ _id: otpDoc._id });
      throw httpError(400, 'OTP expired. Please request a new code.', 'OTP_EXPIRED');
    }

    if (Number(otpDoc.attemptsLeft || 0) <= 0) {
      await OTP.deleteOne({ _id: otpDoc._id });
      throw httpError(429, 'OTP attempt limit exceeded. Please request a new code.', 'OTP_ATTEMPTS_EXCEEDED');
    }

    const incomingHash = hashOtp(email, otpInput);
    if (incomingHash !== String(otpDoc.otp || '')) {
      otpDoc.attemptsLeft = Math.max(0, Number(otpDoc.attemptsLeft || 0) - 1);
      if (otpDoc.attemptsLeft <= 0) {
        await OTP.deleteOne({ _id: otpDoc._id });
      } else {
        await otpDoc.save();
      }
      throw httpError(400, 'Invalid OTP', 'OTP_INVALID');
    }

    await OTP.deleteOne({ _id: otpDoc._id });
    user.lastLoginAt = new Date();
    await user.save();

    const authPayload = buildVendorAuthPayload({ user, vendor });

    res.json({ ok: true, ...authPayload });
  } catch (err) {
    next(err);
  }
});

vendorRouter.use(requireAuth);
vendorRouter.use(requireRole('VENDOR'));
vendorRouter.use(async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    if (!vendorId) return next(httpError(403, 'Vendor access required', 'FORBIDDEN'));

    const vendor = await withMongoReadRetry('vendor active check', async () =>
      Vendor.findById(vendorId).select({ isTerminated: 1 }).lean()
    );
    if (!vendor) return next(httpError(404, 'Vendor profile not found', 'VENDOR_NOT_FOUND'));
    if (vendor.isTerminated) {
      return next(
        httpError(
          403,
          'Vendor account is terminated. Access is read-only and dashboard actions are disabled.',
          'VENDOR_TERMINATED'
        )
      );
    }
    return next();
  } catch (err) {
    return next(err);
  }
});
vendorRouter.use('/:vendorId', requireVendorParamMatch);

vendorRouter.get('/:vendorId/overview', async (req, res, next) => {
  try {
    const overview = await getVendorOverview(req.params.vendorId);
    res.json({ ok: true, overview });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:vendorId/dashboard-bootstrap', async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;

    // Retry the full bootstrap read bundle together to survive short-lived TLS pool clears.
    const [overview, orders, feedbacks, vendor] = await withMongoReadRetry(
      'vendor dashboard bootstrap aggregate read',
      async () =>
        Promise.all([
          getVendorOverview(vendorId),
          withMongoReadRetry('vendor dashboard bootstrap orders', async () =>
            Order.find({ vendorId }).sort({ createdAt: -1 }).lean()
          ),
          withMongoReadRetry('vendor dashboard bootstrap feedbacks', async () =>
            Feedback.find({ vendorId }).sort({ createdAt: -1 }).lean()
          ),
          withMongoReadRetry('vendor dashboard bootstrap profile', async () =>
            Vendor.findById(vendorId).lean()
          ),
        ])
    );

    if (!vendor) throw httpError(404, 'Vendor profile not found', 'VENDOR_NOT_FOUND');

    const profile = buildVendorProfilePayload(vendor, overview?.averageTrustScore);
    const settings = buildVendorSettingsPayload(vendor?.settings || {});

    res.json({ ok: true, overview, orders, feedbacks, profile, settings });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:vendorId/profile', async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    // Retry profile + overview together to avoid transient 500 responses on temporary TLS errors.
    const [vendor, overview] = await withMongoReadRetry('vendor profile aggregate read', async () =>
      Promise.all([
        withMongoReadRetry('vendor profile read', async () => Vendor.findById(vendorId).lean()),
        getVendorOverview(vendorId),
      ])
    );

    if (!vendor) throw httpError(404, 'Vendor profile not found', 'VENDOR_NOT_FOUND');

    res.json({
      ok: true,
      profile: buildVendorProfilePayload(vendor, overview?.averageTrustScore),
    });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/profile', async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const businessName = String(req.body?.businessName || '').trim();
    const businessEmail = normalizeEmail(req.body?.businessEmail);
    const businessCategory = String(req.body?.businessCategory || '').trim();
    const businessLogo = String(req.body?.businessLogo || '').trim();
    const country = String(req.body?.country || '').trim();
    const state = String(req.body?.state || '').trim();
    const city = String(req.body?.city || '').trim();
    const contactPersonName = String(req.body?.contactPersonName || '').trim();
    const phoneNumber = sanitizePhone(req.body?.phoneNumber);
    const supportEmail = normalizeEmail(req.body?.supportEmail);
    const description = String(req.body?.description || '').trim();
    const additionalInfoHeading = String(req.body?.additionalInfoHeading || '').trim();
    const additionalInfoResult = String(req.body?.additionalInfoResult || '').trim();
    const businessId = String(req.body?.businessId || '').trim();
    const businessWebsite = normalizeWebsite(req.body?.businessWebsite);

    if (!businessName) throw httpError(400, 'Business name is required', 'VALIDATION');
    if (!businessEmail) throw httpError(400, 'Business email is required', 'VALIDATION');
    if (!isValidEmail(businessEmail)) throw httpError(400, 'Please provide a valid business email', 'VALIDATION');
    if (!businessCategory || !VENDOR_PROFILE_CATEGORIES.has(businessCategory)) {
      throw httpError(400, 'Please choose a valid business category', 'VALIDATION');
    }
    if (!country) throw httpError(400, 'Country is required', 'VALIDATION');
    if (!city) throw httpError(400, 'City is required', 'VALIDATION');
    if (phoneNumber && !isValidPhone(phoneNumber)) {
      throw httpError(400, 'Please provide a valid phone number', 'VALIDATION');
    }
    if (supportEmail && !isValidEmail(supportEmail)) {
      throw httpError(400, 'Please provide a valid support email', 'VALIDATION');
    }
    if (businessWebsite && !isValidWebsite(businessWebsite)) {
      throw httpError(400, 'Please provide a valid website URL', 'VALIDATION');
    }
    if (!isValidLogoDataUrl(businessLogo)) {
      throw httpError(400, 'Business logo must be PNG or SVG data URL', 'VALIDATION');
    }
    if (estimateDataUrlBytes(businessLogo) > 2 * 1024 * 1024) {
      throw httpError(400, 'Business logo file size must be 2MB or less', 'VALIDATION');
    }
    if (description.length > 1500) throw httpError(400, 'Description is too long', 'VALIDATION');
    if (additionalInfoHeading.length > 120) {
      throw httpError(400, 'Additional info heading is too long', 'VALIDATION');
    }
    if (additionalInfoResult.length > 1500) {
      throw httpError(400, 'Additional info result is too long', 'VALIDATION');
    }
    if (additionalInfoResult && !additionalInfoHeading) {
      throw httpError(400, 'Additional info heading is required when result is provided', 'VALIDATION');
    }
    if (businessId.length > 120) throw httpError(400, 'Business ID is too long', 'VALIDATION');

    const [vendor, user] = await Promise.all([
      Vendor.findById(vendorId),
      User.findOne({ vendorId, role: 'VENDOR' }),
    ]);

    if (!vendor) throw httpError(404, 'Vendor profile not found', 'VENDOR_NOT_FOUND');
    if (!user) throw httpError(404, 'Vendor user not found', 'VENDOR_USER_NOT_FOUND');

    const incomingVisibility = req.body?.publicVisibility;
    const mergedVisibility =
      incomingVisibility && typeof incomingVisibility === 'object' && !Array.isArray(incomingVisibility)
        ? { ...(vendor.profileVisibility || {}), ...incomingVisibility }
        : vendor.profileVisibility || {};
    const normalizedVisibility = normalizeProfileVisibility(mergedVisibility);

    if (businessEmail !== String(user.email || '')) {
      const [emailUserConflict, emailVendorConflict] = await Promise.all([
        withMongoReadRetry('vendor profile user email conflict check', async () =>
          User.findOne({ email: businessEmail, _id: { $ne: user._id } }).lean()
        ),
        withMongoReadRetry('vendor profile vendor email conflict check', async () =>
          Vendor.findOne({ email: businessEmail, _id: { $ne: vendor._id } }).lean()
        ),
      ]);

      if (emailUserConflict || emailVendorConflict) {
        throw httpError(409, 'Business email is already in use', 'CONFLICT');
      }
    }

    vendor.name = businessName;
    vendor.email = businessEmail;
    vendor.businessLogo = businessLogo || undefined;
    vendor.category = businessCategory;
    vendor.website = businessWebsite || undefined;
    vendor.gstBusinessId = businessId || undefined;
    vendor.country = country;
    vendor.state = state || undefined;
    vendor.city = city;
    vendor.contactName = contactPersonName || undefined;
    vendor.phone = phoneNumber || undefined;
    vendor.supportEmail = supportEmail || undefined;
    vendor.contactEmail = supportEmail || businessEmail;
    vendor.description = description || undefined;
    vendor.additionalInfoHeading = additionalInfoHeading || undefined;
    vendor.additionalInfoResult = additionalInfoResult || undefined;
    vendor.profileVisibility = normalizedVisibility;
    await vendor.save();

    if (businessEmail !== String(user.email || '')) {
      user.email = businessEmail;
      await user.save();
    }

    const overview = await getVendorOverview(vendorId);
    const authPayload = buildVendorAuthPayload({ user, vendor });

    res.json({
      ok: true,
      message: 'Profile updated successfully',
      profile: buildVendorProfilePayload(vendor.toObject(), overview?.averageTrustScore),
      ...authPayload,
    });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:vendorId/settings', async (req, res, next) => {
  try {
    const vendor = await withMongoReadRetry('vendor settings read', async () =>
      Vendor.findById(req.params.vendorId).lean()
    );

    if (!vendor) throw httpError(404, 'Vendor profile not found', 'VENDOR_NOT_FOUND');

    res.json({
      ok: true,
      settings: buildVendorSettingsPayload(vendor?.settings || {}),
    });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/settings', async (req, res, next) => {
  try {
    const incomingSettings = req.body?.settings ?? req.body;
    if (!incomingSettings || typeof incomingSettings !== 'object' || Array.isArray(incomingSettings)) {
      throw httpError(400, 'Settings payload must be an object', 'VALIDATION');
    }

    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) throw httpError(404, 'Vendor profile not found', 'VENDOR_NOT_FOUND');

    const normalizedSettings = normalizeVendorSettings(incomingSettings);
    vendor.settings = normalizedSettings;
    await vendor.save();

    res.json({
      ok: true,
      message: 'Settings updated successfully',
      settings: buildVendorSettingsPayload(vendor.settings || {}),
    });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/settings/password', async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw httpError(400, 'Current password, new password, and confirmation are required', 'VALIDATION');
    }
    if (newPassword.length < 8) {
      throw httpError(400, 'New password must be at least 8 characters', 'VALIDATION');
    }
    if (newPassword !== confirmPassword) {
      throw httpError(400, 'New password and confirmation do not match', 'VALIDATION');
    }

    const user = await User.findOne({ vendorId, role: 'VENDOR' });
    if (!user) throw httpError(404, 'Vendor user not found', 'VENDOR_USER_NOT_FOUND');

    const currentMatches = await verifyPassword(currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw httpError(400, 'Current password is incorrect', 'VALIDATION');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.json({
      ok: true,
      message: 'Password updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:vendorId/orders', async (req, res, next) => {
  try {
    const orders = await withMongoReadRetry('vendor orders', async () =>
      Order.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 }).lean()
    );
    res.json({ ok: true, orders });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/orders', async (req, res, next) => {
  try {
    const created = await createOrder({
      vendorId: req.params.vendorId,
      payload: req.body,
      requestMeta: { clientIp: extractClientIp(req), headers: req.headers },
    });
    res.status(201).json({ ok: true, created });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/orders/:orderId/confirm-payment', async (req, res, next) => {
  try {
    const updated = await confirmPayment({
      vendorId: req.params.vendorId,
      orderId: req.params.orderId,
      requestMeta: { clientIp: extractClientIp(req), headers: req.headers },
    });
    res.json({ ok: true, updated });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/:vendorId/orders/:orderId/delivery-status', async (req, res, next) => {
  try {
    const updated = await updateDeliveryStatus({
      vendorId: req.params.vendorId,
      orderId: req.params.orderId,
      payload: req.body,
    });
    res.json({ ok: true, updated });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:vendorId/feedbacks', async (req, res, next) => {
  try {
    const feedbacks = await withMongoReadRetry('vendor feedbacks', async () =>
      Feedback.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 }).lean()
    );
    res.json({ ok: true, feedbacks });
  } catch (err) {
    next(err);
  }
});

module.exports = { vendorRouter };
