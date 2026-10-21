import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  BsEnvelopeCheckFill,
  BsShieldCheck,
  BsArrowRight,
  BsArrowRepeat,
  BsCheckCircleFill,
  BsLockFill,
  BsPencilSquare
} from 'react-icons/bs';
import confetti from 'canvas-confetti';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ErrorAlert from '../../components/Common/ErrorAlert';

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, verifyOtp, resendVerification } = useAuth();
  const toast = useToast();

  const queryParams = new URLSearchParams(location.search);
  const rawToken = queryParams.get('token') || '';
  const initialEmail = queryParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [linkVerifying, setLinkVerifying] = useState(Boolean(rawToken));

  const inputRefs = useRef([]);

  // Auto-verify if rawToken is present in URL
  useEffect(() => {
    if (!rawToken) return;

    const verifyToken = async () => {
      setLinkVerifying(true);
      setError(null);
      try {
        await verifyEmail(rawToken);
        setIsVerified(true);
        triggerCelebration();
        toast('Email successfully verified! You can now sign in.', 'success', 'Verified');
        setTimeout(() => navigate('/login'), 2500);
      } catch (err) {
        setError(err.response?.data?.message || 'Verification link is invalid or has expired.');
      } finally {
        setLinkVerifying(false);
      }
    };

    verifyToken();
  }, [rawToken, verifyEmail, navigate, toast]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      /* silent */
    }
  };

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean && value !== '') return;

    const newDigits = [...digits];
    newDigits[index] = clean.slice(-1);
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next input
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (clean && index === 5) {
      const fullCode = newDigits.slice(0, 5).join('') + clean.slice(-1);
      if (fullCode.length === 6) {
        submitOtp(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    const cleanNumbers = pasteData.replace(/\D/g, '').slice(0, 6);
    if (!cleanNumbers) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < cleanNumbers.length; i++) {
      newDigits[i] = cleanNumbers[i];
    }
    setDigits(newDigits);

    if (cleanNumbers.length === 6) {
      submitOtp(cleanNumbers);
    } else {
      inputRefs.current[cleanNumbers.length]?.focus();
    }
  };

  const submitOtp = async (codeToSubmit) => {
    const finalOtp = codeToSubmit || digits.join('');
    if (!email || !email.includes('@')) {
      setError('Please provide a valid registered email address.');
      setIsEditingEmail(true);
      return;
    }
    if (finalOtp.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyOtp(email.trim().toLowerCase(), finalOtp);
      setIsVerified(true);
      triggerCelebration();
      toast('Email verified successfully! 🎉', 'success', 'Confirmed');
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed. Please check the code.';
      setError(msg);
      // Clear OTP inputs on failure
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      setIsEditingEmail(true);
      return;
    }
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    try {
      await resendVerification(email.trim().toLowerCase());
      toast('A new verification code has been dispatched to your email!', 'info', 'Code Sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code. Please wait before retrying.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rm-auth-page">
      <div className="rm-auth-card" style={{ maxWidth: 460 }}>
        {/* Logo / Header */}
        <div className="rm-auth-logo">
          <div
            className="logo-circle"
            style={{
              background: isVerified
                ? 'linear-gradient(135deg, var(--rm-green, #22c55e), #15803d)'
                : 'linear-gradient(135deg, var(--rm-blue, #1d72fe), var(--rm-navy, #0f2057))'
            }}
          >
            {isVerified ? <BsCheckCircleFill /> : <BsEnvelopeCheckFill />}
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 4 }}>
            {isVerified ? 'Email Confirmed!' : 'Verify your email'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {isVerified
              ? 'Your account is ready. Redirecting to login...'
              : 'Enter the 6-digit code or click the link sent to your inbox'}
          </p>
        </div>

        {/* Error Section */}
        <ErrorAlert
          error={error}
          onClear={() => setError(null)}
          actionText={error?.includes('locked') ? 'Wait & retry' : undefined}
        />

        {linkVerifying ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', width: 36, height: 36 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
              Verifying your secure link...
            </p>
          </div>
        ) : isVerified ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--rm-green-light, #dcfce7)',
                color: 'var(--rm-green, #22c55e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '2rem'
              }}
            >
              <BsCheckCircleFill />
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Verification Complete
            </p>
            <Link
              to="/login"
              className="btn-rm-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            >
              <span>Continue to Sign In</span>
              <BsArrowRight />
            </Link>
          </div>
        ) : (
          <div>
            {/* Target Email Box */}
            <div
              style={{
                background: 'var(--bg-input, #f8faff)',
                border: '1px solid var(--border-color)',
                borderRadius: 14,
                padding: '10px 14px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}
            >
              {isEditingEmail ? (
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    className="rm-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email"
                    style={{ fontSize: '0.84rem', padding: '6px 10px' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-rm-primary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    onClick={() => {
                      if (email && email.includes('@')) setIsEditingEmail(false);
                    }}
                  >
                    Set
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Sent code to
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {email || 'No email specified'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--rm-blue)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <BsPencilSquare />
                    <span>Change</span>
                  </button>
                </>
              )}
            </div>

            {/* 6-Digit OTP Box Grid */}
            <form onSubmit={(e) => { e.preventDefault(); submitOtp(); }}>
              <label className="rm-form-label" style={{ textAlign: 'center', display: 'block', marginBottom: 12 }}>
                Enter 6-digit confirmation code
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 8,
                  marginBottom: 20
                }}
                onPaste={handlePaste}
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="rm-input"
                    style={{
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      padding: '10px 0',
                      borderRadius: 12,
                      borderColor: digit ? 'var(--rm-blue)' : undefined,
                      background: digit ? 'var(--rm-blue-pale)' : undefined
                    }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn-rm-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                disabled={loading || digits.join('').length !== 6}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <span>Verify Code</span>
                    <BsShieldCheck />
                  </>
                )}
              </button>
            </form>

            {/* Resend Cooldown Section */}
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                Didn't receive the email or code?
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: cooldown > 0 ? 'var(--text-muted)' : 'var(--rm-blue)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {resending ? (
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                ) : (
                  <BsArrowRepeat />
                )}
                <span>
                  {cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : 'Resend Verification Code'}
                </span>
              </button>
            </div>

            <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
              <Link
                to="/login"
                style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                ← Back to <span style={{ fontWeight: 700, color: 'var(--rm-blue)' }}>Sign In</span>
              </Link>
            </div>

            <div
              style={{
                marginTop: 16,
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
              <BsLockFill color="var(--rm-blue)" />
              <span>Codes expire in 10 minutes. 5 failed attempts locks verification for 15 minutes.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
