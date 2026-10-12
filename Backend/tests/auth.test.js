const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const User = require('../src/models/User');
const { OTP_SECRET, JWT_SECRET } = require('../src/config/env');

describe('Authentication & Email Verification API', () => {
  it('should register a new user with emailVerified: false and NOT issue JWT/cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nikhil Kumar',
        email: 'nikhil@test.com',
        password: 'password123',
        phone: '9876543210',
        upiId: 'nikhil@upi'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe('nikhil@test.com');
    expect(res.body.token).toBeUndefined();

    // Verify database record has unverified status and cryptographic hashes stored
    const dbUser = await User.findOne({ email: 'nikhil@test.com' }).select(
      '+emailVerificationOtp +emailVerificationToken'
    );
    expect(dbUser).toBeDefined();
    expect(dbUser.emailVerified).toBe(false);
    expect(dbUser.emailVerificationToken).toBeDefined();
    expect(dbUser.emailVerificationOtp).toBeDefined();

    // Must not issue auth cookie prior to verification
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('token='))).toBe(false);
  });

  it('should reject unverified user login with 403 and code EMAIL_NOT_VERIFIED', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Aryan Sharma',
        email: 'aryan@test.com',
        password: 'password123'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aryan@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('should successfully verify email using valid 6-digit OTP', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test OTP User',
        email: 'otpuser@test.com',
        password: 'password123'
      });

    // Set a known OTP HMAC in the database
    const rawOtp = '654321';
    const secretKey = OTP_SECRET || JWT_SECRET;
    const otpHash = crypto.createHmac('sha256', secretKey).update(rawOtp).digest('hex');

    await User.updateOne(
      { email: 'otpuser@test.com' },
      {
        emailVerificationOtp: otpHash,
        emailVerificationOtpExpires: new Date(Date.now() + 10 * 60 * 1000)
      }
    );

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'otpuser@test.com',
        otp: rawOtp
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const updatedUser = await User.findOne({ email: 'otpuser@test.com' });
    expect(updatedUser.emailVerified).toBe(true);
  });

  it('should reject invalid OTP and enforce 5-attempt lockout (429)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Brute Target',
        email: 'brute@test.com',
        password: 'password123'
      });

    // Send 4 wrong attempts
    for (let i = 0; i < 4; i++) {
      const failRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'brute@test.com', otp: '000000' });
      expect(failRes.status).toBe(400);
    }

    // 5th wrong attempt triggers lockout
    const fifthRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'brute@test.com', otp: '000000' });
    expect(fifthRes.status).toBe(429);
    expect(fifthRes.body.message).toMatch(/locked/i);
  });

  it('should login an existing verified user with correct credentials and issue JWT cookie', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Aryan Verified',
        email: 'aryan.verified@test.com',
        password: 'password123'
      });

    await User.updateOne({ email: 'aryan.verified@test.com' }, { emailVerified: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aryan.verified@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Aryan Verified');
    expect(res.body.token).toBeDefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('token='))).toBe(true);
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Aryan Test',
        email: 'aryan.wrong@test.com',
        password: 'password123'
      });

    await User.updateOne({ email: 'aryan.wrong@test.com' }, { emailVerified: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aryan.wrong@test.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with duplicate email for an already verified user', async () => {
    await User.create({
      name: 'Existing Verified',
      email: 'dup@test.com',
      password: 'password123',
      emailVerified: true
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another Nikhil',
        email: 'dup@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should fail to access protected /api/auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should access protected /api/auth/me with Bearer token for verified user', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nikhil Kumar',
        email: 'nikhil.me@test.com',
        password: 'password123'
      });

    await User.updateOne({ email: 'nikhil.me@test.com' }, { emailVerified: true });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nikhil.me@test.com',
        password: 'password123'
      });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('nikhil.me@test.com');
  });

  it('should enforce 60s cooldown on resend verification', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cooldown User',
        email: 'cooldown@test.com',
        password: 'password123'
      });

    // Immediate second resend request should trigger cooldown
    const resendRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'cooldown@test.com' });

    expect(resendRes.status).toBe(429);
    expect(resendRes.body.message).toMatch(/wait.*seconds/i);
  });
});
