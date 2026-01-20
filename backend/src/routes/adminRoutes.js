const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');
const Validators = require('../utils/validators');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorizeAdmin);

// System statistics
router.get('/stats', AdminController.getSystemStats);

// User management
router.get('/users', 
  Validators.queryValidators.pagination,
  Validators.validate,
  AdminController.getAllUsers
);

router.put('/users/:userId/role', 
  Validators.validate,
  AdminController.updateUserRole
);

router.post('/users/:userId/suspend', 
  Validators.validate,
  AdminController.suspendUser
);

// Issuer management
router.get('/issuers', 
  Validators.queryValidators.pagination,
  Validators.validate,
  AdminController.getAllIssuers
);

router.put('/issuers/:issuerId/verify', 
  Validators.validate,
  AdminController.verifyIssuer
);

// Credential management
router.get('/credentials/:credentialId', 
  Validators.validate,
  AdminController.getCredentialDetails
);

router.post('/credentials/:credentialId/revoke', 
  Validators.validate,
  AdminController.adminRevokeCredential
);

// System logs
router.get('/logs', 
  Validators.queryValidators.pagination,
  Validators.validate,
  AdminController.getSystemLogs
);

// Analytics
router.get('/analytics', AdminController.getDashboardAnalytics);

// Data export
router.get('/export', AdminController.exportData);

module.exports = router;