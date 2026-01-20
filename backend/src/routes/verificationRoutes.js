const express = require('express');
const router = express.Router();
const VerificationController = require('../controllers/verificationController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Verification endpoints
router.post('/verify', VerificationController.verifyCredential);
router.post('/scan-qr', VerificationController.scanQRCode);
router.get('/history', VerificationController.getVerificationHistory);
router.get('/stats', VerificationController.getVerificationStats);
router.get('/:verificationId', VerificationController.getVerificationDetails);

module.exports = router;