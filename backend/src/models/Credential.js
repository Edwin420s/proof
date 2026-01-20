const { prisma } = require('../config/database');

class Credential {
  static async create(credentialData) {
    return await prisma.credential.create({
      data: {
        userId: credentialData.userId,
        issuerId: credentialData.issuerId,
        type: credentialData.type,
        title: credentialData.title,
        description: credentialData.description,
        credentialHash: credentialData.credentialHash,
        contractAddress: credentialData.contractAddress,
        tokenId: credentialData.tokenId,
        chainId: credentialData.chainId || 137,
        data: credentialData.data,
        metadata: credentialData.metadata,
        expiresAt: credentialData.expiresAt
      }
    });
  }

  static async findById(credentialId) {
    return await prisma.credential.findUnique({
      where: { id: credentialId },
      include: {
        user: true,
        issuer: true
      }
    });
  }

  static async findByHash(credentialHash) {
    return await prisma.credential.findUnique({
      where: { credentialHash },
      include: {
        user: true,
        issuer: true
      }
    });
  }

  static async findByUser(userId, filters = {}) {
    const where = { userId };
    
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    
    return await prisma.credential.findMany({
      where,
      include: { issuer: true },
      orderBy: { issuedAt: 'desc' }
    });
  }

  static async findByIssuer(issuerId, filters = {}) {
    const where = { issuerId };
    
    if (filters.status) where.status = filters.status;
    
    return await prisma.credential.findMany({
      where,
      include: { user: true },
      orderBy: { issuedAt: 'desc' }
    });
  }

  static async updateStatus(credentialId, status, reason = null) {
    const updateData = { status };
    
    if (status === 'REVOKED') {
      updateData.revokedAt = new Date();
      updateData.revokedReason = reason;
    }
    
    return await prisma.credential.update({
      where: { id: credentialId },
      data: updateData
    });
  }

  static async revoke(credentialId, reason) {
    return await this.updateStatus(credentialId, 'REVOKED', reason);
  }

  static async expireOldCredentials() {
    const expired = await prisma.credential.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });
    
    return expired;
  }
}

module.exports = Credential;