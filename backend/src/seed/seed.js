require('dotenv').config();

const { connectDb } = require('../db');

const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Feedback = require('../models/Feedback');

const { submitFeedback } = require('../services/feedbackService');
const { hashPassword } = require('../services/authService');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientMongoError(err) {
  const msg = String(err?.message || '');
  const causeCode = err?.cause?.code;
  const code = err?.code;
  return (
    err?.name === 'MongoPoolClearedError' ||
    msg.includes('PoolClearedError') ||
    code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
    causeCode === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
    msg.includes('tlsv1 alert internal error')
  );
}

async function seedOnce() {
  await connectDb();

  await Promise.all([
    Vendor.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
    Invoice.deleteMany({}),
    Feedback.deleteMany({}),
  ]);

  const techVendor = await Vendor.create({
    name: 'TechGadgets Pro',
    email: 'contact@techgadgetspro.com',
    contactEmail: 'contact@techgadgetspro.com',
    category: 'Electronics',
  });
  const fashionVendor = await Vendor.create({
    name: 'StyleHub Fashion',
    email: 'hello@stylehub.com',
    contactEmail: 'hello@stylehub.com',
    category: 'Fashion',
  });
  const homeVendor = await Vendor.create({
    name: 'HomeEssentials Plus',
    email: 'support@homeessentials.com',
    contactEmail: 'support@homeessentials.com',
    category: 'Home & Kitchen',
  });

  await User.create({
    email: 'trustylens@gmail.com',
    passwordHash: await hashPassword('Anshu@2322'),
    role: 'ADMIN',
  });

  await User.create({
    email: 'vendor.tech@trustlens.local',
    passwordHash: await hashPassword('Vendor123'),
    role: 'VENDOR',
    vendorId: techVendor._id,
  });

  await User.create({
    email: 'vendor.fashion@trustlens.local',
    passwordHash: await hashPassword('Vendor123'),
    role: 'VENDOR',
    vendorId: fashionVendor._id,
  });

  await User.create({
    email: 'vendor.home@trustlens.local',
    passwordHash: await hashPassword('Vendor123'),
    role: 'VENDOR',
    vendorId: homeVendor._id,
  });

  const deliveredOrder = await Order.create({
    vendorId: techVendor._id,
    customerName: 'Demo Customer',
    email: 'demo.customer@example.com',
    phone: '9999999999',
    address: 'Demo Address, City',
    productDetails: 'Wireless Earbuds - Model X2',
    price: 1999,
    paymentStatus: 'PAID',
    locked: true,
    deliveryStatus: 'DELIVERED',
    deliveryHistory: [
      { status: 'CREATED', note: 'Order created', at: new Date() },
      { status: 'DELIVERED', note: 'Delivered successfully', at: new Date() },
    ],
    feedbackCode: 'TL-DEMO2026',
  });

  const pendingOrder = await Order.create({
    vendorId: techVendor._id,
    customerName: 'Second Customer',
    email: 'second.customer@example.com',
    phone: '8888888888',
    address: 'Second Address, City',
    productDetails: 'USB-C Fast Charger - 45W',
    price: 899,
    paymentStatus: 'PENDING',
    locked: false,
    deliveryStatus: 'CREATED',
    deliveryHistory: [{ status: 'CREATED', note: 'Order created', at: new Date() }],
    feedbackCode: 'TL-DEMO2026-B',
  });

  await Invoice.create({
    vendorId: techVendor._id,
    orderId: deliveredOrder._id,
    amount: deliveredOrder.price,
    status: 'PAID',
    invoiceNumber: 'INV-DEMO2026',
    emails: [],
  });

  await Invoice.create({
    vendorId: techVendor._id,
    orderId: pendingOrder._id,
    amount: pendingOrder.price,
    status: 'ISSUED',
    invoiceNumber: 'INV-DEMO2026-B',
    emails: [],
  });

  const fashionDeliveredOrder = await Order.create({
    vendorId: fashionVendor._id,
    customerName: 'Fashion Demo Customer',
    email: 'fashion.customer@example.com',
    phone: '7777777777',
    address: 'Fashion Street, City',
    productDetails: 'Cotton T-Shirt - Size M',
    price: 799,
    paymentStatus: 'PAID',
    locked: true,
    deliveryStatus: 'DELIVERED',
    deliveryHistory: [
      { status: 'CREATED', note: 'Order created', at: new Date() },
      { status: 'DELIVERED', note: 'Delivered successfully', at: new Date() },
    ],
    feedbackCode: 'TL-FASHION2026',
  });

  await Invoice.create({
    vendorId: fashionVendor._id,
    orderId: fashionDeliveredOrder._id,
    amount: fashionDeliveredOrder.price,
    status: 'PAID',
    invoiceNumber: 'INV-FASHION2026',
    emails: [],
  });

  const homeDeliveredOrder = await Order.create({
    vendorId: homeVendor._id,
    customerName: 'Home Demo Customer',
    email: 'home.customer@example.com',
    phone: '6666666666',
    address: 'Home Lane, City',
    productDetails: 'Non-stick Pan - 24cm',
    price: 1299,
    paymentStatus: 'PAID',
    locked: true,
    deliveryStatus: 'DELIVERED',
    deliveryHistory: [
      { status: 'CREATED', note: 'Order created', at: new Date() },
      { status: 'DELIVERED', note: 'Delivered successfully', at: new Date() },
    ],
    feedbackCode: 'TL-HOME2026',
  });

  await Invoice.create({
    vendorId: homeVendor._id,
    orderId: homeDeliveredOrder._id,
    amount: homeDeliveredOrder.price,
    status: 'PAID',
    invoiceNumber: 'INV-HOME2026',
    emails: [],
  });

  await submitFeedback({
    vendorId: techVendor._id,
    payload: {
      text: 'Delivered on time. Sound quality is good and the case feels sturdy. Order #123 matched the invoice and packaging was sealed.',
      code: 'TL-DEMO2026',
      deviceHash: 'seed-device-hash-1',
      behavior: { typingTimeMs: 18000, editCount: 5 },
      notReceived: false,
    },
  });

  await submitFeedback({
    vendorId: techVendor._id,
    payload: {
      text: 'Okay product. Battery is average.',
      deviceHash: 'seed-device-hash-2',
      behavior: { typingTimeMs: 7000, editCount: 1 },
      notReceived: false,
    },
  });

  // Duplicate-like feedback to demonstrate scoring adjustments.
  await submitFeedback({
    vendorId: techVendor._id,
    payload: {
      text: 'Okay product. Battery is average.',
      deviceHash: 'seed-device-hash-3',
      behavior: { typingTimeMs: 2500, editCount: 0 },
      notReceived: false,
    },
  });

  // Fashion vendor: one verified + one anonymous.
  await submitFeedback({
    vendorId: fashionVendor._id,
    payload: {
      text: 'Good fabric quality and stitching. Size matches. Delivery was on time and packaging was neat.',
      code: 'TL-FASHION2026',
      deviceHash: 'seed-device-hash-fashion-1',
      behavior: { typingTimeMs: 14000, editCount: 3 },
      notReceived: false,
    },
  });

  await submitFeedback({
    vendorId: fashionVendor._id,
    payload: {
      text: 'Not bad, but color looked slightly different than photos.',
      deviceHash: 'seed-device-hash-fashion-2',
      behavior: { typingTimeMs: 4000, editCount: 1 },
      notReceived: false,
    },
  });

  // Home vendor: verified high-trust + a low-context quick entry.
  await submitFeedback({
    vendorId: homeVendor._id,
    payload: {
      text: 'Pan heats evenly and the coating feels durable. Handle is solid and cleaning is easy. Arrived sealed and on time.',
      code: 'TL-HOME2026',
      deviceHash: 'seed-device-hash-home-1',
      behavior: { typingTimeMs: 16000, editCount: 4 },
      notReceived: false,
    },
  });

  await submitFeedback({
    vendorId: homeVendor._id,
    payload: {
      text: 'ok',
      deviceHash: 'seed-device-hash-home-2',
      behavior: { typingTimeMs: 800, editCount: 0 },
      notReceived: false,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    vendorIds: {
      techVendorId: String(techVendor._id),
      fashionVendorId: String(fashionVendor._id),
      homeVendorId: String(homeVendor._id),
    },
    demoFeedbackCodes: {
      tech: 'TL-DEMO2026',
      fashion: 'TL-FASHION2026',
      home: 'TL-HOME2026',
    },
    demoLogins: {
      admin: { email: 'trustylens@gmail.com', password: 'Anshu@2322' },
      vendorTech: { email: 'vendor.tech@trustlens.local', password: 'Vendor123' },
      vendorFashion: { email: 'vendor.fashion@trustlens.local', password: 'Vendor123' },
      vendorHome: { email: 'vendor.home@trustlens.local', password: 'Vendor123' },
    },
  });
  process.exit(0);
}

async function seedWithRetry() {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await seedOnce();
      return;
    } catch (err) {
      if (attempt < maxAttempts && isTransientMongoError(err)) {
        // eslint-disable-next-line no-console
        console.error(`Seed attempt ${attempt} failed due to transient MongoDB error. Retrying...`);
        await sleep(750 * 2 ** (attempt - 1));
        continue;
      }
      // eslint-disable-next-line no-console
      console.error('Seed failed', err);
      process.exit(1);
    }
  }
}

seedWithRetry();
