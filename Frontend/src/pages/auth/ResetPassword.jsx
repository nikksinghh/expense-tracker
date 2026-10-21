import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  BsShieldLockFill,
  BsEyeFill,
  BsEyeSlashFill,
  BsArrowRight,
  BsCheckCircleFill,
  BsXLg,
  BsCheckLg
} from 'react-icons/bs';
import confetti from 'canvas-confetti';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import ErrorAlert from '../../components/Common/ErrorAlert';

const ResetPassword = () => {
  const { token: paramToken } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const queryToken = new URLSearchParams(location.search).get('token') || '';
  const token = paramToken || queryToken;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [strength, setStrength] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(!token ? 'Password reset token is missing. Please request a new link.' : null);

  useEffect(() => {
    if (!password) { setStrength(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/api/auth/check-password', { password });
        setStrength(res.data);
      } catch { /* silent */ }
    }, 350);
    return () => clearTimeout(timer);
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Please request a fresh reset link.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Please fill all password fields.');
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Backend supports PUT /api/auth/reset-password/:token
      await api.put(`/api/auth/reset-password/${encodeURIComponent(token)}`, { password });
      setIsSuccess(true);
      try {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      } catch { /* silent */ }
      toast('Password reset successfully! Pre-existing sessions revoked.', 'success', 'Password Updated');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Password reset failed. Token may be expired or already used.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const colors = { 'Very Weak': '#ef4444', 'Too Common': '#ef4444', 'Weak': '#f97316', 'Medium': '#eab308', 'Strong': '#22c55e', 'Very Strong': '#00c9a7' };
  const widths = { 'Very Weak': 20, 'Too Common': 10, 'Weak': 40, 'Medium': 60, 'Strong': 80, 'Very Strong': 100 };
  const strengthColor = strength ? colors[strength.label] || '#718096' : '#718096';

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card" style={{ maxWidth: 460 }}>
        <div className="rm-auth-logo">
          <div
            className="logo-circle"
            style={{
              background: isSuccess
                ? 'linear-gradient(135deg, var(--rm-green, #22c55e), #15803d)'
                : 'linear-gradient(135deg, var(--rm-blue, #1d72fe), var(--rm-navy, #0f2057))'
            }}
          >
            {isSuccess ? <BsCheckCircleFill /> : <BsShieldLockFill />}
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 4 }}>
            {isSuccess ? 'Password Reset!' : 'Set new password'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {isSuccess
              ? 'Your password has been changed. Redirecting to login...'
              : 'Choose a strong new password for your account'}
          </p>
        </div>

        {/* Inline Error Section */}
        <ErrorAlert
          error={error}
          onClear={() => setError(null)}
          actionText={error?.includes('token') || error?.includes('expired') ? 'Request new link' : undefined}
          onAction={() => navigate('/forgot-password')}
        />

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Link
              to="/login"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              <span>Continue to Sign In</span>
              <BsArrowRight />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="rm-form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="rm-input"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="reset-new-password"
                  style={{ paddingRight: 42 }}
                  autoComplete="new-password"
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  {showPw ? <BsEyeSlashFill /> : <BsEyeFill />}
                </button>
              </div>

              {/* Password strength indicator */}
              {strength && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Strength</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: strengthColor }}>{strength.label}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${widths[strength.label] || 20}%`,
                        background: strengthColor,
                        transition: 'width 0.3s ease',
                        borderRadius: 4
                      }}
                    />
                  </div>
                  {strength.suggestions?.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {strength.suggestions.slice(0, 1).map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: 'var(--rm-orange)' }}>
                          <BsXLg size={8} /> {s}
                        </div>
                      ))}
                    </div>
                  )}
                  {strength.score >= 4 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: 'var(--rm-green)', marginTop: 4 }}>
                      <BsCheckLg size={8} /> Good password!
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="rm-form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  className="rm-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  id="reset-confirm-password"
                  style={{ paddingRight: 42 }}
                  autoComplete="new-password"
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  {showConfirmPw ? <BsEyeSlashFill /> : <BsEyeFill />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={loading || !token}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <span>Reset & Revoke Old Sessions</span>
                  <BsArrowRight />
                </>
              )}
            </button>

            <div
              style={{
                marginTop: 18,
                background: 'var(--rm-blue-pale)',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <BsShieldLockFill color="var(--rm-blue)" />
              <span>For your security, resetting your password revokes all active sessions on other devices.</span>
            </div>

            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <Link
                to="/login"
                style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                ← Back to <span style={{ fontWeight: 700, color: 'var(--rm-blue)' }}>Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
