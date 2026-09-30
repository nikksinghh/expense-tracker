import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('rm_token');
    if (!token) {
      setUser(null);
      setRoom(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
      // Always try to fetch room — fetchRoom silently handles 404
      await fetchRoom();
    } catch {
      localStorage.removeItem('rm_token');
      setUser(null);
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoom = async () => {
    try {
      // Backend route is /api/rooms/current
      const res = await api.get('/api/rooms/current');
      setRoom(res.data.room);
    } catch {
      setRoom(null);
    }
  };

  useEffect(() => {
    fetchMe();
    const onUnauth = () => {
      localStorage.removeItem('rm_token');
      setUser(null);
      setRoom(null);
    };
    window.addEventListener('rm:unauthorized', onUnauth);
    return () => window.removeEventListener('rm:unauthorized', onUnauth);
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('rm_token', res.data.token);
    }
    setUser(res.data.user);
    // Always fetch room after login
    await fetchRoom();
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/api/auth/register', data);
    if (res.data.token) {
      localStorage.setItem('rm_token', res.data.token);
    }
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* silent */
    }
    localStorage.removeItem('rm_token');
    setUser(null);
    setRoom(null);
  };

  const loginWithGoogle = async (googleData) => {
    const res = await api.post('/api/auth/google', googleData);
    if (res.data.token) {
      localStorage.setItem('rm_token', res.data.token);
    }
    setUser(res.data.user);
    await fetchRoom();
    return res.data;
  };

  const updateUser = (u) => setUser(u);
  const updateRoom = (r) => setRoom(r);
  const refreshRoom = fetchRoom;

  return (
    <AuthContext.Provider value={{ user, room, loading, login, loginWithGoogle, register, logout, updateUser, updateRoom, refreshRoom }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
