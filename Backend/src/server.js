
const app = require('./app');

const { connectDB, disconnectDB } = require('./config/db');
const { PORT } = require('./config/env');

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed dedicated admin account if it doesn't exist
    try {
      const User = require('./models/User');
      const adminEmail = 'nikhiladmin@gmail.com';
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        await User.create({
          name: 'Nikhil Admin',
          email: adminEmail,
          password: '123456',
          role: 'admin',
          phone: '',
          upiId: ''
        });
        console.log('👑 Dedicated Admin account initialized: nikhiladmin@gmail.com / 123456');
      } else if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
      }
    } catch (seedErr) {
      console.log('Admin check info:', seedErr.message);
    }

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
