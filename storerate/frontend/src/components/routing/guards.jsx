import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../ui/index.jsx';
import { ROLE_HOME } from '../../utils/roles.js';

/** Requires a signed-in user; remembers where they were heading. */
export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Spinner label="Restoring your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Requires one of the given roles; everyone else is sent to their own home. */
export function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />;
  return <Outlet />;
}

/** Login/Signup: already signed-in users go straight to their dashboard. */
export function PublicOnlyRoute() {
  const { isAuthenticated, user, initializing } = useAuth();
  if (initializing) return <Spinner label="Restoring your session…" />;
  if (isAuthenticated) return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />;
  return <Outlet />;
}

/** "/" -> role home (or login). */
export function RoleRedirect() {
  const { isAuthenticated, user, initializing } = useAuth();
  if (initializing) return <Spinner label="Restoring your session…" />;
  return <Navigate to={isAuthenticated ? (ROLE_HOME[user.role] ?? '/login') : '/login'} replace />;
}
