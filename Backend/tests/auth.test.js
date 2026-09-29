const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

// Note: MongoDB connection is handled globally by tests/dbSetup.js via setupFilesAfterEnv
// No need for beforeAll/afterAll here.

describe('Authentication API', () => {
  it('should register a new user successfully and return JWT cookie', async () => {
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
    expect(res.body.user.email).toBe('nikhil@test.com');
    expect(res.body.token).toBeDefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('token='))).toBe(true);
  });

  it('should reject registration with duplicate email', async () => {
    await User.create({
      name: 'Existing User',
      email: 'nikhil@test.com',
      password: 'password123'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another Nikhil',
        email: 'nikhil@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should login an existing user with correct credentials', async () => {
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

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Aryan Sharma');
  });

  it('should reject login with wrong password', async () => {
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
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should fail to access protected /api/auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should access protected /api/auth/me with Bearer token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nikhil Kumar',
        email: 'nikhil@test.com',
        password: 'password123'
      });

    const token = reg.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('nikhil@test.com');
  });
});
