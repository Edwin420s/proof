const { ethers } = require('ethers');
const { body, param, query, validationResult } = require('express-validator');

class Validators {
  // Wallet address validation
  static isEthereumAddress(value) {
    if (!value) return false;
    try {
      return ethers.isAddress(value);
    } catch (error) {
      return false;
    }
  }

  // DID validation
  static isDID(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Basic DID validation - can be extended based on DID method
    const didPattern = /^did:[a-z0-9]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9]$/;
    return didPattern.test(value);
  }

  // Credential hash validation
  static isCredentialHash(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Check if it's a valid hex string (like Ethereum hash)
    const hexPattern = /^0x[a-fA-F0-9]{64}$/;
    return hexPattern.test(value);
  }

  // Proof hash validation
  static isProofHash(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Accept both hex (0x...) and base64 style hashes
    const hexPattern = /^0x[a-fA-F0-9]{64}$/;
    const base64Pattern = /^[A-Za-z0-9+/=]{43,44}$/;
    
    return hexPattern.test(value) || base64Pattern.test(value);
  }

  // Email validation
  static isEmail(value) {
    if (!value) return false;
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  }

  // Phone number validation (basic)
  static isPhoneNumber(value) {
    if (!value) return false;
    
    // Basic international phone number validation
    const phonePattern = /^\+[1-9]\d{1,14}$/;
    return phonePattern.test(value);
  }

  // URL validation
  static isURL(value) {
    if (!value) return false;
    
    try {
      new URL(value);
      return true;
    } catch (error) {
      return false;
    }
  }

  // IPFS CID validation
  static isIPFSCID(value) {
    if (!value) return false;
    
    // Basic CID validation (v0 or v1)
    const cidPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/;
    return cidPattern.test(value);
  }

  // JSON validation
  static isJSON(value) {
    if (!value) return false;
    
    try {
      JSON.parse(value);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Expiration date validation
  static isFutureDate(value) {
    if (!value) return true; // Optional field
    
    const date = new Date(value);
    const now = new Date();
    
    return date > now;
  }

  // Chain ID validation
  static isValidChainId(value) {
    if (!value) return false;
    
    const chainId = parseInt(value);
    const validChains = [1, 137, 80001, 56, 43114]; // Ethereum, Polygon, Mumbai, BSC, Avalanche
    
    return validChains.includes(chainId);
  }

  // Credential type validation
  static isValidCredentialType(value) {
    if (!value) return false;
    
    const validTypes = [
      'EDUCATION_DEGREE',
      'AGE_VERIFICATION',
      'PROFESSIONAL_LICENSE',
      'MEMBERSHIP',
      'EMPLOYMENT',
      'IDENTITY_DOCUMENT',
      'CERTIFICATION',
      'SKILL_ASSESSMENT',
      'BACKGROUND_CHECK',
      'CUSTOM'
    ];
    
    return validTypes.includes(value.toUpperCase());
  }

  // Express validators for routes
  static authValidators = {
    walletLogin: [
      body('walletAddress')
        .notEmpty()
        .withMessage('Wallet address is required')
        .custom(this.isEthereumAddress)
        .withMessage('Invalid Ethereum address'),
      
      body('signature')
        .notEmpty()
        .withMessage('Signature is required')
        .isString()
        .withMessage('Signature must be a string'),
      
      body('message')
        .notEmpty()
        .withMessage('Message is required')
        .isString()
        .withMessage('Message must be a string')
    ],
    
    requestIssuer: [
      body('name')
        .notEmpty()
        .withMessage('Issuer name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
      
      body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
      
      body('website')
        .optional()
        .custom(this.isURL)
        .withMessage('Invalid website URL'),
      
      body('contactEmail')
        .optional()
        .custom(this.isEmail)
        .withMessage('Invalid contact email')
    ]
  };

  static credentialValidators = {
    requestCredential: [
      body('issuerId')
        .notEmpty()
        .withMessage('Issuer ID is required')
        .isUUID()
        .withMessage('Invalid issuer ID format'),
      
      body('credentialType')
        .notEmpty()
        .withMessage('Credential type is required')
        .custom(this.isValidCredentialType)
        .withMessage('Invalid credential type'),
      
      body('data')
        .optional()
        .custom(this.isJSON)
        .withMessage('Data must be valid JSON'),
      
      body('metadata.expiresAt')
        .optional()
        .custom(this.isFutureDate)
        .withMessage('Expiration date must be in the future')
    ],
    
    generateProof: [
      body('attributes')
        .optional()
        .isArray()
        .withMessage('Attributes must be an array'),
      
      body('expiration')
        .optional()
        .custom(this.isFutureDate)
        .withMessage('Expiration must be in the future')
    ],
    
    revokeCredential: [
      body('reason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Reason must be less than 500 characters')
    ]
  };

  static issuerValidators = {
    issueCredential: [
      body('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isUUID()
        .withMessage('Invalid user ID format'),
      
      body('credentialType')
        .notEmpty()
        .withMessage('Credential type is required')
        .custom(this.isValidCredentialType)
        .withMessage('Invalid credential type'),
      
      body('data')
        .optional()
        .custom(this.isJSON)
        .withMessage('Data must be valid JSON'),
      
      body('metadata.title')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Title must be less than 200 characters'),
      
      body('expiration')
        .optional()
        .custom(this.isFutureDate)
        .withMessage('Expiration must be in the future')
    ]
  };

  static verificationValidators = {
    verifyCredential: [
      body('proofData')
        .optional()
        .custom(this.isJSON)
        .withMessage('Proof data must be valid JSON'),
      
      body('proofId')
        .optional()
        .custom(this.isProofHash)
        .withMessage('Invalid proof ID format'),
      
      body('attributes')
        .optional()
        .isArray()
        .withMessage('Attributes must be an array')
    ],
    
    scanQRCode: [
      body('qrData')
        .notEmpty()
        .withMessage('QR data is required')
        .isString()
        .withMessage('QR data must be a string'),
      
      body('attributes')
        .optional()
        .isArray()
        .withMessage('Attributes must be an array')
    ],
    
    createVerificationRequest: [
      body('credentialType')
        .notEmpty()
        .withMessage('Credential type is required'),
      
      body('requiredAttributes')
        .optional()
        .isArray()
        .withMessage('Required attributes must be an array'),
      
      body('expiration')
        .optional()
        .custom(this.isFutureDate)
        .withMessage('Expiration must be in the future'),
      
      body('callbackUrl')
        .optional()
        .custom(this.isURL)
        .withMessage('Invalid callback URL')
    ]
  };

  static queryValidators = {
    pagination: [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt()
    ],
    
    credentialFilters: [
      query('status')
        .optional()
        .isIn(['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED'])
        .withMessage('Invalid status value'),
      
      query('type')
        .optional()
        .isString()
        .withMessage('Type must be a string'),
      
      query('search')
        .optional()
        .isString()
        .withMessage('Search must be a string')
    ]
  };

  // Validate request and handle errors
  static validate(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    
    next();
  }

  // Sanitize input data
  static sanitize(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    // Remove any script tags or dangerous HTML
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+="[^"]*"/gi,
      /on\w+='[^']*'/gi,
      /on\w+=\w+/gi
    ];
    
    const sanitizeValue = (value) => {
      if (typeof value === 'string') {
        let sanitizedValue = value;
        dangerousPatterns.forEach(pattern => {
          sanitizedValue = sanitizedValue.replace(pattern, '');
        });
        return sanitizedValue.trim();
      }
      return value;
    };
    
    // Recursively sanitize object
    const recursiveSanitize = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => 
          typeof item === 'object' ? recursiveSanitize(item) : sanitizeValue(item)
        );
      }
      
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            result[key] = typeof obj[key] === 'object' 
              ? recursiveSanitize(obj[key]) 
              : sanitizeValue(obj[key]);
          }
        }
        return result;
      }
      
      return sanitizeValue(obj);
    };
    
    return recursiveSanitize(sanitized);
  }

  // Validate and sanitize request body
  static validateAndSanitize(req, res, next) {
    // First sanitize
    if (req.body) {
      req.body = this.sanitize(req.body);
    }
    
    // Then validate using express-validator results
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    
    next();
  }

  // Validate file upload
  static validateFile(file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    
    if (!allowedTypes.includes(file.mimetype)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
      };
    }
    
    // Max file size: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 5MB' };
    }
    
    return { valid: true, file };
  }

  // Validate blockchain transaction
  static validateTransaction(txHash) {
    if (!txHash || typeof txHash !== 'string') {
      return { valid: false, error: 'Transaction hash is required' };
    }
    
    const txPattern = /^0x[a-fA-F0-9]{64}$/;
    if (!txPattern.test(txHash)) {
      return { valid: false, error: 'Invalid transaction hash format' };
    }
    
    return { valid: true, txHash };
  }

  // Validate signature
  static validateSignature(message, signature, address) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  // Generate validation schema for OpenAPI/Swagger
  static getOpenAPISchema(validatorType) {
    const schemas = {
      walletLogin: {
        type: 'object',
        required: ['walletAddress', 'signature', 'message'],
        properties: {
          walletAddress: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            example: '0x742d35Cc6634C0532925a3b844Bc9e34B1e1B2a1'
          },
          signature: {
            type: 'string',
            description: 'ECDSA signature of the message'
          },
          message: {
            type: 'string',
            description: 'Original message that was signed'
          }
        }
      },
      
      credentialRequest: {
        type: 'object',
        required: ['issuerId', 'credentialType'],
        properties: {
          issuerId: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          credentialType: {
            type: 'string',
            enum: ['EDUCATION_DEGREE', 'AGE_VERIFICATION', 'PROFESSIONAL_LICENSE'],
            example: 'EDUCATION_DEGREE'
          },
          data: {
            type: 'object',
            additionalProperties: true
          },
          metadata: {
            type: 'object',
            properties: {
              title: { type: 'string', maxLength: 200 },
              description: { type: 'string', maxLength: 500 },
              expiresAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    };
    
    return schemas[validatorType] || {};
  }
}

module.exports = Validators;