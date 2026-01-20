const { prisma } = require('../config/database');
const { ethers } = require('ethers');

class AuditService {
  // Log user action
  static async logUserAction(userId, action, details = {}) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId,
          action,
          details,
          ipAddress: details.ipAddress || null,
          userAgent: details.userAgent || null,
          resourceId: details.resourceId || null,
          resourceType: details.resourceType || null,
          status: details.status || 'SUCCESS',
          timestamp: new Date()
        }
      });

      return auditLog;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw, audit logging shouldn't break main flow
      return null;
    }
  }

  // Log credential lifecycle event
  static async logCredentialEvent(credentialId, event, details = {}) {
    try {
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
        include: { user: true, issuer: true }
      });

      if (!credential) {
        console.warn('Credential not found for audit logging:', credentialId);
        return null;
      }

      const auditLog = await prisma.auditLog.create({
        data: {
          userId: credential.userId,
          action: `CREDENTIAL_${event.toUpperCase()}`,
          details: {
            credentialId,
            credentialType: credential.type,
            credentialHash: credential.credentialHash,
            issuerId: credential.issuerId,
            issuerName: credential.issuer.name,
            ...details
          },
          resourceId: credentialId,
          resourceType: 'CREDENTIAL',
          timestamp: new Date()
        }
      });

      return auditLog;
    } catch (error) {
      console.error('Credential audit logging error:', error);
      return null;
    }
  }

  // Log verification event
  static async logVerificationEvent(verificationId, event, details = {}) {
    try {
      const verification = await prisma.verification.findUnique({
        where: { id: verificationId },
        include: {
          credential: true,
          verifier: true
        }
      });

      if (!verification) {
        console.warn('Verification not found for audit logging:', verificationId);
        return null;
      }

      const auditLog = await prisma.auditLog.create({
        data: {
          userId: verification.verifierId,
          action: `VERIFICATION_${event.toUpperCase()}`,
          details: {
            verificationId,
            credentialId: verification.credentialId,
            proofHash: verification.proofHash,
            status: verification.status,
            ...details
          },
          resourceId: verificationId,
          resourceType: 'VERIFICATION',
          timestamp: new Date()
        }
      });

      return auditLog;
    } catch (error) {
      console.error('Verification audit logging error:', error);
      return null;
    }
  }

  // Log blockchain transaction
  static async logBlockchainTransaction(txHash, action, details = {}) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: details.userId || null,
          action: `BLOCKCHAIN_${action.toUpperCase()}`,
          details: {
            txHash,
            network: details.network || 'polygon',
            contractAddress: details.contractAddress,
            method: details.method,
            ...details
          },
          resourceId: txHash,
          resourceType: 'BLOCKCHAIN_TRANSACTION',
          timestamp: new Date()
        }
      });

      return auditLog;
    } catch (error) {
      console.error('Blockchain audit logging error:', error);
      return null;
    }
  }

  // Get audit logs with filtering
  static async getAuditLogs(filters = {}) {
    try {
      const {
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters;

      const skip = (page - 1) * limit;

      const where = {};
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (resourceId) where.resourceId = resourceId;

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.auditLog.count({ where })
      ]);

      return {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw new Error('Failed to get audit logs');
    }
  }

  // Generate audit report
  static async generateAuditReport(startDate, endDate, reportType = 'summary') {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const where = {
        timestamp: {
          gte: start,
          lte: end
        }
      };

      switch (reportType) {
        case 'summary':
          return await this.generateSummaryReport(where, start, end);
        
        case 'user_activity':
          return await this.generateUserActivityReport(where, start, end);
        
        case 'credential_activity':
          return await this.generateCredentialActivityReport(where, start, end);
        
        case 'security':
          return await this.generateSecurityReport(where, start, end);
        
        default:
          throw new Error('Invalid report type');
      }
    } catch (error) {
      console.error('Generate audit report error:', error);
      throw error;
    }
  }

  // Generate summary report
  static async generateSummaryReport(where, start, end) {
    const [
      totalActions,
      uniqueUsers,
      actionsByType,
      actionsByResource,
      hourlyDistribution
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true
      }),
      prisma.auditLog.groupBy({
        by: ['resourceType'],
        where,
        _count: true
      }),
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as count
        FROM "AuditLog"
        WHERE timestamp >= ${start} AND timestamp <= ${end}
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY hour
      `
    ]);

    return {
      reportType: 'summary',
      period: { start, end },
      summary: {
        totalActions,
        uniqueUsers: uniqueUsers.length,
        actionsByType: actionsByType.reduce((acc, item) => {
          acc[item.action] = item._count;
          return acc;
        }, {}),
        actionsByResource: actionsByResource.reduce((acc, item) => {
          acc[item.resourceType] = item._count;
          return acc;
        }, {}),
        hourlyDistribution: hourlyDistribution.map(item => ({
          hour: item.hour,
          count: parseInt(item.count)
        }))
      }
    };
  }

  // Generate user activity report
  static async generateUserActivityReport(where, start, end) {
    const userActivity = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.wallet_address as "walletAddress",
        u.name,
        u.role,
        COUNT(al.id) as "actionCount",
        COUNT(DISTINCT al.action) as "uniqueActions",
        MIN(al.timestamp) as "firstAction",
        MAX(al.timestamp) as "lastAction"
      FROM "AuditLog" al
      JOIN "User" u ON al."userId" = u.id
      WHERE al.timestamp >= ${start} AND al.timestamp <= ${end}
      GROUP BY u.id, u.wallet_address, u.name, u.role
      ORDER BY "actionCount" DESC
    `;

    const topActionsByUser = await prisma.$queryRaw`
      SELECT 
        u.id,
        al.action,
        COUNT(*) as count
      FROM "AuditLog" al
      JOIN "User" u ON al."userId" = u.id
      WHERE al.timestamp >= ${start} AND al.timestamp <= ${end}
      GROUP BY u.id, al.action
      ORDER BY u.id, count DESC
    `;

    return {
      reportType: 'user_activity',
      period: { start, end },
      userActivity: userActivity.map(user => ({
        id: user.id,
        walletAddress: user.walletAddress,
        name: user.name,
        role: user.role,
        actionCount: parseInt(user.actionCount),
        uniqueActions: parseInt(user.uniqueActions),
        firstAction: user.firstAction,
        lastAction: user.lastAction
      })),
      topActionsByUser: topActionsByUser.reduce((acc, item) => {
        if (!acc[item.id]) acc[item.id] = [];
        acc[item.id].push({
          action: item.action,
          count: parseInt(item.count)
        });
        return acc;
      }, {})
    };
  }

  // Generate credential activity report
  static async generateCredentialActivityReport(where, start, end) {
    const credentialActivity = await prisma.$queryRaw`
      SELECT 
        c.type,
        COUNT(al.id) as "actionCount",
        COUNT(DISTINCT al.action) as "uniqueActions"
      FROM "AuditLog" al
      JOIN "Credential" c ON al."resourceId" = c.id
      WHERE al.timestamp >= ${start} 
        AND al.timestamp <= ${end}
        AND al."resourceType" = 'CREDENTIAL'
      GROUP BY c.type
      ORDER BY "actionCount" DESC
    `;

    const credentialLifecycle = await prisma.$queryRaw`
      SELECT 
        al.action,
        COUNT(*) as count
      FROM "AuditLog" al
      WHERE al.timestamp >= ${start} 
        AND al.timestamp <= ${end}
        AND al."resourceType" = 'CREDENTIAL'
        AND al.action LIKE 'CREDENTIAL_%'
      GROUP BY al.action
      ORDER BY count DESC
    `;

    return {
      reportType: 'credential_activity',
      period: { start, end },
      credentialActivity: credentialActivity.map(item => ({
        type: item.type,
        actionCount: parseInt(item.actionCount),
        uniqueActions: parseInt(item.uniqueActions)
      })),
      lifecycleEvents: credentialLifecycle.map(item => ({
        action: item.action,
        count: parseInt(item.count)
      }))
    };
  }

  // Generate security report
  static async generateSecurityReport(where, start, end) {
    const securityEvents = await prisma.$queryRaw`
      SELECT 
        al.action,
        al.status,
        COUNT(*) as count,
        COUNT(DISTINCT al."userId") as "uniqueUsers",
        COUNT(DISTINCT al."ipAddress") as "uniqueIPs"
      FROM "AuditLog" al
      WHERE al.timestamp >= ${start} 
        AND al.timestamp <= ${end}
        AND (
          al.action LIKE '%LOGIN%' 
          OR al.action LIKE '%FAILED%'
          OR al.action LIKE '%SECURITY%'
          OR al.status = 'FAILED'
        )
      GROUP BY al.action, al.status
      ORDER BY count DESC
    `;

    const suspiciousIPs = await prisma.$queryRaw`
      SELECT 
        al."ipAddress",
        COUNT(*) as "attemptCount",
        COUNT(DISTINCT al."userId") as "uniqueUsers",
        COUNT(DISTINCT al.action) as "uniqueActions"
      FROM "AuditLog" al
      WHERE al.timestamp >= ${start} 
        AND al.timestamp <= ${end}
        AND al."ipAddress" IS NOT NULL
        AND (
          al.action LIKE '%LOGIN%'
          OR al.status = 'FAILED'
        )
      GROUP BY al."ipAddress"
      HAVING COUNT(*) > 10
      ORDER BY "attemptCount" DESC
    `;

    const failedActions = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        ...where,
        status: 'FAILED'
      },
      _count: true
    });

    return {
      reportType: 'security',
      period: { start, end },
      securityEvents: securityEvents.map(event => ({
        action: event.action,
        status: event.status,
        count: parseInt(event.count),
        uniqueUsers: parseInt(event.uniqueUsers),
        uniqueIPs: parseInt(event.uniqueIPs)
      })),
      suspiciousIPs: suspiciousIPs.map(ip => ({
        ipAddress: ip.ipAddress,
        attemptCount: parseInt(ip.attemptCount),
        uniqueUsers: parseInt(ip.uniqueUsers),
        uniqueActions: parseInt(ip.uniqueActions)
      })),
      failedActions: failedActions.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {})
    };
  }

  // Export audit logs to CSV
  static async exportAuditLogsToCSV(filters = {}) {
    try {
      const { logs } = await this.getAuditLogs({ ...filters, limit: 10000 });

      const csvRows = [];
      
      // Add headers
      csvRows.push([
        'Timestamp',
        'User ID',
        'User Wallet',
        'User Name',
        'Action',
        'Resource Type',
        'Resource ID',
        'Status',
        'IP Address',
        'Details'
      ].join(','));

      // Add data rows
      for (const log of logs) {
        const row = [
          log.timestamp.toISOString(),
          log.userId || '',
          log.user?.walletAddress || '',
          log.user?.name || '',
          log.action,
          log.resourceType || '',
          log.resourceId || '',
          log.status,
          log.ipAddress || '',
          JSON.stringify(log.details).replace(/"/g, '""')
        ];
        
        csvRows.push(row.join(','));
      }

      return csvRows.join('\n');
    } catch (error) {
      console.error('Export audit logs error:', error);
      throw new Error('Failed to export audit logs');
    }
  }

  // Clean up old audit logs
  static async cleanupOldAuditLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      return {
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays
      };
    } catch (error) {
      console.error('Cleanup old audit logs error:', error);
      throw new Error('Failed to cleanup old audit logs');
    }
  }

  // Real-time audit monitoring
  static async monitorAuditEvents(callback) {
    try {
      // This would typically use WebSockets or a pub/sub system
      // For now, we'll simulate with a polling mechanism
      
      const lastCheck = new Date();
      
      setInterval(async () => {
        const newLogs = await prisma.auditLog.findMany({
          where: {
            timestamp: {
              gt: lastCheck
            }
          },
          orderBy: { timestamp: 'asc' },
          take: 100
        });

        if (newLogs.length > 0) {
          newLogs.forEach(log => {
            callback(log);
          });
          
          // Update last check time
          lastCheck.setTime(newLogs[newLogs.length - 1].timestamp.getTime());
        }
      }, 5000); // Check every 5 seconds

      console.log('Audit monitoring started');
    } catch (error) {
      console.error('Audit monitoring error:', error);
    }
  }
}

module.exports = AuditService;