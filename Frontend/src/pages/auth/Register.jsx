import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BsHouseFill, BsEyeFill, BsEyeSlashFill, BsArrowRight } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', upiId: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim();
    if (!cleanName || !cleanEmail || !form.password) return toast('Name, email, and password are required', 'warning');
    if (form.password.length < 6) return toast('Password must be at least 6 characters', 'warning');
    setLoading(true);
    try {
      await register({
        ...form,
        name: cleanName,
        email: cleanEmail,
        phone: form.phone?.trim() || '',
        upiId: form.upiId?.trim() || ''
      });
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
            <input className="rm-input" placeholder="name@upi" value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} id="reg-upi" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="rm-form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="rm-input"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                id="reg-password"
                style={{ paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPw ? <BsEyeSlashFill /> : <BsEyeFill />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-rm-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} id="reg-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : <><span>Create Account</span><BsArrowRight /></>}
          </button>
        </form>

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
