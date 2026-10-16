import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword } from '../../utils/password.js';
import { applyContainsFilters, paginate } from '../../utils/listQuery.js';
import { emailExists, insertUser, findUserById } from '../users/users.repository.js';
import {
  ratingSummarySubquery,
  findStoreSummaryById,
  findStoreSummaryByOwnerId,
  storeEmailExists,
  ownerHasStore,
} from '../stores/stores.repository.js';

// ------------------------------------------------------------------ dashboard

export async function getDashboardStats() {
  const { rows } = await db.raw(`
    SELECT (SELECT count(*) FROM users)   AS total_users,
           (SELECT count(*) FROM stores)  AS total_stores,
           (SELECT count(*) FROM ratings) AS total_ratings
  `);
  const [stats] = rows;
  return {
    totalUsers: Number(stats.totalUsers),
    totalStores: Number(stats.totalStores),
    totalRatings: Number(stats.totalRatings),
  };
}

// ---------------------------------------------------------------------- users

const USER_SORT_COLUMNS = {
  name: 'u.name',
  email: 'u.email',
  address: 'u.address',
  role: 'u.role::text', // alphabetical rather than enum declaration order
  createdAt: 'u.created_at',
};

export function listUsers(query) {
  const base = db('users as u')
    .leftJoin('stores as s', 's.ownerId', 'u.id')
    .select('u.id', 'u.name', 'u.email', 'u.address', 'u.role', 'u.createdAt')
    .select(db.raw('s.id as store_id'), db.raw('s.name as store_name'));

  applyContainsFilters(base, query, { name: 'u.name', email: 'u.email', address: 'u.address' });
  if (query.role) base.where('u.role', query.role);
  if (query.unassignedOwners) base.where('u.role', 'store_owner').whereNull('s.id');

  return paginate(base, query, USER_SORT_COLUMNS, 'u.id');
}

export async function createUser({ name, email, password, address, role }) {
  if (await emailExists(email)) {
    throw ApiError.conflict('Email is already registered', [
      { field: 'email', message: 'Email is already registered' },
    ]);
  }
  const passwordHash = await hashPassword(password);
  return insertUser({ name, email, passwordHash, address, role });
}

/** Full user details; store owners also include their store and its rating. */
export async function getUserDetails(id) {
  const user = await findUserById(id);
  if (!user) throw ApiError.notFound('User not found');

  const store = user.role === 'store_owner' ? await findStoreSummaryByOwnerId(id) : null;
  return { user, store: store ?? null };
}

// --------------------------------------------------------------------- stores

const STORE_SORT_COLUMNS = {
  name: 's.name',
  email: 's.email',
  address: 's.address',
  rating: 'r.average_rating',
  createdAt: 's.created_at',
};

export function listStores(query) {
  const base = db('stores as s')
    .leftJoin(ratingSummarySubquery(), 'r.store_id', 's.id')
    .join('users as o', 'o.id', 's.ownerId')
    .select('s.id', 's.name', 's.email', 's.address', 's.createdAt')
    .select(
      db.raw('r.average_rating'),
      db.raw('coalesce(r.rating_count, 0)::int as rating_count'),
      db.raw(`json_build_object('id', o.id, 'name', o.name, 'email', o.email) as owner`),
    );

  applyContainsFilters(base, query, { name: 's.name', email: 's.email', address: 's.address' });

  return paginate(base, query, STORE_SORT_COLUMNS, 's.id');
}

/**
 * Create a store, assigning an existing store owner or creating a new owner account
 * in the same transaction so we never end up with an owner without a store or vice versa.
 */
export async function createStore({ name, email, address, ownerId, owner }) {
  if (await storeEmailExists(email)) {
    throw ApiError.conflict('A store with this email already exists', [
      { field: 'email', message: 'A store with this email already exists' },
    ]);
  }

  const storeId = await db.transaction(async (trx) => {
    let resolvedOwnerId = ownerId;

    if (owner) {
      if (await emailExists(owner.email, trx)) {
        throw ApiError.conflict('Owner email is already registered', [
          { field: 'owner.email', message: 'Email is already registered' },
        ]);
      }
      const created = await insertUser(
        { ...owner, passwordHash: await hashPassword(owner.password), role: 'store_owner' },
        trx,
      );
      resolvedOwnerId = created.id;
    } else {
      const existing = await findUserById(ownerId, trx);
      if (!existing) {
        throw ApiError.validation([{ field: 'ownerId', message: 'Selected owner does not exist' }]);
      }
      if (existing.role !== 'store_owner') {
        throw ApiError.validation([{ field: 'ownerId', message: 'Selected user is not a store owner' }]);
      }
      if (await ownerHasStore(ownerId, trx)) {
        throw ApiError.conflict('This owner already has a store', [
          { field: 'ownerId', message: 'This owner already has a store' },
        ]);
      }
    }

    const [store] = await trx('stores')
      .insert({ name, email, address, ownerId: resolvedOwnerId })
      .returning('id');
    return store.id;
  });

  const store = await findStoreSummaryById(storeId);
  const storeOwner = await findUserById(store.ownerId);
  return { ...store, owner: { id: storeOwner.id, name: storeOwner.name, email: storeOwner.email } };
}
