const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Public routes
router.post('/wallet-login', AuthController.walletLogin);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);
router.put('/profile', authenticate, AuthController.updateProfile);
router.post('/request-issuer', authenticate, AuthController.requestIssuerRole);

module.exports = router;