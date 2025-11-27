import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Students } from './pages/Students';
import { StrategicPlanning } from './pages/StrategicPlanning';
import { AppRoute } from './types';

// Guard for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={AppRoute.LOGIN} state={{ from: location }} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path={AppRoute.LOGIN} element={<Login />} />
      <Route path={AppRoute.REGISTER} element={<Register />} />
      
      <Route
        path={AppRoute.DASHBOARD}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={AppRoute.PROFILE}
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path={AppRoute.STUDENTS}
        element={
          <ProtectedRoute>
            <Students />
          </ProtectedRoute>
        }
      />
      <Route
        path={AppRoute.STRATEGY}
        element={
          <ProtectedRoute>
            <StrategicPlanning />
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route path="*" element={<Navigate to={AppRoute.LOGIN} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;