const { prisma } = require('../config/database');

class Issuer {
  static async create(issuerData) {
    return await prisma.issuer.create({
      data: {
        name: issuerData.name,
        description: issuerData.description,
        walletAddress: issuerData.walletAddress.toLowerCase(),
        did: issuerData.did,
        isVerified: issuerData.isVerified || false,
        contractAddress: issuerData.contractAddress,
        metadata: issuerData.metadata
      }
    });
  }

  static async findByWallet(walletAddress) {
    return await prisma.issuer.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() }
    });
  }

  static async findByDID(did) {
    return await prisma.issuer.findUnique({
      where: { did }
    });
  }

  static async findAllVerified() {
    return await prisma.issuer.findMany({
      where: { isVerified: true },
      orderBy: { name: 'asc' }
    });
  }

  static async updateVerification(issuerId, isVerified) {
    return await prisma.issuer.update({
      where: { id: issuerId },
      data: { isVerified }
    });
  }

  static async getIssuerStats(issuerId) {
    const credentials = await prisma.credential.groupBy({
      by: ['status'],
      where: { issuerId },
      _count: true
    });

    const total = credentials.reduce((sum, item) => sum + item._count, 0);
    
    return {
      total,
      byStatus: credentials.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {})
    };
  }
}

module.exports = Issuer;