const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const Credential = require('../models/Credential');
const Verification = require('../models/Verification');
const PolygonIDService = require('../services/polygonIdService');
const { generateProofHash } = require('../utils/cryptography');

class VerificationController {
  // Verify a credential proof
  static async verifyCredential(req, res, next) {
    try {
      const { proofData, proofId, attributes } = req.body;
      const verifierId = req.user.userId;

      if (!proofData && !proofId) {
        return res.status(400).json({
          success: false,
          error: 'Either proofData or proofId is required'
        });
      }

      let verificationResult;
      let credentialHash;

      if (proofId) {
        // Verify using proof ID
        verificationResult = await PolygonIDService.verifyProofById(
          proofId,
          attributes
        );
        credentialHash = verificationResult.credentialHash;
      } else {
        // Verify using proof data
        verificationResult = await PolygonIDService.verifyProof(
          proofData,
          attributes
        );
        credentialHash = verificationResult.credentialHash;
      }

      // Find credential
      const credential = await Credential.findByHash(credentialHash);

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Generate proof hash for tracking
      const proofHash = generateProofHash({
        credentialHash,
        verifierId,
        timestamp: Date.now()
      });

      // Create verification record
      const verification = await Verification.create({
        credentialId: credential.id,
        verifierId,
        proofHash,
        proofData: verificationResult.proofData,
        status: verificationResult.valid ? 'VERIFIED' : 'REJECTED',
        verificationResult: {
          valid: verificationResult.valid,
          attributes: verificationResult.attributes,
          timestamp: new Date().toISOString(),
          credentialInfo: {
            type: credential.type,
            issuer: credential.issuer.name,
            issuedAt: credential.issuedAt
          }
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: req.body.reason
      });

      res.json({
        success: true,
        verification: {
          id: verification.id,
          proofHash: verification.proofHash,
          status: verification.status,
          verifiedAt: verification.verifiedAt,
          result: verification.verificationResult,
          credential: {
            id: credential.id,
            type: credential.type,
            issuer: credential.issuer.name
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Scan QR code for verification
  static async scanQRCode(req, res, next) {
    try {
      const { qrData } = req.body;
      const verifierId = req.user.userId;

      // Parse QR data
      let proofData;
      try {
        proofData = JSON.parse(qrData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code data'
        });
      }

      // Verify the proof
      const verificationResult = await PolygonIDService.verifyProof(
        proofData,
        req.body.attributes || []
      );

      // Find or create verification record
      const credential = await Credential.findByHash(
        verificationResult.credentialHash
      );

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      const proofHash = generateProofHash({
        credentialHash: verificationResult.credentialHash,
        verifierId,
        timestamp: Date.now()
      });

      const verification = await Verification.create({
        credentialId: credential.id,
        verifierId,
        proofHash,
        proofData: verificationResult.proofData,
        status: verificationResult.valid ? 'VERIFIED' : 'REJECTED',
        verificationResult: {
          valid: verificationResult.valid,
          attributes: verificationResult.attributes,
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: req.body.reason
      });

      res.json({
        success: true,
        verification: {
          id: verification.id,
          status: verification.status,
          result: verification.verificationResult,
          credential: {
            type: credential.type,
            issuer: credential.issuer.name
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get verification history
  static async getVerificationHistory(req, res, next) {
    try {
      const verifierId = req.user.userId;
      const { page = 1, limit = 20, credentialId } = req.query;

      const skip = (page - 1) * limit;

      const where = { verifierId };
      if (credentialId) where.credentialId = credentialId;

      const [verifications, total] = await Promise.all([
        prisma.verification.findMany({
          where,
          include: {
            credential: {
              include: {
                issuer: true,
                user: {
                  select: {
                    walletAddress: true,
                    did: true
                  }
                }
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.verification.count({ where })
      ]);

      res.json({
        success: true,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        verifications: verifications.map(ver => ({
          id: ver.id,
          proofHash: ver.proofHash,
          status: ver.status,
          createdAt: ver.createdAt,
          verifiedAt: ver.verifiedAt,
          credential: {
            id: ver.credential.id,
            type: ver.credential.type,
            issuer: ver.credential.issuer.name
          },
          user: ver.credential.user
        }))
      });

    } catch (error) {
      next(error);
    }
  }

  // Get verification details
  static async getVerificationDetails(req, res, next) {
    try {
      const { verificationId } = req.params;
      const verifierId = req.user.userId;

      const verification = await prisma.verification.findUnique({
        where: { id: verificationId },
        include: {
          credential: {
            include: {
              issuer: true,
              user: {
                select: {
                  id: true,
                  walletAddress: true,
                  did: true,
                  name: true
                }
              }
            }
          },
          verifier: {
            select: {
              id: true,
              walletAddress: true,
              name: true
            }
          }
        }
      });

      if (!verification) {
        return res.status(404).json({
          success: false,
          error: 'Verification not found'
        });
      }

      // Check authorization
      if (verification.verifierId !== verifierId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this verification'
        });
      }

      res.json({
        success: true,
        verification: {
          id: verification.id,
          proofHash: verification.proofHash,
          status: verification.status,
          createdAt: verification.createdAt,
          verifiedAt: verification.verifiedAt,
          ipAddress: verification.ipAddress,
          userAgent: verification.userAgent,
          reason: verification.reason,
          result: verification.verificationResult,
          credential: {
            id: verification.credential.id,
            type: verification.credential.type,
            title: verification.credential.title,
            issuedAt: verification.credential.issuedAt,
            expiresAt: verification.credential.expiresAt
          },
          issuer: verification.credential.issuer,
          user: verification.credential.user,
          verifier: verification.verifier
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get verification statistics
  static async getVerificationStats(req, res, next) {
    try {
      const verifierId = req.user.userId;

      const stats = await Verification.getVerifierStats(verifierId);

      // Get recent verifications
      const recentVerifications = await prisma.verification.findMany({
        where: { verifierId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          credential: {
            include: {
              issuer: true
            }
          }
        }
      });

      res.json({
        success: true,
        stats,
        recentVerifications: recentVerifications.map(ver => ({
          id: ver.id,
          status: ver.status,
          createdAt: ver.createdAt,
          credentialType: ver.credential.type,
          issuer: ver.credential.issuer.name
        }))
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = VerificationController;