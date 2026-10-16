import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { applyContainsFilters, escapeLike, paginate } from '../../utils/listQuery.js';
import { ratingSummarySubquery, findStoreById, findStoreSummaryById } from './stores.repository.js';

const BROWSE_SORT_COLUMNS = {
  name: 's.name',
  address: 's.address',
  rating: 'r.average_rating',
  myRating: 'mine.rating',
};

/** Stores as seen by a Normal User: overall rating plus the caller's own rating. */
export function browseStores(userId, query) {
  const base = db('stores as s')
    .leftJoin(ratingSummarySubquery(), 'r.store_id', 's.id')
    .leftJoin('ratings as mine', function joinMyRating() {
      this.on('mine.storeId', '=', 's.id').andOnVal('mine.userId', '=', userId);
    })
    .select('s.id', 's.name', 's.address')
    .select(
      db.raw('r.average_rating'),
      db.raw('coalesce(r.rating_count, 0)::int as rating_count'),
      db.raw('mine.rating as my_rating'),
      db.raw('mine.updated_at as my_rating_updated_at'),
    );

  if (query.q) {
    const term = `%${escapeLike(query.q)}%`;
    base.where((qb) => {
      qb.whereRaw(`s.name ILIKE ? ESCAPE '\\'`, [term]).orWhereRaw(`s.address ILIKE ? ESCAPE '\\'`, [term]);
    });
  }
  applyContainsFilters(base, query, { name: 's.name', address: 's.address' });

  return paginate(base, query, BROWSE_SORT_COLUMNS, 's.id');
}

/**
 * Submit or modify the caller's rating for a store in a single statement.
 * Returns `created: true` on first submission (201) and `false` when modified (200).
 */
export async function rateStore(userId, storeId, rating) {
  const store = await findStoreById(storeId);
  if (!store) throw ApiError.notFound('Store not found');

  const { rows } = await db.raw(
    `INSERT INTO ratings (user_id, store_id, rating)
     VALUES (?, ?, ?)
     ON CONFLICT (user_id, store_id)
     DO UPDATE SET rating = EXCLUDED.rating
     RETURNING id, rating, created_at, updated_at, (xmax = 0) AS created`,
    [userId, storeId, rating],
  );
  const [saved] = rows;
  const summary = await findStoreSummaryById(storeId);

  return {
    created: saved.created,
    rating: { id: saved.id, rating: saved.rating, createdAt: saved.createdAt, updatedAt: saved.updatedAt },
    store: {
      id: summary.id,
      name: summary.name,
      averageRating: summary.averageRating,
      ratingCount: summary.ratingCount,
    },
  };
}
