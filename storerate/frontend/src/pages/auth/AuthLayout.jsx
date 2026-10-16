/** Centered card used by the login and signup screens. */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-layout">
      <div className="card auth-card">
        <div className="card__body">
          <div className="auth-brand">
            <span className="brand__logo" aria-hidden="true">
              ★
            </span>
            <div>
              <div className="auth-brand__title">StoreRate</div>
              <div className="auth-brand__subtitle">{subtitle}</div>
            </div>
          </div>
          <h1 className="visually-hidden">{title}</h1>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
