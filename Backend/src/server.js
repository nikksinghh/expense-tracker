
const app = require('./app');

const { connectDB, disconnectDB } = require('./config/db');
const { PORT } = require('./config/env');

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 RoomMates Backend running on port ${PORT}`);
      console.log(`🌐 API Health Check: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down RoomMates server...`);
      server.close(async () => {
        await disconnectDB();
        console.log('💤 Database connection closed. Server stopped.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Fatal server startup failure:', error);
    process.exit(1);
  }
};

startServer();
