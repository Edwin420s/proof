const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error']
});

module.exports = {
  prisma,
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  POLYGON_RPC_URL: process.env.POLYGON_RPC_URL,
  IPFS_API_URL: process.env.IPFS_API_URL,
  IPFS_GATEWAY_URL: process.env.IPFS_GATEWAY_URL,
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  ADMIN_WALLET_ADDRESS: process.env.ADMIN_WALLET_ADDRESS,
  ADMIN_WALLET_PRIVATE_KEY: process.env.ADMIN_WALLET_PRIVATE_KEY
};