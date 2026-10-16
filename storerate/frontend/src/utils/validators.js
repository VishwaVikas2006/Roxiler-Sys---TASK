/**
 * Client-side validation rules. These intentionally mirror
 * `backend/src/validation/rules.js` so users get instant feedback,
 * while the server remains the source of truth.
 */
export const LIMITS = Object.freeze({
  NAME_MIN: 20,
  NAME_MAX: 60,
  ADDRESS_MAX: 400,
  EMAIL_MAX: 255,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 16,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_RE = /[A-Z]/;
// eslint-disable-next-line no-useless-escape
const SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

export function validateName(value) {
  const name = (value ?? '').trim();
  if (!name) return 'Name is required';
  if (name.length < LIMITS.NAME_MIN || name.length > LIMITS.NAME_MAX) {
    return `Name must be between ${LIMITS.NAME_MIN} and ${LIMITS.NAME_MAX} characters`;
  }
  return null;
}

export function validateEmail(value) {
  const email = (value ?? '').trim();
  if (!email) return 'Email is required';
  if (email.length > LIMITS.EMAIL_MAX || !EMAIL_RE.test(email)) return 'Enter a valid email address';
  return null;
}

export function validateAddress(value) {
  const address = (value ?? '').trim();
  if (!address) return 'Address is required';
  if (address.length > LIMITS.ADDRESS_MAX) return `Address must be at most ${LIMITS.ADDRESS_MAX} characters`;
  return null;
}

/** Per-rule password checks, used for the live checklist UI. */
export function passwordChecks(value = '') {
  return [
    {
      id: 'length',
      label: `${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters`,
      ok: value.length >= LIMITS.PASSWORD_MIN && value.length <= LIMITS.PASSWORD_MAX,
    },
    { id: 'uppercase', label: 'one uppercase letter', ok: UPPERCASE_RE.test(value) },
    { id: 'special', label: 'one special character', ok: SPECIAL_RE.test(value) },
  ];
}

export function validatePassword(value) {
  if (!value) return 'Password is required';
  const failed = passwordChecks(value).filter((c) => !c.ok);
  if (failed.length === 0) return null;
  return `Password needs ${failed.map((c) => c.label).join(', ')}`;
}

export function validateRequired(value, label = 'This field') {
  return (value ?? '').toString().trim() ? null : `${label} is required`;
}

/**
 * Run a map of validators against a values object.
 * @returns {Record<string, string>} field -> error message (only failing fields)
 */
export function validateForm(values, validators) {
  const errors = {};
  for (const [field, validator] of Object.entries(validators)) {
    const message = validator(values[field], values);
    if (message) errors[field] = message;
  }
  return errors;
}
