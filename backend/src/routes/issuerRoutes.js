const express = require('express');
const router = express.Router();
const IssuerController = require('../controllers/issuerController');
const { authenticate, authorizeIssuer } = require('../middleware/authMiddleware');

// Public routes
router.get('/verified', IssuerController.getVerifiedIssuers);
router.get('/:issuerId', IssuerController.getIssuerDetails);

// Protected issuer routes
router.use(authenticate);
router.use(authorizeIssuer);

router.get('/dashboard/credentials', IssuerController.getIssuerCredentials);
router.post('/issue', IssuerController.issueCredential);
router.get('/dashboard/stats', IssuerController.getIssuerStats);
router.put('/profile', IssuerController.updateIssuerProfile);

module.exports = router;