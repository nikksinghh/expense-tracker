import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BsHouseFill, BsEyeFill, BsEyeSlashFill, BsArrowRight } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = form.email.trim();
    if (!cleanEmail || !form.password) return toast('Please fill all fields', 'warning');
    setLoading(true);
    try {
      await login(cleanEmail, form.password);
      navigate('/dashboard');
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
          <div className="logo-circle">
            <BsHouseFill />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Welcome back!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Sign in to your RoomMates account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="rm-form-label">Email address</label>
            <input
              type="email"
              className="rm-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              id="login-email"
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="rm-form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="rm-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                id="login-password"
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
              >
                {showPw ? <BsEyeSlashFill /> : <BsEyeFill />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-rm-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            id="login-btn"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <><span>Sign In</span><BsArrowRight /></>}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700 }}>Create one</Link>
          </p>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop: 16, background: 'var(--rm-blue-pale)', borderRadius: 12, padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--rm-blue)' }}>Demo:</strong> Register a new account to get started.
        </div>
      </div>
    </div>
  );
};

export default Login;
