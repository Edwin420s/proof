const { prisma } = require('../config/database');
const { ethers } = require('ethers');
const IPFSService = require('../utils/ipfs');

class HealthController {
  // Basic health check
  static async healthCheck(req, res) {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      const health = {
        status: 'healthy',
        service: 'proof-backend',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        environment: process.env.NODE_ENV || 'development'
      };

      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Detailed health check with dependencies
  static async detailedHealthCheck(req, res) {
    try {
      const checks = {
        database: await this.checkDatabase(),
        blockchain: await this.checkBlockchain(),
        ipfs: await this.checkIPFS(),
        memory: this.checkMemory(),
        disk: await this.checkDiskSpace()
      };

      const allHealthy = Object.values(checks).every(check => check.healthy);
      
      const health = {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
        summary: {
          totalChecks: Object.keys(checks).length,
          healthyChecks: Object.values(checks).filter(c => c.healthy).length,
          degradedChecks: Object.values(checks).filter(c => !c.healthy).length
        }
      };

      res.status(allHealthy ? 200 : 503).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Check database connection
  static async checkDatabase() {
    try {
      const startTime = Date.now();
      
      // Test connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      // Get some stats
      const [usersCount, credentialsCount, verificationsCount] = await Promise.all([
        prisma.user.count(),
        prisma.credential.count(),
        prisma.verification.count()
      ]);

      return {
        healthy: true,
        responseTime: `${responseTime}ms`,
        stats: {
          users: usersCount,
          credentials: credentialsCount,
          verifications: verificationsCount
        },
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Database connection failed'
      };
    }
  }

  // Check blockchain connection
  static async checkBlockchain() {
    try {
      const { POLYGON_RPC_URL } = require('../config/database');
      
      if (!POLYGON_RPC_URL) {
        return {
          healthy: false,
          message: 'Blockchain RPC URL not configured'
        };
      }

      const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
      const startTime = Date.now();
      
      // Test connection
      const blockNumber = await provider.getBlockNumber();
      const network = await provider.getNetwork();
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime: `${responseTime}ms`,
        details: {
          network: network.name,
          chainId: network.chainId,
          blockNumber,
          rpcUrl: POLYGON_RPC_URL.replace(/(https?:\/\/[^/]+\/)[^]/, '$1...') // Mask URL
        },
        message: 'Blockchain connection successful'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Blockchain connection failed'
      };
    }
  }

  // Check IPFS connection
  static async checkIPFS() {
    try {
      const startTime = Date.now();
      
      // Test IPFS connection by getting version
      const version = await IPFSService.client.version();
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime: `${responseTime}ms`,
        details: {
          version: version.version,
          commit: version.commit,
          gateway: IPFSService.gateway
        },
        message: 'IPFS connection successful'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'IPFS connection failed'
      };
    }
  }

  // Check memory usage
  static checkMemory() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = Math.round(memoryUsage.rss / 1024 / 1024);
      const usedMemory = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

      const healthy = memoryPercentage < 90; // Consider unhealthy if > 90% used

      return {
        healthy,
        details: {
          totalMemory: `${totalMemory}MB`,
          usedMemory: `${usedMemory}MB`,
          memoryPercentage: `${memoryPercentage}%`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        message: healthy ? 'Memory usage normal' : 'High memory usage'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Memory check failed'
      };
    }
  }

  // Check disk space
  static async checkDiskSpace() {
    try {
      const { checkDiskSpace } = require('check-disk-space');
      
      const diskSpace = await checkDiskSpace('/');
      const totalGB = (diskSpace.size / 1024 / 1024 / 1024).toFixed(2);
      const freeGB = (diskSpace.free / 1024 / 1024 / 1024).toFixed(2);
      const usedGB = ((diskSpace.size - diskSpace.free) / 1024 / 1024 / 1024).toFixed(2);
      const usedPercentage = ((usedGB / totalGB) * 100).toFixed(2);

      const healthy = usedPercentage < 90; // Consider unhealthy if > 90% used

      return {
        healthy,
        details: {
          total: `${totalGB}GB`,
          free: `${freeGB}GB`,
          used: `${usedGB}GB`,
          usedPercentage: `${usedPercentage}%`,
          path: diskSpace.diskPath
        },
        message: healthy ? 'Disk space normal' : 'Low disk space'
      };
    } catch (error) {
      // Disk space check might fail in some environments (like containers)
      return {
        healthy: true, // Don't fail health check for disk space
        message: 'Disk space check skipped',
        error: error.message
      };
    }
  }

