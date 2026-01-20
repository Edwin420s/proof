const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');

const authenticate = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

const authorizeIssuer = async (req, res, next) => {
  try {
    if (req.user.role !== 'ISSUER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Issuer access required'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const authorizeAdmin = (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const authorizeVerifier = (req, res, next) => {
  try {
    if (req.user.role !== 'VERIFIER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Verifier access required'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authorizeIssuer,
  authorizeAdmin,
  authorizeVerifier
};