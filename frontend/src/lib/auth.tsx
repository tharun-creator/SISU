import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrPayload: any, password?: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => void;
  updateUser: (updated: User) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('sisu_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sisu_token');
    if (token) {
      setLoading(true);
      client.get('/auth/me')
        .then((res: any) => {
          setUser(res);
          localStorage.setItem('sisu_user', JSON.stringify(res));
        })
        .catch(() => {
          localStorage.removeItem('sisu_token');
          localStorage.removeItem('sisu_refresh_token');
          localStorage.removeItem('sisu_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrPayload: any, password?: string) => {
    const payload = typeof emailOrPayload === 'string' ? { email: emailOrPayload, password } : emailOrPayload;
    // client returns inner data due to interceptor
    const res: any = await client.post('/auth/login', payload);
    localStorage.setItem('sisu_token', res.access_token);
    localStorage.setItem('sisu_refresh_token', res.refresh_token);
    localStorage.setItem('sisu_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user as User;
  };

  const register = async (payload: any) => {
    const res: any = await client.post('/auth/register', payload);
    // Registration might require verification, check if token is returned
    if (res.access_token) {
      localStorage.setItem('sisu_token', res.access_token);
      localStorage.setItem('sisu_refresh_token', res.refresh_token);
      localStorage.setItem('sisu_user', JSON.stringify(res.user));
      setUser(res.user);
      return res.user as User;
    }
    return res.user as User;
  };

  const logout = () => {
    localStorage.removeItem('sisu_token');
    localStorage.removeItem('sisu_refresh_token');
    localStorage.removeItem('sisu_user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updated: User) => {
    localStorage.setItem('sisu_user', JSON.stringify(updated));
    setUser(updated);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface PrivateRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-2.5 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-heading font-semibold text-slate-600 text-lg">Loading SISU...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  const isProfileIncomplete = !user.phone || !user.company || user.phone === 'N/A' || user.company === 'N/A';
  
  if (isProfileIncomplete && window.location.pathname !== '/setup-profile') {
    window.location.href = '/setup-profile';
    return null;
  }

  if (!isProfileIncomplete && window.location.pathname === '/setup-profile') {
    window.location.href = '/';
    return null;
  }

  if (adminOnly && !isAdmin) {
    window.location.href = '/';
    return null;
  }

  return <>{children}</>;
};
