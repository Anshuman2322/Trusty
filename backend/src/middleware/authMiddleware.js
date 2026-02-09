const { verifyToken, httpError } = require('../services/authService');

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw httpError(401, 'Missing bearer token', 'AUTH');
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(httpError(401, 'Not authenticated', 'AUTH'));
    if (req.user.role !== role) return next(httpError(403, 'Forbidden', 'FORBIDDEN'));
    return next();
  };
}

function requireVendorParamMatch(req, res, next) {
  const vendorId = req.params.vendorId;
  if (!req.user?.vendorId) return next(httpError(403, 'Vendor access required', 'FORBIDDEN'));
  if (String(req.user.vendorId) !== String(vendorId)) {
    return next(httpError(403, 'Vendor mismatch', 'FORBIDDEN'));
  }
  return next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireVendorParamMatch,
};
