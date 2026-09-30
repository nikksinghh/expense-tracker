import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BsHouseFill, BsArrowLeft, BsEnvelopeFill, BsShieldLockFill, BsCheckCircleFill, BsKeyFill } from 'react-icons/bs';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Enter OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Step 1: Send OTP to email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) return toast('Please enter your email address', 'warning');
    
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim() });
      toast(res.data.message || 'OTP verification code sent to your email!', 'success');
      setStep(2);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to request OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) return toast('Please enter the valid 6-digit OTP from your email', 'warning');

    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', {
        email: email.trim(),
        otp: otp.trim()
      });

      toast('OTP verified successfully!', 'success');
      if (res.data.resetToken) {
        navigate(`/reset-password/${res.data.resetToken}`);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Invalid or expired OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card">
        <div className="rm-auth-logo">
          <div className="logo-circle"><BsHouseFill /></div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
            {step === 1 ? 'Forgot Password?' : 'Enter 6-Digit Email OTP'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {step === 1
              ? 'Enter your registered email to receive a secure OTP code'
              : `Check your inbox (${email}) for the 6-digit security code`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp}>
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
                  required
                />
                <BsEnvelopeFill style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={loading || !email}
              id="send-otp-btn"
            >
              {loading ? <span className="spinner" /> : 'Send 6-Digit Security OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ background: 'var(--rm-blue-pale)', border: '1px solid rgba(29,114,254,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <BsEnvelopeFill size={20} color="var(--rm-blue)" />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                We sent a 6-digit code to <strong>{email}</strong>. Please check your inbox / spam folder.
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="rm-form-label">Enter 6-Digit Code</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={6}
                  className="rm-input"
                  placeholder="••••••"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ paddingLeft: 40, letterSpacing: 6, fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                  id="otp-input"
                  required
                />
                <BsShieldLockFill style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: 12 }}
              disabled={loading || otp.length !== 6}
              id="verify-otp-btn"
            >
              {loading ? <span className="spinner" /> : 'Verify OTP & Set Password'}
            </button>

            <button
              type="button"
              className="btn-rm-outline"
              style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '0.78rem' }}
              onClick={() => { setStep(1); setOtp(''); }}
            >
              Change Email
            </button>
          </form>
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
