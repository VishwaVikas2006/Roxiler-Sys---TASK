import { db } from '../../config/db.js';
import { paginate } from '../../utils/listQuery.js';
import { findStoreSummaryByOwnerId } from '../stores/stores.repository.js';

/** The owner's store with its average rating and rating count (null if none assigned yet). */
export async function getDashboard(ownerId) {
  const store = await findStoreSummaryByOwnerId(ownerId);
  return { store: store ?? null };
}

const RATING_SORT_COLUMNS = {
  name: 'u.name',
  email: 'u.email',
  rating: 'rt.rating',
  createdAt: 'rt.created_at',
};

/** Users who have rated the owner's store. */
export async function listRatings(ownerId, query) {
  const base = db('ratings as rt')
    .join('stores as s', 's.id', 'rt.storeId')
    .join('users as u', 'u.id', 'rt.userId')
    .where('s.ownerId', ownerId)
    .select('rt.id', 'rt.rating', 'rt.createdAt', 'rt.updatedAt')
    .select(db.raw(`json_build_object('id', u.id, 'name', u.name, 'email', u.email) as "user"`));

  return paginate(base, query, RATING_SORT_COLUMNS, 'rt.id');
}
