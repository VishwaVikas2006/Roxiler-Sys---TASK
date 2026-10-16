import { z } from 'zod';

/**
 * Single source of truth for field rules on the backend.
 * The frontend mirrors these constants in `frontend/src/utils/validators.js`.
 */
export const LIMITS = Object.freeze({
  NAME_MIN: 20,
  NAME_MAX: 60,
  ADDRESS_MAX: 400,
  EMAIL_MAX: 255,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 16,
  RATING_MIN: 1,
  RATING_MAX: 5,
  PAGE_SIZE_DEFAULT: 10,
  PAGE_SIZE_MAX: 100,
});

export const ROLES = Object.freeze(['admin', 'user', 'store_owner']);

export const PASSWORD_UPPERCASE_RE = /[A-Z]/;
// eslint-disable-next-line no-useless-escape
export const PASSWORD_SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

export const MESSAGES = Object.freeze({
  name: `Name must be between ${LIMITS.NAME_MIN} and ${LIMITS.NAME_MAX} characters`,
  email: 'Enter a valid email address',
  addressRequired: 'Address is required',
  addressMax: `Address must be at most ${LIMITS.ADDRESS_MAX} characters`,
  passwordLength: `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters long`,
  passwordUppercase: 'Password must contain at least one uppercase letter',
  passwordSpecial: 'Password must contain at least one special character',
  rating: `Rating must be a whole number between ${LIMITS.RATING_MIN} and ${LIMITS.RATING_MAX}`,
  role: 'Role must be one of: admin, user, store_owner',
});

const requiredString = (field) =>
  z.string({
    required_error: `${field} is required`,
    invalid_type_error: `${field} must be a string`,
  });

export const nameRule = requiredString('Name')
  .trim()
  .min(LIMITS.NAME_MIN, MESSAGES.name)
  .max(LIMITS.NAME_MAX, MESSAGES.name);

export const emailRule = requiredString('Email')
  .trim()
  .toLowerCase()
  .max(LIMITS.EMAIL_MAX, MESSAGES.email)
  .email(MESSAGES.email);

export const addressRule = requiredString('Address')
  .trim()
  .min(1, MESSAGES.addressRequired)
  .max(LIMITS.ADDRESS_MAX, MESSAGES.addressMax);

export const passwordRule = requiredString('Password')
  .min(LIMITS.PASSWORD_MIN, MESSAGES.passwordLength)
  .max(LIMITS.PASSWORD_MAX, MESSAGES.passwordLength)
  .regex(PASSWORD_UPPERCASE_RE, MESSAGES.passwordUppercase)
  .regex(PASSWORD_SPECIAL_RE, MESSAGES.passwordSpecial);

export const roleRule = z.enum(ROLES, { errorMap: () => ({ message: MESSAGES.role }) });

export const ratingRule = z
  .number({ required_error: 'Rating is required', invalid_type_error: MESSAGES.rating })
  .int(MESSAGES.rating)
  .min(LIMITS.RATING_MIN, MESSAGES.rating)
  .max(LIMITS.RATING_MAX, MESSAGES.rating);

export const idRule = z.coerce
  .number({ invalid_type_error: 'Invalid id' })
  .int('Invalid id')
  .positive('Invalid id');

/** Optional free-text filter: blank strings are treated as "not provided". */
export const filterRule = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((value) => (value ? value : undefined));

export const booleanFlagRule = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');

/**
 * Builds the shared `?sortBy=&order=&page=&limit=` schema for a listing endpoint.
 * `sortable` is the whitelist of allowed sort keys (prevents ORDER BY injection).
 */
export function listQueryRule(sortable, defaultSort, extraFields = {}) {
  return z.object({
    sortBy: z
      .enum(sortable, { errorMap: () => ({ message: `sortBy must be one of: ${sortable.join(', ')}` }) })
      .default(defaultSort),
    order: z
      .enum(['asc', 'desc'], { errorMap: () => ({ message: 'order must be asc or desc' }) })
      .default('asc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(LIMITS.PAGE_SIZE_MAX).default(LIMITS.PAGE_SIZE_DEFAULT),
    ...extraFields,
  });
}
