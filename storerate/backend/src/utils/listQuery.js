import { db } from '../config/db.js';

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Add case-insensitive "contains" filters.
 * @param {import('knex').Knex.QueryBuilder} query
 * @param {Record<string, string|undefined>} filters   e.g. { name: 'raj', email: undefined }
 * @param {Record<string, string>} columns             e.g. { name: 'u.name', email: 'u.email' }
 */
export function applyContainsFilters(query, filters, columns) {
  for (const [key, column] of Object.entries(columns)) {
    const value = filters[key];
    if (value) {
      query.whereRaw(`${column} ILIKE ? ESCAPE '\\'`, [`%${escapeLike(value)}%`]);
    }
  }
  return query;
}

/**
 * Run a listing query with whitelisted sorting and pagination.
 * @param {import('knex').Knex.QueryBuilder} query  base query (filters applied, no ORDER/LIMIT)
 * @param {{ sortBy: string, order: 'asc'|'desc', page: number, limit: number }} params
 * @param {Record<string, string>} sortColumns       map of sort key -> SQL expression
 * @param {string} tiebreaker                        deterministic secondary order, e.g. 'u.id'
 */
export async function paginate(query, { sortBy, order, page, limit }, sortColumns, tiebreaker) {
  const sortExpression = sortColumns[sortBy];
  if (!sortExpression) {
    // Should be unreachable: the validation layer whitelists sortBy. Fail loudly if not.
    throw new Error(`Unsupported sort field: ${sortBy}`);
  }
  const direction = order === 'desc' ? 'DESC' : 'ASC';

  const [{ count }] = await db.count({ count: '*' }).from(query.clone().clearOrder().as('q'));
  const total = Number(count);

  const data = await query
    .clone()
    .orderByRaw(`${sortExpression} ${direction} NULLS LAST, ${tiebreaker} ${direction}`)
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
