import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BsHouseFill, BsEyeFill, BsEyeSlashFill, BsArrowRight, BsShieldLockFill } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import GoogleAuthButton from '../../components/Auth/GoogleAuthButton';
import ErrorAlert from '../../components/Common/ErrorAlert';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast('Please fill all fields', 'warning');
    setLoading(true);
    setError(null);
    try {
      const res = await login(form.email, form.password);
      if (res.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errData = err.response?.data;
      const isUnverified = errData?.code === 'EMAIL_NOT_VERIFIED';
      const msg = errData?.message || 'Login failed. Please check your credentials.';

      setError({
        message: msg,
        code: errData?.code,
        isUnverified
      });
      toast(msg, isUnverified ? 'warning' : 'error', isUnverified ? 'Verification Required' : 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card">
        <div className="rm-auth-logo">
          <div className="logo-circle"><BsHouseFill /></div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Welcome back!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Sign in to your RoomMates account</p>
        </div>

        {/* Actionable Error Section */}
        <ErrorAlert
          error={error}
          type={error?.isUnverified ? 'warning' : 'error'}
          onClear={() => setError(null)}
          actionText={error?.isUnverified ? 'Verify Email Now' : undefined}
          onAction={() => {
            if (error?.isUnverified) {
              navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
            }
          }}
        />

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="rm-form-label">Email address</label>
            <input
              type="email" className="rm-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); if (error) setError(null); }}
              id="login-email" autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="rm-form-label" style={{ margin: 0 }}>Password</label>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.76rem', color: 'var(--rm-blue)', fontWeight: 600, textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} className="rm-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); if (error) setError(null); }}
                id="login-password" autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>
                {showPw ? <BsEyeSlashFill /> : <BsEyeFill />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-rm-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} id="login-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : <><span>Sign In</span><BsArrowRight /></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        </div>

        {/* Google One-Tap & Sign In */}
        <GoogleAuthButton text="signin_with" />

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700 }}>Create one</Link>
          </p>
        </div>

        <div style={{ marginTop: 16, background: 'var(--rm-blue-pale)', borderRadius: 12, padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BsShieldLockFill color="var(--rm-blue)" />
          <span>Your data is secured with bcrypt password hashing</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
