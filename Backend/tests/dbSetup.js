/**
 * Jest setupFilesAfterFramework helper.
 * Yeh file ek baar sab test suite ke pehle run hoti hai.
 * Isme ek single Mongoose connection create ki jaati hai jo
 * saare test suites ke beech share hoti hai.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Connect ONCE before all test suites
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  await mongoose.connect(uri);
}, 60000);

// Clear data before each individual test
beforeEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}, 15000);

// Disconnect ONCE after all test suites
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
}, 30000);
