const crypto = require('crypto');

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateTxRef() {
  const rand = crypto.randomBytes(4).toString('hex');
  return `TLX-${Date.now().toString(36)}-${rand}`;
}

module.exports = { sha256Hex, generateTxRef };
