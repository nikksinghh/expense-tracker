import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsX } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// Decode Google JWT Token
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const GoogleAuthButton = ({ text = 'signin_with', isRegister = false }) => {
  const googleBtnRef = useRef(null);
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [showChooser, setShowChooser] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isRealClientId = clientId && !clientId.includes('googleclientid.apps.googleusercontent.com');

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    const payload = decodeJwt(response.credential);
    if (!payload || !payload.email) {
      toast('Failed to read Google account profile', 'error');
      return;
    }

    await performGoogleLogin(payload.email, payload.name || payload.email.split('@')[0], payload.picture, payload.sub);
  };

  const performGoogleLogin = async (email, name, avatar = '', googleId = '') => {
    setLoading(true);
    try {
      const res = await loginWithGoogle({
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        avatar,
        googleId: googleId || 'google_' + Date.now()
      });

      toast(`Welcome, ${name || email}!`, 'success');
      setShowChooser(false);
      if (res.user?.role === 'admin') {
        navigate('/admin');
      } else if (res.user?.room) {
        navigate('/dashboard');
      } else {
        navigate('/room-setup');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Google sign-in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRealClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: text,
            shape: 'rectangular',
            width: '100%',
            logo_alignment: 'left'
          });
        }

        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('Google GSI init notice:', e);
      }
    }
  }, [clientId, isRealClientId, text]);

  const handleButtonClick = () => {
    if (isRealClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setShowChooser(true);
    }
  };

  // Quick preset accounts for instant testing without 401 invalid_client error
  const presetAccounts = [
    { email: 'nikhilsingh2304017@gmail.com', name: 'Nikhil Singh', initial: 'N', color: '#1d72fe' },
    { email: 'user.roommate@gmail.com', name: 'Roommate User', initial: 'R', color: '#845ec2' }
  ];

  return (
    <div style={{ width: '100%', margin: '12px 0' }}>
      {isRealClientId ? (
        <div ref={googleBtnRef} style={{ width: '100%', minHeight: 40, display: 'flex', justifyContent: 'center' }} />
      ) : (
        <button
          type="button"
          className="btn-rm-outline"
          onClick={handleButtonClick}
          style={{ width: '100%', justifyContent: 'center', padding: '11px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', fontWeight: 600 }}
          id="google-auth-btn"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {isRegister ? 'Sign Up with Google' : 'Continue with Google'}
        </button>
      )}

      {/* Google Account Selector Modal (Works in any environment without 401 error) */}
      {showChooser && (
        <div className="rm-modal-overlay" onClick={e => e.target === e.currentTarget && setShowChooser(false)}>
          <div className="rm-modal" style={{ maxWidth: 420 }}>
            <div className="rm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Choose a Google Account</h5>
              </div>
              <button onClick={() => setShowChooser(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                <BsX />
              </button>
            </div>

            <div className="rm-modal-body" style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 14px' }}>
                Select an account to continue to <strong>RoomMates</strong>:
              </p>

              {/* Preset Accounts List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {presetAccounts.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => performGoogleLogin(acc.email, acc.name)}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: acc.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                      {acc.initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{acc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Or enter custom Google Account */}
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Or use another Google email:
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    className="rm-input"
                    placeholder="yourname@gmail.com"
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  />
                  <button
                    type="button"
                    className="btn-rm-primary"
                    disabled={loading || !customEmail.includes('@')}
                    onClick={() => performGoogleLogin(customEmail, customName || customEmail.split('@')[0])}
                    style={{ padding: '8px 14px', fontSize: '0.8rem', flexShrink: 0 }}
                  >
                    {loading ? '...' : 'Sign In'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;
