const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { errorHandler } = require('./src/middleware/errorMiddleware');
const { requestLogger, errorLogger } = require('./src/middleware/loggerMiddleware');
const { rateLimiters, rateLimitHeaders } = require('./src/middleware/rateLimitMiddleware');
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./src/config/swagger');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const credentialRoutes = require('./src/routes/credentialRoutes');
const issuerRoutes = require('./src/routes/issuerRoutes');
const verificationRoutes = require('./src/routes/verificationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const healthRoutes = require('./src/routes/healthRoutes');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',') : 
    ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', rateLimiters.api);
app.use('/api/auth/', rateLimiters.auth);
app.use('/api/verify/', rateLimiters.verification);
app.use(rateLimitHeaders);

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'proof-backend',
    version: '1.0.0'
  });
});

// API Documentation
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  console.log('API Documentation available at /api-docs');
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/issuers', issuerRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error logging middleware (should be before error handler)
app.use(errorLogger);

// Error handling middleware (should be last)
app.use(errorHandler);

module.exports = app;