const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

// Create Redis client if configured
let redisClient;
let redisStore;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL
  });
  
  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
  });
  
  redisClient.connect().catch(console.error);
  
  redisStore = new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: 'proof:ratelimit:'
  });
}

// Rate limiter configurations
const rateLimiters = {
  // Strict rate limiter for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: true, // Don't count successful requests
    store: redisStore // Use Redis store if available
  }),
  
  // Standard rate limiter for API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore
  }),
  
  // Generous rate limiter for public endpoints
  public: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore
  }),
  
  // Strict rate limiter for verification endpoints
  verification: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 verification requests per hour
    message: {
      success: false,
      error: 'Too many verification requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore
  }),
  
  // Custom rate limiter for specific routes
  custom: (windowMs, max) => {
    return rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        error: 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: redisStore
    });
  }
};

// User-specific rate limiting
const userRateLimit = (maxRequests, windowMs = 60 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip;
    },
    message: {
      success: false,
      error: 'Too many requests from your account, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore
  });
};

// Dynamic rate limiting based on user role
const roleBasedRateLimit = () => {
  return (req, res, next) => {
    let maxRequests;
    let windowMs = 15 * 60 * 1000; // 15 minutes
    
    switch (req.user?.role) {
      case 'ADMIN':
        maxRequests = 1000;
        break;
      case 'ISSUER':
        maxRequests = 500;
        break;
      case 'VERIFIER':
        maxRequests = 300;
        break;
      case 'USER':
        maxRequests = 100;
        break;
      default:
        maxRequests = 50;
    }
    
    rateLimit({
      windowMs,
      max: maxRequests,
      keyGenerator: (req) => req.user?.id || req.ip,
      message: {
        success: false,
        error: 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: redisStore
    })(req, res, next);
  };
};

// Rate limit headers middleware
const rateLimitHeaders = (req, res, next) => {
  const limit = req.rateLimit?.limit || 100;
  const remaining = req.rateLimit?.remaining || limit;
  const reset = req.rateLimit?.resetTime || new Date(Date.now() + 15 * 60 * 1000);
  
  res.set({
    'X-RateLimit-Limit': limit,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': Math.floor(reset.getTime() / 1000)
  });
  
  next();
};

module.exports = {
  rateLimiters,
  userRateLimit,
  roleBasedRateLimit,
  rateLimitHeaders,
  redisClient
};