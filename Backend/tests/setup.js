// Test-specific setup helpers
// Shared Mongoose connection is managed by tests/dbSetup.js via Jest setupFilesAfterFramework
const mongoose = require('mongoose');
const request = require('supertest');
const User = require('../src/models/User');

const connectTestDB = async () => {};

const clearTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

const closeTestDB = async () => {};

const createVerifiedUser = async (app, userData) => {
  await request(app).post('/api/auth/register').send(userData);
  await User.updateOne({ email: userData.email.toLowerCase() }, { emailVerified: true });
  const loginRes = await request(app).post('/api/auth/login').send({
    email: userData.email,
    password: userData.password
  });
  return {
    user: loginRes.body.user,
    token: loginRes.body.token
  };
};

module.exports = { connectTestDB, clearTestDB, closeTestDB, createVerifiedUser };
