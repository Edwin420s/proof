const { ethers } = require('ethers');
const axios = require('axios');
const { 
  POLYGON_RPC_URL,
  CONTRACT_ADDRESS 
} = require('../config/database');

class PolygonIDService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    this.baseURL = process.env.POLYGON_ID_API_URL || 'https://api.polygonid.com/v1';
    this.apiKey = process.env.POLYGON_ID_API_KEY;
  }

  // Issue a verifiable credential
  async issueCredential({ holderDID, issuerDID, credentialType, data, expiration }) {
    try {
      const credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://schema.org'
        ],
        type: ['VerifiableCredential', credentialType],
        issuer: issuerDID,
        issuanceDate: new Date().toISOString(),
        expirationDate: expiration ? new Date(expiration).toISOString() : undefined,
        credentialSubject: {
          id: holderDID,
          ...data
        }
      };

      // In a real implementation, this would call Polygon ID API
      // For now, return mock credential
      const credentialHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(credential))
      );

      return {
        success: true,
        credential,
        credentialHash,
        contractAddress: CONTRACT_ADDRESS,
        tokenId: `cred-${credentialHash.slice(0, 16)}`,
        issuedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error issuing credential:', error);
      throw new Error('Failed to issue credential');
    }
  }

  // Generate ZK proof
  async generateProof({ credentialId, holderDID, attributes, expiration }) {
    try {
      const proofData = {
        type: 'zk_proof',
        credentialId,
        holderDID,
        attributes,
        circuitId: 'credentialAtomicQuerySigV2',
        timestamp: Date.now(),
        nonce: ethers.hexlify(ethers.randomBytes(32))
      };

      // Generate proof ID
      const proofId = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(proofData))
      );

      return {
        proofId,
        proofData,
        expiresAt: expiration || Date.now() + (24 * 60 * 60 * 1000),
        verificationUrl: `${this.baseURL}/verify/${proofId}`
      };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw new Error('Failed to generate proof');
    }
  }

  // Verify proof
  async verifyProof(proofData, requiredAttributes = []) {
    try {
      // Mock verification logic
      // In real implementation, this would verify against Polygon ID circuits
      
      const isValid = true; // Mock validation
      const verifiedAttributes = requiredAttributes.reduce((acc, attr) => {
        acc[attr] = true;
        return acc;
      }, {});

      return {
        valid: isValid,
        proofId: proofData.proofId || ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(proofData))),
        attributes: verifiedAttributes,
        verifiedAt: new Date().toISOString(),
        credentialHash: proofData.credentialId
      };
    } catch (error) {
      console.error('Error verifying proof:', error);
      throw new Error('Failed to verify proof');
    }
  }

  // Verify proof by ID
  async verifyProofById(proofId, requiredAttributes = []) {
    try {
      // Mock API call to Polygon ID
      // In real implementation, this would query Polygon ID API
      
      return {
        valid: true,
        proofId,
        attributes: requiredAttributes.reduce((acc, attr) => {
          acc[attr] = true;
          return acc;
        }, {}),
        verifiedAt: new Date().toISOString(),
        credentialHash: `cred-${proofId.slice(0, 32)}`
      };
    } catch (error) {
      console.error('Error verifying proof by ID:', error);
      throw new Error('Failed to verify proof');
    }
  }

  // Revoke credential
  async revokeCredential(credentialHash, reason = '') {
    try {
      // Mock revocation
      // In real implementation, this would call Polygon ID revocation registry
      
      return {
        success: true,
        credentialHash,
        revokedAt: new Date().toISOString(),
        reason,
        transactionHash: ethers.keccak256(ethers.toUtf8Bytes(`revoke-${credentialHash}-${Date.now()}`))
      };
    } catch (error) {
      console.error('Error revoking credential:', error);
      throw new Error('Failed to revoke credential');
    }
  }

  // Check credential status
  async checkCredentialStatus(credentialHash) {
    try {
      // Mock status check
      // In real implementation, this would query Polygon ID
        
      return {
        valid: true,
        credentialHash,
        status: 'ACTIVE',
        issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        revoked: false
      };
    } catch (error) {
      console.error('Error checking credential status:', error);
      throw new Error('Failed to check credential status');
    }
  }

  // Generate QR code for proof
  async generateQRCode(proofData) {
    try {
      const QRGenerator = require('../utils/qrGenerator');
      return await QRGenerator.generateProofQR(proofData);
    } catch (error) {
      throw error;
    }
  }

  // Get DID document
  async getDIDDocument(did) {
    try {
      // Mock DID document
      // In real implementation, this would resolve from Polygon ID
      
      return {
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        verificationMethod: [{
          id: `${did}#keys-1`,
          type: 'EcdsaSecp256k1VerificationKey2019',
          controller: did,
          publicKeyHex: '0x' + '0'.repeat(64) // Mock public key
        }],
        authentication: [`${did}#keys-1`],
        assertionMethod: [`${did}#keys-1`]
      };
    } catch (error) {
      console.error('Error getting DID document:', error);
      throw new Error('Failed to get DID document');
    }
  }
}

module.exports = new PolygonIDService();