import axios from 'axios';
import { getStoredToken, clearSession } from '../utils/session.js';

/** Fires when the API answers 401 so the auth layer can log the user out. */
export const UNAUTHORIZED_EVENT = 'storerate:unauthorized';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Attach the access token. It is sent twice on purpose: `Authorization` is the
 * standard transport, while `X-Auth-Token` survives reverse proxies and preview
 * tunnels that strip or overwrite the Authorization header.
 */
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Auth-Token'] = token;
  }
  return config;
});

/**
 * Normalise every failure into a consistent shape:
 *   { status, code, message, details: [{ field, message }], fieldErrors: { field: message } }
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data?.error;

    const normalized = {
      status,
      code: payload?.code ?? (status ? 'HTTP_ERROR' : 'NETWORK_ERROR'),
      message:
        payload?.message ??
        (status
          ? `Request failed (${status})`
          : 'Cannot reach the server. Check your connection and try again.'),
      details: payload?.details ?? [],
      fieldErrors: {},
    };
    for (const detail of normalized.details) {
      // Keep the first message per field - it is the most relevant one.
      if (detail.field && !normalized.fieldErrors[detail.field]) {
        normalized.fieldErrors[detail.field] = detail.message;
      }
    }

    const isAuthRequest =
      error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/register');
    if (status === 401 && !isAuthRequest) {
      clearSession();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(normalized);
  },
);
