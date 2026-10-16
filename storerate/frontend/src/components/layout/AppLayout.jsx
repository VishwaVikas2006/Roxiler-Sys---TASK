import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { RoleBadge, Button } from '../ui/index.jsx';
import { ROLE_HOME } from '../../utils/roles.js';
import { initials } from '../../utils/format.js';
import { MenuIcon } from '../ui/Icons.jsx';

const NAV_LINKS = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/stores', label: 'Stores' },
  ],
  user: [{ to: '/stores', label: 'Stores', end: true }],
  store_owner: [{ to: '/owner', label: 'My store', end: true }],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.info('You have been signed out');
    navigate('/login', { replace: true });
  };

  const links = NAV_LINKS[user.role] ?? [];

  return (
    <div className="app-shell">
      <nav className={`navbar ${open ? 'navbar--open' : ''}`} aria-label="Main navigation">
        <div className="navbar__inner">
          <Link to={ROLE_HOME[user.role] ?? '/'} className="brand">
            <span className="brand__logo" aria-hidden="true">
              ★
            </span>
            StoreRate
          </Link>

          <button
            type="button"
            className="btn btn--secondary btn--sm nav-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            <MenuIcon size={18} />
          </button>

          <div className="nav-links">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="nav-link"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-user">
            <span className="avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div className="nav-user__meta">
              <span className="nav-user__name truncate" title={user.name}>
                {user.name}
              </span>
              <RoleBadge role={user.role} />
            </div>
            <Link to="/change-password" className="nav-link" onClick={() => setOpen(false)}>
              Change password
            </Link>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </nav>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
