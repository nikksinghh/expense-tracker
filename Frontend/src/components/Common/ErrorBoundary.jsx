import React from 'react';
import { BsExclamationTriangleFill, BsArrowRepeat, BsHouseFill } from 'react-icons/bs';

/**
 * Top-level React Error Boundary
 * Catches unhandled runtime render crashes and presents a fast recovery UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Render Error in Boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rm-auth-page" style={{ padding: 24 }}>
          <div className="rm-auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--rm-red-light, #ffe4e4)',
                color: 'var(--rm-red, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '1.8rem',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)'
              }}
            >
              <BsExclamationTriangleFill />
            </div>

            <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Something went wrong
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20 }}>
              An unexpected interface error occurred. Don't worry, your expense data is safely saved.
            </p>

            <div
              style={{
                background: 'var(--bg-input, #f8faff)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                padding: '10px 14px',
                textAlign: 'left',
                fontSize: '0.76rem',
                color: 'var(--rm-red, #ef4444)',
                fontFamily: 'monospace',
                marginBottom: 24,
                maxHeight: 90,
                overflowY: 'auto',
                wordBreak: 'break-word'
              }}
            >
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-rm-primary"
                style={{ padding: '10px 18px', gap: 8 }}
              >
                <BsArrowRepeat />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-rm-outline"
                style={{ padding: '10px 18px', gap: 8 }}
              >
                <BsHouseFill />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
