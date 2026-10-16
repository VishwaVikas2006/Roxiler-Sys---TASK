import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { env } from './env.js';
import { snakeCase, camelCaseKeys } from '../utils/caseMapping.js';

const config = knexConfig[env.NODE_ENV] ?? knexConfig.development;

/**
 * Application-wide Knex instance.
 * - Identifiers written in camelCase are converted to snake_case on the way in.
 * - Result keys are converted back to camelCase on the way out.
 * Raw SQL fragments are passed through untouched, so write snake_case inside `db.raw()`.
 */
export const db = knex({
  ...config,
  wrapIdentifier: (value, origImpl) => origImpl(snakeCase(value)),
  postProcessResponse: (result) => {
    // `db.raw()` resolves to a pg Result object; convert its rows in place.
    if (result && typeof result === 'object' && Array.isArray(result.rows) && 'command' in result) {
      result.rows = camelCaseKeys(result.rows);
      return result;
    }
    return camelCaseKeys(result);
  },
});

/** Lightweight connectivity probe used by the health endpoint and at boot. */
export async function pingDatabase() {
  await db.raw('select 1');
}
