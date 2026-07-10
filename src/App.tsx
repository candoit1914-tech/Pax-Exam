import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';

const LoginScreen = lazy(() => import('./screens/Login').then(m => ({ default: m.LoginScreen })));
const DashboardScreen = lazy(() => import('./screens/Dashboard').then(m => ({ default: m.DashboardScreen })));
const StudentsScreen = lazy(() => import('./screens/Students').then(m => ({ default: m.StudentsScreen })));
const ClassesSubjectsScreen = lazy(() => import('./screens/ClassesSubjects').then(m => ({ default: m.ClassesSubjectsScreen })));
const ScoreEntryScreen = lazy(() => import('./screens/Scores').then(m => ({ default: m.ScoreEntryScreen })));
const ReportsScreen = lazy(() => import('./screens/Reports').then(m => ({ default: m.ReportsScreen })));
const SettingsScreen = lazy(() => import('./screens/Settings').then(m => ({ default: m.SettingsScreen })));
const TeacherManagementScreen = lazy(() => import('./screens/TeacherManagement').then(m => ({ default: m.TeacherManagementScreen })));
const StudentPortalScreen = lazy(() => import('./screens/StudentPortal').then(m => ({ default: m.StudentPortalScreen })));

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

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-500 text-sm font-medium">Loading...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Redirect to="/login" />} />
            <Route path="login" element={<Suspense fallback={<LoadingFallback />}><LoginScreen /></Suspense>} />
            <Route path="student-portal" element={<Suspense fallback={<LoadingFallback />}><StudentPortalScreen /></Suspense>} />
            <Route path="dashboard" element={<AdminRoute><Suspense fallback={<LoadingFallback />}><DashboardScreen /></Suspense></AdminRoute>} />
            <Route path="students" element={<AdminRoute><Suspense fallback={<LoadingFallback />}><StudentsScreen /></Suspense></AdminRoute>} />
            <Route path="classes" element={<AdminRoute><Suspense fallback={<LoadingFallback />}><ClassesSubjectsScreen /></Suspense></AdminRoute>} />
            <Route path="scores" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><ScoreEntryScreen /></Suspense></ProtectedRoute>} />
            <Route path="reports" element={<AdminRoute><Suspense fallback={<LoadingFallback />}><ReportsScreen /></Suspense></AdminRoute>} />
            <Route path="teachers" element={<AdminRoute><Suspense fallback={<LoadingFallback />}><TeacherManagementScreen /></Suspense></AdminRoute>} />
            <Route path="settings" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><SettingsScreen /></Suspense></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

