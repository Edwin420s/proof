const Queue = require('bull');
const { prisma } = require('../../config/database');
const blockchainService = require('../../services/blockchainService');
const NotificationService = require('../../services/notificationService');
const AuditService = require('../../services/auditService');

class CredentialWorker {
  constructor(queueName = 'credential-issuance') {
    this.queue = new Queue(queueName, process.env.REDIS_URL || 'redis://localhost:6379');
    this.setupWorker();
  }

  // Set up worker to process jobs
  setupWorker() {
    // Process credential issuance jobs
    this.queue.process('issueCredential', async (job) => {
      console.log(`Processing credential issuance job: ${job.id}`);
      
      try {
        const { credentialId, userId, issuerId, credentialData } = job.data;
        
        // Update job progress
        job.progress(10);
        
        // Get credential from database
        const credential = await prisma.credential.findUnique({
          where: { id: credentialId },
          include: {
            user: true,
            issuer: true
          }
        });

        if (!credential) {
          throw new Error(`Credential ${credentialId} not found`);
        }

        // Update job progress
        job.progress(30);
        
        // Issue credential on blockchain
        const blockchainResult = await blockchainService.issueCredential({
          holderAddress: credential.user.walletAddress,
          credentialType: credential.type,
          expiresAt: credential.expiresAt,
          metadataURI: credential.metadata?.ipfs?.url || 'ipfs://QmDefaultMetadata',
          issuerAddress: credential.issuer.walletAddress
        });

        if (!blockchainResult.success) {
          throw new Error(`Blockchain issuance failed: ${blockchainResult.error}`);
        }

        // Update job progress
        job.progress(60);
        
        // Update credential with blockchain data
        await prisma.credential.update({
          where: { id: credentialId },
          data: {
            credentialHash: blockchainResult.credentialHash,
            contractAddress: blockchainResult.details.issuerAddress,
            tokenId: `cred-${blockchainResult.credentialHash.substring(2, 18)}`,
            status: 'ACTIVE'
          }
        });

        // Update job progress
        job.progress(80);
        
        // Send notification to user
        await NotificationService.sendCredentialIssuedNotification(
          credential,
          credential.user
        );

        // Log audit event
        await AuditService.logCredentialEvent(credentialId, 'issued', {
          txHash: blockchainResult.transactionHash,
          credentialHash: blockchainResult.credentialHash
        });

        // Update job progress
        job.progress(100);
        
        return {
          success: true,
          credentialId,
          credentialHash: blockchainResult.credentialHash,
          transactionHash: blockchainResult.transactionHash,
          message: 'Credential issued successfully'
        };
        
      } catch (error) {
        console.error(`Credential issuance job ${job.id} failed:`, error);
        
        // Update credential status to failed
        if (job.data.credentialId) {
          await prisma.credential.update({
            where: { id: job.data.credentialId },
            data: { status: 'FAILED' }
          }).catch(console.error);
        }
        
        throw error;
      }
    });

    // Process credential revocation jobs
    this.queue.process('revokeCredential', async (job) => {
      console.log(`Processing credential revocation job: ${job.id}`);
      
      try {
        const { credentialId, reason } = job.data;
        
        // Update job progress
        job.progress(20);
        
        // Get credential from database
        const credential = await prisma.credential.findUnique({
          where: { id: credentialId },
          include: { issuer: true }
        });

        if (!credential) {
          throw new Error(`Credential ${credentialId} not found`);
        }

        // Update job progress
        job.progress(40);
        
        // Revoke credential on blockchain
        const blockchainResult = await blockchainService.revokeCredential(
          credential.credentialHash,
          reason
        );

        if (!blockchainResult.success) {
          throw new Error(`Blockchain revocation failed: ${blockchainResult.error}`);
        }

        // Update job progress
        job.progress(70);
        
        // Update credential status in database
        await prisma.credential.update({
          where: { id: credentialId },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revokedReason: reason
          }
        });

        // Update job progress
        job.progress(90);
        
        // Log audit event
        await AuditService.logCredentialEvent(credentialId, 'revoked', {
          txHash: blockchainResult.transactionHash,
          reason
        });

        // Update job progress
        job.progress(100);
        
        return {
          success: true,
          credentialId,
          transactionHash: blockchainResult.transactionHash,
          message: 'Credential revoked successfully'
        };
        
      } catch (error) {
        console.error(`Credential revocation job ${job.id} failed:`, error);
        throw error;
      }
    });

    // Process batch credential issuance
    this.queue.process('batchIssueCredentials', async (job) => {
      console.log(`Processing batch credential issuance job: ${job.id}`);
      
      try {
        const { credentials, issuerId } = job.data;
        const results = [];
        
        let progress = 0;
        const progressIncrement = 100 / credentials.length;
        
        for (const credData of credentials) {
          try {
            // Issue single credential
            const result = await blockchainService.issueCredential({
              holderAddress: credData.userWallet,
              credentialType: credData.type,
              expiresAt: credData.expiresAt,
              metadataURI: credData.metadataURI,
              issuerAddress: credData.issuerWallet
            });
            
            if (result.success) {
              // Create credential in database
              const credential = await prisma.credential.create({
                data: {
                  userId: credData.userId,
                  issuerId: issuerId,
                  type: credData.type,
                  title: credData.title,
                  description: credData.description,
                  credentialHash: result.credentialHash,
                  contractAddress: result.details.issuerAddress,
                  tokenId: `cred-${result.credentialHash.substring(2, 18)}`,
                  data: credData.data,
                  metadata: credData.metadata,
                  status: 'ACTIVE',
                  issuedAt: new Date(),
                  expiresAt: credData.expiresAt ? new Date(credData.expiresAt) : null
                }
              });
              
              results.push({
                success: true,
                credentialId: credential.id,
                userId: credData.userId,
                credentialHash: result.credentialHash,
                transactionHash: result.transactionHash
              });
            } else {
              results.push({
                success: false,
                userId: credData.userId,
                error: result.error
              });
            }
          } catch (error) {
            results.push({
              success: false,
              userId: credData.userId,
              error: error.message
            });
          }
          
          // Update progress
          progress += progressIncrement;
          job.progress(Math.min(progress, 100));
        }
        
        // Calculate success rate
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        return {
          success: true,
          total: credentials.length,
          successful,
          failed,
          results
        };
        
      } catch (error) {
        console.error(`Batch credential issuance job ${job.id} failed:`, error);
        throw error;
      }
    });

    console.log('✅ Credential worker initialized');
  }

  // Add job to queue
  async addJob(jobName, data, options = {}) {
    return await this.queue.add(jobName, data, options);
  }

  // Get job status
  async getJobStatus(jobId) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }
    
    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      state,
      progress: job.progress(),
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
  }

  // Get queue statistics
  async getQueueStats() {
    const counts = await this.queue.getJobCounts();
    const workers = await this.queue.getWorkers();
    
    return {
      name: this.queue.name,
      counts,
      workers: workers.length,
      isPaused: await this.queue.isPaused()
    };
  }

  // Clean up old jobs
  async cleanupOldJobs(gracePeriod = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const grace = Date.now() - gracePeriod;
    
    const [completedCleaned, failedCleaned] = await Promise.all([
      this.queue.clean(grace, 1000, 'completed'),
      this.queue.clean(grace, 1000, 'failed')
    ]);
    
    return {
      completed: completedCleaned.length,
      failed: failedCleaned.length,
      total: completedCleaned.length + failedCleaned.length
    };
  }

  // Close queue
  async close() {
    await this.queue.close();
    console.log('🔒 Credential worker closed');
  }
}

module.exports = CredentialWorker;