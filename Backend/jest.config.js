module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/tests/dbSetup.js']
};
