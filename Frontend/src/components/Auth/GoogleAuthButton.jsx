import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// Real Google OAuth Client ID provided for the RoomMates project
const DEFAULT_GOOGLE_CLIENT_ID = '142740479335-23ben0g6abeob15cbs8i1pdikekljna3.apps.googleusercontent.com';

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

const GoogleAuthButton = ({ isRegister = false }) => {
  const googleBtnContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();

  // Handle Google ID Token Response from GSI
  const handleCredentialResponse = async (response) => {
    if (!response?.credential) {
      toast('No credential received from Google.', 'error');
      return;
    }

    const payload = decodeGoogleJwt(response.credential);
    if (!payload || !payload.email) {
      toast('Failed to read Google account identity.', 'error');
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Ensure Google Identity Services script is present in DOM
    const loadGsiScript = () => {
      if (window.google?.accounts?.id) {
        setGsiLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setGsiLoaded(true);
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', () => setGsiLoaded(true));
        // Check periodically in case it already loaded
        const checkInterval = setInterval(() => {
          if (window.google?.accounts?.id) {
            setGsiLoaded(true);
            clearInterval(checkInterval);
          }
        }, 200);
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    };

    loadGsiScript();
  }, []);

  useEffect(() => {
    if (!gsiLoaded || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Render the official Google button inside our container if desired
      if (googleBtnContainerRef.current) {
        googleBtnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: isRegister ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          width: 320,
          logo_alignment: 'left'
        });
      }

      // Automatically display Google One-Tap for logged-in Chrome users
      window.google.accounts.id.prompt();
    } catch (err) {
      console.warn('Google GSI init notice:', err);
    }
  }, [gsiLoaded, clientId, isRegister]);

  // Click handler for our visible native RoomMates Google button
  const handleButtonClick = () => {
    if (loading) return;

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false
        });
        window.google.accounts.id.prompt();
      } catch {
        toast('Opening Google Authentication...', 'info');
      }
    } else {
      toast('Loading Google Sign-In service. Please tap again in a moment.', 'info');
    }
  };

  return (
    <div style={{ width: '100%', margin: '12px 0' }}>
      {/* 1. Styled, visible native button that ALWAYS renders cleanly */}
      <button
        type="button"
        className="btn-rm-outline"
        onClick={handleButtonClick}
        disabled={loading}
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.88rem',
          fontWeight: 600,
          position: 'relative',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
        id="google-signin-btn"
      >
        {loading ? (
          <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>{isRegister ? 'Sign Up with Google' : 'Continue with Google'}</span>
          </>
        )}
      </button>

      {/* 2. Hidden/Auxiliary GSI Mount Node for official GSI Button Overlay */}
      <div
        ref={googleBtnContainerRef}
        style={{
          display: 'none',
          justifyContent: 'center',
          marginTop: 6
        }}
      />
    </div>
  );
};

export default GoogleAuthButton;
