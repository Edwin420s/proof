const express = require('express');
const router = express.Router();
const CredentialController = require('../controllers/credentialController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Credential management
router.post('/request', CredentialController.requestCredential);
router.get('/my-credentials', CredentialController.getUserCredentials);
router.get('/:credentialId', CredentialController.getCredential);
router.post('/:credentialId/proof', CredentialController.generateProof);
router.post('/:credentialId/revoke', CredentialController.revokeCredential);

module.exports = router;