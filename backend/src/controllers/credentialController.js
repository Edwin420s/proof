const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const Credential = require('../models/Credential');
const { 
  generateCredentialHash, 
  encryptData, 
  decryptData 
} = require('../utils/cryptography');
const { uploadToIPFS } = require('../utils/ipfs');
const PolygonIDService = require('../services/polygonIdService');

class CredentialController {
  // Request a new credential
  static async requestCredential(req, res, next) {
    try {
      const { issuerId, credentialType, data, metadata } = req.body;
      const userId = req.user.userId;

      // Verify issuer exists and is verified
      const issuer = await prisma.issuer.findUnique({
        where: { id: issuerId, isVerified: true }
      });

      if (!issuer) {
        return res.status(404).json({
          success: false,
          error: 'Issuer not found or not verified'
        });
      }

      // Generate credential hash
      const credentialHash = generateCredentialHash({
        userId,
        issuerId,
        credentialType,
        timestamp: Date.now()
      });

      // Encrypt sensitive data
      const encryptedData = encryptData(JSON.stringify(data));

      // Create credential record
      const credential = await Credential.create({
        userId,
        issuerId,
        type: credentialType,
        title: metadata?.title || `${credentialType} Credential`,
        description: metadata?.description,
        credentialHash,
        data: encryptedData,
        metadata,
        expiresAt: metadata?.expiresAt ? new Date(metadata.expiresAt) : null
      });

      // Generate on-chain credential (Polygon ID)
      const polygonIdCredential = await PolygonIDService.issueCredential({
        holderDID: req.user.did,
        issuerDID: issuer.did,
        credentialType,
        data: metadata.publicData || {},
        expiration: metadata.expiresAt
      });

      // Update credential with on-chain data
      await Credential.update(credential.id, {
        contractAddress: polygonIdCredential.contractAddress,
        tokenId: polygonIdCredential.tokenId
      });

      res.status(201).json({
        success: true,
        message: 'Credential requested successfully',
        credential: {
          id: credential.id,
          hash: credential.credentialHash,
          type: credential.type,
          status: credential.status,
          issuedAt: credential.issuedAt,
          issuer: {
            name: issuer.name,
            did: issuer.did
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get user's credentials
  static async getUserCredentials(req, res, next) {
    try {
      const userId = req.user.userId;
      const { status, type } = req.query;

      const credentials = await Credential.findByUser(userId, {
        status,
        type
      });

      // Decrypt data for each credential
      const decryptedCredentials = await Promise.all(
        credentials.map(async (cred) => {
          let decryptedData = null;
          if (cred.data) {
            try {
              decryptedData = JSON.parse(decryptData(cred.data));
            } catch (error) {
              decryptedData = {};
            }
          }

          return {
            id: cred.id,
            type: cred.type,
            title: cred.title,
            description: cred.description,
            status: cred.status,
            issuedAt: cred.issuedAt,
            expiresAt: cred.expiresAt,
            credentialHash: cred.credentialHash,
            issuer: {
              id: cred.issuer.id,
              name: cred.issuer.name,
              did: cred.issuer.did
            },
            data: decryptedData,
            metadata: cred.metadata
          };
        })
      );

      res.json({
        success: true,
        count: decryptedCredentials.length,
        credentials: decryptedCredentials
      });

    } catch (error) {
      next(error);
    }
  }

  // Get single credential
  static async getCredential(req, res, next) {
    try {
      const { credentialId } = req.params;
      const userId = req.user.userId;

      const credential = await Credential.findById(credentialId);

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Check ownership
      if (credential.userId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this credential'
        });
      }

      // Decrypt data
      let decryptedData = {};
      if (credential.data) {
        try {
          decryptedData = JSON.parse(decryptData(credential.data));
        } catch (error) {
          decryptedData = {};
        }
      }

      res.json({
        success: true,
        credential: {
          id: credential.id,
          type: credential.type,
          title: credential.title,
          description: credential.description,
          status: credential.status,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
          credentialHash: credential.credentialHash,
          contractAddress: credential.contractAddress,
          tokenId: credential.tokenId,
          chainId: credential.chainId,
          user: {
            id: credential.user.id,
            walletAddress: credential.user.walletAddress,
            did: credential.user.did
          },
          issuer: {
            id: credential.issuer.id,
            name: credential.issuer.name,
            did: credential.issuer.did
          },
          data: decryptedData,
          metadata: credential.metadata
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Generate proof for credential
  static async generateProof(req, res, next) {
    try {
      const { credentialId } = req.params;
      const { attributes, expiration } = req.body;
      const userId = req.user.userId;

      const credential = await Credential.findById(credentialId);

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Check ownership
      if (credential.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to generate proof for this credential'
        });
      }

      // Check credential status
      if (credential.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          error: `Credential is ${credential.status.toLowerCase()}`
        });
      }

      // Generate ZK proof using Polygon ID
      const proof = await PolygonIDService.generateProof({
        credentialId: credential.credentialHash,
        holderDID: credential.user.did,
        attributes,
        expiration
      });

      // Generate QR code for proof
      const qrCode = await PolygonIDService.generateQRCode(proof);

      res.json({
        success: true,
        proof: {
          id: proof.proofId,
          credentialId: credential.id,
          credentialType: credential.type,
          attributes,
          proofData: proof.proofData,
          qrCode,
          expiresAt: proof.expiresAt
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Revoke credential (issuer only)
  static async revokeCredential(req, res, next) {
    try {
      const { credentialId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;

      const credential = await Credential.findById(credentialId);

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Check if user is the issuer or admin
      if (credential.issuerId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to revoke this credential'
        });
      }

      // Revoke on-chain credential
      await PolygonIDService.revokeCredential(
        credential.credentialHash,
        reason
      );

      // Update database record
      await Credential.revoke(credentialId, reason);

      res.json({
        success: true,
        message: 'Credential revoked successfully'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = CredentialController;