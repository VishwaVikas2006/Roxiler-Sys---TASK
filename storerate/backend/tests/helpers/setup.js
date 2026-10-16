import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { db } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { insertUser } from '../../src/modules/users/users.repository.js';
import { hashPassword } from '../../src/utils/password.js';
import { signToken } from '../../src/utils/jwt.js';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test (see "npm test")');
}

export const app = createApp();

/** Rebuild the schema from scratch using a plain (unmapped) knex instance. */
export async function resetDatabase() {
  const migrator = knex(knexConfig.test);
  try {
    await migrator.migrate.rollback(undefined, true);
    await migrator.migrate.latest();
  } finally {
    await migrator.destroy();
  }
}

export async function truncateAll() {
  await db.raw('TRUNCATE TABLE ratings, stores, users RESTART IDENTITY CASCADE');
}

export async function closeDatabase() {
  await db.destroy();
}

export const VALID_PASSWORD = 'Passw0rd!';

let counter = 0;

/** Create an account directly in the DB and return it with a signed token. */
export async function createAccount(overrides = {}) {
  counter += 1;
  const {
    name = `Test Account Holder Number ${counter}`,
    email = `account${counter}@test.com`,
    password = VALID_PASSWORD,
    address = `Test address ${counter}`,
    role = 'user',
  } = overrides;
  const user = await insertUser({ name, email, passwordHash: await hashPassword(password), address, role });
  return { user, token: signToken(user), password, auth: { Authorization: `Bearer ${signToken(user)}` } };
}

export async function createStore(overrides = {}) {
  counter += 1;
  const owner = overrides.ownerId
    ? null
    : await createAccount({ role: 'store_owner', email: `owner${counter}@test.com` });
  const [store] = await db('stores')
    .insert({
      name: overrides.name ?? `Test Store Number ${counter} Limited`,
      email: overrides.email ?? `store${counter}@test.com`,
      address: overrides.address ?? `Store address ${counter}`,
      ownerId: overrides.ownerId ?? owner.user.id,
    })
    .returning('*');
  return { store, owner };
}

export async function rate(userId, storeId, rating) {
  await db('ratings').insert({ userId, storeId, rating });
}
