const nodemailer = require('nodemailer');
const axios = require('axios');
const { prisma } = require('../config/database');

class NotificationService {
  constructor() {
    this.transporter = null;
    
    // Initialize email transporter if configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT == 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter) {
        console.warn('Email transporter not configured');
        return { success: false, error: 'Email service not configured' };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@proofidentity.com',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send credential issued notification
  async sendCredentialIssuedNotification(credential, user) {
    try {
      const subject = `🎉 New Credential Issued: ${credential.title}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0B1D3D; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f7fa; padding: 20px; }
            .credential { background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Proof Identity</h1>
              <h2>New Credential Issued</h2>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>You have been issued a new credential:</p>
              
              <div class="credential">
                <h3>${credential.title}</h3>
                <p><strong>Type:</strong> ${credential.type}</p>
                <p><strong>Issuer:</strong> ${credential.issuer.name}</p>
                <p><strong>Issued:</strong> ${new Date(credential.issuedAt).toLocaleDateString()}</p>
                ${credential.expiresAt ? `<p><strong>Expires:</strong> ${new Date(credential.expiresAt).toLocaleDateString()}</p>` : ''}
              </div>
              
              <p>You can view and manage this credential in your Proof dashboard.</p>
              <p><a href="${process.env.APP_URL}/dashboard" style="background-color: #4FC3F7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a></p>
              
              <p>Best regards,<br>The Proof Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Proof Identity System.</p>
              <p>If you did not request this credential, please contact support immediately.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (user.email) {
        return await this.sendEmail(user.email, subject, html);
      }
      
      return { success: false, error: 'User email not available' };
    } catch (error) {
      console.error('Credential issued notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send verification notification
  async sendVerificationNotification(verification, credential, verifier) {
    try {
      const subject = `🔍 Credential Verified: ${credential.title}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #22C55E; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f7fa; padding: 20px; }
            .info { background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Proof Identity</h1>
              <h2>Credential Verified</h2>
            </div>
            <div class="content">
              <p>Your credential has been verified:</p>
              
              <div class="info">
                <h3>${credential.title}</h3>
                <p><strong>Verified by:</strong> ${verifier.name || 'Unknown Verifier'}</p>
                <p><strong>Verified at:</strong> ${new Date(verification.verifiedAt).toLocaleString()}</p>
                <p><strong>Status:</strong> <span style="color: #22C55E;">Verified Successfully</span></p>
                <p><strong>Proof Hash:</strong> ${verification.proofHash.substring(0, 16)}...</p>
              </div>
              
              <p>You can view the verification details in your Proof dashboard.</p>
              <p><a href="${process.env.APP_URL}/dashboard" style="background-color: #4FC3F7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a></p>
              
              <p>Best regards,<br>The Proof Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Proof Identity System.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Get credential owner
      const credentialWithUser = await prisma.credential.findUnique({
        where: { id: credential.id },
        include: { user: true }
      });

      if (credentialWithUser.user.email) {
        return await this.sendEmail(credentialWithUser.user.email, subject, html);
      }
      
      return { success: false, error: 'User email not available' };
    } catch (error) {
      console.error('Verification notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send issuer approval notification
  async sendIssuerApprovalNotification(issuer) {
    try {
      const subject = issuer.isVerified 
        ? '✅ Issuer Application Approved' 
        : '❌ Issuer Application Requires Attention';

      const statusMessage = issuer.isVerified
        ? 'Your issuer application has been approved! You can now issue credentials to users.'
        : 'Your issuer application requires additional information or verification.';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${issuer.isVerified ? '#22C55E' : '#EF4444'}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f7fa; padding: 20px; }
            .info { background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Proof Identity</h1>
              <h2>Issuer Application Update</h2>
            </div>
            <div class="content">
              <p>Hello ${issuer.name},</p>
              <p>${statusMessage}</p>
              
              <div class="info">
                <h3>Application Details</h3>
                <p><strong>Issuer Name:</strong> ${issuer.name}</p>
                <p><strong>Wallet Address:</strong> ${issuer.walletAddress}</p>
                <p><strong>DID:</strong> ${issuer.did}</p>
                <p><strong>Status:</strong> <strong>${issuer.isVerified ? 'Verified' : 'Pending'}</strong></p>
                <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              ${issuer.isVerified ? `
                <p>You can now access the issuer dashboard to start issuing credentials:</p>
                <p><a href="${process.env.APP_URL}/issuer/dashboard" style="background-color: #4FC3F7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Issuer Dashboard</a></p>
              ` : `
                <p>Please check your application details and provide any additional information if required.</p>
              `}
              
              <p>Best regards,<br>The Proof Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Proof Identity System.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Get user associated with issuer wallet
      const user = await prisma.user.findUnique({
        where: { walletAddress: issuer.walletAddress }
      });

      if (user && user.email) {
        return await this.sendEmail(user.email, subject, html);
      }
      
      return { success: false, error: 'User email not found' };
    } catch (error) {
      console.error('Issuer approval notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    try {
      const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
      const subject = '🔑 Reset Your Proof Password';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0B1D3D; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f7fa; padding: 20px; }
            .button { background-color: #4FC3F7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Proof Identity</h1>
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>We received a request to reset your password for your Proof account.</p>
              
              <p>Click the button below to reset your password:</p>
              <p><a href="${resetLink}" class="button">Reset Password</a></p>
              
              <p>If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
              
              <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
              
              <p>Best regards,<br>The Proof Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Proof Identity System.</p>
              <p>If you didn't request a password reset, please contact support immediately.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (user.email) {
        return await this.sendEmail(user.email, subject, html);
      }
      
      return { success: false, error: 'User email not available' };
    } catch (error) {
      console.error('Password reset email error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send webhook notification
  async sendWebhookNotification(webhookUrl, event, data) {
    try {
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        signature: this.generateWebhookSignature(data)
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Proof-Identity/1.0'
        },
        timeout: 5000 // 5 second timeout
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      console.error('Webhook notification error:', error);
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  // Generate webhook signature
  generateWebhookSignature(data) {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    
    return hmac.digest('hex');
  }

  // Send SMS notification (placeholder - integrate with SMS provider)
  async sendSMS(phoneNumber, message) {
    try {
      // This is a placeholder implementation
      // In production, integrate with Twilio, Vonage, etc.
      
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        message: 'SMS sent (simulated)',
        phoneNumber,
        message
      };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send Discord notification
  async sendDiscordNotification(webhookUrl, message, embed = null) {
    try {
      const payload = {
        content: message,
        embeds: embed ? [embed] : []
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        status: response.status
      };
    } catch (error) {
      console.error('Discord notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create Discord embed for credential issuance
  createCredentialIssuedEmbed(credential, user) {
    return {
      title: 'New Credential Issued',
      color: 0x4FC3F7,
      fields: [
        {
          name: 'Credential',
          value: credential.title,
          inline: true
        },
        {
          name: 'Type',
          value: credential.type,
          inline: true
        },
        {
          name: 'Issued To',
          value: user.name || user.walletAddress,
          inline: true
        },
        {
          name: 'Issuer',
          value: credential.issuer.name,
          inline: true
        },
        {
          name: 'Issued At',
          value: new Date(credential.issuedAt).toISOString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  // Log notification to database
  async logNotification(notificationData) {
    try {
      await prisma.notification.create({
        data: {
          type: notificationData.type,
          recipient: notificationData.recipient,
          subject: notificationData.subject,
          content: notificationData.content,
          channel: notificationData.channel,
          status: notificationData.status || 'SENT',
          metadata: notificationData.metadata
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Notification log error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();