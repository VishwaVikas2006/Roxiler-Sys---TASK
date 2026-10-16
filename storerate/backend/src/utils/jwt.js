import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Issue an access token for a user. The subject is the user id; role is informational. */
export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/** Verify a token and return its payload. Throws on invalid/expired tokens. */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}
