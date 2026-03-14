const { fetch } = require('undici');

function getEmbeddingServiceUrl() {
  return process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8010';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimeoutMs() {
  return Number(process.env.EMBEDDING_TIMEOUT_MS || 2500);
}

function getMaxAttempts() {
  return Math.max(1, Number(process.env.EMBEDDING_RETRY_ATTEMPTS || 3));
}

function formatEndpoint(baseUrl) {
  return `${baseUrl.replace(/\/$/, '')}/upsert-and-search`;
}

function formatNetworkError(error) {
  if (!error) return '';

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map((item) => formatNetworkError(item)).filter(Boolean).join('; ');
  }

  const parts = [];
  const code = error.code || error.errno;
  if (code) parts.push(code);

  if (error.address || error.port) {
    parts.push(`${error.address || 'unknown-host'}:${error.port || 'unknown-port'}`);
  }

  const message = String(error.message || '').trim();
  if (message && message !== 'fetch failed') {
    parts.push(message);
  }

  return parts.join(' ');
}

function describeRequestFailure(err, timeoutMs) {
  if (err?.name === 'AbortError') {
    return `timeout after ${timeoutMs}ms`;
  }

  const topLevel = formatNetworkError(err);
  const cause = formatNetworkError(err?.cause);

  if (topLevel && cause && cause !== topLevel) {
    return `${topLevel}: ${cause}`;
  }

  return topLevel || cause || String(err?.message || 'unknown error');
}

function isRetryableFailure(err) {
  if (err?.name === 'AbortError') return true;
  if (err?.retryable === true) return true;

  const details = [err?.message, err?.cause?.message, err?.code, err?.cause?.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    details.includes('fetch failed') ||
    details.includes('econnrefused') ||
    details.includes('econnreset') ||
    details.includes('enotfound') ||
    details.includes('etimedout') ||
    details.includes('socket') ||
    details.includes('timeout')
  );
}

function buildRequestPayload({ feedbackId, vendorId, text, topK }) {
  return {
    feedbackId: String(feedbackId),
    vendorId: String(vendorId),
    text,
    topK,
    filters: { vendorId: String(vendorId) },
  };
}

function toJsonOrText(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

async function upsertAndSearch({ feedbackId, vendorId, text, topK = 5 }) {
  const baseUrl = getEmbeddingServiceUrl();
  const endpoint = formatEndpoint(baseUrl);
  const timeoutMs = getTimeoutMs();
  const maxAttempts = getMaxAttempts();
  const body = JSON.stringify(buildRequestPayload({ feedbackId, vendorId, text, topK }));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      const payload = await toJsonOrText(response);
      if (!response.ok) {
        const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const err = new Error(`HTTP ${response.status} ${message}`);
        err.statusCode = response.status;
        err.retryable = response.status >= 500;
        throw err;
      }

      return payload;
    } catch (err) {
      const reason = describeRequestFailure(err, timeoutMs);
      // eslint-disable-next-line no-console
      console.error(`Embedding service request failed: ${reason}`);

      const shouldRetry = attempt < maxAttempts && isRetryableFailure(err);
      if (shouldRetry) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }

      const unavailable = new Error('Embedding service unavailable');
      unavailable.cause = err;
      throw unavailable;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { upsertAndSearch };
