const mongoose = require('mongoose');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDb() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set in environment variables.');
    process.exit(1);
  }
  mongoose.set('strictQuery', true);

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10_000,
        family: 4,
      });
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      if (attempt < maxAttempts) {
        console.error(`MongoDB connection attempt ${attempt} failed. Retrying...`);
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }

      const tlsInternalError =
        error?.cause?.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
        error?.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR';

      console.error('MongoDB connection error:', error);
      if (tlsInternalError) {
        console.error(
          'This often indicates MongoDB Atlas Network Access (IP allowlist) is blocking the connection, or a TLS-inspecting proxy/firewall is interfering.'
        );
      }
      process.exit(1);
    }
  }
}

module.exports = { connectDb };
