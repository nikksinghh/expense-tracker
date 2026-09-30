import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// Safe Client-side JWT Decoder for Google ID Tokens
const decodeGoogleJwt = (token) => {
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
  const [isConfigured, setIsConfigured] = useState(false);
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    const payload = decodeGoogleJwt(response.credential);
    if (!payload || !payload.email) {
      toast('Failed to parse Google account information.', 'error');
      return;
    }

    try {
      const res = await loginWithGoogle({
        credential: response.credential,
        email: payload.email,
        name: payload.name || payload.given_name || payload.email.split('@')[0],
        avatar: payload.picture || '',
        googleId: payload.sub
      });

      toast(`Welcome, ${payload.name || payload.email}!`, 'success');
      if (res.user?.role === 'admin') {
        navigate('/admin');
      } else if (res.user?.room) {
        navigate('/dashboard');
      } else {
        navigate('/room-setup');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Google authentication failed. Please try again.', 'error');
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isRealClientId = clientId && clientId.trim() !== '' && !clientId.includes('your_google_client_id') && !clientId.includes('1048293849182-googleclientid');

    if (!isRealClientId) {
      setIsConfigured(false);
      return;
    }

    setIsConfigured(true);

    const initGoogleGSI = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId.trim(),
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

          // Trigger Google One-Tap account chooser for signed-in Chrome users
          window.google.accounts.id.prompt();
        } catch (e) {
          console.warn('Google GSI initialization notice:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleGSI();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleGSI();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [text]);

  const handleManualClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isRealClientId = clientId && clientId.trim() !== '' && !clientId.includes('your_google_client_id') && !clientId.includes('1048293849182-googleclientid');

    if (!isRealClientId) {
      toast('Google Sign-In setup: Add your VITE_GOOGLE_CLIENT_ID to your environment variables (Vercel / .env).', 'warning');
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast('Connecting to Google Identity Services...', 'info');
    }
  };

  return (
    <div style={{ width: '100%', margin: '12px 0' }}>
      {isConfigured ? (
        <div ref={googleBtnRef} style={{ width: '100%', minHeight: 42, display: 'flex', justifyContent: 'center' }} />
      ) : (
        <button
          type="button"
          className="btn-rm-outline"
          onClick={handleManualClick}
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
    </div>
  );
};

export default GoogleAuthButton;
