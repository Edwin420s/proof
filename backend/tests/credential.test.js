const request = require('supertest');
const { ethers } = require('ethers');
const app = require('../app');
const { prisma } = require('../src/config/database');

describe('Credential API', () => {
  let testUser;
  let testIssuer;
  let authToken;
  let testCredential;
  
  beforeAll(async () => {
    // Create test user and issuer
    const testWallet = ethers.Wallet.createRandom();
    
    // Create user
    testUser = await prisma.user.create({
      data: {
        walletAddress: testWallet.address.toLowerCase(),
        did: `did:polygon:${testWallet.address}:test`,
        name: 'Test User',
        email: 'test.user@example.com',
        role: 'USER'
      }
    });
    
    // Create issuer
    const issuerWallet = ethers.Wallet.createRandom();
    testIssuer = await prisma.issuer.create({
      data: {
        name: 'Test Issuer',
        description: 'Test issuer for unit tests',
        walletAddress: issuerWallet.address.toLowerCase(),
        did: `did:polygon:${issuerWallet.address}:issuer`,
        isVerified: true,
        metadata: {
          type: 'test_issuer'
        }
      }
    });
    
    // Create JWT token for user
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      {
        userId: testUser.id,
        walletAddress: testUser.walletAddress,
        role: testUser.role
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });
  
  afterAll(async () => {
    // Clean up test data
    await prisma.credential.deleteMany({
      where: {
        userId: testUser.id
      }
    });
    
    await prisma.issuer.delete({
      where: { id: testIssuer.id }
    });
    
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    await prisma.$disconnect();
  });
  
  describe('POST /api/credentials/request', () => {
    it('should request a new credential', async () => {
      const credentialData = {
        issuerId: testIssuer.id,
        credentialType: 'TEST_CERTIFICATION',
        data: {
          testField: 'test value'
        },
        metadata: {
          title: 'Test Certification',
          description: 'Test credential for unit testing'
        }
      };
      
      const response = await request(app)
        .post('/api/credentials/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(credentialData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.credential).toBeDefined();
      expect(response.body.credential.type).toBe(credentialData.credentialType);
      expect(response.body.credential.hash).toBeDefined();
      
      // Save for later tests
      testCredential = response.body.credential;
    });
    
    it('should return 404 for non-existent issuer', async () => {
      const response = await request(app)
        .post('/api/credentials/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          issuerId: '00000000-0000-0000-0000-000000000000',
          credentialType: 'TEST_CERTIFICATION'
        })
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/credentials/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing issuerId and credentialType
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
  
  describe('GET /api/credentials/my-credentials', () => {
    it('should return user credentials', async () => {
      const response = await request(app)
        .get('/api/credentials/my-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.credentials).toBeDefined();
      expect(Array.isArray(response.body.credentials)).toBe(true);
      
      // Should include the credential we created
      const credential = response.body.credentials.find(
        c => c.type === 'TEST_CERTIFICATION'
      );
      expect(credential).toBeDefined();
    });
    
    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/credentials/my-credentials?status=ACTIVE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // All returned credentials should have ACTIVE status
      response.body.credentials.forEach(credential => {
        expect(credential.status).toBe('ACTIVE');
      });
    });
    
    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/credentials/my-credentials?type=TEST_CERTIFICATION')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // All returned credentials should be TEST_CERTIFICATION type
      response.body.credentials.forEach(credential => {
        expect(credential.type).toBe('TEST_CERTIFICATION');
      });
    });
  });
  
  describe('GET /api/credentials/:credentialId', () => {
    it('should return credential details', async () => {
      // First get credential ID from list
      const listResponse = await request(app)
        .get('/api/credentials/my-credentials')
        .set('Authorization', `Bearer ${authToken}`);
      
      const credential = listResponse.body.credentials[0];
      
      const response = await request(app)
        .get(`/api/credentials/${credential.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.credential).toBeDefined();
      expect(response.body.credential.id).toBe(credential.id);
      expect(response.body.credential.type).toBe(credential.type);
    });
    
    it('should return 404 for non-existent credential', async () => {
      const response = await request(app)
        .get('/api/credentials/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 403 for unauthorized access', async () => {
      // Create another user
      const otherWallet = ethers.Wallet.createRandom();
      const otherUser = await prisma.user.create({
        data: {
          walletAddress: otherWallet.address.toLowerCase(),
          did: `did:polygon:${otherWallet.address}:other`,
          name: 'Other User',
          role: 'USER'
        }
      });
      
      const otherToken = jwt.sign(
        {
          userId: otherUser.id,
          walletAddress: otherUser.walletAddress,
          role: otherUser.role
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      
      // Get credential ID from first user
      const listResponse = await request(app)
        .get('/api/credentials/my-credentials')
        .set('Authorization', `Bearer ${authToken}`);
      
      const credential = listResponse.body.credentials[0];
      
      // Try to access with other user's token
      const response = await request(app)
        .get(`/api/credentials/${credential.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect('Content-Type', /json/)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      // Clean up
      await prisma.user.delete({
        where: { id: otherUser.id }
      });
    });
  });
  
  describe('POST /api/credentials/:credentialId/proof', () => {
    it('should generate proof for credential', async () => {
      // Get credential ID
      const listResponse = await request(app)
        .get('/api/credentials/my-credentials')
        .set('Authorization', `Bearer ${authToken}`);
      
      const credential = listResponse.body.credentials[0];
      
      const response = await request(app)
        .post(`/api/credentials/${credential.id}/proof`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attributes: ['has_certification'],
          expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.proof).toBeDefined();
      expect(response.body.proof.credentialId).toBe(credential.id);
      expect(response.body.proof.attributes).toBeDefined();
      expect(response.body.proof.qrCode).toBeDefined();
    });
    
    it('should return 400 for expired credential', async () => {
      // Create an expired credential
      const expiredCredential = await prisma.credential.create({
        data: {
          userId: testUser.id,
          issuerId: testIssuer.id,
          type: 'EXPIRED_TEST',
          title: 'Expired Test Credential',
          credentialHash: ethers.keccak256(ethers.toUtf8Bytes(`expired-${Date.now()}`)),
          status: 'EXPIRED',
          issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        }
      });
      
      const response = await request(app)
        .post(`/api/credentials/${expiredCredential.id}/proof`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attributes: ['test']
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      // Clean up
      await prisma.credential.delete({
        where: { id: expiredCredential.id }
      });
    });
  });
});