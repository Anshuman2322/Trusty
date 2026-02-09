require('dotenv').config();

const { createApp } = require('./app');
const { connectDb } = require('./db');

async function main() {
  await connectDb();
  const app = createApp();
  const port = Number(process.env.PORT || 5000);

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`TrustLens backend listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend:', error);
  process.exit(1);
});
