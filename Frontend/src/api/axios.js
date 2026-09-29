import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://expense-tracker-41hn.onrender.com');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach token from localStorage for mobile & cross-origin support
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: auto-redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rm_token');
      const event = new CustomEvent('rm:unauthorized');
      window.dispatchEvent(event);
    }
    return Promise.reject(error);
  }
);

export default api;
