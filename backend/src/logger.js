const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  
  return log;
});

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? json() : combine(colorize(), logFormat)
  ),
  transports: [
    // Console transport
    new transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),
    
    // File transport for errors
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Custom logging methods
logger.request = (req) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
};

logger.response = (req, res, responseTime) => {
  logger.info('HTTP Response', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: req.user?.id
  });
};

logger.errorWithContext = (error, context = {}) => {
  logger.error(error.message, {
    error: error.stack,
    ...context
  });
};

logger.audit = (action, userId, details = {}) => {
  logger.info('AUDIT_LOG', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Database logging
logger.dbQuery = (query, params, duration) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database Query', {
      query,
      params,
      duration: `${duration}ms`
    });
  }
};

// Blockchain logging
logger.blockchain = (action, txHash, details = {}) => {
  logger.info('Blockchain Transaction', {
    action,
    txHash,
    ...details
  });
};

// Credential lifecycle logging
logger.credentialLifecycle = (action, credentialId, userId, details = {}) => {
  logger.info('Credential Lifecycle', {
    action,
    credentialId,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Export logger
module.exports = logger;