const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');

class JWTService {
  // Generate JWT token
  static generateToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Generate refresh token
  static generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  // Decode token without verification
  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  // Generate verification token for email/phone
  static generateVerificationToken(userId, purpose) {
    return jwt.sign(
      { userId, purpose, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  // Generate API key
  static generateApiKey(clientId, permissions = []) {
    const payload = {
      clientId,
      permissions,
      type: 'api_key',
      timestamp: Date.now()
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });
  }

  // Generate one-time token
  static generateOneTimeToken(payload, expiresIn = '15m') {
    return jwt.sign(
      { ...payload, oneTime: true },
      JWT_SECRET,
      { expiresIn }
    );
  }
}

module.exports = JWTService;