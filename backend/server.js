const app = require('./app');
const { PORT } = require('./src/config/database');

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Proof Backend running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();