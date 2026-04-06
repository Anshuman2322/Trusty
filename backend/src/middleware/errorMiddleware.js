function errorMiddleware(err, req, res, next) {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      ok: false,
      error: {
        message: 'Request payload is too large. Please upload a smaller file.',
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  }

  const status = err.statusCode || 500;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    ok: false,
    error: {
      message: err.message || 'Server error',
      code: err.code,
    },
  });
}

module.exports = { errorMiddleware };
