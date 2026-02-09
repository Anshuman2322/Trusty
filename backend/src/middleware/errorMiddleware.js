function errorMiddleware(err, req, res, next) {
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
