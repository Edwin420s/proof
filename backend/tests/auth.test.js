const request = require('supertest');
const { ethers } = require('ethers');
const app = require('../app');
const { prisma } = require('../src/config/database');

describe('Authentication API', () => {
  let testWallet;
  let testSignature;
  let testMessage;
  
  beforeAll(async () => {
    // Create test wallet
    testWallet = ethers.Wallet.createRandom();
    testMessage = 'Proof Identity Login - ' + Date.now();
    
    // Sign message
    testSignature = await testWallet.signMessage(testMessage);
    
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        walletAddress: testWallet.address.toLowerCase()
      }
    });
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  describe('POST /api/auth/wallet-login', () => {
    it('should authenticate user with valid wallet signature', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-login')
        .send({
          walletAddress: testWallet.address,
          signature: testSignature,
          message: testMessage
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.walletAddress.toLowerCase()).toBe(testWallet.address.toLowerCase());
    });
    
    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-login')
        .send({
          walletAddress: testWallet.address
          // Missing signature and message
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 401 for invalid signature', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-login')
        .send({
          walletAddress: testWallet.address,
          signature: '0xinvalid',
          message: testMessage
        })
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('GET /api/auth/me', () => {
    let authToken;
    
    beforeAll(async () => {
      // First authenticate to get token
      const authResponse = await request(app)
        .post('/api/auth/wallet-login')
        .send({
          walletAddress: testWallet.address,
          signature: testSignature,
          message: testMessage
        });
      
      authToken = authResponse.body.token;
    });
    
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.walletAddress.toLowerCase()).toBe(testWallet.address.toLowerCase());
    });
    
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('PUT /api/auth/profile', () => {
    let authToken;
    
    beforeAll(async () => {
      // First authenticate to get token
      const authResponse = await request(app)
        .post('/api/auth/wallet-login')
        .send({
          walletAddress: testWallet.address,
          signature: testSignature,
          message: testMessage
        });
      
      authToken = authResponse.body.token;
    });
    
    it('should update user profile', async () => {
      const updateData = {
        name: 'Test User Updated',
        email: 'test.updated@example.com'
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.email).toBe(updateData.email);
    });
    
    it('should validate email format', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email'
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});