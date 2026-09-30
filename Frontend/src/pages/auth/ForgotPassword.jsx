import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BsHouseFill, BsArrowLeft, BsEnvelopeFill, BsKeyFill } from 'react-icons/bs';
import api from '../../api/axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      setSent(true);
      // In dev mode, show token to use for testing
      if (res.data.resetToken) {
        setDevToken(res.data.resetToken);
      }
    } catch (err) {
      setSent(true); // Always show success for security
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card">
        <div className="rm-auth-logo">
          <div className="logo-circle"><BsHouseFill /></div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Forgot Password?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Enter your email to receive a reset link
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="rm-form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email" className="rm-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  id="forgot-email"
                />
                <BsEnvelopeFill style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button type="submit" className="btn-rm-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading || !email}>
              {loading ? <span className="spinner" /> : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📧</div>
            <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Password Reset Requested!</h5>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              A reset security token has been generated for <strong>{email}</strong>.
            </p>

            {devToken ? (
              <div style={{ background: 'var(--rm-blue-pale)', border: '1px solid rgba(29,114,254,0.3)', borderRadius: 12, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--rm-blue)', marginBottom: 8 }}>
                  🔑 Direct Password Reset Link:
                </div>
                <Link
                  to={`/reset-password/${devToken}`}
                  className="btn-rm-primary"
                  style={{ display: 'flex', width: '100%', justifyContent: 'center', padding: '10px', textDecoration: 'none' }}
                >
                  Click Here to Set New Password →
                </Link>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Please check your inbox or spam folder for the password reset instructions.
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--rm-blue)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BsArrowLeft size={12} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
