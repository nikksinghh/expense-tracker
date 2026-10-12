const request = require('supertest');
const app = require('../src/app');
const { createVerifiedUser } = require('./setup');

let user1Token, user2Token;
let user1Id, user2Id;

beforeEach(async () => {
  const u1 = await createVerifiedUser(app, {
    name: 'Nikhil',
    email: 'nikhil@test.com',
    password: 'password123'
  });
  user1Token = u1.token;
  user1Id = u1.user._id;

  const u2 = await createVerifiedUser(app, {
    name: 'Aryan',
    email: 'aryan@test.com',
    password: 'password123'
  });
  user2Token = u2.token;
  user2Id = u2.user._id;

  const roomRes = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${user1Token}`)
    .send({ name: 'Flat 402' });

  await request(app)
    .post('/api/rooms/join')
    .set('Authorization', `Bearer ${user2Token}`)
    .send({ code: roomRes.body.room.code });
});

describe('Settlement API & Personal/Shared Separation', () => {
  it('should calculate net settlement accurately from shared expenses', async () => {
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Room Rent',
        amount: 3000,
        category: 'Rent',
        type: 'shared',
        splitMode: 'equal'
      });

    const res1 = await request(app)
      .get('/api/settlements/status')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res1.status).toBe(200);
    expect(res1.body.calculation.relationship).toBe('roommate_owes_you');
    expect(res1.body.calculation.netAmount).toBe(1500);

    const res2 = await request(app)
      .get('/api/settlements/status')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res2.status).toBe(200);
    expect(res2.body.calculation.relationship).toBe('you_owe_roommate');
    expect(res2.body.calculation.netAmount).toBe(1500);
  });

  it('MUST NOT let personal expenses affect roommate settlement balances', async () => {
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Room Rent',
        amount: 3000,
        category: 'Rent',
        type: 'shared'
      });

    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        title: 'Personal Headphones',
        amount: 2000,
        category: 'Others',
        type: 'personal'
      });

    const res = await request(app)
      .get('/api/settlements/status')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.calculation.relationship).toBe('roommate_owes_you');
    expect(res.body.calculation.netAmount).toBe(1500);
  });

  it('should clear net balance when settlement payment is recorded', async () => {
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Groceries',
        amount: 1000,
        category: 'Grocery',
        type: 'shared'
      });

    const settleRes = await request(app)
      .post('/api/settlements')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        receiver: user1Id,
        amount: 500,
        paymentMethod: 'UPI',
        referenceNote: 'GPay payment'
      });

    expect(settleRes.status).toBe(201);

    const res = await request(app)
      .get('/api/settlements/status')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.body.calculation.relationship).toBe('settled');
    expect(res.body.calculation.netAmount).toBe(0);
  });

  it('should prevent duplicate settlement recording when Idempotency-Key is reused', async () => {
    const idempotencyKey = 'test-settle-idemp-999';
    const payload = {
      receiver: user1Id,
      amount: 400,
      paymentMethod: 'UPI',
      referenceNote: 'UPI Settlement'
    };

    const res1 = await request(app)
      .post('/api/settlements')
      .set('Authorization', `Bearer ${user2Token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    const originalSettlementId = res1.body.settlement._id;

    // Retry with identical key
    const res2 = await request(app)
      .post('/api/settlements')
      .set('Authorization', `Bearer ${user2Token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.headers['idempotent-replayed']).toBe('true');
    expect(res2.body.settlement._id).toBe(originalSettlementId);
  });
});
