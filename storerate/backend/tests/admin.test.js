import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  app,
  resetDatabase,
  truncateAll,
  closeDatabase,
  createAccount,
  createStore,
  rate,
} from './helpers/setup.js';

describe('admin', () => {
  let admin;

  before(resetDatabase);
  beforeEach(async () => {
    await truncateAll();
    admin = await createAccount({
      role: 'admin',
      email: 'admin@test.com',
      name: 'System Administrator Account',
    });
  });
  after(closeDatabase);

  test('admin routes are forbidden for normal users and owners', async () => {
    const user = await createAccount({ role: 'user' });
    const owner = await createAccount({ role: 'store_owner' });
    await request(app).get('/api/admin/dashboard').set(user.auth).expect(403);
    await request(app).get('/api/admin/users').set(owner.auth).expect(403);
    await request(app).get('/api/admin/dashboard').expect(401);
  });

  test('GET /api/admin/dashboard returns live totals', async () => {
    const user = await createAccount();
    const { store } = await createStore();
    await rate(user.user.id, store.id, 5);

    const res = await request(app).get('/api/admin/dashboard').set(admin.auth).expect(200);
    // admin + user + store owner = 3 users
    assert.deepEqual(res.body, { totalUsers: 3, totalStores: 1, totalRatings: 1 });
  });

  test('POST /api/admin/users creates users of any role and rejects duplicates', async () => {
    const payload = {
      name: 'Second Administrator Account',
      email: 'admin2@test.com',
      password: 'Admin@1234',
      address: 'HQ',
      role: 'admin',
    };
    const res = await request(app).post('/api/admin/users').set(admin.auth).send(payload).expect(201);
    assert.equal(res.body.user.role, 'admin');

    await request(app).post('/api/admin/users').set(admin.auth).send(payload).expect(409);
    await request(app)
      .post('/api/admin/users')
      .set(admin.auth)
      .send({ ...payload, email: 'x@test.com', role: 'superuser' })
      .expect(400);
  });

  test('GET /api/admin/users filters, sorts and paginates', async () => {
    await createAccount({
      name: 'Zara Khan Of Kukatpally Area',
      email: 'zara@test.com',
      address: 'Kukatpally',
      role: 'user',
    });
    await createAccount({
      name: 'Arun Kumar From Madhapur Zone',
      email: 'arun@test.com',
      address: 'Madhapur',
      role: 'store_owner',
    });

    const byName = await request(app)
      .get('/api/admin/users')
      .query({ sortBy: 'name', order: 'desc' })
      .set(admin.auth)
      .expect(200);
    assert.deepEqual(
      byName.body.data.map((u) => u.name),
      ['Zara Khan Of Kukatpally Area', 'System Administrator Account', 'Arun Kumar From Madhapur Zone'],
    );

    const filtered = await request(app)
      .get('/api/admin/users')
      .query({ address: 'kukat', role: 'user' })
      .set(admin.auth)
      .expect(200);
    assert.equal(filtered.body.meta.total, 1);
    assert.equal(filtered.body.data[0].email, 'zara@test.com');

    const paged = await request(app)
      .get('/api/admin/users')
      .query({ limit: 2, page: 2 })
      .set(admin.auth)
      .expect(200);
    assert.equal(paged.body.data.length, 1);
    assert.deepEqual(paged.body.meta, { page: 2, limit: 2, total: 3, totalPages: 2 });

    const unassigned = await request(app)
      .get('/api/admin/users')
      .query({ unassignedOwners: 'true' })
      .set(admin.auth)
      .expect(200);
    assert.deepEqual(
      unassigned.body.data.map((u) => u.email),
      ['arun@test.com'],
    );

    await request(app).get('/api/admin/users').query({ sortBy: 'passwordHash' }).set(admin.auth).expect(400);
  });

  test('GET /api/admin/users/:id includes the store rating for store owners', async () => {
    const { store, owner } = await createStore();
    const rater = await createAccount();
    await rate(rater.user.id, store.id, 4);

    const res = await request(app).get(`/api/admin/users/${owner.user.id}`).set(admin.auth).expect(200);
    assert.equal(res.body.user.role, 'store_owner');
    assert.equal(res.body.store.id, store.id);
    assert.equal(res.body.store.averageRating, 4);
    assert.equal(res.body.store.ratingCount, 1);

    const plain = await request(app).get(`/api/admin/users/${rater.user.id}`).set(admin.auth).expect(200);
    assert.equal(plain.body.store, null);

    await request(app).get('/api/admin/users/9999').set(admin.auth).expect(404);
    await request(app).get('/api/admin/users/abc').set(admin.auth).expect(400);
  });

  test('POST /api/admin/stores assigns an existing owner or creates a new one atomically', async () => {
    const owner = await createAccount({ role: 'store_owner', email: 'owner@test.com' });
    const base = { name: 'Kukatpally Fresh Mart Supermarket', email: 'store@test.com', address: 'KPHB' };

    const created = await request(app)
      .post('/api/admin/stores')
      .set(admin.auth)
      .send({ ...base, ownerId: owner.user.id })
      .expect(201);
    assert.equal(created.body.store.owner.id, owner.user.id);
    assert.equal(created.body.store.ratingCount, 0);

    // Same owner again -> conflict
    const dup = await request(app)
      .post('/api/admin/stores')
      .set(admin.auth)
      .send({ ...base, email: 'other@test.com', ownerId: owner.user.id })
      .expect(409);
    assert.equal(dup.body.error.details[0].field, 'ownerId');

    // Normal user cannot own a store
    const normal = await createAccount({ role: 'user' });
    await request(app)
      .post('/api/admin/stores')
      .set(admin.auth)
      .send({ ...base, email: 'other2@test.com', ownerId: normal.user.id })
      .expect(400);

    // Inline owner creation
    const inline = await request(app)
      .post('/api/admin/stores')
      .set(admin.auth)
      .send({
        ...base,
        email: 'inline@test.com',
        owner: {
          name: 'Brand New Store Owner Person',
          email: 'new-owner@test.com',
          password: 'Owner@1234',
          address: 'Madhapur',
        },
      })
      .expect(201);
    assert.equal(inline.body.store.owner.email, 'new-owner@test.com');

    // Duplicate owner email inside the transaction -> nothing is created
    await request(app)
      .post('/api/admin/stores')
      .set(admin.auth)
      .send({
        ...base,
        email: 'inline2@test.com',
        owner: {
          name: 'Brand New Store Owner Person',
          email: 'new-owner@test.com',
          password: 'Owner@1234',
          address: 'Madhapur',
        },
      })
      .expect(409);
    const stores = await request(app).get('/api/admin/stores').set(admin.auth).expect(200);
    assert.equal(stores.body.meta.total, 2);
  });

  test('GET /api/admin/stores lists stores with ratings and supports sorting by rating', async () => {
    const a = await createStore({ name: 'Alpha Store With Enough Name', email: 'a@test.com' });
    const b = await createStore({ name: 'Beta Store With Enough Name!', email: 'b@test.com' });
    const u1 = await createAccount();
    const u2 = await createAccount();
    await rate(u1.user.id, a.store.id, 2);
    await rate(u1.user.id, b.store.id, 5);
    await rate(u2.user.id, b.store.id, 4);

    const res = await request(app)
      .get('/api/admin/stores')
      .query({ sortBy: 'rating', order: 'desc' })
      .set(admin.auth)
      .expect(200);
    assert.deepEqual(
      res.body.data.map((s) => [s.name, s.averageRating, s.ratingCount]),
      [
        ['Beta Store With Enough Name!', 4.5, 2],
        ['Alpha Store With Enough Name', 2, 1],
      ],
    );
    assert.equal(res.body.data[0].owner.id, b.owner.user.id);

    const filtered = await request(app)
      .get('/api/admin/stores')
      .query({ email: 'a@' })
      .set(admin.auth)
      .expect(200);
    assert.equal(filtered.body.meta.total, 1);
  });
});
