const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    let uri = MONGODB_URI;

    // Use in-memory MongoDB if no URI is provided or in test environment
    if (!uri || uri === 'memory' || NODE_ENV === 'test') {
      console.log('⚡ Initializing in-memory MongoDB instance for seamless local testing...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      console.log(`📦 In-memory MongoDB running at: ${uri}`);
    } else {
      console.log('📡 Connecting to MongoDB Atlas / Remote database...');
    }

    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (error) {
    console.error('Error disconnecting MongoDB:', error);
  }
};

module.exports = { connectDB, disconnectDB };
