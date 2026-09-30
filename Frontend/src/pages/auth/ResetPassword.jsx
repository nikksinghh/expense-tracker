import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BsHouseFill, BsEyeFill, BsEyeSlashFill, BsArrowRight } from 'react-icons/bs';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) return toast('Password must be at least 6 characters', 'warning');
    if (form.password !== form.confirm) return toast('Passwords do not match', 'warning');
    setLoading(true);
    try {
      await api.put(`/api/auth/reset-password/${token}`, { password: form.password });
      setDone(true);
      toast('Password reset successfully! Please login.', 'success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast(err.response?.data?.message || 'Invalid or expired reset link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card">
        <div className="rm-auth-logo">
          <div className="logo-circle"><BsHouseFill /></div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Reset Password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Enter your new password below</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h5 style={{ fontWeight: 700 }}>Password Reset!</h5>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label className="rm-form-label">New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} className="rm-input"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <BsEyeSlashFill /> : <BsEyeFill />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="rm-form-label">Confirm Password *</label>
              <input
                type="password" className="rm-input"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              />
              {form.password && form.confirm && form.password !== form.confirm && (
                <div style={{ color: 'var(--rm-red)', fontSize: '0.72rem', marginTop: 4 }}>⚠️ Passwords don't match</div>
              )}
            </div>
            <button type="submit" className="btn-rm-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading || !form.password || !form.confirm}>
              {loading ? <span className="spinner" /> : <><span>Reset Password</span><BsArrowRight /></>}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--rm-blue)' }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
