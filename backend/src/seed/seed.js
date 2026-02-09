require('dotenv').config();

const { connectDb } = require('../db');

const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Feedback = require('../models/Feedback');

const { submitFeedback } = require('../services/feedbackService');
const { hashPassword } = require('../services/authService');

async function seed() {
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
    email: 'admin@trustlens.local',
    passwordHash: await hashPassword('Admin123'),
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

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    vendorIds: {
      techVendorId: String(techVendor._id),
      fashionVendorId: String(fashionVendor._id),
      homeVendorId: String(homeVendor._id),
    },
    demoFeedbackCode: 'TL-DEMO2026',
    demoLogins: {
      admin: { email: 'admin@trustlens.local', password: 'Admin123' },
      vendorTech: { email: 'vendor.tech@trustlens.local', password: 'Vendor123' },
      vendorFashion: { email: 'vendor.fashion@trustlens.local', password: 'Vendor123' },
      vendorHome: { email: 'vendor.home@trustlens.local', password: 'Vendor123' },
    },
  });
  process.exit(0);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed', err);
  process.exit(1);
});
