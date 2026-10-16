import { db } from '../../config/db.js';

/**
 * Per-store rating aggregate, used as a LEFT JOIN target:
 *   r.store_id | r.average_rating (1 decimal, float) | r.rating_count (int)
 * Averages are always derived from `ratings` - never stored - so they can't drift.
 */
export function ratingSummarySubquery(trx = db) {
  return trx('ratings')
    .select('storeId')
    .select(
      trx.raw('round(avg(rating)::numeric, 1)::float as average_rating'),
      trx.raw('count(*)::int as rating_count'),
    )
    .groupBy('storeId')
    .as('r');
}

const STORE_SUMMARY_COLUMNS = [
  's.id',
  's.name',
  's.email',
  's.address',
  's.ownerId',
  's.createdAt',
  's.updatedAt',
  db.raw('r.average_rating'),
  db.raw('coalesce(r.rating_count, 0)::int as rating_count'),
];

function storeSummaryQuery(trx = db) {
  return trx('stores as s')
    .leftJoin(ratingSummarySubquery(trx), 'r.store_id', 's.id')
    .select(STORE_SUMMARY_COLUMNS);
}

export function findStoreSummaryById(id, trx = db) {
  return storeSummaryQuery(trx).where('s.id', id).first();
}

export function findStoreSummaryByOwnerId(ownerId, trx = db) {
  return storeSummaryQuery(trx).where('s.ownerId', ownerId).first();
}

export function findStoreById(id, trx = db) {
  return trx('stores').select('id', 'name', 'ownerId').where({ id }).first();
}

export async function storeEmailExists(email, trx = db) {
  const row = await trx('stores').select('id').whereRaw('lower(email) = lower(?)', [email]).first();
  return Boolean(row);
}

export async function ownerHasStore(ownerId, trx = db) {
  const row = await trx('stores').select('id').where({ ownerId }).first();
  return Boolean(row);
}
