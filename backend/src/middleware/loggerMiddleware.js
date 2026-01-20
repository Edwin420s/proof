const logger = require('../utils/logger');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.request(req);
  
  // Capture response finish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.response(req, res, responseTime);
    
    // Update request counters
    const requestCount = req.app.get('requestCount') || 0;
    req.app.set('requestCount', requestCount + 1);
    
    // Update active requests
    const activeRequests = req.app.get('activeRequests') || 0;
    req.app.set('activeRequests', Math.max(0, activeRequests - 1));
  });
  
  // Track active requests
  const activeRequests = req.app.get('activeRequests') || 0;
  req.app.set('activeRequests', activeRequests + 1);
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.errorWithContext(err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(err);
};

// Audit logging middleware
const auditLogger = (action) => {
  return (req, res, next) => {
    const userId = req.user?.id;
    const details = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      params: req.params,
      query: req.query
    };
    
    logger.audit(action, userId, details);
    next();
  };
};

module.exports = {
  requestLogger,
  errorLogger,
  auditLogger
};