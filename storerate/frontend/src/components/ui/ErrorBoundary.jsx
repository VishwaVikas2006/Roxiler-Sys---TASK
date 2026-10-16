import { Component } from 'react';
import { WarningIcon } from './Icons.jsx';

/**
 * Last line of defence against unexpected render errors: instead of a blank
 * white screen the user gets an explanation and a way to recover.
 * (Error boundaries must be class components - there is no hook equivalent yet.)
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hook point for an error-reporting service (Sentry etc.).
    console.error('[ErrorBoundary] Uncaught render error', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="auth-layout" role="alert">
        <div className="card auth-card">
          <div className="card__body">
            <div className="table-state">
              <div className="table-state__icon">
                <WarningIcon />
              </div>
              <h1 className="table-state__title">Something went wrong</h1>
              <p className="text-sm text-muted mt-1">
                An unexpected error occurred while rendering this page. Reloading usually fixes it.
              </p>
              {import.meta.env.DEV && (
                <pre className="text-sm mt-2" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                  {String(this.state.error?.message ?? this.state.error)}
                </pre>
              )}
              <div className="row mt-2" style={{ justifyContent: 'center' }}>
                <button type="button" className="btn btn--primary" onClick={this.handleReload}>
                  Reload page
                </button>
                <a className="btn btn--secondary" href="/">
                  Go to home
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
