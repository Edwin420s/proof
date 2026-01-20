const app = require('./app');
const { prisma, PORT } = require('./config/database');
const { seedDatabase } = require('./scripts/seedIssuers');

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('\n🔄 Received shutdown signal, initiating graceful shutdown...');
  
  try {
    // Close Prisma connection
    await prisma.$disconnect();
    console.log('✅ Database connections closed');
    
    // Close server
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('✅ HTTP server closed');
          resolve();
        });
      });
    }
    
    console.log('👋 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // Don't exit immediately in production, let the process manager handle it
  if (process.env.NODE_ENV === 'production') {
    // Log error and continue
    console.error('Continuing despite uncaught exception');
  } else {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, log and continue
  if (process.env.NODE_ENV === 'production') {
    console.error('Continuing despite unhandled rejection');
  } else {
    process.exit(1);
  }
});

// Handle SIGTERM (Docker stop, Kubernetes termination)
process.on('SIGTERM', gracefulShutdown);

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Proof Backend Server started on port ${PORT}`);
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔗 Blockchain: ${process.env.POLYGON_RPC_URL ? 'Configured' : 'Not configured'}`);
  
  // Run database seeding in development
  if (process.env.NODE_ENV === 'development' && process.argv.includes('--seed')) {
    console.log('\n🌱 Running database seeding...');
    try {
      await seedDatabase();
    } catch (error) {
      console.error('Seeding failed:', error);
    }
  }
  
  console.log('\n📋 Available endpoints:');
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`   Metrics: http://localhost:${PORT}/health/metrics`);
  console.log('\n👂 Listening for requests...');
});

// Export for testing
module.exports = server;