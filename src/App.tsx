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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated && localStorage.getItem('auth') !== 'true') {
    return <Navigate to="/login" replace />;
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
            <Route path="dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
            <Route path="students" element={<ProtectedRoute><StudentsScreen /></ProtectedRoute>} />
            <Route path="classes" element={<ProtectedRoute><ClassesSubjectsScreen /></ProtectedRoute>} />
            <Route path="scores" element={<ProtectedRoute><ScoreEntryScreen /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute><ReportsScreen /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

