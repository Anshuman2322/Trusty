const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorMiddleware } = require('./middleware/errorMiddleware');
const { registerRoutes } = require('./routes');

function createApp() {
  const app = express();

  // ✅ FIXED CORS (Allow all origins for demo)
  app.use(cors({
    origin: true, // allow all
    credentials: true
  }));

  app.use(helmet());
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan('dev'));

  // Health route
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      service: 'trustlens-backend',
      time: new Date().toISOString()
    });
  });

  // Routes
  registerRoutes(app);

  // Error handler
  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };