const { prisma } = require('../config/database');
const NotificationService = require('../services/notificationService');

class AdminController {
  // Get system statistics
  static async getSystemStats(req, res, next) {
    try {
      // Get counts
      const [
        usersCount,
        issuersCount,
        credentialsCount,
        verificationsCount,
        pendingIssuersCount
      ] = await Promise.all([
        prisma.user.count(),
        prisma.issuer.count(),
        prisma.credential.count(),
        prisma.verification.count(),
        prisma.issuer.count({ where: { isVerified: false } })
      ]);

      // Get credential distribution by type
      const credentialDistribution = await prisma.credential.groupBy({
        by: ['type'],
        _count: true,
        orderBy: { _count: 'desc' }
      });

      // Get verification distribution by status
      const verificationDistribution = await prisma.verification.groupBy({
        by: ['status'],
        _count: true
      });

      // Get recent activity
      const recentCredentials = await prisma.credential.findMany({
        include: {
          user: {
            select: {
              name: true,
              walletAddress: true
            }
          },
          issuer: {
            select: {
              name: true
            }
          }
        },
        orderBy: { issuedAt: 'desc' },
        take: 10
      });

      const recentVerifications = await prisma.verification.findMany({
        include: {
          credential: {
            select: {
              type: true,
              title: true
            }
          },
          verifier: {
            select: {
              name: true,
              walletAddress: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      res.json({
        success: true,
        stats: {
          users: usersCount,
          issuers: issuersCount,
          verifiedIssuers: issuersCount - pendingIssuersCount,
          pendingIssuers: pendingIssuersCount,
          credentials: credentialsCount,
          verifications: verificationsCount
        },
        distribution: {
          credentials: credentialDistribution,
          verifications: verificationDistribution
        },
        recentActivity: {
          credentials: recentCredentials.map(c => ({
            id: c.id,
            type: c.type,
            title: c.title,
            status: c.status,
            issuedAt: c.issuedAt,
            user: c.user,
            issuer: c.issuer
          })),
          verifications: recentVerifications.map(v => ({
            id: v.id,
            status: v.status,
            verifiedAt: v.verifiedAt,
            credentialType: v.credential.type,
            credentialTitle: v.credential.title,
            verifier: v.verifier
          }))
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get all users with pagination
  static async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search, role } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { walletAddress: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (role) where.role = role;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            walletAddress: true,
            did: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
              select: {
                credentials: true,
                verifications: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        users: users.map(user => ({
          id: user.id,
          walletAddress: user.walletAddress,
          did: user.did,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          stats: user._count
        }))
      });

    } catch (error) {
      next(error);
    }
  }

  // Get all issuers with filtering
  static async getAllIssuers(req, res, next) {
    try {
      const { page = 1, limit = 20, verified, search } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { walletAddress: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (verified !== undefined) {
        where.isVerified = verified === 'true';
      }

      const [issuers, total] = await Promise.all([
        prisma.issuer.findMany({
          where,
          include: {
            _count: {
              select: {
                credentials: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.issuer.count({ where })
      ]);

      res.json({
        success: true,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        issuers: issuers.map(issuer => ({
          id: issuer.id,
          name: issuer.name,
          description: issuer.description,
          walletAddress: issuer.walletAddress,
          did: issuer.did,
          isVerified: issuer.isVerified,
          metadata: issuer.metadata,
          createdAt: issuer.createdAt,
          credentialsCount: issuer._count.credentials
        }))
      });

    } catch (error) {
      next(error);
    }
  }

  // Approve/verify an issuer
  static async verifyIssuer(req, res, next) {
    try {
      const { issuerId } = req.params;
      const { isVerified } = req.body;

      const issuer = await prisma.issuer.findUnique({
        where: { id: issuerId }
      });

      if (!issuer) {
        return res.status(404).json({
          success: false,
          error: 'Issuer not found'
        });
      }

      const updatedIssuer = await prisma.issuer.update({
        where: { id: issuerId },
        data: { isVerified }
      });

      // Update user role to ISSUER if verified
      if (isVerified) {
        await prisma.user.update({
          where: { walletAddress: issuer.walletAddress },
          data: { role: 'ISSUER' }
        });
      }

      // Send notification
      await NotificationService.sendIssuerApprovalNotification(updatedIssuer);

      res.json({
        success: true,
        message: `Issuer ${isVerified ? 'verified' : 'unverified'} successfully`,
        issuer: {
          id: updatedIssuer.id,
          name: updatedIssuer.name,
          isVerified: updatedIssuer.isVerified,
          updatedAt: updatedIssuer.updatedAt
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Update user role
  static async updateUserRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const validRoles = ['USER', 'ISSUER', 'VERIFIER', 'ADMIN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Valid roles: USER, ISSUER, VERIFIER, ADMIN'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Prevent removing last admin
      if (user.role === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN' }
        });

        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: 'Cannot remove the last admin user'
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role }
      });

      res.json({
        success: true,
        message: `User role updated to ${role}`,
        user: {
          id: updatedUser.id,
          walletAddress: updatedUser.walletAddress,
          name: updatedUser.name,
          role: updatedUser.role
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get credential details
  static async getCredentialDetails(req, res, next) {
    try {
      const { credentialId } = req.params;

      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              did: true,
              name: true,
              email: true
            }
          },
          issuer: {
            select: {
              id: true,
              name: true,
              did: true,
              isVerified: true
            }
          },
          verifications: {
            include: {
              verifier: {
                select: {
                  name: true,
                  walletAddress: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      res.json({
        success: true,
        credential: {
          id: credential.id,
          type: credential.type,
          title: credential.title,
          description: credential.description,
          status: credential.status,
          credentialHash: credential.credentialHash,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
          revokedAt: credential.revokedAt,
          revokedReason: credential.revokedReason,
          user: credential.user,
          issuer: credential.issuer,
          metadata: credential.metadata,
          verifications: credential.verifications.map(v => ({
            id: v.id,
            status: v.status,
            verifiedAt: v.verifiedAt,
            proofHash: v.proofHash,
            verifier: v.verifier,
            reason: v.reason
          }))
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Revoke credential as admin
  static async adminRevokeCredential(req, res, next) {
    try {
      const { credentialId } = req.params;
      const { reason } = req.body;

      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
        include: {
          user: true,
          issuer: true
        }
      });

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      const updatedCredential = await prisma.credential.update({
        where: { id: credentialId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedReason: reason
        }
      });

      // TODO: Call blockchain to revoke on-chain credential
      // const blockchainService = require('../utils/blockchain');
      // await blockchainService.revokeCredential(credential.credentialHash, reason);

      res.json({
        success: true,
        message: 'Credential revoked by admin',
        credential: {
          id: updatedCredential.id,
          status: updatedCredential.status,
          revokedAt: updatedCredential.revokedAt,
          revokedReason: updatedCredential.revokedReason
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Suspend user account
  static async suspendUser(req, res, next) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (user.role === 'ADMIN') {
        return res.status(400).json({
          success: false,
          error: 'Cannot suspend admin user'
        });
      }

      // Update all user's credentials to suspended
      await prisma.credential.updateMany({
        where: { userId },
        data: { status: 'SUSPENDED' }
      });

      // Create suspension record
      await prisma.suspension.create({
        data: {
          userId,
          suspendedBy: req.user.userId,
          reason,
          suspendedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'User account suspended',
        userId,
        reason,
        suspendedAt: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  // Get system logs
  static async getSystemLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, level, startDate, endDate } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (level) where.level = level;
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        prisma.systemLog.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { timestamp: 'desc' }
        }),
        prisma.systemLog.count({ where })
      ]);

      res.json({
        success: true,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        logs
      });

    } catch (error) {
      next(error);
    }
  }

  // Get dashboard analytics
  static async getDashboardAnalytics(req, res, next) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get daily user registrations
      const userRegistrations = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM "User"
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      // Get daily credential issuances
      const credentialIssuances = await prisma.$queryRaw`
        SELECT 
          DATE(issued_at) as date,
          COUNT(*) as count
        FROM "Credential"
        WHERE issued_at >= ${thirtyDaysAgo}
        GROUP BY DATE(issued_at)
        ORDER BY date ASC
      `;

      // Get daily verifications
      const dailyVerifications = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM "Verification"
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      // Get top issuers
      const topIssuers = await prisma.issuer.findMany({
        include: {
          _count: {
            select: { credentials: true }
          }
        },
        orderBy: {
          credentials: {
            _count: 'desc'
          }
        },
        take: 10
      });

      // Get recent issues
      const recentIssues = await prisma.systemLog.findMany({
        where: {
          level: 'ERROR',
          timestamp: { gte: thirtyDaysAgo }
        },
        orderBy: { timestamp: 'desc' },
        take: 20
      });

      res.json({
        success: true,
        analytics: {
          period: {
            start: thirtyDaysAgo.toISOString(),
            end: now.toISOString(),
            days: 30
          },
          timeSeries: {
            userRegistrations,
            credentialIssuances,
            dailyVerifications
          },
          topIssuers: topIssuers.map(issuer => ({
            id: issuer.id,
            name: issuer.name,
            credentialsCount: issuer._count.credentials,
            isVerified: issuer.isVerified
          })),
          recentIssues: recentIssues.map(log => ({
            id: log.id,
            message: log.message,
            level: log.level,
            timestamp: log.timestamp,
            metadata: log.metadata
          }))
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Export data
  static async exportData(req, res, next) {
    try {
      const { type, format = 'json', startDate, endDate } = req.query;
      
      const where = {};
      if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        
        if (type === 'credentials') {
          where.issuedAt = dateFilter;
        } else if (type === 'verifications') {
          where.createdAt = dateFilter;
        } else if (type === 'users') {
          where.createdAt = dateFilter;
        }
      }

      let data;
      let filename;

      switch (type) {
        case 'users':
          data = await prisma.user.findMany({ where });
          filename = `users_export_${Date.now()}`;
          break;
        
        case 'credentials':
          data = await prisma.credential.findMany({
            where,
            include: {
              user: {
                select: {
                  walletAddress: true,
                  name: true
                }
              },
              issuer: {
                select: {
                  name: true
                }
              }
            }
          });
          filename = `credentials_export_${Date.now()}`;
          break;
        
        case 'verifications':
          data = await prisma.verification.findMany({
            where,
            include: {
              credential: {
                select: {
                  type: true,
                  title: true
                }
              },
              verifier: {
                select: {
                  walletAddress: true,
                  name: true
                }
              }
            }
          });
          filename = `verifications_export_${Date.now()}`;
          break;
        
        case 'issuers':
          data = await prisma.issuer.findMany({ where });
          filename = `issuers_export_${Date.now()}`;
          break;
        
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid export type. Valid types: users, credentials, verifications, issuers'
          });
      }

      // Format data based on requested format
      let exportData;
      let contentType;

      if (format === 'csv') {
        exportData = this.convertToCSV(data);
        contentType = 'text/csv';
        filename += '.csv';
      } else {
        exportData = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        filename += '.json';
      }

      // Set headers for download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      res.send(exportData);

    } catch (error) {
      next(error);
    }
  }

  // Convert data to CSV
  static convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        
        if (value === null || value === undefined) {
          return '';
        }
        
        if (typeof value === 'object') {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        
        return String(value).replace(/"/g, '""');
      });
      
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
}

module.exports = AdminController;