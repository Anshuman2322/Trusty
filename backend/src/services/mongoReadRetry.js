function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientMongoReadError(err) {
  const message = String(err?.message || '');
  const causeCode = err?.cause?.code;
  const code = err?.code;

  return (
    err?.name === 'MongoPoolClearedError' ||
    message.includes('PoolClearedError') ||
    code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
    causeCode === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
    message.includes('tlsv1 alert internal error')
  );
}

async function withMongoReadRetry(label, work) {
  const maxAttempts = 3;

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