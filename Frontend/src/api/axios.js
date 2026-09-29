import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor: auto-redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const event = new CustomEvent('rm:unauthorized');
      window.dispatchEvent(event);
    }
    return Promise.reject(error);
  }
);

export default api;
