import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BsHouseFill, BsArrowLeft, BsEnvelopeFill, BsCheckCircleFill, BsShieldLockFill } from 'react-icons/bs';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const toast = useToast();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast('Please enter your registered email address.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: cleanEmail });
      setSubmitted(true);
      setCooldown(60);
      toast(res.data?.message || 'Password reset email sent. Please check your inbox.', 'success');
    } catch (err) {
      // For security and privacy, still show confirmation message so attackers cannot enumerate users
      setSubmitted(true);
      setCooldown(60);
      const errMsg = err.response?.data?.message || 'Password reset request processed. Please check your inbox.';
      toast(errMsg, 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    await handleSubmit({ preventDefault: () => {} });
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card">
        <div className="rm-auth-logo">
          <div className="logo-circle"><BsHouseFill /></div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
            {submitted ? 'Check Your Inbox' : 'Forgot Password?'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {submitted
              ? 'Password reset instructions have been dispatched'
              : 'Enter your registered email to receive a password reset link'}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="rm-form-label">Registered Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="rm-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  id="forgot-email"
                  autoComplete="email"
                  required
                />
                <BsEnvelopeFill style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={loading || !email.trim()}
              id="send-reset-btn"
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                'Send Password Reset Link'
              )}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.12)', color: 'var(--rm-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>
              <BsCheckCircleFill />
            </div>

            <h5 style={{ fontWeight: 700, marginBottom: 8, fontSize: '1.05rem' }}>Instructions Sent!</h5>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              If an account with <strong>{email}</strong> exists in our system, we have sent a secure password reset link to your email address.
            </p>

            <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20, textAlign: 'left', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>💡 Next steps:</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                <li>Open your email inbox and look for <strong>"RoomMates - Reset Your Password"</strong>.</li>
                <li>Check your <strong>Spam / Junk</strong> folder if you don't see it within a minute.</li>
                <li>Click the reset link in the email (valid for 15 minutes).</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleResend}
                className="btn-rm-outline"
                disabled={cooldown > 0 || loading}
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.82rem' }}
              >
                {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend Reset Email'}
              </button>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', marginTop: 4 }}
              >
                Try a different email address
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <Link to="/login" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--rm-blue)', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <BsArrowLeft size={12} /> Back to Sign In
          </Link>
        </div>

        <div style={{ marginTop: 16, background: 'var(--rm-blue-pale)', borderRadius: 10, padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BsShieldLockFill color="var(--rm-blue)" />
          <span>Single-use 256-bit encrypted token security</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
