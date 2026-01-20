const { prisma } = require('../config/database');
const Issuer = require('../models/Issuer');
const Credential = require('../models/Credential');

class IssuerController {
  // Get all verified issuers
  static async getVerifiedIssuers(req, res, next) {
    try {
      const issuers = await Issuer.findAllVerified();

      res.json({
        success: true,
        count: issuers.length,
        issuers: issuers.map(issuer => ({
          id: issuer.id,
          name: issuer.name,
          description: issuer.description,
          did: issuer.did,
          isVerified: issuer.isVerified,
          createdAt: issuer.createdAt,
          metadata: issuer.metadata
        }))
      });

    } catch (error) {
      next(error);
    }
  }

  // Get issuer details
  static async getIssuerDetails(req, res, next) {
    try {
      const { issuerId } = req.params;

      const issuer = await prisma.issuer.findUnique({
        where: { id: issuerId }
      });

      if (!issuer) {
        return res.status(404).json({
          success: false,
          error: 'Issuer not found'
        });
      }

      res.json({
        success: true,
        issuer: {
          id: issuer.id,
          name: issuer.name,
          description: issuer.description,
          walletAddress: issuer.walletAddress,
          did: issuer.did,
          isVerified: issuer.isVerified,
          contractAddress: issuer.contractAddress,
          metadata: issuer.metadata,
          createdAt: issuer.createdAt
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get issuer's credentials (for issuer dashboard)
  static async getIssuerCredentials(req, res, next) {
    try {
      const issuerId = req.user.userId;
      const { status, page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;

      const where = { issuerId };
      if (status) where.status = status;

      const [credentials, total] = await Promise.all([
        prisma.credential.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
                did: true,
                name: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { issuedAt: 'desc' }
        }),
        prisma.credential.count({ where })
      ]);

      res.json({
        success: true,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        credentials: credentials.map(cred => ({
          id: cred.id,
          type: cred.type,
          title: cred.title,
          status: cred.status,
          issuedAt: cred.issuedAt,
          expiresAt: cred.expiresAt,
          user: {
            id: cred.user.id,
            walletAddress: cred.user.walletAddress,
            did: cred.user.did,
            name: cred.user.name
          }
        }))
      });

    } catch (error) {
      next(error);
    }
  }

  // Issue a credential (for issuers)
  static async issueCredential(req, res, next) {
    try {
      const issuerId = req.user.userId;
      const { 
        userId, 
        credentialType, 
        data, 
        metadata, 
        expiration 
      } = req.body;

      // Verify issuer
      const issuer = await prisma.issuer.findUnique({
        where: { walletAddress: req.user.walletAddress, isVerified: true }
      });

      if (!issuer) {
        return res.status(403).json({
          success: false,
          error: 'Issuer not verified'
        });
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Create credential
      const credentialController = require('./credentialController');
      // We'll use the credential controller's logic
      // This is a simplified version
      
      // Generate credential hash
      const { generateCredentialHash } = require('../utils/cryptography');
      const credentialHash = generateCredentialHash({
        userId,
        issuerId: issuer.id,
        credentialType,
        timestamp: Date.now()
      });

      // Create credential record
      const credential = await Credential.create({
        userId,
        issuerId: issuer.id,
        type: credentialType,
        title: metadata?.title || `${credentialType} Credential`,
        description: metadata?.description,
        credentialHash,
        data: JSON.stringify(data),
        metadata,
        expiresAt: expiration ? new Date(expiration) : null
      });

      res.status(201).json({
        success: true,
        message: 'Credential issued successfully',
        credential: {
          id: credential.id,
          hash: credential.credentialHash,
          type: credential.type,
          userId: credential.userId,
          issuedAt: credential.issuedAt
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get issuer statistics
  static async getIssuerStats(req, res, next) {
    try {
      const issuerId = req.user.userId;

      const stats = await Issuer.getIssuerStats(issuerId);

      // Get recent activity
      const recentCredentials = await prisma.credential.findMany({
        where: { issuerId },
        orderBy: { issuedAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              walletAddress: true,
              name: true
            }
          }
        }
      });

      res.json({
        success: true,
        stats,
        recentActivity: recentCredentials.map(cred => ({
          id: cred.id,
          type: cred.type,
          status: cred.status,
          issuedAt: cred.issuedAt,
          user: cred.user
        }))
      });

    } catch (error) {
      next(error);
    }
  }

  // Update issuer profile
  static async updateIssuerProfile(req, res, next) {
    try {
      const { name, description, metadata } = req.body;
      const issuerId = req.user.userId;

      const updatedIssuer = await prisma.issuer.update({
        where: { id: issuerId },
        data: {
          name,
          description,
          metadata: {
            ...metadata,
            updatedAt: new Date().toISOString()
          }
        }
      });

      res.json({
        success: true,
        issuer: {
          id: updatedIssuer.id,
          name: updatedIssuer.name,
          description: updatedIssuer.description,
          metadata: updatedIssuer.metadata
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = IssuerController;