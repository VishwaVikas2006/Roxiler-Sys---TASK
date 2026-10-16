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

describe('stores & ratings (normal user) + owner dashboard', () => {
  before(resetDatabase);
  beforeEach(truncateAll);
  after(closeDatabase);

  test('store routes are limited to normal users', async () => {
    const admin = await createAccount({ role: 'admin' });
    const owner = await createAccount({ role: 'store_owner' });
    await request(app).get('/api/stores').set(admin.auth).expect(403);
    await request(app).put('/api/stores/1/rating').set(owner.auth).send({ rating: 5 }).expect(403);
    await request(app).get('/api/stores').expect(401);
  });

  test('GET /api/stores shows overall rating and my rating, searchable by name or address', async () => {
    const me = await createAccount();
    const other = await createAccount();
    const { store: fresh } = await createStore({
      name: 'Kukatpally Fresh Mart Supermarket',
      address: 'KPHB Phase 1',
    });
    const { store: hub } = await createStore({
      name: 'Hitech City Electronics Hub Store',
      address: 'Cyber Towers',
    });
    await rate(other.user.id, fresh.id, 5);
    await rate(me.user.id, fresh.id, 4);

    const all = await request(app).get('/api/stores').set(me.auth).expect(200);
    const freshRow = all.body.data.find((s) => s.id === fresh.id);
    const hubRow = all.body.data.find((s) => s.id === hub.id);
    assert.equal(freshRow.averageRating, 4.5);
    assert.equal(freshRow.ratingCount, 2);
    assert.equal(freshRow.myRating, 4);
    assert.equal(hubRow.averageRating, null);
    assert.equal(hubRow.myRating, null);

    const byAddress = await request(app).get('/api/stores').query({ q: 'cyber' }).set(me.auth).expect(200);
    assert.deepEqual(
      byAddress.body.data.map((s) => s.id),
      [hub.id],
    );

    const byName = await request(app)
      .get('/api/stores')
      .query({ name: 'fresh mart' })
      .set(me.auth)
      .expect(200);
    assert.deepEqual(
      byName.body.data.map((s) => s.id),
      [fresh.id],
    );

    const sorted = await request(app)
      .get('/api/stores')
      .query({ sortBy: 'rating', order: 'desc' })
      .set(me.auth)
      .expect(200);
    assert.deepEqual(
      sorted.body.data.map((s) => s.id),
      [fresh.id, hub.id],
      'nulls sort last',
    );
  });

  test('PUT /api/stores/:id/rating creates (201) then modifies (200) and recomputes the average', async () => {
    const me = await createAccount();
    const other = await createAccount();
    const { store, owner } = await createStore();
    await rate(other.user.id, store.id, 2);

    const first = await request(app)
      .put(`/api/stores/${store.id}/rating`)
      .set(me.auth)
      .send({ rating: 4 })
      .expect(201);
    assert.equal(first.body.rating.rating, 4);
    assert.equal(first.body.store.averageRating, 3);
    assert.equal(first.body.store.ratingCount, 2);

    const second = await request(app)
      .put(`/api/stores/${store.id}/rating`)
      .set(me.auth)
      .send({ rating: 5 })
      .expect(200);
    assert.equal(second.body.rating.id, first.body.rating.id, 'same rating row is updated');
    assert.equal(second.body.store.averageRating, 3.5);
    assert.equal(second.body.store.ratingCount, 2, 'no duplicate rating rows');

    await request(app).put(`/api/stores/${store.id}/rating`).set(me.auth).send({ rating: 6 }).expect(400);
    await request(app).put(`/api/stores/${store.id}/rating`).set(me.auth).send({ rating: 2.5 }).expect(400);
    await request(app).put('/api/stores/9999/rating').set(me.auth).send({ rating: 3 }).expect(404);

    // Owner sees the rater and the average
    const dash = await request(app).get('/api/owner/dashboard').set(owner.auth).expect(200);
    assert.equal(dash.body.store.id, store.id);
    assert.equal(dash.body.store.averageRating, 3.5);

    const raters = await request(app)
      .get('/api/owner/ratings')
      .query({ sortBy: 'rating', order: 'desc' })
      .set(owner.auth)
      .expect(200);
    assert.deepEqual(
      raters.body.data.map((r) => [r.user.id, r.rating]),
      [
        [me.user.id, 5],
        [other.user.id, 2],
      ],
    );
  });

  test('owner routes are limited to store owners; owner without a store gets an empty dashboard', async () => {
    const user = await createAccount();
    await request(app).get('/api/owner/dashboard').set(user.auth).expect(403);

    const lonelyOwner = await createAccount({ role: 'store_owner' });
    const dash = await request(app).get('/api/owner/dashboard').set(lonelyOwner.auth).expect(200);
    assert.equal(dash.body.store, null);
    const ratings = await request(app).get('/api/owner/ratings').set(lonelyOwner.auth).expect(200);
    assert.deepEqual(ratings.body.data, []);
  });
});
