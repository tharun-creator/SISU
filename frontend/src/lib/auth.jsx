import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('sisu_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sisu_token');
    if (token) {
      setLoading(true);
      api.me()
        .then((u) => {
          setUser(u);
          localStorage.setItem('sisu_user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('sisu_token');
          localStorage.removeItem('sisu_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrPayload, password) => {
    const payload = typeof emailOrPayload === 'string' ? { email: emailOrPayload, password } : emailOrPayload;
    const res = await api.login(payload);
    localStorage.setItem('sisu_token', res.access_token);
    localStorage.setItem('sisu_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (data) => {
    const res = await api.register(data);
    localStorage.setItem('sisu_token', res.access_token);
    localStorage.setItem('sisu_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('sisu_token');
    localStorage.removeItem('sisu_user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('sisu_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin: user?.role?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'tharunriot@gmail.com' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Kavivanar', cursive", color: 'var(--color-text-secondary)', fontSize: '24px', margin: 0 }}>வாழ்க வளமுடன். நற்பவி.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  if (adminOnly && !isAdmin) {
    window.location.href = '/';
    return null;
  }

  return children;
}
