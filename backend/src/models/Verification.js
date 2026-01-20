const { prisma } = require('../config/database');

class Verification {
  static async create(verificationData) {
    return await prisma.verification.create({
      data: {
        credentialId: verificationData.credentialId,
        verifierId: verificationData.verifierId,
        proofHash: verificationData.proofHash,
        proofData: verificationData.proofData,
        status: verificationData.status || 'PENDING',
        ipAddress: verificationData.ipAddress,
        userAgent: verificationData.userAgent,
        reason: verificationData.reason
      }
    });
  }

  static async findByProofHash(proofHash) {
    return await prisma.verification.findUnique({
      where: { proofHash },
      include: {
        credential: {
          include: {
            user: true,
            issuer: true
          }
        },
        verifier: true
      }
    });
  }

  static async updateStatus(verificationId, status, result = null) {
    const updateData = { 
      status,
      verificationResult: result
    };
    
    if (status === 'VERIFIED') {
      updateData.verifiedAt = new Date();
    }
    
    return await prisma.verification.update({
      where: { id: verificationId },
      data: updateData
    });
  }

  static async getVerificationHistory(credentialId) {
    return await prisma.verification.findMany({
      where: { credentialId },
      include: { verifier: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getVerifierStats(verifierId) {
    const verifications = await prisma.verification.groupBy({
      by: ['status'],
      where: { verifierId },
      _count: true
    });

    return verifications.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});
  }
}

module.exports = Verification;