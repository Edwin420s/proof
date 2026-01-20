const Queue = require('bull');
const Redis = require('ioredis');
const { prisma } = require('../config/database');

class QueueManager {
  constructor() {
    this.queues = {};
    this.redisClient = null;
    this.initialized = false;
  }

  // Initialize Redis connection and queues
  async initialize() {
    if (this.initialized) return;

    try {
      // Create Redis client
      this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false
      });

      // Create queues
      this.queues = {
        // Credential issuance queue
        credentialIssuance: new Queue('credential-issuance', {
          redis: this.redisClient.options,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000
            },
            removeOnComplete: 100, // Keep last 100 completed jobs
            removeOnFail: 1000 // Keep last 1000 failed jobs
          }
        }),

        // Email notification queue
        emailNotifications: new Queue('email-notifications', {
          redis: this.redisClient.options,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000
            },
            removeOnComplete: 100,
            removeOnFail: 1000
          }
        }),

        // Blockchain transaction queue
        blockchainTransactions: new Queue('blockchain-transactions', {
          redis: this.redisClient.options,
          defaultJobOptions: {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 2000
            },
            removeOnComplete: 100,
            removeOnFail: 500
          }
        }),

        // Data processing queue
        dataProcessing: new Queue('data-processing', {
          redis: this.redisClient.options,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000
            },
            removeOnComplete: 100,
            removeOnFail: 1000
          }
        }),

        // Analytics queue
        analyticsProcessing: new Queue('analytics-processing', {
          redis: this.redisClient.options,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000
            },
            removeOnComplete: 50,
            removeOnFail: 500
          }
        }),

        // Cleanup queue
        cleanupJobs: new Queue('cleanup-jobs', {
          redis: this.redisClient.options,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'fixed',
              delay: 5000
            },
            removeOnComplete: 50,
            removeOnFail: 200
          }
        })
      };

      // Set up event listeners for all queues
      this.setupQueueEventListeners();

      this.initialized = true;
      console.log('✅ Queue manager initialized');
    } catch (error) {
      console.error('❌ Queue manager initialization failed:', error);
      throw error;
    }
  }

  // Set up event listeners for queues
  setupQueueEventListeners() {
    Object.values(this.queues).forEach(queue => {
      queue.on('completed', (job, result) => {
        console.log(`✅ Job ${job.id} completed in queue ${queue.name}`);
      });

      queue.on('failed', (job, error) => {
        console.error(`❌ Job ${job.id} failed in queue ${queue.name}:`, error.message);
        
        // Log failure to database
        this.logJobFailure(job, error).catch(console.error);
      });

      queue.on('stalled', (job) => {
        console.warn(`⚠️ Job ${job.id} stalled in queue ${queue.name}`);
      });

      queue.on('active', (job) => {
        console.log(`🚀 Job ${job.id} started in queue ${queue.name}`);
      });
    });
  }

  // Log job failure to database
  async logJobFailure(job, error) {
    try {
      await prisma.failedJob.create({
        data: {
          queue: job.queue.name,
          jobId: job.id.toString(),
          jobName: job.name || 'unknown',
          data: job.data,
          error: error.message,
          stackTrace: error.stack,
          failedAt: new Date()
        }
      });
    } catch (dbError) {
      console.error('Failed to log job failure to database:', dbError);
    }
  }

  // Add job to queue
  async addJob(queueName, jobName, data, options = {}) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobName, data, options);
    
    console.log(`📝 Added job ${job.id} to queue ${queueName}: ${jobName}`);
    
    return {
      jobId: job.id,
      queue: queueName,
      name: jobName,
      timestamp: new Date().toISOString()
    };
  }

  // Add credential issuance job
  async addCredentialIssuanceJob(credentialData) {
    return this.addJob('credentialIssuance', 'issueCredential', credentialData, {
      priority: 1,
      timeout: 30000 // 30 seconds
    });
  }

  // Add email notification job
  async addEmailNotificationJob(notificationData) {
    return this.addJob('emailNotifications', 'sendEmail', notificationData, {
      priority: 3,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  // Add blockchain transaction job
  async addBlockchainTransactionJob(transactionData) {
    return this.addJob('blockchainTransactions', 'processTransaction', transactionData, {
      priority: 2,
      attempts: 5,
      timeout: 60000 // 60 seconds
    });
  }

  // Add analytics processing job
  async addAnalyticsJob(analyticsData) {
    return this.addJob('analyticsProcessing', 'processAnalytics', analyticsData, {
      priority: 4,
      delay: 5000 // Process after 5 seconds
    });
  }

  // Add cleanup job
  async addCleanupJob(cleanupData) {
    return this.addJob('cleanupJobs', 'runCleanup', cleanupData, {
      priority: 5,
      delay: 3600000 // Process after 1 hour
    });
  }

  // Get queue status
  async getQueueStatus(queueName) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [
      waiting,
      active,
      completed,
      failed,
      delayed
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    const workers = await queue.getWorkers();
    const jobCounts = await queue.getJobCounts();

    return {
      queue: queueName,
      status: 'active',
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        ...jobCounts
      },
      workers: workers.length,
      isPaused: await queue.isPaused()
    };
  }

  // Get all queues status
  async getAllQueuesStatus() {
    await this.initialize();

    const statuses = {};
    for (const [name, queue] of Object.entries(this.queues)) {
      statuses[name] = await this.getQueueStatus(name);
    }

    return {
      timestamp: new Date().toISOString(),
      queues: statuses,
      totalQueues: Object.keys(this.queues).length
    };
  }

  // Pause a queue
  async pauseQueue(queueName) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    console.log(`⏸️ Queue ${queueName} paused`);
    
    return {
      queue: queueName,
      status: 'paused',
      timestamp: new Date().toISOString()
    };
  }

  // Resume a queue
  async resumeQueue(queueName) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    console.log(`▶️ Queue ${queueName} resumed`);
    
    return {
      queue: queueName,
      status: 'active',
      timestamp: new Date().toISOString()
    };
  }

  // Clean a queue (remove completed/failed jobs)
  async cleanQueue(queueName, grace = 5000, limit = 1000, type = 'completed') {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const cleaned = await queue.clean(grace, limit, type);
    
    console.log(`🧹 Cleaned ${cleaned.length} ${type} jobs from queue ${queueName}`);
    
    return {
      queue: queueName,
      type,
      cleanedCount: cleaned.length,
      timestamp: new Date().toISOString()
    };
  }

  // Get job by ID
  async getJob(queueName, jobId) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();
    
    return {
      id: job.id,
      name: job.name,
      queue: queueName,
      data: job.data,
      opts: job.opts,
      state,
      progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    };
  }

  // Retry failed job
  async retryJob(queueName, jobId) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.retry();
    
    console.log(`🔄 Retrying job ${jobId} in queue ${queueName}`);
    
    return {
      jobId,
      queue: queueName,
      retried: true,
      timestamp: new Date().toISOString()
    };
  }

  // Remove job
  async removeJob(queueName, jobId) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.remove();
    
    console.log(`🗑️ Removed job ${jobId} from queue ${queueName}`);
    
    return {
      jobId,
      queue: queueName,
      removed: true,
      timestamp: new Date().toISOString()
    };
  }

  // Get failed jobs
  async getFailedJobs(queueName, start = 0, end = 49) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed(start, end);
    
    const jobs = await Promise.all(
      failedJobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
        processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
      }))
    );

    return {
      queue: queueName,
      count: jobs.length,
      jobs,
      range: { start, end }
    };
  }

  // Retry all failed jobs in a queue
  async retryAllFailedJobs(queueName) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed();
    const retriedJobs = [];

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedJobs.push(job.id);
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    console.log(`🔄 Retried ${retriedJobs.length} failed jobs in queue ${queueName}`);
    
    return {
      queue: queueName,
      retriedCount: retriedJobs.length,
      retriedJobs,
      timestamp: new Date().toISOString()
    };
  }

  // Empty a queue (remove all jobs)
  async emptyQueue(queueName) {
    await this.initialize();

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.empty();
    
    console.log(`🧹 Emptied queue ${queueName}`);
    
    return {
      queue: queueName,
      emptied: true,
      timestamp: new Date().toISOString()
    };
  }

  // Close all queues (graceful shutdown)
  async closeAll() {
    for (const [name, queue] of Object.entries(this.queues)) {
      try {
        await queue.close();
        console.log(`🔒 Closed queue ${name}`);
      } catch (error) {
        console.error(`Error closing queue ${name}:`, error);
      }
    }

    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('🔒 Closed Redis connection');
    }

    this.initialized = false;
    console.log('✅ All queues closed');
  }
}

// Create singleton instance
const queueManager = new QueueManager();

// Initialize on startup if Redis is configured
if (process.env.REDIS_URL) {
  queueManager.initialize().catch(console.error);
}

module.exports = queueManager;