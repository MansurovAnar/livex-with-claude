const logger = require('../utils/logger');

module.exports = function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'An unexpected error occurred' : err.message,
    },
  });
};
