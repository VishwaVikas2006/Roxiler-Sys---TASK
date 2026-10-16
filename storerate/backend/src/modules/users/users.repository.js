import { db } from '../../config/db.js';

/** Columns that are safe to expose through the API (never the password hash). */
export const PUBLIC_USER_COLUMNS = ['id', 'name', 'email', 'address', 'role', 'createdAt', 'updatedAt'];

export function findUserById(id, trx = db) {
  return trx('users').select(PUBLIC_USER_COLUMNS).where({ id }).first();
}

/** Includes the password hash - for authentication flows only. */
export function findUserWithPasswordByEmail(email, trx = db) {
  return trx('users')
    .select([...PUBLIC_USER_COLUMNS, 'passwordHash'])
    .whereRaw('lower(email) = lower(?)', [email])
    .first();
}

export function findUserWithPasswordById(id, trx = db) {
  return trx('users')
    .select([...PUBLIC_USER_COLUMNS, 'passwordHash'])
    .where({ id })
    .first();
}

export async function emailExists(email, trx = db) {
  const row = await trx('users').select('id').whereRaw('lower(email) = lower(?)', [email]).first();
  return Boolean(row);
}

/** Insert a user and return the public representation. */
export async function insertUser({ name, email, passwordHash, address, role }, trx = db) {
  const [user] = await trx('users')
    .insert({ name, email, passwordHash, address, role })
    .returning(PUBLIC_USER_COLUMNS);
  return user;
}

export function updatePasswordHash(id, passwordHash, trx = db) {
  return trx('users').where({ id }).update({ passwordHash });
}
