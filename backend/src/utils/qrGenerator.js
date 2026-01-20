const QRCode = require('qrcode');

class QRGenerator {
  // Generate QR code from data
  static async generateQR(data, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300,
        ...options
      };

      // Convert data to string if it's an object
      const dataString = typeof data === 'string' 
        ? data 
        : JSON.stringify(data);

      // Generate QR code as data URL
      const qrCode = await QRCode.toDataURL(dataString, defaultOptions);
      
      return {
        success: true,
        qrCode,
        data: dataString,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('QR generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  // Generate QR code for credential proof
  static async generateProofQR(proofData, credentialInfo = {}) {
    try {
      const qrData = {
        type: 'credential_proof',
        version: '1.0.0',
        proof: proofData,
        credential: {
          type: credentialInfo.type,
          issuer: credentialInfo.issuer,
          issuedAt: credentialInfo.issuedAt
        },
        timestamp: new Date().toISOString(),
        verificationUrl: `${process.env.APP_URL}/verify`
      };

      return await this.generateQR(qrData);
    } catch (error) {
      throw error;
    }
  }

  // Generate QR code for verification request
  static async generateVerificationQR(verificationRequest) {
    try {
      const qrData = {
        type: 'verification_request',
        version: '1.0.0',
        requestId: verificationRequest.id,
        verifier: verificationRequest.verifier,
        requiredAttributes: verificationRequest.requiredAttributes,
        expiresAt: verificationRequest.expiresAt,
        callbackUrl: verificationRequest.callbackUrl,
        timestamp: new Date().toISOString()
      };

      return await this.generateQR(qrData);
    } catch (error) {
      throw error;
    }
  }

  // Generate QR code for wallet connection
  static async generateWalletConnectionQR(sessionId) {
    try {
      const qrData = {
        type: 'wallet_connection',
        version: '1.0.0',
        sessionId,
        appName: 'Proof Identity',
        network: 'polygon',
        timestamp: new Date().toISOString(),
        connectionUrl: `${process.env.APP_URL}/connect/${sessionId}`
      };

      return await this.generateQR(qrData);
    } catch (error) {
      throw error;
    }
  }

  // Generate QR code as file
  static async generateQRFile(data, filePath, options = {}) {
    try {
      const dataString = typeof data === 'string' 
        ? data 
        : JSON.stringify(data);

      await QRCode.toFile(filePath, dataString, options);
      
      return {
        success: true,
        filePath,
        data: dataString,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('QR file generation error:', error);
      throw new Error('Failed to generate QR code file');
    }
  }

  // Parse QR code data
  static parseQRData(qrData) {
    try {
      if (typeof qrData === 'string') {
        // Try to parse as JSON
        try {
          return JSON.parse(qrData);
        } catch {
          return qrData;
        }
      }
      return qrData;
    } catch (error) {
      throw new Error('Failed to parse QR data');
    }
  }
}

module.exports = QRGenerator;