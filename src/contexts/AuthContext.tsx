import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  school_id: number;
  school_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const APP_VERSION = '2.0.0';

const APP_STORAGE_KEYS = ['accessToken', 'refreshToken', 'user', 'auth', 'appVersion'];

function clearAppStorage() {
  APP_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedVersion = localStorage.getItem('appVersion');
        if (storedVersion !== APP_VERSION) {
          clearAppStorage();
          localStorage.setItem('appVersion', APP_VERSION);
          return;
        }

        const raw = localStorage.getItem('user');
        if (raw) {
          const user = JSON.parse(raw);
          setUser(user);
        }
      } catch (e) {
        console.error(e);
        clearAppStorage();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.login(email, password);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('auth', 'true');
    localStorage.setItem('appVersion', APP_VERSION);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      await logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
