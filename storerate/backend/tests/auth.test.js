import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  app,
  resetDatabase,
  truncateAll,
  closeDatabase,
  createAccount,
  VALID_PASSWORD,
} from './helpers/setup.js';

const VALID_SIGNUP = {
  name: 'Priya Lakshmi Narasimhan',
  email: 'Priya@Example.com',
  address: 'Kukatpally, Hyderabad',
  password: 'Secret@123',
};

describe('auth', () => {
  before(resetDatabase);
  beforeEach(truncateAll);
  after(closeDatabase);

  test('POST /api/auth/register creates a normal user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_SIGNUP).expect(201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'user');
    assert.equal(res.body.user.email, 'priya@example.com');
    assert.equal(res.body.user.passwordHash, undefined, 'hash must never be exposed');
  });

  test('POST /api/auth/register validates every field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Too short', email: 'nope', address: '', password: 'weak' })
      .expect(400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const fields = new Set(res.body.error.details.map((d) => d.field));
    assert.deepEqual([...fields].sort(), ['address', 'email', 'name', 'password']);
  });

  test('POST /api/auth/register rejects duplicate emails case-insensitively', async () => {
    await request(app).post('/api/auth/register').send(VALID_SIGNUP).expect(201);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_SIGNUP, email: 'PRIYA@example.com' })
      .expect(409);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.equal(res.body.error.details[0].field, 'email');
  });

  test('POST /api/auth/login succeeds with correct credentials and fails otherwise', async () => {
    const { user } = await createAccount({ email: 'login@test.com' });

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'LOGIN@test.com', password: VALID_PASSWORD })
      .expect(200);
    assert.equal(ok.body.user.id, user.id);

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Wrong@123' })
      .expect(401);
    assert.equal(bad.body.error.message, 'Invalid email or password');

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: VALID_PASSWORD })
      .expect(401);
  });

  test('GET /api/auth/me returns the profile (with store for owners) and rejects bad tokens', async () => {
    const { auth } = await createAccount({ role: 'store_owner' });
    const res = await request(app).get('/api/auth/me').set(auth).expect(200);
    assert.equal(res.body.user.role, 'store_owner');
    assert.equal(res.body.store, null);

    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-token').expect(401);
  });

  test('the token is accepted via Authorization or X-Auth-Token (proxies may strip Authorization)', async () => {
    const { token } = await createAccount({ role: 'admin' });

    await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).get('/api/admin/dashboard').set('X-Auth-Token', token).expect(200);
    // A proxy overwrote Authorization with its own value, but the custom header arrived intact.
    await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer not-ours')
      .set('X-Auth-Token', token)
      .expect(200);

    const missing = await request(app).get('/api/admin/dashboard').expect(401);
    assert.equal(missing.body.error.message, 'Authentication required');
    const invalid = await request(app).get('/api/admin/dashboard').set('X-Auth-Token', 'garbage').expect(401);
    assert.equal(invalid.body.error.message, 'Invalid or expired token');
  });

  test('PATCH /api/auth/password verifies the current password and applies the new one', async () => {
    const { auth, user } = await createAccount({ email: 'pw@test.com' });

    const wrong = await request(app)
      .patch('/api/auth/password')
      .set(auth)
      .send({ currentPassword: 'Nope@1234', newPassword: 'Fresh@123' })
      .expect(400);
    assert.equal(wrong.body.error.details[0].field, 'currentPassword');

    const same = await request(app)
      .patch('/api/auth/password')
      .set(auth)
      .send({ currentPassword: VALID_PASSWORD, newPassword: VALID_PASSWORD })
      .expect(400);
    assert.equal(same.body.error.details[0].field, 'newPassword');

    await request(app)
      .patch('/api/auth/password')
      .set(auth)
      .send({ currentPassword: VALID_PASSWORD, newPassword: 'Fresh@123' })
      .expect(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Fresh@123' })
      .expect(200);
    assert.equal(login.body.user.id, user.id);
  });
});
