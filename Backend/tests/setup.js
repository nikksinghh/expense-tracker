// Test-specific setup helpers
// Shared Mongoose connection is managed by tests/dbSetup.js via Jest setupFilesAfterFramework
// These helpers are kept for backward compatibility

const mongoose = require('mongoose');

// No-op: connection handled globally in dbSetup.js
const connectTestDB = async () => {};

// Clear all collections (called in beforeEach if needed manually)
const clearTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

// No-op: connection handled globally in dbSetup.js
const closeTestDB = async () => {};

module.exports = { connectTestDB, clearTestDB, closeTestDB };
