const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const OTP = require('../models/OTP');
const { sendVerificationOtpEmail } = require('../utils/sendEmail');
const { signToken, verifyPassword, hashPassword, httpError } = require('../services/authService');
const { withMongoReadRetry } = require('../services/mongoReadRetry');
const { requireAuth } = require('../middleware/authMiddleware');

const authRouter = express.Router();

const OTP_PURPOSES = {
  SIGNUP: 'SIGNUP',
  RESET_PASSWORD: 'RESET_PASSWORD',
  ADMIN_LOGIN: 'ADMIN_LOGIN',
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) throw httpError(500, 'JWT_SECRET is not set', 'CONFIG');
  return secret;
}

function normalizePurpose(value) {
  const text = String(value || OTP_PURPOSES.SIGNUP).trim().toUpperCase();
  if (text === OTP_PURPOSES.RESET_PASSWORD) return OTP_PURPOSES.RESET_PASSWORD;
  return OTP_PURPOSES.SIGNUP;
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(email, otp) {
  const pepper = String(process.env.OTP_PEPPER || '').trim();
  const payload = `${normalizeEmail(email)}:${String(otp || '').trim()}:${pepper}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function signOtpActionToken({ email, purpose }) {
  return jwt.sign(
    {
      type: 'OTP_VERIFIED',
      email: normalizeEmail(email),
      purpose,
    },
    getJwtSecret(),
    { expiresIn: '10m' }
  );
}

function verifyOtpActionToken(token, { email, purpose }) {
  if (!token) throw httpError(401, 'verificationToken is required', 'AUTH');

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    throw httpError(401, 'Invalid or expired verification token', 'AUTH');
  }

  if (decoded?.type !== 'OTP_VERIFIED') {
    throw httpError(401, 'Invalid verification token type', 'AUTH');
  }

  if (normalizeEmail(decoded?.email) !== normalizeEmail(email)) {
    throw httpError(401, 'Verification token email mismatch', 'AUTH');
  }

  if (String(decoded?.purpose || '').toUpperCase() !== String(purpose || '').toUpperCase()) {
    throw httpError(401, 'Verification token purpose mismatch', 'AUTH');
  }
}

function buildVendorAuthPayload({ user, vendor }) {
  const vendorId = String(vendor._id);
  return {
    token: signToken({
      userId: String(user._id),
      role: 'VENDOR',
      email: user.email,
      vendorId,
    }),
    user: {
      role: 'VENDOR',
      email: user.email,
      vendorId,
      vendorName: vendor.name,
    },
  };
}

authRouter.post('/send-otp', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const purpose = normalizePurpose(req.body?.purpose);

    if (!email) throw httpError(400, 'email is required', 'VALIDATION');
    if (!isValidEmail(email)) throw httpError(400, 'Please provide a valid email address', 'VALIDATION');

    const existingUser = await withMongoReadRetry('auth send otp user lookup', async () =>
      User.findOne({ email, role: 'VENDOR' }).lean()
    );

    if (purpose === OTP_PURPOSES.SIGNUP && existingUser) {
      throw httpError(409, 'Email already registered', 'CONFLICT');
    }

    if (purpose === OTP_PURPOSES.RESET_PASSWORD && !existingUser) {
      throw httpError(404, 'No vendor account found for this email', 'NOT_FOUND');
    }

    const otpCode = generateOtpCode();
    const otpHash = hashOtp(email, otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.findOneAndUpdate(
      { email, purpose },
      {
        $set: {
          otp: otpHash,
          attemptsLeft: 3,
          expiresAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const delivery = await sendVerificationOtpEmail({ toEmail: email, otp: otpCode });

    res.json({
      ok: true,
      message:
        delivery?.delivered === false
          ? 'OTP generated in backend console (email not configured).'
          : 'OTP sent successfully',
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/verify-otp', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otpInput = String(req.body?.otp || '').trim();
    const purpose = normalizePurpose(req.body?.purpose);

    if (!email || !otpInput) throw httpError(400, 'email and otp are required', 'VALIDATION');

    const otpDoc = await OTP.findOne({ email, purpose });
    if (!otpDoc) throw httpError(400, 'Invalid OTP', 'OTP_INVALID');

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

    const verificationToken = signOtpActionToken({ email, purpose });
    res.json({ ok: true, message: 'OTP verified', verificationToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/vendor-signup', async (req, res, next) => {
  try {
    const businessName = String(req.body?.businessName || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const categoryRaw = String(req.body?.category || 'Other').trim();
    const country = String(req.body?.country || '').trim();
    const city = String(req.body?.city || '').trim();
    const verificationToken = String(req.body?.verificationToken || '').trim();

    if (!businessName) throw httpError(400, 'Business name is required', 'VALIDATION');
    if (!email) throw httpError(400, 'Business email is required', 'VALIDATION');
    if (!isValidEmail(email)) throw httpError(400, 'Please provide a valid email address', 'VALIDATION');
    if (!country) throw httpError(400, 'Country is required', 'VALIDATION');

    verifyOtpActionToken(verificationToken, { email, purpose: OTP_PURPOSES.SIGNUP });

    const existingUser = await withMongoReadRetry('auth vendor signup user lookup', async () =>
      User.findOne({ email }).lean()
    );
    if (existingUser) throw httpError(409, 'Email already registered', 'CONFLICT');

    const existingVendor = await withMongoReadRetry('auth vendor signup vendor lookup', async () =>
      Vendor.findOne({ email }).lean()
    );
    if (existingVendor) throw httpError(409, 'Business email already in use', 'CONFLICT');

    const allowedCategories = new Set([
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
    const category = allowedCategories.has(categoryRaw) ? categoryRaw : 'Other';

    const passwordHash = await hashPassword(password);

    const vendor = await Vendor.create({
      name: businessName,
      email,
      contactEmail: email,
      category,
      country,
      city: city || undefined,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    const user = await User.create({
      email,
      passwordHash,
      role: 'VENDOR',
      vendorId: vendor._id,
    });

    const authPayload = buildVendorAuthPayload({ user, vendor });

    res.status(201).json({
      ok: true,
      ...authPayload,
      onboardingMessage:
        'Welcome to Trusty. Start by creating your first order to collect verified feedback.',
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const newPassword = String(req.body?.newPassword || '');
    const verificationToken = String(req.body?.verificationToken || '').trim();

    if (!email || !newPassword || !verificationToken) {
      throw httpError(400, 'email, newPassword and verificationToken are required', 'VALIDATION');
    }

    verifyOtpActionToken(verificationToken, { email, purpose: OTP_PURPOSES.RESET_PASSWORD });

    const user = await withMongoReadRetry('auth reset password user lookup', async () =>
      User.findOne({ email, role: 'VENDOR' })
    );
    if (!user) throw httpError(404, 'No vendor account found for this email', 'NOT_FOUND');

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Cleanup any pending reset OTPs for this email.
    await OTP.deleteMany({ email, purpose: OTP_PURPOSES.RESET_PASSWORD });

    res.json({ ok: true, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) throw httpError(400, 'email and password are required', 'VALIDATION');

    const user = await withMongoReadRetry('auth login user lookup', async () => User.findOne({ email }).lean());
    if (!user) throw httpError(401, 'Invalid credentials', 'AUTH');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw httpError(401, 'Invalid credentials', 'AUTH');

    const token = signToken({
      userId: String(user._id),
      role: user.role,
      email: user.email,
      vendorId: user.vendorId ? String(user.vendorId) : null,
    });

    let vendorName = null;
    if (user.vendorId) {
      const v = await withMongoReadRetry('auth login vendor lookup', async () => Vendor.findById(user.vendorId).lean());
      if (user.role === 'VENDOR' && v?.isTerminated) {
        throw httpError(
          403,
          'Vendor account is terminated. Contact platform admin for review.',
          'VENDOR_TERMINATED'
        );
      }
      vendorName = v?.name || null;
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    res.json({
      ok: true,
      token,
      user: {
        role: user.role,
        email: user.email,
        vendorId: user.vendorId ? String(user.vendorId) : null,
        vendorName,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({
    ok: true,
    user: {
      role: req.user.role,
      email: req.user.email,
      vendorId: req.user.vendorId || null,
    },
  });
});

module.exports = { authRouter };
