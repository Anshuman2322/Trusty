const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorMiddleware } = require('./middleware/errorMiddleware');
const { registerRoutes } = require('./routes');

function createApp() {
  const app = express();
  const requestBodyLimit = String(process.env.REQUEST_BODY_LIMIT || '5mb').trim() || '5mb';

  // ✅ SUPER SAFE CORS FIX
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200); // important
    }
    next();
  });

  app.use(cors()); // optional but keep

  app.use(helmet());
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));
  app.use(morgan('dev'));

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      service: 'trustlens-backend',
      time: new Date().toISOString()
    });
  });

  registerRoutes(app);

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };