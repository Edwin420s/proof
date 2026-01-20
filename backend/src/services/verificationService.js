const { prisma } = require('../config/database');
const Verification = require('../models/Verification');
const PolygonIDService = require('./polygonIdService');
const QRGenerator = require('../utils/qrGenerator');

class VerificationService {
  // Create verification request
  async createVerificationRequest(verifierId, requestData) {
    try {
      const { 
        credentialType, 
        requiredAttributes, 
        expiration, 
        callbackUrl 
      } = requestData;

      // Generate verification request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create verification request record
      const verificationRequest = await prisma.verificationRequest.create({
        data: {
          requestId,
          verifierId,
          credentialType,
          requiredAttributes,
          expiresAt: expiration ? new Date(expiration) : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
          callbackUrl,
          status: 'PENDING'
        }
      });

      // Generate QR code for the request
      const qrCode = await QRGenerator.generateVerificationQR({
        id: requestId,
        verifierId,
        requiredAttributes,
        expiresAt: verificationRequest.expiresAt,
        callbackUrl
      });

      return {
        success: true,
        request: {
          id: requestId,
          credentialType,
          requiredAttributes,
          expiresAt: verificationRequest.expiresAt,
          callbackUrl,
          status: verificationRequest.status
        },
        qrCode: qrCode.qrCode
      };

    } catch (error) {
      console.error('Verification request creation error:', error);
      throw new Error('Failed to create verification request');
    }
  }

  // Process verification response
  async processVerificationResponse(requestId, proofData) {
    try {
      const request = await prisma.verificationRequest.findUnique({
        where: { requestId }
      });

      if (!request) {
        throw new Error('Verification request not found');
      }

      if (request.status !== 'PENDING') {
        throw new Error(`Verification request is ${request.status.toLowerCase()}`);
      }

      if (new Date(request.expiresAt) < new Date()) {
        await prisma.verificationRequest.update({
          where: { requestId },
          data: { status: 'EXPIRED' }
        });
        throw new Error('Verification request has expired');
      }

      // Verify the proof
      const verificationResult = await PolygonIDService.verifyProof(
        proofData,
        request.requiredAttributes
      );

      // Update request status
      await prisma.verificationRequest.update({
        where: { requestId },
        data: {
          status: verificationResult.valid ? 'COMPLETED' : 'FAILED',
          completedAt: new Date(),
          verificationResult
        }
      });

      // Create verification record if valid
      if (verificationResult.valid) {
        const verification = await Verification.create({
          credentialId: verificationResult.credentialHash,
          verifierId: request.verifierId,
          proofHash: verificationResult.proofId,
          proofData,
          status: 'VERIFIED',
          verificationResult
        });
      }

      // Call callback URL if provided
      if (request.callbackUrl) {
        try {
          await this.callCallbackUrl(request.callbackUrl, {
            requestId,
            status: verificationResult.valid ? 'VERIFIED' : 'FAILED',
            result: verificationResult,
            timestamp: new Date().toISOString()
          });
        } catch (callbackError) {
          console.error('Callback URL error:', callbackError);
          // Don't fail the verification if callback fails
        }
      }

      return {
        success: true,
        requestId,
        status: verificationResult.valid ? 'VERIFIED' : 'FAILED',
        result: verificationResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Verification response processing error:', error);
      throw error;
    }
  }

  // Call callback URL
  async callCallbackUrl(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Callback failed with status: ${response.status}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Callback failed: ${error.message}`);
    }
  }

  // Get verification request status
  async getVerificationRequestStatus(requestId) {
    try {
      const request = await prisma.verificationRequest.findUnique({
        where: { requestId },
        include: {
          verifier: {
            select: {
              name: true,
              walletAddress: true
            }
          }
        }
      });

      if (!request) {
        throw new Error('Verification request not found');
      }

      return {
        requestId: request.requestId,
        credentialType: request.credentialType,
        requiredAttributes: request.requiredAttributes,
        status: request.status,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
        completedAt: request.completedAt,
        verifier: request.verifier,
        result: request.verificationResult
      };

    } catch (error) {
      console.error('Get verification request status error:', error);
      throw error;
    }
  }

  // Bulk verify credentials
  async bulkVerify(verifierId, verificationRequests) {
    try {
      const results = await Promise.allSettled(
        verificationRequests.map(async (req) => {
          try {
            const result = await this.createVerificationRequest(verifierId, req);
            return { success: true, data: result };
          } catch (error) {
            return { 
              success: false, 
              error: error.message,
              request: req 
            };
          }
        })
      );

      const successful = results.filter(r => r.value?.success).length;
      const failed = results.filter(r => !r.value?.success).length;

      return {
        total: verificationRequests.length,
        successful,
        failed,
        results: results.map((r, index) => ({
          index,
          success: r.value?.success || false,
          error: r.value?.error,
          requestId: r.value?.data?.request?.id
        }))
      };

    } catch (error) {
      console.error('Bulk verification error:', error);
      throw new Error('Failed to bulk verify');
    }
  }

  // Get verification analytics
  async getVerificationAnalytics(verifierId, timeframe = '30d') {
    try {
      const startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get verification stats
      const verifications = await prisma.verification.groupBy({
        by: ['status', 'createdAt'],
        where: {
          verifierId,
          createdAt: {
            gte: startDate
          }
        },
        _count: true
      });

      // Get daily verification counts
      const dailyCounts = await prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as count,
          status
        FROM "Verification"
        WHERE "verifierId" = ${verifierId}
          AND "createdAt" >= ${startDate}
        GROUP BY DATE(createdAt), status
        ORDER BY date ASC
      `;

      // Get credential type distribution
      const credentialDistribution = await prisma.$queryRaw`
        SELECT 
          c.type,
          COUNT(v.id) as count
        FROM "Verification" v
        JOIN "Credential" c ON v."credentialId" = c.id
        WHERE v."verifierId" = ${verifierId}
          AND v."createdAt" >= ${startDate}
        GROUP BY c.type
        ORDER BY count DESC
      `;

      return {
        timeframe,
        startDate,
        total: verifications.reduce((sum, item) => sum + item._count, 0),
        byStatus: verifications.reduce((acc, item) => {
          if (!acc[item.status]) acc[item.status] = 0;
          acc[item.status] += item._count;
          return acc;
        }, {}),
        dailyCounts,
        credentialDistribution
      };

    } catch (error) {
      console.error('Get verification analytics error:', error);
      throw new Error('Failed to get verification analytics');
    }
  }
}

module.exports = new VerificationService();