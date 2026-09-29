const request = require('supertest');
const app = require('../src/app');

let userToken;

beforeEach(async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Nikhil',
    email: 'nikhil@test.com',
    password: 'password123'
  });
  userToken = res.body.token;

  await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ name: 'Flat 402' });
});

describe('Budget API & Threshold Notifications', () => {
  it('should set monthly budget and return accurate spending & remaining', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const setRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ month, year, monthlyLimit: 10000, thresholds: [75, 90, 100] });

    expect(setRes.status).toBe(200);
    expect(setRes.body.budget.monthlyLimit).toBe(10000);

    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Various Bills', amount: 6820, category: 'Others', date: new Date() });

    const statusRes = await request(app)
      .get(`/api/budgets?month=${month}&year=${year}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.monthlyLimit).toBe(10000);
    expect(statusRes.body.totalSpending).toBe(6820);
    expect(statusRes.body.remaining).toBe(3180);
    expect(statusRes.body.percentageUsed).toBe(68);
    expect(statusRes.body.status).toBe('normal');
  });

  it('should trigger 75% budget alert and NOT duplicate it', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ month, year, monthlyLimit: 10000, thresholds: [75, 90, 100] });

    // Add expense that exceeds 75% (8000 = 80%)
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Rent and Furniture', amount: 8000, category: 'Rent', date: new Date() });

    // Small second expense (still within 75%..90% range)
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Snack', amount: 100, category: 'Food', date: new Date() });

    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(notifRes.status).toBe(200);

    const budgetAlert = notifRes.body.notifications.find((n) => n.type === 'budget_alert');
    expect(budgetAlert).toBeDefined();
    expect(budgetAlert.title).toContain('75% Reached');

    const alerts75 = notifRes.body.notifications.filter(
      (n) => n.type === 'budget_alert' && n.title.includes('75%')
    );
    // Should be exactly 1 — no duplicates!
    expect(alerts75.length).toBe(1);
  });
});
