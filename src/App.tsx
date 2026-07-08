import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  if (isLoading) return null;
  if (!isAuthenticated && localStorage.getItem('auth') !== 'true') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated && localStorage.getItem('auth') !== 'true') {
    return <Navigate to="/login" replace />;
  }
  const role = user?.role || JSON.parse(localStorage.getItem('user') || '{}').role;
  if (role !== 'super_admin' && role !== 'school_admin') {
    return <Navigate to="/scores" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<LoginScreen />} />
            <Route path="student-portal" element={<StudentPortalScreen />} />
            <Route path="dashboard" element={<AdminRoute><DashboardScreen /></AdminRoute>} />
            <Route path="students" element={<AdminRoute><StudentsScreen /></AdminRoute>} />
            <Route path="classes" element={<AdminRoute><ClassesSubjectsScreen /></AdminRoute>} />
            <Route path="scores" element={<ProtectedRoute><ScoreEntryScreen /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute><ReportsScreen /></ProtectedRoute>} />
            <Route path="teachers" element={<AdminRoute><TeacherManagementScreen /></AdminRoute>} />
            <Route path="settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