  // Get API status
  static async getAPIStatus(req, res) {
    try {
      const endpoints = [
        { path: '/api/auth/wallet-login', method: 'POST', description: 'Wallet authentication' },
        { path: '/api/credentials/request', method: 'POST', description: 'Request credential' },
        { path: '/api/credentials/my-credentials', method: 'GET', description: 'Get user credentials' },
        { path: '/api/issuers/verified', method: 'GET', description: 'Get verified issuers' },
        { path: '/api/verify', method: 'POST', description: 'Verify credential' },
        { path: '/api/admin/stats', method: 'GET', description: 'Admin statistics' }
      ];

      res.json({
        success: true,
        service: 'Proof Identity API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints,
        documentation: `${process.env.APP_URL || 'http://localhost:3000'}/api-docs`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get system metrics for monitoring
  static async getMetrics(req, res) {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          versions: process.versions
        },
        requests: {
          total: req.app.get('requestCount') || 0,
          active: req.app.get('activeRequests') || 0
        },
        database: {
          pool: {
            max: req.app.get('dbPoolMax') || 10,
            active: req.app.get('dbActiveConnections') || 0,
            idle: req.app.get('dbIdleConnections') || 0,
            waiting: req.app.get('dbWaitingConnections') || 0
          }
        }
      };

      // Format for Prometheus if requested
      if (req.query.format === 'prometheus') {
        const prometheusMetrics = this.formatPrometheusMetrics(metrics);
        res.set('Content-Type', 'text/plain');
        return res.send(prometheusMetrics);
      }

      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Format metrics for Prometheus
  static formatPrometheusMetrics(metrics) {
    const lines = [];
    
    // System metrics
    lines.push(`# HELP nodejs_process_uptime_seconds The uptime of the process in seconds`);
    lines.push(`# TYPE nodejs_process_uptime_seconds gauge`);
    lines.push(`nodejs_process_uptime_seconds ${metrics.system.uptime}`);
    
    lines.push(`# HELP nodejs_heap_size_total_bytes The total heap size in bytes`);
    lines.push(`# TYPE nodejs_heap_size_total_bytes gauge`);
    lines.push(`nodejs_heap_size_total_bytes ${metrics.system.memory.heapTotal}`);
    
    lines.push(`# HELP nodejs_heap_size_used_bytes The used heap size in bytes`);
    lines.push(`# TYPE nodejs_heap_size_used_bytes gauge`);
    lines.push(`nodejs_heap_size_used_bytes ${metrics.system.memory.heapUsed}`);
    
    // Request metrics
    lines.push(`# HELP http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE http_requests_total counter`);
    lines.push(`http_requests_total ${metrics.requests.total}`);
    
    lines.push(`# HELP http_requests_active Current number of active HTTP requests`);
    lines.push(`# TYPE http_requests_active gauge`);
    lines.push(`http_requests_active ${metrics.requests.active}`);
    
    // Database metrics
    lines.push(`# HELP database_connections_max Maximum number of database connections`);
    lines.push(`# TYPE database_connections_max gauge`);
    lines.push(`database_connections_max ${metrics.database.pool.max}`);
    
    lines.push(`# HELP database_connections_active Current number of active database connections`);
    lines.push(`# TYPE database_connections_active gauge`);
    lines.push(`database_connections_active ${metrics.database.pool.active}`);
    
    lines.push(`# HELP database_connections_idle Current number of idle database connections`);
    lines.push(`# TYPE database_connections_idle gauge`);
    lines.push(`database_connections_idle ${metrics.database.pool.idle}`);
    
    return lines.join('\n');
  }
}

module.exports = HealthController;