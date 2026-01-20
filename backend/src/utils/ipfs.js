const { create } = require('ipfs-http-client');
const { IPFS_API_URL, IPFS_GATEWAY_URL } = require('../config/database');

class IPFSService {
  constructor() {
    this.client = create({
      url: IPFS_API_URL || 'http://localhost:5001'
    });
    this.gateway = IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs';
  }

  // Upload data to IPFS
  async upload(data) {
    try {
      let content;
      
      if (typeof data === 'object') {
        content = JSON.stringify(data);
      } else {
        content = data;
      }

      const { cid } = await this.client.add(content);
      
      return {
        success: true,
        cid: cid.toString(),
        url: `${this.gateway}/${cid}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload to IPFS');
    }
  }

  // Upload credential metadata
  async uploadCredentialMetadata(metadata) {
    try {
      const credentialMetadata = {
        ...metadata,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        schema: 'https://schema.org/VerifiableCredential'
      };

      return await this.upload(credentialMetadata);
    } catch (error) {
      throw error;
    }
  }

  // Upload credential data (encrypted)
  async uploadCredentialData(credentialData, encryptionKey = null) {
    try {
      let dataToUpload = credentialData;
      
      // Encrypt if key provided
      if (encryptionKey) {
        const { encryptData } = require('./cryptography');
        dataToUpload = encryptData(JSON.stringify(credentialData));
      }

      return await this.upload(dataToUpload);
    } catch (error) {
      throw error;
    }
  }

  // Retrieve data from IPFS
  async retrieve(cid) {
    try {
      const chunks = [];
      
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }

      const data = Buffer.concat(chunks).toString();
      
      // Try to parse as JSON
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error('IPFS retrieve error:', error);
      throw new Error(`Failed to retrieve data from IPFS: ${cid}`);
    }
  }

  // Upload and pin JSON data
  async uploadAndPin(data) {
    try {
      const result = await this.upload(data);
      
      // Pin the content
      await this.client.pin.add(result.cid);
      
      return {
        ...result,
        pinned: true
      };
    } catch (error) {
      throw error;
    }
  }

  // Upload file
  async uploadFile(fileBuffer, filename) {
    try {
      const file = {
        path: filename,
        content: fileBuffer
      };

      const { cid } = await this.client.add(file);
      
      return {
        success: true,
        cid: cid.toString(),
        url: `${this.gateway}/${cid}/${filename}`,
        filename,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('IPFS file upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  // Check if CID exists
  async cidExists(cid) {
    try {
      const stats = await this.client.files.stat(`/ipfs/${cid}`);
      return stats ? true : false;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new IPFSService();