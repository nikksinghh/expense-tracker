const request = require('supertest');
const app = require('../src/app');

let user1Token, user2Token, user3Token;

beforeEach(async () => {
  const res1 = await request(app).post('/api/auth/register').send({
    name: 'Roommate One',
    email: 'user1@test.com',
    password: 'password123'
  });
  user1Token = res1.body.token;

  const res2 = await request(app).post('/api/auth/register').send({
    name: 'Roommate Two',
    email: 'user2@test.com',
    password: 'password123'
  });
  user2Token = res2.body.token;

  const res3 = await request(app).post('/api/auth/register').send({
    name: 'Roommate Three',
    email: 'user3@test.com',
    password: 'password123'
  });
  user3Token = res3.body.token;
});

describe('Room System API', () => {
  it('should allow user1 to create a room with unique invite code', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Flat 402 - Green Glen' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.room.name).toBe('Flat 402 - Green Glen');
    expect(res.body.room.code).toMatch(/^RM-[A-Z0-9]{6}$/);
    expect(res.body.room.members.length).toBe(1);
  });

  it('should allow user2 to join the room using invite code', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Flat 402' });

    const code = createRes.body.room.code;

    const joinRes = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ code });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);
    expect(joinRes.body.room.members.length).toBe(2);
  });

  it('should strictly ENFORCE max 2 roommates and reject user3 from joining', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Flat 402' });

    const code = createRes.body.room.code;

    await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ code });

    const thirdJoinRes = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${user3Token}`)
      .send({ code });

    expect(thirdJoinRes.status).toBe(400);
    expect(thirdJoinRes.body.success).toBe(false);
    expect(thirdJoinRes.body.message).toMatch(/already full/i);
  });

  it('should reject joining with invalid room code', async () => {
    const res = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ code: 'RM-INVALID' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
