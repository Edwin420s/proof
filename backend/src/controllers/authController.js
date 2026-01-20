const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { prisma, JWT_SECRET } = require('../config/database');
const { generateDID } = require('../utils/cryptography');

class AuthController {
  // Wallet authentication
  static async walletLogin(req, res, next) {
    try {
      const { walletAddress, signature, message } = req.body;
      
      if (!walletAddress || !signature || !message) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address, signature, and message are required'
        });
      }

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      });

      if (!user) {
        // Generate DID for new user
        const did = await generateDID(walletAddress);
        
        user = await prisma.user.create({
          data: {
            walletAddress: walletAddress.toLowerCase(),
            did,
            role: 'USER'
          }
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          walletAddress: user.walletAddress,
          role: user.role,
          did: user.did
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          did: user.did,
          role: user.role,
          name: user.name,
          email: user.email
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get current user
  static async getCurrentUser(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          credentials: {
            where: { status: 'ACTIVE' },
            include: { issuer: true },
            take: 10
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Remove sensitive data
      const { id, walletAddress, did, role, name, email, createdAt, credentials } = user;
      
      res.json({
        success: true,
        user: {
          id,
          walletAddress,
          did,
          role,
          name,
          email,
          createdAt,
          credentials
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  static async updateProfile(req, res, next) {
    try {
      const { name, email } = req.body;
      const userId = req.user.userId;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email
        }
      });

      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          walletAddress: updatedUser.walletAddress,
          did: updatedUser.did,
          role: updatedUser.role,
          name: updatedUser.name,
          email: updatedUser.email
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Request issuer role
  static async requestIssuerRole(req, res, next) {
    try {
      const { name, description, website, contactEmail } = req.body;
      const userId = req.user.userId;

      // Check if user already has an issuer record
      const existingIssuer = await prisma.issuer.findUnique({
        where: { walletAddress: req.user.walletAddress }
      });

      if (existingIssuer) {
        return res.status(400).json({
          success: false,
          error: 'Issuer profile already exists'
        });
      }

      // Create issuer record (pending verification)
      const issuer = await prisma.issuer.create({
        data: {
          name,
          description,
          walletAddress: req.user.walletAddress,
          did: req.user.did,
          isVerified: false,
          metadata: {
            website,
            contactEmail,
            submittedAt: new Date().toISOString()
          }
        }
      });

      // Update user role
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ISSUER' }
      });

      res.json({
        success: true,
        message: 'Issuer role requested. Awaiting verification.',
        issuer
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;