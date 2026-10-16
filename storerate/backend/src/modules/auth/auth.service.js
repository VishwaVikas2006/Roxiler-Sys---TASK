import { ApiError } from '../../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import {
  emailExists,
  insertUser,
  findUserWithPasswordByEmail,
  findUserWithPasswordById,
  updatePasswordHash,
} from '../users/users.repository.js';
import { findStoreSummaryByOwnerId } from '../stores/stores.repository.js';

const EMAIL_TAKEN = [{ field: 'email', message: 'Email is already registered' }];

/** Public self-signup - always creates a Normal User. */
export async function register({ name, email, address, password }) {
  if (await emailExists(email)) {
    throw ApiError.conflict('Email is already registered', EMAIL_TAKEN);
  }
  const passwordHash = await hashPassword(password);
  const user = await insertUser({ name, email, passwordHash, address, role: 'user' });
  return { token: signToken(user), user };
}

export async function login({ email, password }) {
  const record = await findUserWithPasswordByEmail(email);
  // Same message for unknown email and wrong password - don't leak which accounts exist.
  const valid = record && (await verifyPassword(password, record.passwordHash));
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const { passwordHash: _ignored, ...user } = record;
  return { token: signToken(user), user };
}

/** Current user profile; store owners also get a summary of their store. */
export async function getProfile(user) {
  const store = user.role === 'store_owner' ? await findStoreSummaryByOwnerId(user.id) : null;
  return { user, store: store ?? null };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const record = await findUserWithPasswordById(userId);
  if (!record) {
    throw ApiError.unauthorized('This account no longer exists');
  }
  if (!(await verifyPassword(currentPassword, record.passwordHash))) {
    throw ApiError.validation(
      [{ field: 'currentPassword', message: 'Current password is incorrect' }],
      'Current password is incorrect',
    );
  }
  await updatePasswordHash(userId, await hashPassword(newPassword));
  return { message: 'Password updated successfully' };
}
