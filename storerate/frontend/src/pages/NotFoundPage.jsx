import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="auth-layout">
      <div className="card auth-card">
        <div className="card__body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em' }}>404</div>
          <h1 style={{ fontSize: 20, marginTop: 8 }}>Page not found</h1>
          <p className="text-muted mt-1">The page you are looking for doesn't exist or has moved.</p>
          <Link to="/" className="btn btn--primary mt-3">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
