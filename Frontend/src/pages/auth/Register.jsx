import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BsHouseFill, BsEyeFill, BsEyeSlashFill, BsArrowRight, BsCheckLg, BsXLg } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const PasswordStrength = ({ password }) => {
  const [strength, setStrength] = useState(null);

  useEffect(() => {
    if (!password) { setStrength(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/api/auth/check-password', { password });
        setStrength(res.data);
      } catch { /* silent */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [password]);

  if (!strength || !password) return null;

  const colors = { 'Very Weak': '#ef4444', 'Too Common': '#ef4444', 'Weak': '#f97316', 'Medium': '#eab308', 'Strong': '#22c55e', 'Very Strong': '#00c9a7' };
  const widths = { 'Very Weak': 20, 'Too Common': 10, 'Weak': 40, 'Medium': 60, 'Strong': 80, 'Very Strong': 100 };
  const c = colors[strength.label] || '#718096';

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Password strength</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: c }}>{strength.label}</span>
      </div>
      <div style={{ height: 4, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${widths[strength.label] || 20}%`, background: c, transition: 'width 0.4s ease, background 0.3s ease', borderRadius: 4 }} />
      </div>
      {strength.suggestions?.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {strength.suggestions.slice(0, 2).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: 'var(--rm-orange)', marginTop: 2 }}>
              <BsXLg size={8} /> {s}
            </div>
          ))}
        </div>
      )}
      {strength.score >= 4 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: 'var(--rm-green)', marginTop: 4 }}>
          <BsCheckLg size={8} /> Strong password!
        </div>
      )}
    </div>
  );
};

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', upiId: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast('Name, email, and password are required', 'warning');
    if (form.password.length < 6) return toast('Password must be at least 6 characters', 'warning');
    setLoading(true);
    try {
      await register(form);
      toast('Account created successfully! 🎉', 'success', 'Welcome!');
      navigate('/room-setup');
    } catch (err) {
      toast(err.response?.data?.message || 'Registration failed', 'error', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card" style={{ maxWidth: 480 }}>
        <div className="rm-auth-logo">
          <div className="logo-circle"><BsHouseFill /></div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Create account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Start tracking shared expenses today</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="rm-form-label">Full Name *</label>
              <input className="rm-input" placeholder="Nikhil Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} id="reg-name" />
            </div>
            <div>
              <label className="rm-form-label">Phone</label>
              <input className="rm-input" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} id="reg-phone" />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="rm-form-label">Email *</label>
            <input type="email" className="rm-input" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} id="reg-email" autoComplete="email" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="rm-form-label">UPI ID (for payments)</label>
            <input className="rm-input" placeholder="name@upi or name@paytm" value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} id="reg-upi" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="rm-form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} className="rm-input"
                placeholder="Min 6 characters (use uppercase, numbers, symbols)"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                id="reg-password" style={{ paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPw ? <BsEyeSlashFill /> : <BsEyeFill />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>

          <button type="submit" className="btn-rm-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} id="reg-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : <><span>Create Account</span><BsArrowRight /></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        </div>

        {/* Google Signup Button */}
        <button
          type="button"
          className="btn-rm-outline"
          style={{ width: '100%', justifyContent: 'center', padding: '11px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', fontWeight: 600 }}
          onClick={async () => {
            const googleEmail = window.prompt("Enter your Google Account Email for instant sign up:");
            if (!googleEmail || !googleEmail.trim()) return;
            try {
              setLoading(true);
              const name = form.name.trim() || googleEmail.split('@')[0].replace(/[._]/g, ' ');
              const res = await loginWithGoogle({ email: googleEmail.trim(), name, phone: form.phone, upiId: form.upiId });
              toast('Signed up successfully with Google!', 'success');
              if (res.user?.role === 'admin') navigate('/admin');
              else navigate('/room-setup');
            } catch (err) {
              toast(err.response?.data?.message || 'Google sign-up failed', 'error');
            } finally {
              setLoading(false);
            }
          }}
          id="google-reg-btn"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign Up with Google
        </button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
