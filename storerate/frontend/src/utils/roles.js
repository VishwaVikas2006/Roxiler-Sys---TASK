export const ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user',
  STORE_OWNER: 'store_owner',
});

export const ROLE_LABELS = Object.freeze({
  admin: 'System Administrator',
  user: 'Normal User',
  store_owner: 'Store Owner',
});

export const ROLE_OPTIONS = Object.freeze([
  { value: 'user', label: ROLE_LABELS.user },
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'store_owner', label: ROLE_LABELS.store_owner },
]);

/** Where each role lands after login. */
export const ROLE_HOME = Object.freeze({
  admin: '/admin',
  user: '/stores',
  store_owner: '/owner',
});

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}
