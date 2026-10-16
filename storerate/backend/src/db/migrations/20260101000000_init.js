/**
 * Initial schema: users, stores, ratings.
 *
 * Design notes
 * - Form validation rules are mirrored as CHECK constraints (DB = last line of defence).
 * - Emails are unique case-insensitively via an expression index on lower(email).
 * - A store owner owns exactly one store (stores.owner_id UNIQUE NOT NULL).
 * - A user can rate a store only once (UNIQUE(user_id, store_id)); "modify" is an update.
 * - Average ratings are never stored; they are aggregated from `ratings` at query time.
 * - updated_at is maintained by a trigger so application code can't forget it.
 */

const TIMESTAMP_TRIGGER = (table) =>
  `CREATE TRIGGER ${table}_set_updated_at
     BEFORE UPDATE ON ${table}
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`;

export async function up(knex) {
  await knex.raw(`CREATE TYPE user_role AS ENUM ('admin', 'user', 'store_owner')`);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // ---------------------------------------------------------------- users
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 60).notNullable();
    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('address', 400).notNullable();
    table.specificType('role', 'user_role').notNullable().defaultTo('user');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check('char_length(name) BETWEEN 20 AND 60', [], 'users_name_length_check');
    table.check('char_length(address) <= 400', [], 'users_address_length_check');
    table.index(['role'], 'users_role_idx');
  });
  await knex.raw(`CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email))`);
  await knex.raw(TIMESTAMP_TRIGGER('users'));

  // --------------------------------------------------------------- stores
  await knex.schema.createTable('stores', (table) => {
    table.increments('id').primary();
    table.string('name', 60).notNullable();
    table.string('email', 255).notNullable();
    table.string('address', 400).notNullable();
    table.integer('owner_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check('char_length(name) BETWEEN 20 AND 60', [], 'stores_name_length_check');
    table.check('char_length(address) <= 400', [], 'stores_address_length_check');
    table.unique(['owner_id'], { indexName: 'stores_owner_id_unique' });
  });
  await knex.raw(`CREATE UNIQUE INDEX stores_email_lower_uidx ON stores (lower(email))`);
  await knex.raw(TIMESTAMP_TRIGGER('stores'));

  // -------------------------------------------------------------- ratings
  await knex.schema.createTable('ratings', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
    table.smallint('rating').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check('rating BETWEEN 1 AND 5', [], 'ratings_rating_range_check');
    table.unique(['user_id', 'store_id'], { indexName: 'ratings_user_id_store_id_unique' });
    table.index(['store_id'], 'ratings_store_id_idx');
  });
  await knex.raw(TIMESTAMP_TRIGGER('ratings'));
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ratings');
  await knex.schema.dropTableIfExists('stores');
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at()');
  await knex.raw('DROP TYPE IF EXISTS user_role');
}
