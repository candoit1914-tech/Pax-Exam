import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/Login';
import { DashboardScreen } from './screens/Dashboard';
import { StudentsScreen } from './screens/Students';
import { ClassesSubjectsScreen } from './screens/ClassesSubjects';
import { ScoreEntryScreen } from './screens/Scores';
import { ReportsScreen } from './screens/Reports';
import { SettingsScreen } from './screens/Settings';
import { TeacherManagementScreen } from './screens/TeacherManagement';
import { StudentPortalScreen } from './screens/StudentPortal';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && localStorage.getItem('auth') !== 'true') {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);
  if (isLoading) return null;
  return <>{children}</>;
};

const Redirect = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && localStorage.getItem('auth') !== 'true') {
      navigate('/login', { replace: true });
      return;
    }
    const role = user?.role || JSON.parse(localStorage.getItem('user') || '{}').role;
    if (role !== 'super_admin' && role !== 'school_admin') {
      navigate('/scores', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);
  if (isLoading) return null;
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Redirect to="/login" />} />
            <Route path="login" element={<LoginScreen />} />
            <Route path="student-portal" element={<StudentPortalScreen />} />
            <Route path="dashboard" element={<AdminRoute><DashboardScreen /></AdminRoute>} />
            <Route path="students" element={<AdminRoute><StudentsScreen /></AdminRoute>} />
            <Route path="classes" element={<AdminRoute><ClassesSubjectsScreen /></AdminRoute>} />
            <Route path="scores" element={<ProtectedRoute><ScoreEntryScreen /></ProtectedRoute>} />
            <Route path="reports" element={<AdminRoute><ReportsScreen /></AdminRoute>} />
            <Route path="teachers" element={<AdminRoute><TeacherManagementScreen /></AdminRoute>} />
            <Route path="settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

