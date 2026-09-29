const { MongoMemoryServer } = require('mongodb-memory-server');
const { execSync } = require('child_process');

async function run() {
  console.log('🚀 Starting in-memory MongoDB server for tests...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log('✅ In-memory MongoDB listening at:', uri);

  // Set MONGODB_URI in current process - it gets inherited by the child Jest process
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';

  let exitCode = 0;
  try {
    execSync('npx jest --runInBand --forceExit', {
      stdio: 'inherit',
      env: { ...process.env, MONGODB_URI: uri, NODE_ENV: 'test' }
    });
  } catch (err) {
    exitCode = err.status || 1;
  }

  console.log('🛑 Stopping in-memory MongoDB server...');
  await mongod.stop();
  process.exit(exitCode);
}

run().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
