const nodemailer = require('nodemailer');

const SENDER_REGISTRY = {
  henry: {
    key: 'henry',
    label: 'Henry',
    displayName: 'Henry',
    envUser: 'SMTP_HENRY_USER',
    envPass: 'SMTP_HENRY_PASS',
  },
  david: {
    key: 'david',
    label: 'David',
    displayName: 'David',
    envUser: 'SMTP_DAVID_USER',
    envPass: 'SMTP_DAVID_PASS',
  },
  john: {
    key: 'john',
    label: 'John',
    displayName: 'John Parsall',
    envUser: 'SMTP_JOHN_USER',
    envPass: 'SMTP_JOHN_PASS',
  },
};

const SENDER_ALIASES = {
  h: 'henry',
  henry: 'henry',
  'henry10davis@gmail.com': 'henry',
  d: 'david',
  david: 'david',
  'david210william@gmail.com': 'david',
  j: 'john',
  john: 'john',
  'johnparsall3066@gmail.com': 'john',
};

const transporterCache = new Map();

function getSmtpConnectionConfig() {
  const host = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim() || 'smtp.gmail.com';
  const portRaw = String(process.env.SMTP_PORT || '587').trim() || '587';
  const port = Number(portRaw);

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: false,
    family: 4,
  };
}

function normalizeSenderKey(sender) {
  const normalized = String(sender || '').trim().toLowerCase();
  return SENDER_ALIASES[normalized] || normalized || 'henry';
}

function getDefaultSenderKey() {
  return normalizeSenderKey(process.env.SMTP_DEFAULT_SENDER || 'henry');
}

function resolveSenderConfig(sender) {
  const key = normalizeSenderKey(sender || getDefaultSenderKey());
  const config = SENDER_REGISTRY[key];

  if (!config) {
    const error = new Error(`Unsupported sender: ${sender || key}`);
    error.statusCode = 400;
    error.code = 'INVALID_SENDER';
    throw error;
  }

  const user = String(process.env[config.envUser] || '').trim();
  const pass = String(process.env[config.envPass] || '').replace(/\s+/g, '').trim();

  if (!user || !pass) {
    const error = new Error(`SMTP credentials are missing for sender: ${key}`);
    error.statusCode = 500;
    error.code = 'EMAIL_CONFIG_MISSING';
    throw error;
  }

  return {
    key,
    label: config.label,
    displayName: config.displayName,
    user,
    pass,
    from: `${config.displayName} <${user}>`,
  };
}

function createTransporterOptions(credentials) {
  const smtp = getSmtpConnectionConfig();

  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    family: smtp.family,
    auth: {
      user: credentials.user,
      pass: credentials.pass,
    },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  };
}

function getTransporter(sender) {
  const credentials = resolveSenderConfig(sender);

  if (transporterCache.has(credentials.key)) {
    return transporterCache.get(credentials.key);
  }

  const transporter = nodemailer.createTransport(createTransporterOptions(credentials));
  transporterCache.set(credentials.key, transporter);
  return transporter;
}

function listSenderKeys() {
  return Object.keys(SENDER_REGISTRY);
}

module.exports = {
  getDefaultSenderKey,
  getTransporter,
  listSenderKeys,
  normalizeSenderKey,
  resolveSenderConfig,
};