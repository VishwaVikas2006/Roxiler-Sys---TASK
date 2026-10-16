import { env } from './src/config/env.js';

/**
 * Plain Knex configuration used by the CLI (migrations / seeds).
 * The application instance in `src/config/db.js` layers snake_case <-> camelCase
 * identifier mapping on top of this; migrations and seeds use snake_case directly.
 */
const base = {
  client: 'pg',
  connection: env.DATABASE_URL,
  migrations: {
    directory: './src/db/migrations',
    tableName: 'knex_migrations',
    loadExtensions: ['.js'],
  },
  seeds: {
    directory: './src/db/seeds',
    loadExtensions: ['.js'],
  },
  pool: { min: 0, max: 10 },
};

export default {
  development: base,
  test: { ...base, pool: { min: 0, max: 5 } },
  production: { ...base, pool: { min: 2, max: 10 } },
};
