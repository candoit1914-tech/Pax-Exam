import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { studentAuthService } from '../services/studentAuthService';

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  school_id: number;
  school_name?: string;
  student_id?: number;
  student_name?: string;
  class_name?: string;
  class_id?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginStudent: (loginCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  loginStudent: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const APP_VERSION = '2.0.0';

const APP_STORAGE_KEYS = ['accessToken', 'refreshToken', 'user', 'auth', 'appVersion', 'userType'];

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
    localStorage.setItem('userType', 'admin');
    setUser(data.user);
  }, []);

  const loginStudent = useCallback(async (loginCode: string) => {
    const data = await studentAuthService.login(loginCode);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('auth', 'true');
    localStorage.setItem('appVersion', APP_VERSION);
    localStorage.setItem('userType', 'student');
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const userType = localStorage.getItem('userType');
    if (userType === 'student') {
      await studentAuthService.logout();
    } else {
      await authService.logout();
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userType = localStorage.getItem('userType');
      let userData;
      if (userType === 'student') {
        userData = await studentAuthService.getMe();
      } else {
        userData = await authService.getMe();
      }
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
      loginStudent,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
