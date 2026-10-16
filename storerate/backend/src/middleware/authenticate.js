import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';
import { findUserById } from '../modules/users/users.repository.js';

/**
 * Secondary token header. Some reverse proxies / preview tunnels strip or
 * overwrite the standard `Authorization` header, so the client sends the
 * token in both and the API accepts whichever arrives intact.
 */
export const AUTH_TOKEN_HEADER = 'x-auth-token';

const BEARER_RE = /^Bearer\s+(\S+)$/i;

/** Collect candidate tokens from the supported transports, in order of preference. */
function extractTokens(req) {
  const tokens = [];

  const bearer = BEARER_RE.exec(req.headers.authorization ?? '');
  if (bearer) tokens.push(bearer[1]);

  const custom = req.headers[AUTH_TOKEN_HEADER];
  if (typeof custom === 'string' && custom.trim()) tokens.push(custom.trim());

  return tokens;
}

/**
 * Verifies the access token and attaches the current user to `req.user`.
 * The user is re-loaded from the database on every request so role changes
 * or deletions take effect immediately instead of when the token expires.
 */
export async function authenticate(req, _res, next) {
  const tokens = extractTokens(req);
  if (tokens.length === 0) {
    throw ApiError.unauthorized();
  }

  let payload = null;
  for (const token of tokens) {
    try {
      payload = verifyToken(token);
      break;
    } catch {
      // Try the next transport (e.g. a proxy replaced the Authorization header).
    }
  }
  if (!payload) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await findUserById(Number(payload.sub));
  if (!user) {
    throw ApiError.unauthorized('This account no longer exists');
  }

  req.user = user;
  next();
}
