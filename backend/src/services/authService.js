const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw httpError(500, 'JWT_SECRET is not set', 'CONFIG');
  }
  return secret;
}

async function hashPassword(password) {
  const p = String(password || '');
  if (p.length < 6) throw httpError(400, 'Password must be at least 6 characters', 'VALIDATION');
  return bcrypt.hash(p, 10);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(String(password || ''), String(passwordHash || ''));
}

function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '12h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (e) {
    throw httpError(401, 'Invalid or expired token', 'AUTH');
  }
}

module.exports = {
  httpError,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
};
