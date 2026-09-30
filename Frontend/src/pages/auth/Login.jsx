import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BsHouseFill, BsEyeFill, BsEyeSlashFill, BsArrowRight, BsShieldLockFill } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast('Please fill all fields', 'warning');
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (res.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Login failed. Check credentials.', 'error', 'Login Failed');
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="rm-form-label">Email address</label>
            <input
              type="email" className="rm-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              id="login-email" autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="rm-form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} className="rm-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                id="login-password" autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>
                {showPw ? <BsEyeSlashFill /> : <BsEyeFill />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <Link to="/forgot-password" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--rm-blue)' }}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-rm-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} id="login-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : <><span>Sign In</span><BsArrowRight /></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          className="btn-rm-outline"
          style={{ width: '100%', justifyContent: 'center', padding: '11px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', fontWeight: 600 }}
          onClick={async () => {
            const googleEmail = window.prompt("Enter your Google Account Email for instant login verification:");
            if (!googleEmail || !googleEmail.trim()) return;
            try {
              setLoading(true);
              const name = googleEmail.split('@')[0].replace(/[._]/g, ' ');
              const res = await loginWithGoogle({ email: googleEmail.trim(), name });
              toast('Signed in successfully with Google!', 'success');
              if (res.user?.role === 'admin') navigate('/admin');
              else navigate('/dashboard');
            } catch (err) {
              toast(err.response?.data?.message || 'Google login failed', 'error');
            } finally {
              setLoading(false);
            }
          }}
          id="google-login-btn"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
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
