import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** Friendly messages for unique-constraint violations, keyed by constraint/index name. */
const UNIQUE_VIOLATIONS = {
  users_email_lower_uidx: { field: 'email', message: 'Email is already registered' },
  stores_email_lower_uidx: { field: 'email', message: 'A store with this email already exists' },
  stores_owner_id_unique: { field: 'ownerId', message: 'This owner already has a store' },
  ratings_user_id_store_id_unique: { field: 'rating', message: 'You have already rated this store' },
};

/** Translate low-level PostgreSQL / body-parser errors into ApiErrors. */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (err.code) {
    case '23505': {
      const known = UNIQUE_VIOLATIONS[err.constraint];
      return known
        ? ApiError.conflict(known.message, [known])
        : ApiError.conflict('A record with these values already exists');
    }
    case '23514':
      return ApiError.badRequest('One or more values violate a database constraint');
    case '23503':
      return ApiError.badRequest('Referenced record does not exist');
    case '22P02':
      return ApiError.badRequest('Invalid value supplied');
    default:
      break;
  }

  // express.json() errors
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body');
  if (err.type === 'entity.too.large')
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');

  return null;
}

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(err, req, res, _next) {
  const apiError = normalizeError(err);

  if (apiError) {
    return res.status(apiError.status).json({
      error: { code: apiError.code, message: apiError.message, details: apiError.details },
    });
  }

  // Unexpected error: log with context, never leak internals to the client.
  console.error(`[${new Date().toISOString()}] Unhandled error on ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProduction ? 'Something went wrong' : err.message,
    },
  });
}
