const { execSync } = require('child_process');

async function run() {
  console.log('🚀 Running complete backend test suite with in-memory MongoDB...');
  let exitCode = 0;
  try {
    execSync('npx jest --runInBand --forceExit', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
  } catch (err) {
    exitCode = err.status || 1;
  }
  process.exit(exitCode);
}

run();
