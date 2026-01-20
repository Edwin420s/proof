const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/healthController');

// Basic health check
router.get('/', HealthController.healthCheck);

// Detailed health check
router.get('/detailed', HealthController.detailedHealthCheck);

// API status
router.get('/status', HealthController.getAPIStatus);

// Metrics (for monitoring)
router.get('/metrics', HealthController.getMetrics);

module.exports = router;