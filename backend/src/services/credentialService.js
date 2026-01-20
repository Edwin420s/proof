const { prisma } = require('../config/database');
const Credential = require('../models/Credential');
const PolygonIDService = require('./polygonIdService');
const IPFSService = require('../utils/ipfs');
const { encryptData, generateCredentialHash } = require('../utils/cryptography');

class CredentialService {
  // Issue a new credential
  async issueCredential(issuerId, userId, credentialData) {
    try {
      const { type, title, description, data, metadata, expiresAt } = credentialData;

      // Generate credential hash
      const credentialHash = generateCredentialHash({
        issuerId,
        userId,
        type,
        timestamp: Date.now()
      });

      // Encrypt sensitive data
      const encryptedData = encryptData(JSON.stringify(data));

      // Upload metadata to IPFS
      const ipfsMetadata = await IPFSService.uploadCredentialMetadata({
        type,
        title,
        description,
        issuerId,
        userId,
        ...metadata
      });

      // Create credential record
      const credential = await Credential.create({
        userId,
        issuerId,
        type,
        title,
        description,
        credentialHash,
        data: encryptedData,
        metadata: {
          ...metadata,
          ipfs: ipfsMetadata
        },
        expiresAt: expiresAt ? new Date(expiresAt) : null
      });

      // Issue on-chain credential via Polygon ID
      const issuer = await prisma.issuer.findUnique({
        where: { id: issuerId }
      });

      const holder = await prisma.user.findUnique({
        where: { id: userId }
      });

      const polygonIdCredential = await PolygonIDService.issueCredential({
        holderDID: holder.did,
        issuerDID: issuer.did,
        credentialType: type,
        data: metadata.publicData || {},
        expiration: expiresAt
      });

      // Update credential with on-chain data
      await Credential.update(credential.id, {
        contractAddress: polygonIdCredential.contractAddress,
        tokenId: polygonIdCredential.tokenId
      });

      return {
        success: true,
        credential: {
          id: credential.id,
          hash: credential.credentialHash,
          type: credential.type,
          title: credential.title,
          status: credential.status,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
          onChain: {
            contractAddress: polygonIdCredential.contractAddress,
            tokenId: polygonIdCredential.tokenId
          },
          ipfs: ipfsMetadata
        }
      };

    } catch (error) {
      console.error('Credential issuance error:', error);
      throw new Error('Failed to issue credential');
    }
  }

  // Verify credential
  async verifyCredential(credentialId, verifierId, verificationData = {}) {
    try {
      const credential = await Credential.findById(credentialId);

      if (!credential) {
        throw new Error('Credential not found');
      }

      if (credential.status !== 'ACTIVE') {
        throw new Error(`Credential is ${credential.status.toLowerCase()}`);
      }

      // Check expiration
      if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
        await Credential.updateStatus(credentialId, 'EXPIRED');
        throw new Error('Credential has expired');
      }

      // Generate proof
      const proof = await PolygonIDService.generateProof({
        credentialId: credential.credentialHash,
        holderDID: credential.user.did,
        attributes: verificationData.attributes || [],
        expiration: verificationData.expiration
      });

      return {
        success: true,
        credential: {
          id: credential.id,
          type: credential.type,
          title: credential.title,
          issuer: credential.issuer.name
        },
        proof
      };

    } catch (error) {
      console.error('Credential verification error:', error);
      throw error;
    }
  }

  // Get credential with decrypted data
  async getCredentialWithData(credentialId, userId) {
    try {
      const credential = await Credential.findById(credentialId);

      if (!credential) {
        throw new Error('Credential not found');
      }

      // Check authorization
      if (credential.userId !== userId) {
        throw new Error('Not authorized to view this credential');
      }

      // Decrypt data
      const { decryptData } = require('../utils/cryptography');
      let decryptedData = {};
      
      if (credential.data) {
        try {
          decryptedData = JSON.parse(decryptData(credential.data));
        } catch (error) {
          console.error('Data decryption error:', error);
        }
      }

      // Get verification history
      const Verification = require('../models/Verification');
      const verifications = await Verification.getVerificationHistory(credentialId);

      return {
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
          chainId: credential.chainId
        },
        issuer: {
          id: credential.issuer.id,
          name: credential.issuer.name,
          did: credential.issuer.did
        },
        data: decryptedData,
        metadata: credential.metadata,
        verifications
      };

    } catch (error) {
      console.error('Get credential error:', error);
      throw error;
    }
  }

  // Batch issue credentials
  async batchIssueCredentials(issuerId, credentialsData) {
    try {
      const results = await Promise.allSettled(
        credentialsData.map(async (credData) => {
          try {
            const result = await this.issueCredential(
              issuerId,
              credData.userId,
              credData
            );
            return { success: true, data: result };
          } catch (error) {
            return { 
              success: false, 
              error: error.message,
              userId: credData.userId 
            };
          }
        })
      );

      const successful = results.filter(r => r.value?.success).length;
      const failed = results.filter(r => !r.value?.success).length;

      return {
        total: credentialsData.length,
        successful,
        failed,
        results: results.map((r, index) => ({
          index,
          userId: credentialsData[index].userId,
          success: r.value?.success || false,
          error: r.value?.error,
          credentialId: r.value?.data?.credential?.id
        }))
      };

    } catch (error) {
      console.error('Batch issuance error:', error);
      throw new Error('Failed to batch issue credentials');
    }
  }

  // Search credentials
  async searchCredentials(filters = {}) {
    try {
      const where = {};

      if (filters.userId) where.userId = filters.userId;
      if (filters.issuerId) where.issuerId = filters.issuerId;
      if (filters.type) where.type = filters.type;
      if (filters.status) where.status = filters.status;
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [credentials, total] = await Promise.all([
        prisma.credential.findMany({
          where,
          include: {
            user: {
              select: {
                walletAddress: true,
                did: true,
                name: true
              }
            },
            issuer: {
              select: {
                name: true,
                did: true
              }
            }
          },
          skip: filters.skip || 0,
          take: filters.limit || 50,
          orderBy: { issuedAt: 'desc' }
        }),
        prisma.credential.count({ where })
      ]);

      return {
        credentials,
        total,
        page: Math.floor((filters.skip || 0) / (filters.limit || 50)) + 1,
        limit: filters.limit || 50
      };

    } catch (error) {
      console.error('Search credentials error:', error);
      throw new Error('Failed to search credentials');
    }
  }

  // Clean up expired credentials
  async cleanupExpiredCredentials() {
    try {
      const expiredCount = await Credential.expireOldCredentials();
      
      // Also cleanup verification records older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedVerifications = await prisma.verification.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo }
        }
      });

      return {
        expiredCredentials: expiredCount.count || 0,
        deletedVerifications: deletedVerifications.count || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Cleanup error:', error);
      throw new Error('Failed to cleanup expired data');
    }
  }
}

module.exports = new CredentialService();