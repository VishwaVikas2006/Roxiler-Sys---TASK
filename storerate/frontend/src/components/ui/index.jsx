import { useEffect } from 'react';
import { Link } from 'react-router';
import { roleLabel } from '../../utils/roles.js';

export function Button({
  children,
  variant = 'primary',
  size,
  block,
  loading = false,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="spinner spinner--sm" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ to, children, variant = 'primary', size, className = '', ...rest }) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, className].filter(Boolean).join(' ');
  return (
    <Link to={to} className={classes} {...rest}>
      {children}
    </Link>
  );
}

export function Card({ children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, actions }) {
  return (
    <header className="card__header">
      <div>
        <h2 className="card__title">{title}</h2>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`card__body ${className}`}>{children}</div>;
}

export function StatCard({ icon, label, value, loading }) {
  return (
    <Card className="stat-card">
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{loading ? '…' : value}</div>
      </div>
    </Card>
  );
}

export function RoleBadge({ role }) {
  return <span className={`badge badge--${role}`}>{roleLabel(role)}</span>;
}

export function Alert({ type = 'info', children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${type} ${className}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center-screen" role="status">
      <div className="stack" style={{ alignItems: 'center' }}>
        <span className="spinner" aria-hidden="true" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function Modal({ title, children, footer, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__header">
          <h2 className="modal__title" id="modal-title">
            {title}
          </h2>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
