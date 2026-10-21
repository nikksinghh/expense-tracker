import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach token from localStorage for cross-domain requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-redirect to login on 401 for authenticated session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Don't trigger global logout when on auth pages attempting credentials or reset
      const isAuthAttempt =
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/register') ||
        url.includes('/api/auth/verify') ||
        url.includes('/api/auth/forgot-password') ||
        url.includes('/api/auth/reset-password');

      if (!isAuthAttempt) {
        localStorage.removeItem('rm_token');
        const event = new CustomEvent('rm:unauthorized');
        window.dispatchEvent(event);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
