import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api.js';
import { UNAUTHORIZED_EVENT } from '../api/client.js';
import { getStoredToken, getStoredUser, saveSession, saveUser, clearSession } from '../utils/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getStoredToken() ? getStoredUser() : null));
  // Set when the API rejected the session (expired/invalid token) so the login page can explain why.
  const [sessionExpired, setSessionExpired] = useState(false);
  // True until we have re-validated a stored token against the API on first load.
  const [initializing, setInitializing] = useState(() => Boolean(getStoredToken()));

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setSessionExpired(false);
  }, []);

  // Re-validate the persisted session once on mount (token may have expired).
  useEffect(() => {
    if (!getStoredToken()) return;
    let cancelled = false;
    authApi
      .me()
      .then(({ user: fresh }) => {
        if (cancelled) return;
        saveUser(fresh);
        setUser(fresh);
      })
      .catch((error) => {
        // 401 is already handled by the client interceptor; other errors keep the cached user.
        if (!cancelled && error.status === 401) {
          setUser(null);
          setSessionExpired(true);
        }
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Global 401 handling (expired/revoked token while using the app).
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: profile } = await authApi.login(credentials);
    saveSession(token, profile);
    setUser(profile);
    setSessionExpired(false);
    return profile;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: profile } = await authApi.register(payload);
    saveSession(token, profile);
    setUser(profile);
    setSessionExpired(false);
    return profile;
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), initializing, sessionExpired, login, register, logout }),
    [user, initializing, sessionExpired, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
