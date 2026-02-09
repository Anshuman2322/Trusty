const express = require('express');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { signToken, verifyPassword, httpError } = require('../services/authService');
const { requireAuth } = require('../middleware/authMiddleware');

const authRouter = express.Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) throw httpError(400, 'email and password are required', 'VALIDATION');

    const user = await User.findOne({ email }).lean();
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
      const v = await Vendor.findById(user.vendorId).lean();
      vendorName = v?.name || null;
    }

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
