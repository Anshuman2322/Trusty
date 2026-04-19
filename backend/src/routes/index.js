const { publicRouter } = require('./public');
const { vendorRouter } = require('./vendor');
const { adminRouter } = require('./admin');
const { authRouter } = require('./auth');
const { supportRouter } = require('./support');
const { leadsRouter } = require('./leads');

function registerRoutes(app) {
  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/vendor', vendorRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/leads', leadsRouter);
}

module.exports = { registerRoutes };
