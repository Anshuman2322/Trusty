function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientMongoReadError(err) {
  const message = String(err?.message || '');
  const lowerMessage = message.toLowerCase();
  const causeCode = err?.cause?.code;
  const code = err?.code;
  const name = String(err?.name || '');
  const causeMessage = String(err?.cause?.message || '').toLowerCase();
  const reasonMessage = String(err?.reason?.message || '').toLowerCase();

  const hasTlsAlert =
    lowerMessage.includes('tlsv1 alert internal error') ||
    causeMessage.includes('tlsv1 alert internal error') ||
    reasonMessage.includes('tlsv1 alert internal error');

  const hasPoolClearedSignal =
    lowerMessage.includes('poolclearederror') ||
    (lowerMessage.includes('connection pool for') && lowerMessage.includes('was cleared because another operation failed')) ||
    causeMessage.includes('poolclearederror') ||
    reasonMessage.includes('poolclearederror');

  return (
    name === 'MongoPoolClearedError' ||
    name === 'MongoServerSelectionError' ||
    hasPoolClearedSignal ||
    code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
    causeCode === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
    hasTlsAlert
  );
}

async function withMongoReadRetry(label, work) {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await work();
    } catch (err) {
      if (attempt < maxAttempts && isTransientMongoReadError(err)) {
        // eslint-disable-next-line no-console
        console.error(`Transient MongoDB read failure during ${label}. Retrying...`);
        await sleep(300 * 2 ** (attempt - 1));
        continue;
      }

      throw err;
    }
  }
}

module.exports = {
  isTransientMongoReadError,
  withMongoReadRetry,
};