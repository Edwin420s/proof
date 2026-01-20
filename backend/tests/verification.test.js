const request = require('supertest');
const { ethers } = require('ethers');
const app = require('../app');
const { prisma } = require('../src/config/database');

describe('Verification API', () => {
  let testVerifier;
  let testCredential;
  let verifierToken;
  let proofData;
  
  beforeAll(async () => {
    // Create test verifier
    const verifierWallet = ethers.Wallet.createRandom();
    testVerifier = await prisma.user.create({
      data: {
        walletAddress: verifierWallet.address.toLowerCase(),
        did: `did:polygon:${verifierWallet.address}:verifier`,
        name: 'Test Verifier',
        email: 'verifier@example.com',
        role: 'VERIFIER'
      }
    });
    
    // Create test issuer
    const issuerWallet = ethers.Wallet.createRandom();
    const testIssuer = await prisma.issuer.create({
      data: {
        name: 'Verification Test Issuer',
        description: 'For verification tests',
        walletAddress: issuerWallet.address.toLowerCase(),
        did: `did:polygon:${issuerWallet.address}:issuer`,
        isVerified: true
      }
    });
    
    // Create test user with credential
    const userWallet = ethers.Wallet.createRandom();
    const testUser = await prisma.user.create({
      data: {
        walletAddress: userWallet.address.toLowerCase(),
        did: `did:polygon:${userWallet.address}:user`,
        name: 'Test User',
        role: 'USER'
      }
    });
    
    // Create test credential
    testCredential = await prisma.credential.create({
      data: {
        userId: testUser.id,
        issuerId: testIssuer.id,
        type: 'VERIFICATION_TEST',
        title: 'Verification Test Credential',
        description: 'For verification API testing',
        credentialHash: ethers.keccak256(ethers.toUtf8Bytes(`verify-test-${Date.now()}`)),
        status: 'ACTIVE',
        data: {
          testField: 'test value'
        },
        metadata: {
          test: true
        }
      }
    });
    
    // Create JWT token for verifier
    const jwt = require('jsonwebtoken');
    verifierToken = jwt.sign(
      {
        userId: testVerifier.id,
        walletAddress: testVerifier.walletAddress,
        role: testVerifier.role
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    // Create test proof data
    proofData = {
      proofId: ethers.keccak256(ethers.toUtf8Bytes(`proof-${Date.now()}`)),
      credentialHash: testCredential.credentialHash,
      holderDID: testUser.did,
      timestamp: Date.now(),
      nonce: ethers.hexlify(ethers.randomBytes(32))
    };
  });
  
  afterAll(async () => {
    // Clean up test data
    await prisma.verification.deleteMany({
      where: {
        verifierId: testVerifier.id
      }
    });
    
    await prisma.credential.deleteMany({
      where: {
        id: testCredential.id
      }
    });
    
    // Delete users and issuer
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testVerifier.id, testCredential.userId]
        }
      }
    });
    
    await prisma.issuer.deleteMany({
      where: {
        walletAddress: {
          contains: 'verification'
        }
      }
    });
    
    await prisma.$disconnect();
  });
  
  describe('POST /api/verify', () => {
    it('should verify credential with proof data', async () => {
      const response = await request(app)
        .post('/api/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          proofData: proofData,
          attributes: ['has_credential']
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.verification).toBeDefined();
      expect(response.body.verification.status).toBe('VERIFIED');
      expect(response.body.verification.result).toBeDefined();
    });
    
    it('should verify credential with proof ID', async () => {
      const response = await request(app)
        .post('/api/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          proofId: proofData.proofId,
          attributes: ['has_credential']
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.verification).toBeDefined();
    });
    
    it('should return 400 for missing proof data', async () => {
      const response = await request(app)
        .post('/api/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          // Missing proofData and proofId
          attributes: ['test']
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/verify')
        .send({
          proofData: proofData
        })
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/verify/scan-qr', () => {
    it('should verify QR code data', async () => {
      const qrData = JSON.stringify({
        type: 'credential_proof',
        proof: proofData,
        credential: {
          type: 'VERIFICATION_TEST',
          issuer: 'Verification Test Issuer'
        }
      });
      
      const response = await request(app)
        .post('/api/verify/scan-qr')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          qrData: qrData,
          attributes: ['has_credential']
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.verification).toBeDefined();
    });
    
    it('should return 400 for invalid QR data', async () => {
      const response = await request(app)
        .post('/api/verify/scan-qr')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          qrData: 'invalid-json',
          attributes: ['test']
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('GET /api/verify/history', () => {
    it('should return verification history', async () => {
      const response = await request(app)
        .get('/api/verify/history')
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.verifications).toBeDefined();
      expect(Array.isArray(response.body.verifications)).toBe(true);
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/verify/history?page=1&limit=10')
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.total).toBeDefined();
    });
    
    it('should filter by credential ID', async () => {
      const response = await request(app)
        .get(`/api/verify/history?credentialId=${testCredential.id}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // All verifications should be for the specified credential
      response.body.verifications.forEach(verification => {
        expect(verification.credential.id).toBe(testCredential.id);
      });
    });
  });
  
  describe('GET /api/verify/stats', () => {
    it('should return verification statistics', async () => {
      const response = await request(app)
        .get('/api/verify/stats')
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.recentVerifications).toBeDefined();
    });
  });
  
  describe('GET /api/verify/:verificationId', () => {
    let verificationId;
    
    beforeAll(async () => {
      // Create a verification first
      const verification = await prisma.verification.create({
        data: {
          credentialId: testCredential.id,
          verifierId: testVerifier.id,
          proofHash: ethers.keccak256(ethers.toUtf8Bytes(`test-verify-${Date.now()}`)).substring(0, 64),
          status: 'VERIFIED',
          verificationResult: {
            valid: true,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      verificationId = verification.id;
    });
    
    it('should return verification details', async () => {
      const response = await request(app)
        .get(`/api/verify/${verificationId}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.verification).toBeDefined();
      expect(response.body.verification.id).toBe(verificationId);
    });
    
    it('should return 404 for non-existent verification', async () => {
      const response = await request(app)
        .get('/api/verify/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 403 for unauthorized access', async () => {
      // Create another verifier
      const otherVerifierWallet = ethers.Wallet.createRandom();
      const otherVerifier = await prisma.user.create({
        data: {
          walletAddress: otherVerifierWallet.address.toLowerCase(),
          did: `did:polygon:${otherVerifierWallet.address}:other`,
          name: 'Other Verifier',
          role: 'VERIFIER'
        }
      });
      
      const otherToken = jwt.sign(
        {
          userId: otherVerifier.id,
          walletAddress: otherVerifier.walletAddress,
          role: otherVerifier.role
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .get(`/api/verify/${verificationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect('Content-Type', /json/)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      // Clean up
      await prisma.user.delete({
        where: { id: otherVerifier.id }
      });
    });
  });
});