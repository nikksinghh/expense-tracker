/**
 * Jest setupFilesAfterFramework helper.
 * Manages shared in-memory MongoDB connection across test suites safely.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

// Connect before tests run
beforeAll(async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '') {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
  }
  process.env.NODE_ENV = 'test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
  }
}, 30000);

// Clear collection data between tests
beforeEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}, 10000);

// Clean up after tests finish
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
}, 15000);
