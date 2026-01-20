const { prisma } = require('../config/database');

class User {
  static async create(userData) {
    return await prisma.user.create({
      data: {
        walletAddress: userData.walletAddress.toLowerCase(),
        did: userData.did,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'USER'
      }
    });
  }

  static async findByWallet(walletAddress) {
    return await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() }
    });
  }

  static async findByDID(did) {
    return await prisma.user.findUnique({
      where: { did }
    });
  }

  static async update(userId, updateData) {
    return await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  static async getUserWithCredentials(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        credentials: {
          where: { status: 'ACTIVE' },
          include: { issuer: true }
        }
      }
    });
  }
}

module.exports = User;