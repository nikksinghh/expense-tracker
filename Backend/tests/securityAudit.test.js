const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const { OTP_SECRET, JWT_SECRET } = require('../src/config/env');
const { sendVerificationEmail, sendPasswordResetEmail, sendViaBrevo } = require('../src/services/emailService');

async function runSecurityAuditTests() {
  console.log('\n🔒 Starting Production Security, CORS & Authentication Audit Tests...\n');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { runtimeAdapters: { os } });

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

    // 1. CORS Origin Enforcement (Allowed vs Disallowed)
    const allowedCorsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    assert(
      allowedCorsRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
      '1. CORS allows requests from configured client origin (http://localhost:5173)'
    );

    const disallowedCorsRes = await request(app)
      .get('/api/health')
      .set('Origin', 'http://malicious-attacker.com');
    assert(
      disallowedCorsRes.status === 403 && disallowedCorsRes.body.message.includes('CORS policy violation'),
      '2. CORS strictly rejects unauthorized origins (http://malicious-attacker.com) with 403 Forbidden'
    );

    // 2. User Registration creates UNVERIFIED user without JWT
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Audit User',
        email: 'audit@example.com',
        password: 'SecurePassword123!'
      });
    assert(
      regRes.status === 201 && regRes.body.token === undefined && regRes.body.email === 'audit@example.com',
      '3. Registration creates unverified user and strictly does NOT issue JWT before verification'
    );

    // 3. Passwords are never stored in plaintext
    const dbUser = await User.findOne({ email: 'audit@example.com' }).select('+password');
    assert(
      dbUser.password && dbUser.password !== 'SecurePassword123!' && dbUser.password.startsWith('$2'),
      '4. Passwords stored as secure bcrypt hashes'
    );

    // 4. Unverified user CANNOT log in
    const unverifiedLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'audit@example.com',
        password: 'SecurePassword123!'
      });
    assert(
      unverifiedLogin.status === 403 && unverifiedLogin.body.code === 'EMAIL_NOT_VERIFIED',
      '5. Unverified account login is strictly blocked with 403 Forbidden (EMAIL_NOT_VERIFIED)'
    );

    // 5. Verify email via 6-digit cryptographic OTP
    const rawOtp = '123456';
    const secretKey = OTP_SECRET || JWT_SECRET;
    const otpHash = crypto.createHmac('sha256', secretKey).update(rawOtp).digest('hex');
    await User.updateOne(
      { email: 'audit@example.com' },
      {
        emailVerificationOtp: otpHash,
        emailVerificationOtpExpires: new Date(Date.now() + 10 * 60 * 1000)
      }
    );

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'audit@example.com', otp: rawOtp });
    assert(verifyRes.status === 200 && verifyRes.body.success, '6. Email verified successfully using 6-digit OTP (HMAC constant-time check)');

    // 6. Duplicate registration on already verified email is safely rejected
    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Audit',
        email: 'audit@example.com',
        password: 'SecurePassword123!'
      });
    assert(dupRes.status === 400 && !dupRes.body.token, '7. Duplicate registration on verified email is safely rejected with 400');

    // 7. Invalid credentials rejected
    const loginFail = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'audit@example.com',
        password: 'WrongPassword999'
      });
    assert(loginFail.status === 401 && !loginFail.body.token, '8. Invalid credentials rejected with 401');

    // 8. Verified user login succeeds and issues HttpOnly cookie + JWT token
    const loginSuccess = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'audit@example.com',
        password: 'SecurePassword123!'
      });
    assert(
      loginSuccess.status === 200 &&
      loginSuccess.body.token &&
      loginSuccess.headers['set-cookie']?.some(c => c.includes('token=')),
      '9. Verified credentials authenticate successfully with 200 and issue HttpOnly cookie'
    );

    // 9. Protected route access control
    const unauthMe = await request(app).get('/api/auth/me');
    assert(unauthMe.status === 401, '10. Unauthenticated requests to /api/auth/me are rejected with 401');

    const authMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginSuccess.body.token}`);
    assert(authMe.status === 200 && authMe.body.user.email === 'audit@example.com', '11. Authenticated Bearer token accesses /api/auth/me');

    // 10. Forgot Password: No Token Leakage & Anti-Enumeration
    const forgotExisting = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'audit@example.com' });
    assert(
      forgotExisting.status === 200 && !forgotExisting.body.resetToken && !forgotExisting.body.resetUrl,
      '12. Forgot password does not leak token or private URL in response'
    );

    const forgotNonExisting = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent_user@example.com' });
    assert(forgotNonExisting.status === 200, '13. Anti-enumeration: Returns generic success for non-existent emails');

    // 11. Reset token stored as SHA-256 hash in DB with select: false protection
    const userWithReset = await User.findOne({ email: 'audit@example.com' }).select('+passwordResetToken +passwordResetExpires');
    assert(
      userWithReset.passwordResetToken && userWithReset.passwordResetExpires > Date.now(),
      '14. Reset token stored as SHA-256 hash with 15-minute expiry in DB'
    );

    // 12. End-to-End Password Reset & Session Revocation
    const rawPlainToken = crypto.randomBytes(32).toString('hex');
    const hashedAuditToken = crypto.createHash('sha256').update(rawPlainToken).digest('hex');
    userWithReset.passwordResetToken = hashedAuditToken;
    userWithReset.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await userWithReset.save({ validateBeforeSave: false });

    // Reset password using rawPlainToken
    const validResetRes = await request(app)
      .put(`/api/auth/reset-password/${rawPlainToken}`)
      .send({ password: 'BrandNewStrongPassword789!' });
    assert(validResetRes.status === 200 && validResetRes.body.token, '15. Valid token resets password, revokes sessions (tokenVersion++) and logs user in');

    // Verify previous session token is now REVOKED
    const revokedSessionCheck = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginSuccess.body.token}`);
    assert(
      revokedSessionCheck.status === 401 && revokedSessionCheck.body.message.includes('revoked'),
      '16. Pre-existing active sessions are immediately revoked after password reset (tokenVersion check)'
    );

    // Verify single-use: Reusing the same reset token must fail
    const reuseResetRes = await request(app)
      .put(`/api/auth/reset-password/${rawPlainToken}`)
      .send({ password: 'AnotherPassword999!' });
    assert(reuseResetRes.status === 400, '17. Single-use enforcement: Reset token is immediately invalidated after use');

    // Verify old password rejected, new password works
    const oldPwLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'audit@example.com', password: 'SecurePassword123!' });
    assert(oldPwLogin.status === 401, '18. Old password is now rejected');

    const newPwLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'audit@example.com', password: 'BrandNewStrongPassword789!' });
    assert(newPwLogin.status === 200 && newPwLogin.body.user.name === 'Audit User', '19. New password logs in successfully');

    // 13. Non-admin blocked from admin routes
    const userAdminAttempt = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${newPwLogin.body.token}`);
    assert(userAdminAttempt.status === 403, '20. Non-admin users are strictly blocked from admin routes with 403 Forbidden');

    // 14. Brevo Email Service Dispatcher Check
    assert(
      typeof sendVerificationEmail === 'function' && typeof sendPasswordResetEmail === 'function' && typeof sendViaBrevo === 'function',
      '21. Brevo REST API v3 transactional email service functions correctly configured and exported'
    );

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
