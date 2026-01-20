const crypto = require('crypto');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here';
const IV_LENGTH = 16;

class CryptographyService {
  // Generate Decentralized Identifier (DID)
  static generateDID(walletAddress) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const didString = `did:polygon:${walletAddress}:${timestamp}:${random}`;
    
    // Create DID document
    const didDoc = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: didString,
      verificationMethod: [{
        id: `${didString}#keys-1`,
        type: 'EcdsaSecp256k1VerificationKey2019',
        controller: didString,
        publicKeyHex: walletAddress
      }],
      authentication: [`${didString}#keys-1`]
    };

    return {
      did: didString,
      document: didDoc
    };
  }

  // Encrypt data
  static encryptData(text) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(
        'aes-256-gcm', 
        Buffer.from(ENCRYPTION_KEY, 'hex'), 
        iv
      );
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  static decryptData(encryptedText) {
    try {
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const authTag = Buffer.from(textParts.shift(), 'hex');
      const encrypted = textParts.join(':');
      
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm', 
        Buffer.from(ENCRYPTION_KEY, 'hex'), 
        iv
      );
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Generate credential hash
  static generateCredentialHash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return ethers.keccak256(ethers.toUtf8Bytes(dataString + Date.now()));
  }

  // Generate proof hash
  static generateProofHash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');
  }

  // Generate ZK proof signature
  static generateZKSignature(holderDID, credentialHash, attributes) {
    const proofData = {
      holderDID,
      credentialHash,
      attributes,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(32).toString('hex')
    };

    const proofString = JSON.stringify(proofData);
    const signature = crypto
      .createHmac('sha256', ENCRYPTION_KEY)
      .update(proofString)
      .digest('hex');

    return {
      proofId: uuidv4(),
      proofData,
      signature,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }

  // Verify ZK proof signature
  static verifyZKSignature(proofData, signature) {
    try {
      const proofString = JSON.stringify(proofData);
      const expectedSignature = crypto
        .createHmac('sha256', ENCRYPTION_KEY)
        .update(proofString)
        .digest('hex');

      return {
        valid: signature === expectedSignature,
        proofData
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid proof signature'
      };
    }
  }

  // Generate verification token
  static generateVerificationToken(verificationId, expiresIn = '1h') {
    const payload = {
      verificationId,
      timestamp: Date.now()
    };

    const token = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    return {
      token,
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
    };
  }
}

module.exports = CryptographyService;