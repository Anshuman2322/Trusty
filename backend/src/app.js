const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorMiddleware } = require('./middleware/errorMiddleware');
const { registerRoutes } = require('./routes');

function createApp() {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN || '';

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server calls
        if (!origin) return cb(null, true);

        // Dev-friendly defaults: allow any localhost/127.0.0.1 port
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
          return cb(null, true);
        }

        // If explicitly configured, enforce it
        if (corsOrigin) {
          return cb(null, origin === corsOrigin);
        }

        // Otherwise allow (demo-only)
        return cb(null, true);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'trustlens-backend', time: new Date().toISOString() });
  });

  registerRoutes(app);

  app.use(errorMiddleware);
  return app;
}

module.exports = { createApp };
