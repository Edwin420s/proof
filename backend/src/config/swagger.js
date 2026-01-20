const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Proof Identity API',
    version: '1.0.0',
    description: 'Self-sovereign identity and credential verification system',
    contact: {
      name: 'Proof Team',
      email: 'support@proofidentity.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:5000',
      description: 'Development server'
    },
    {
      url: 'https://api.proofidentity.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID'
          },
          walletAddress: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            description: 'Ethereum wallet address'
          },
          did: {
            type: 'string',
            description: 'Decentralized Identifier'
          },
          name: {
            type: 'string',
            description: 'User name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email'
          },
          role: {
            type: 'string',
            enum: ['USER', 'ISSUER', 'VERIFIER', 'ADMIN'],
            description: 'User role'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          }
        }
      },
      Credential: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Credential ID'
          },
          type: {
            type: 'string',
            enum: ['EDUCATION_DEGREE', 'AGE_VERIFICATION', 'PROFESSIONAL_LICENSE', 'MEMBERSHIP', 'EMPLOYMENT', 'IDENTITY_DOCUMENT', 'CERTIFICATION', 'SKILL_ASSESSMENT', 'BACKGROUND_CHECK', 'CUSTOM'],
            description: 'Credential type'
          },
          title: {
            type: 'string',
            description: 'Credential title'
          },
          description: {
            type: 'string',
            description: 'Credential description'
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED'],
            description: 'Credential status'
          },
          credentialHash: {
            type: 'string',
            description: 'On-chain credential hash'
          },
          issuedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Issuance timestamp'
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Expiration timestamp'
          }
        }
      },
      Issuer: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Issuer ID'
          },
          name: {
            type: 'string',
            description: 'Issuer name'
          },
          description: {
            type: 'string',
            description: 'Issuer description'
          },
          did: {
            type: 'string',
            description: 'Issuer DID'
          },
          isVerified: {
            type: 'boolean',
            description: 'Whether issuer is verified'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          }
        }
      },
      Verification: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Verification ID'
          },
          proofHash: {
            type: 'string',
            description: 'Proof hash'
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
            description: 'Verification status'
          },
          verifiedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Verification timestamp'
          },
          result: {
            type: 'object',
            description: 'Verification result details'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Error message'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                value: { type: 'string' }
              }
            }
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              error: 'Authentication required'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              error: 'Insufficient permissions'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              error: 'Resource not found'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              error: 'Validation Error',
              details: [
                {
                  field: 'email',
                  message: 'Invalid email format',
                  value: 'invalid-email'
                }
              ]
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and account management'
    },
    {
      name: 'Credentials',
      description: 'Credential issuance and management'
    },
    {
      name: 'Issuers',
      description: 'Issuer management and operations'
    },
    {
      name: 'Verification',
      description: 'Credential verification'
    },
    {
      name: 'Admin',
      description: 'Administrative operations (requires admin role)'
    },
    {
      name: 'Health',
      description: 'System health and monitoring'
    }
  ]
};

// Options for swagger-jsdoc
const options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

// Swagger UI setup
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Proof Identity API Documentation',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions
};