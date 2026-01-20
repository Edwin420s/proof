const { prisma } = require('../config/database');
const { startOfDay, endOfDay, subDays, subMonths } = require('date-fns');

class AnalyticsService {
  // Get system analytics dashboard
  static async getSystemAnalytics(timeframe = '30d') {
    try {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '7d':
          startDate = subDays(now, 7);
          break;
        case '30d':
          startDate = subDays(now, 30);
          break;
        case '90d':
          startDate = subDays(now, 90);
          break;
        case '1y':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = subDays(now, 30);
      }

      const [
        userStats,
        credentialStats,
        verificationStats,
        issuerStats,
        dailyMetrics,
        topCredentials,
        topIssuers,
        topVerifiers
      ] = await Promise.all([
        this.getUserStats(startDate, now),
        this.getCredentialStats(startDate, now),
        this.getVerificationStats(startDate, now),
        this.getIssuerStats(startDate, now),
        this.getDailyMetrics(startDate, now),
        this.getTopCredentials(startDate, now),
        this.getTopIssuers(startDate, now),
        this.getTopVerifiers(startDate, now)
      ]);

      return {
        timeframe,
        period: { start: startDate, end: now },
        summary: {
          users: userStats,
          credentials: credentialStats,
          verifications: verificationStats,
          issuers: issuerStats
        },
        trends: dailyMetrics,
        topPerformers: {
          credentials: topCredentials,
          issuers: topIssuers,
          verifiers: topVerifiers
        }
      };
    } catch (error) {
      console.error('Get system analytics error:', error);
      throw new Error('Failed to get system analytics');
    }
  }

  // Get user statistics
  static async getUserStats(startDate, endDate) {
    const totalUsers = await prisma.user.count();
    
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const activeUsers = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "userId") as count
      FROM "AuditLog"
      WHERE timestamp >= ${startDate} 
        AND timestamp <= ${endDate}
        AND action IN ('WALLET_LOGIN', 'CREDENTIAL_REQUEST', 'VERIFICATION_REQUEST')
    `;

    const userGrowth = await this.calculateGrowthRate(
      'User',
      'createdAt',
      startDate,
      endDate
    );

    return {
      total: totalUsers,
      new: parseInt(newUsers),
      active: parseInt(activeUsers[0]?.count || 0),
      growthRate: userGrowth
    };
  }

  // Get credential statistics
  static async getCredentialStats(startDate, endDate) {
    const totalCredentials = await prisma.credential.count();
    
    const newCredentials = await prisma.credential.count({
      where: {
        issuedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const activeCredentials = await prisma.credential.count({
      where: {
        status: 'ACTIVE',
        issuedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const revokedCredentials = await prisma.credential.count({
      where: {
        status: 'REVOKED',
        revokedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const credentialTypes = await prisma.credential.groupBy({
      by: ['type'],
      where: {
        issuedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true,
      orderBy: {
        _count: 'desc'
      },
      take: 10
    });

    return {
      total: totalCredentials,
      new: newCredentials,
      active: activeCredentials,
      revoked: revokedCredentials,
      byType: credentialTypes.map(item => ({
        type: item.type,
        count: item._count
      }))
    };
  }

  // Get verification statistics
  static async getVerificationStats(startDate, endDate) {
    const totalVerifications = await prisma.verification.count();
    
    const newVerifications = await prisma.verification.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const successfulVerifications = await prisma.verification.count({
      where: {
        status: 'VERIFIED',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const failedVerifications = await prisma.verification.count({
      where: {
        status: 'REJECTED',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const verificationRate = totalVerifications > 0 
      ? (successfulVerifications / newVerifications) * 100 
      : 0;

    return {
      total: totalVerifications,
      new: newVerifications,
      successful: successfulVerifications,
      failed: failedVerifications,
      successRate: Math.round(verificationRate * 100) / 100
    };
  }

  // Get issuer statistics
  static async getIssuerStats(startDate, endDate) {
    const totalIssuers = await prisma.issuer.count();
    const verifiedIssuers = await prisma.issuer.count({
      where: { isVerified: true }
    });

    const newIssuers = await prisma.issuer.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const topIssuersByCredentials = await prisma.issuer.findMany({
      select: {
        id: true,
        name: true,
        isVerified: true,
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

    return {
      total: totalIssuers,
      verified: verifiedIssuers,
      new: newIssuers,
      topIssuers: topIssuersByCredentials.map(issuer => ({
        id: issuer.id,
        name: issuer.name,
        isVerified: issuer.isVerified,
        credentialCount: issuer._count.credentials
      }))
    };
  }

  // Get daily metrics
  static async getDailyMetrics(startDate, endDate) {
    const dailyData = await prisma.$queryRaw`
      WITH date_series AS (
        SELECT generate_series(
          ${startDate}::date,
          ${endDate}::date,
          '1 day'::interval
        )::date as date
      )
      SELECT 
        ds.date,
        COUNT(DISTINCT u.id) as "newUsers",
        COUNT(DISTINCT c.id) as "newCredentials",
        COUNT(DISTINCT v.id) as "newVerifications",
        COUNT(DISTINCT CASE WHEN v.status = 'VERIFIED' THEN v.id END) as "successfulVerifications"
      FROM date_series ds
      LEFT JOIN "User" u ON DATE(u."createdAt") = ds.date
      LEFT JOIN "Credential" c ON DATE(c."issuedAt") = ds.date
      LEFT JOIN "Verification" v ON DATE(v."createdAt") = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `;

    return dailyData.map(day => ({
      date: day.date,
      newUsers: parseInt(day.newUsers || 0),
      newCredentials: parseInt(day.newCredentials || 0),
      newVerifications: parseInt(day.newVerifications || 0),
      successfulVerifications: parseInt(day.successfulVerifications || 0),
      verificationRate: day.newVerifications > 0 
        ? Math.round((day.successfulVerifications / day.newVerifications) * 100 * 100) / 100 
        : 0
    }));
  }

  // Get top credentials
  static async getTopCredentials(startDate, endDate) {
    const topCredentials = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.type,
        c.title,
        COUNT(v.id) as "verificationCount",
        COUNT(DISTINCT v."verifierId") as "uniqueVerifiers",
        AVG(CASE WHEN v.status = 'VERIFIED' THEN 1 ELSE 0 END) * 100 as "successRate"
      FROM "Credential" c
      LEFT JOIN "Verification" v ON c.id = v."credentialId"
      WHERE c."issuedAt" >= ${startDate} AND c."issuedAt" <= ${endDate}
      GROUP BY c.id, c.type, c.title
      HAVING COUNT(v.id) > 0
      ORDER BY "verificationCount" DESC
      LIMIT 20
    `;

    return topCredentials.map(cred => ({
      id: cred.id,
      type: cred.type,
      title: cred.title,
      verificationCount: parseInt(cred.verificationCount),
      uniqueVerifiers: parseInt(cred.uniqueVerifiers),
      successRate: Math.round(parseFloat(cred.successRate) * 100) / 100
    }));
  }

  // Get top issuers
  static async getTopIssuers(startDate, endDate) {
    const topIssuers = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.name,
        i.is_verified as "isVerified",
        COUNT(c.id) as "credentialCount",
        COUNT(DISTINCT c."userId") as "uniqueRecipients",
        COUNT(v.id) as "totalVerifications",
        AVG(CASE WHEN v.status = 'VERIFIED' THEN 1 ELSE 0 END) * 100 as "verificationSuccessRate"
      FROM "Issuer" i
      LEFT JOIN "Credential" c ON i.id = c."issuerId"
      LEFT JOIN "Verification" v ON c.id = v."credentialId"
      WHERE c."issuedAt" >= ${startDate} AND c."issuedAt" <= ${endDate}
      GROUP BY i.id, i.name, i.is_verified
      ORDER BY "credentialCount" DESC
      LIMIT 20
    `;

    return topIssuers.map(issuer => ({
      id: issuer.id,
      name: issuer.name,
      isVerified: issuer.isVerified,
      credentialCount: parseInt(issuer.credentialCount),
      uniqueRecipients: parseInt(issuer.uniqueRecipients),
      totalVerifications: parseInt(issuer.totalVerifications),
      verificationSuccessRate: Math.round(parseFloat(issuer.verificationSuccessRate) * 100) / 100
    }));
  }

  // Get top verifiers
  static async getTopVerifiers(startDate, endDate) {
    const topVerifiers = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.wallet_address as "walletAddress",
        u.name,
        COUNT(v.id) as "verificationCount",
        COUNT(DISTINCT v."credentialId") as "uniqueCredentials",
        COUNT(DISTINCT c."issuerId") as "uniqueIssuers",
        AVG(CASE WHEN v.status = 'VERIFIED' THEN 1 ELSE 0 END) * 100 as "successRate"
      FROM "User" u
      LEFT JOIN "Verification" v ON u.id = v."verifierId"
      LEFT JOIN "Credential" c ON v."credentialId" = c.id
      WHERE v."createdAt" >= ${startDate} AND v."createdAt" <= ${endDate}
        AND u.role IN ('VERIFIER', 'ADMIN')
      GROUP BY u.id, u.wallet_address, u.name
      HAVING COUNT(v.id) > 0
      ORDER BY "verificationCount" DESC
      LIMIT 20
    `;

    return topVerifiers.map(verifier => ({
      id: verifier.id,
      walletAddress: verifier.walletAddress,
      name: verifier.name,
      verificationCount: parseInt(verifier.verificationCount),
      uniqueCredentials: parseInt(verifier.uniqueCredentials),
      uniqueIssuers: parseInt(verifier.uniqueIssuers),
      successRate: Math.round(parseFloat(verifier.successRate) * 100) / 100
    }));
  }

  // Calculate growth rate
  static async calculateGrowthRate(model, dateField, startDate, endDate) {
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const halfPeriod = Math.floor(periodDays / 2);
    const midDate = new Date(startDate);
    midDate.setDate(midDate.getDate() + halfPeriod);

    const [firstHalf, secondHalf] = await Promise.all([
      prisma[model].count({
        where: {
          [dateField]: {
            gte: startDate,
            lt: midDate
          }
        }
      }),
      prisma[model].count({
        where: {
          [dateField]: {
            gte: midDate,
            lte: endDate
          }
        }
      })
    ]);

    if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
    
    const growth = ((secondHalf - firstHalf) / firstHalf) * 100;
    return Math.round(growth * 100) / 100;
  }

  // Get real-time metrics
  static async getRealtimeMetrics() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      hourlyStats,
      dailyStats,
      activeUsersNow,
      pendingVerifications
    ] = await Promise.all([
      this.getHourlyStats(lastHour, now),
      this.getDailyStats(last24Hours, now),
      this.getActiveUsersCount(),
      prisma.verification.count({
        where: { status: 'PENDING' }
      })
    ]);

    return {
      timestamp: now.toISOString(),
      lastHour: hourlyStats,
      last24Hours: dailyStats,
      current: {
        activeUsers: activeUsersNow,
        pendingVerifications
      }
    };
  }

  // Get hourly stats
  static async getHourlyStats(startDate, endDate) {
    const stats = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as "totalActions",
        COUNT(DISTINCT "userId") as "uniqueUsers"
      FROM "AuditLog"
      WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY hour
    `;

    return stats.map(stat => ({
      hour: parseInt(stat.hour),
      totalActions: parseInt(stat.totalActions),
      uniqueUsers: parseInt(stat.uniqueUsers)
    }));
  }

  // Get daily stats
  static async getDailyStats(startDate, endDate) {
    const stats = await prisma.$queryRaw`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as "totalActions",
        COUNT(DISTINCT "userId") as "uniqueUsers",
        COUNT(DISTINCT "ipAddress") as "uniqueIPs"
      FROM "AuditLog"
      WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    return stats.map(stat => ({
      date: stat.date,
      totalActions: parseInt(stat.totalActions),
      uniqueUsers: parseInt(stat.uniqueUsers),
      uniqueIPs: parseInt(stat.uniqueIPs)
    }));
  }

  // Get active users count
  static async getActiveUsersCount(minutes = 15) {
    const cutoff = new Date(new Date().getTime() - minutes * 60 * 1000);
    
    const result = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "userId") as count
      FROM "AuditLog"
      WHERE timestamp >= ${cutoff}
        AND action IN ('WALLET_LOGIN', 'CREDENTIAL_REQUEST', 'VERIFICATION_REQUEST')
    `;

    return parseInt(result[0]?.count || 0);
  }

  // Export analytics data
  static async exportAnalyticsData(format = 'json', filters = {}) {
    try {
      const analytics = await this.getSystemAnalytics(filters.timeframe || '30d');

      if (format === 'csv') {
        return this.convertAnalyticsToCSV(analytics);
      }

      return JSON.stringify(analytics, null, 2);
    } catch (error) {
      console.error('Export analytics error:', error);
      throw new Error('Failed to export analytics data');
    }
  }

  // Convert analytics to CSV
  static convertAnalyticsToCSV(analytics) {
    const csvRows = [];
    
    // Add timeframe info
    csvRows.push('Timeframe:,${analytics.timeframe}');
    csvRows.push('Start Date:,${analytics.period.start.toISOString()}');
    csvRows.push('End Date:,${analytics.period.end.toISOString()}');
    csvRows.push('');
    
    // Add user stats
    csvRows.push('User Statistics');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Users,${analytics.summary.users.total}`);
    csvRows.push(`New Users,${analytics.summary.users.new}`);
    csvRows.push(`Active Users,${analytics.summary.users.active}`);
    csvRows.push(`Growth Rate,${analytics.summary.users.growthRate}%`);
    csvRows.push('');
    
    // Add credential stats
    csvRows.push('Credential Statistics');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Credentials,${analytics.summary.credentials.total}`);
    csvRows.push(`New Credentials,${analytics.summary.credentials.new}`);
    csvRows.push(`Active Credentials,${analytics.summary.credentials.active}`);
    csvRows.push(`Revoked Credentials,${analytics.summary.credentials.revoked}`);
    csvRows.push('');
    
    // Add verification stats
    csvRows.push('Verification Statistics');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Verifications,${analytics.summary.verifications.total}`);
    csvRows.push(`New Verifications,${analytics.summary.verifications.new}`);
    csvRows.push(`Successful Verifications,${analytics.summary.verifications.successful}`);
    csvRows.push(`Failed Verifications,${analytics.summary.verifications.failed}`);
    csvRows.push(`Success Rate,${analytics.summary.verifications.successRate}%`);
    
    return csvRows.join('\n');
  }
}

module.exports = AnalyticsService;