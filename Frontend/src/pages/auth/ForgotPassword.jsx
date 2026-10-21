import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BsKeyFill, BsArrowRight, BsEnvelopeCheckFill, BsArrowRepeat } from 'react-icons/bs';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import ErrorAlert from '../../components/Common/ErrorAlert';

const RESEND_COOLDOWN_SECONDS = 60;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast('Password reset link dispatched!', 'info', 'Check Inbox');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card" style={{ maxWidth: 450 }}>
        <div className="rm-auth-logo">
          <div className="logo-circle">
            {submitted ? <BsEnvelopeCheckFill /> : <BsKeyFill />}
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 4 }}>
            {submitted ? 'Check your inbox' : 'Forgot password?'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {submitted
              ? `We sent reset instructions to ${email}`
              : 'Enter your email address to receive a secure recovery link'}
          </p>
        </div>

        {/* Error Alert Section */}
        <ErrorAlert error={error} onClear={() => setError(null)} />

        {submitted ? (
          <div>
            <div
              style={{
                background: 'var(--rm-blue-pale)',
                borderRadius: 14,
                padding: '16px',
                fontSize: '0.86rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                marginBottom: 20
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                Reset instructions dispatched
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem' }}>
                If an account exists for <strong>{email}</strong>, you will receive an email shortly with a secure link to reset your password. The link expires in 15 minutes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={cooldown > 0 || loading}
              className="btn-rm-outline"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: 14 }}
            >
              <BsArrowRepeat />
              <span>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
              </span>
            </button>

            <Link
              to="/login"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              <span>Back to Sign In</span>
              <BsArrowRight />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="rm-form-label">Email address</label>
              <input
                type="email"
                className="rm-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                id="forgot-email"
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <BsArrowRight />
                </>
              )}
            </button>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link
                to="/login"
                style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Remember your password?{' '}
                <span style={{ fontWeight: 700, color: 'var(--rm-blue)' }}>Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
