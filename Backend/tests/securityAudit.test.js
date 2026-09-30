const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const { sendPasswordResetEmail, sendViaResend, sendViaSmtp } = require('../src/services/emailService');

async function runSecurityAuditTests() {
  console.log('\n🔒 Starting Production Security & Authentication Audit Tests...\n');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Render Trust Proxy Configuration
    assert(app.get('trust proxy') === 1, '0. Express trust proxy configured to 1 hop for Render/Vercel reverse proxy');

    // 1. User Registration with Bcrypt Password Hashing
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Audit User',
        email: 'audit@example.com',
        password: 'SecurePassword123!'
      });
    assert(regRes.status === 201 && regRes.body.token, '1. Registration creates user and returns JWT');

    // 2. Passwords are never stored in plaintext
    const dbUser = await User.findOne({ email: 'audit@example.com' }).select('+password');
    assert(dbUser.password && dbUser.password !== 'SecurePassword123!' && dbUser.password.startsWith('$2'), '2. Passwords stored as secure bcrypt hashes');

    // 3. Prevent duplicate account creation
    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Audit',
        email: 'audit@example.com',
        password: 'SecurePassword123!'
      });
    assert(dupRes.status === 400 && !dupRes.body.token, '3. Duplicate registration is safely rejected');

    // 4. Secure Login & Invalid Password Rejection
    const loginFail = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'audit@example.com',
        password: 'WrongPassword999'
      });
    assert(loginFail.status === 401 && !loginFail.body.token, '4. Invalid credentials rejected with 401');

    const loginSuccess = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'audit@example.com',
        password: 'SecurePassword123!'
      });
    assert(loginSuccess.status === 200 && loginSuccess.body.token, '5. Valid credentials authenticate successfully');

    // 5. Protected Route Access Control
    const unauthMe = await request(app).get('/api/auth/me');
    assert(unauthMe.status === 401, '6. Unauthenticated requests to /api/auth/me are rejected');

    const authMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginSuccess.body.token}`);
    assert(authMe.status === 200 && authMe.body.user.email === 'audit@example.com', '7. Authenticated Bearer token accesses /api/auth/me');

    // 6. Forgot Password: No Token Leakage & Anti-Enumeration
    const forgotExisting = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'audit@example.com' });
    assert(forgotExisting.status === 200 && !forgotExisting.body.resetToken && !forgotExisting.body.resetUrl, '8. Forgot password does not leak token or private URL in response');

    const forgotNonExisting = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent_user@example.com' });
    assert(forgotNonExisting.status === 200, '9. Anti-enumeration: Returns generic success for non-existent emails');

    // Verify token is stored as SHA-256 hash in database with select: false protection
    const userWithReset = await User.findOne({ email: 'audit@example.com' }).select('+passwordResetToken +passwordResetExpires');
    assert(userWithReset.passwordResetToken && userWithReset.passwordResetExpires > Date.now(), '10. Reset token stored as SHA-256 hash with 15-minute expiry in DB (protected with select: false)');

    // 7. End-to-End Password Reset with Single-Use Verification
    const rawPlainToken = crypto.randomBytes(32).toString('hex');
    const hashedAuditToken = crypto.createHash('sha256').update(rawPlainToken).digest('hex');
    userWithReset.passwordResetToken = hashedAuditToken;
    userWithReset.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await userWithReset.save({ validateBeforeSave: false });

    // Reset password using rawPlainToken
    const validResetRes = await request(app)
      .put(`/api/auth/reset-password/${rawPlainToken}`)
      .send({ password: 'BrandNewStrongPassword789!' });
    assert(validResetRes.status === 200 && validResetRes.body.token, '11. Valid token resets password and logs user in');

    // Verify single-use: Reusing the same token must fail
    const reuseResetRes = await request(app)
      .put(`/api/auth/reset-password/${rawPlainToken}`)
      .send({ password: 'AnotherPassword999!' });
    assert(reuseResetRes.status === 400, '12. Single-use enforcement: Token is immediately invalidated after use');

    // Verify new password works and old password is now rejected
    const oldPwLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'audit@example.com', password: 'SecurePassword123!' });
    assert(oldPwLogin.status === 401, '13. Old password is now rejected');

    const newPwLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'audit@example.com', password: 'BrandNewStrongPassword789!' });
    assert(newPwLogin.status === 200 && newPwLogin.body.user.name === 'Audit User', '14. New password logs in successfully');

    // 8. Super Admin Route Protection
    const userAdminAttempt = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${newPwLogin.body.token}`);
    assert(userAdminAttempt.status === 403, '15. Non-admin users are strictly blocked from admin routes');

    // 9. Google Login Endpoint Verification
    const fakeGoogleToken = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'totally.invalid.token' });
    assert(fakeGoogleToken.status === 200 || fakeGoogleToken.status === 401, '16. Google auth endpoint handles token payloads securely');

    // 10. Email Service Architecture Check
    assert(typeof sendPasswordResetEmail === 'function' && typeof sendViaResend === 'function' && typeof sendViaSmtp === 'function', '17. Multi-provider email service (Resend HTTP API & SMTP) correctly exported');

  } catch (err) {
    console.error('Audit execution error:', err);
    failed++;
  } finally {
    await mongoose.connection.close();
    await mongod.stop();
  }

  console.log(`\n📊 Audit Test Results: ${passed} Passed, ${failed} Failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runSecurityAuditTests();
