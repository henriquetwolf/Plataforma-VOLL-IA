
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
import { Instructors } from './pages/Instructors';
import { StrategicPlanning } from './pages/StrategicPlanning';
import { FinancialAgent } from './pages/FinancialAgent';
import { PricingAgent } from './pages/PricingAgent';
import { RehabAgent } from './pages/RehabAgent';
import { AdminPanel } from './pages/AdminPanel';
import { Settings } from './pages/Settings'; // Nova Importação
import { InstructorWelcome } from './pages/InstructorWelcome';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentRecipes } from './pages/student/StudentRecipes';
import { StudentWorkout } from './pages/student/StudentWorkout';
import { StudentSuggestions } from './pages/student/StudentSuggestions';
import { StudentNewsletters } from './pages/student/StudentNewsletters';
import { InstructorNewsletters } from './pages/instructor/InstructorNewsletters';
import { NewsletterAgent } from './pages/NewsletterAgent';
import { StudioSuggestions } from './pages/StudioSuggestions';
import { AppRoute } from './types';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
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

  if (adminOnly && user?.email !== ADMIN_EMAIL) {
    return <Navigate to={AppRoute.DASHBOARD} replace />;
  }

  if (user?.email === ADMIN_EMAIL && !location.pathname.startsWith(AppRoute.ADMIN)) {
     return <Navigate to={AppRoute.ADMIN} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path={AppRoute.LOGIN} element={<Login />} />
      <Route path={AppRoute.REGISTER} element={<Register />} />
      <Route path={AppRoute.INSTRUCTOR_WELCOME} element={<InstructorWelcome />} />
      
      {/* Rotas do Studio / Instrutor */}
      <Route path={AppRoute.DASHBOARD} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path={AppRoute.PROFILE} element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path={AppRoute.STUDENTS} element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path={AppRoute.INSTRUCTORS} element={<ProtectedRoute><Instructors /></ProtectedRoute>} />
      <Route path={AppRoute.STRATEGY} element={<ProtectedRoute><StrategicPlanning /></ProtectedRoute>} />
      <Route path={AppRoute.FINANCE} element={<ProtectedRoute><FinancialAgent /></ProtectedRoute>} />
      <Route path={AppRoute.PRICING} element={<ProtectedRoute><PricingAgent /></ProtectedRoute>} />
      <Route path={AppRoute.REHAB} element={<ProtectedRoute><RehabAgent /></ProtectedRoute>} />
      <Route path={AppRoute.STUDIO_SUGGESTIONS} element={<ProtectedRoute><StudioSuggestions /></ProtectedRoute>} />
      
      {/* Nova Rota: Settings */}
      <Route path={AppRoute.SETTINGS} element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
      {/* Nova Rota: Agente de Newsletter (Dono) */}
      <Route path={AppRoute.NEWSLETTER_AGENT} element={<ProtectedRoute><NewsletterAgent /></ProtectedRoute>} />
      
      {/* Nova Rota: Newsletters do Instrutor */}
      <Route path={AppRoute.INSTRUCTOR_NEWSLETTERS} element={<ProtectedRoute><InstructorNewsletters /></ProtectedRoute>} />

      {/* Rotas do Aluno */}
      <Route path={AppRoute.STUDENT_DASHBOARD} element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path={AppRoute.STUDENT_RECIPES} element={<ProtectedRoute><StudentRecipes /></ProtectedRoute>} />
      <Route path={AppRoute.STUDENT_WORKOUT} element={<ProtectedRoute><StudentWorkout /></ProtectedRoute>} />
      <Route path={AppRoute.STUDENT_SUGGESTIONS} element={<ProtectedRoute><StudentSuggestions /></ProtectedRoute>} />
      <Route path={AppRoute.STUDENT_NEWSLETTERS} element={<ProtectedRoute><StudentNewsletters /></ProtectedRoute>} />

      <Route path={AppRoute.ADMIN} element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
      
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
