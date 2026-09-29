const request = require('supertest');
const app = require('../src/app');

let user1Token, user2Token;
let user1Id, user2Id;

beforeEach(async () => {
  const res1 = await request(app).post('/api/auth/register').send({
    name: 'Nikhil',
    email: 'nikhil@test.com',
    password: 'password123'
  });
  user1Token = res1.body.token;
  user1Id = res1.body.user._id;

  const res2 = await request(app).post('/api/auth/register').send({
    name: 'Aryan',
    email: 'aryan@test.com',
    password: 'password123'
  });
  user2Token = res2.body.token;
  user2Id = res2.body.user._id;

  const roomRes = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${user1Token}`)
    .send({ name: 'Flat 402' });

  await request(app)
    .post('/api/rooms/join')
    .set('Authorization', `Bearer ${user2Token}`)
    .send({ code: roomRes.body.room.code });
});

describe('Expense API & Split Calculations', () => {
  it('should create a shared expense with equal 50/50 split', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Room Rent',
        amount: 3000,
        category: 'Rent',
        type: 'shared',
        splitMode: 'equal'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.expense.amount).toBe(3000);
    expect(res.body.expense.participants.length).toBe(2);

    const part1 = res.body.expense.participants.find(
      (p) => p.user._id.toString() === user1Id.toString()
    );
    const part2 = res.body.expense.participants.find(
      (p) => p.user._id.toString() === user2Id.toString()
    );

    expect(part1.shareAmount).toBe(1500);
    expect(part2.shareAmount).toBe(1500);
  });

  it('should create a shared expense with custom split amounts', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Electricity Bill',
        amount: 300,
        category: 'Electricity',
        type: 'shared',
        splitMode: 'custom',
        participants: [
          { user: user1Id, shareAmount: 100 },
          { user: user2Id, shareAmount: 200 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.expense.participants.length).toBe(2);
  });

  it('should REJECT custom split when shares do NOT equal total', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Electricity Bill',
        amount: 300,
        category: 'Electricity',
        type: 'shared',
        splitMode: 'custom',
        participants: [
          { user: user1Id, shareAmount: 100 },
          { user: user2Id, shareAmount: 150 } // sums to 250, not 300!
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/must equal/i);
  });

  it('should create a personal expense assigned 100% to payer', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Shoes',
        amount: 1200,
        category: 'Others',
        type: 'personal'
      });

    expect(res.status).toBe(201);
    expect(res.body.expense.type).toBe('personal');
    expect(res.body.expense.participants.length).toBe(1);
    expect(res.body.expense.participants[0].shareAmount).toBe(1200);
    expect(res.body.expense.participants[0].sharePercent).toBe(100);
  });

  it('should update an existing expense', async () => {
    const createRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Snacks', amount: 100, category: 'Food', type: 'shared' });

    const expId = createRes.body.expense._id;

    const updateRes = await request(app)
      .put(`/api/expenses/${expId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Snacks & Drinks', amount: 200 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.expense.title).toBe('Snacks & Drinks');
    expect(updateRes.body.expense.amount).toBe(200);
  });

  it('should delete an expense', async () => {
    const createRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Snacks', amount: 100, category: 'Food' });

    const expId = createRes.body.expense._id;

    const delRes = await request(app)
      .delete(`/api/expenses/${expId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(delRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/expenses/${expId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(getRes.status).toBe(404);
  });
});
