

import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
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
import { Settings } from './pages/Settings'; 
import { InstructorWelcome } from './pages/InstructorWelcome';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentRecipes } from './pages/student/StudentRecipes';
import { StudentWorkout } from './pages/student/StudentWorkout';
import { StudentSuggestions } from './pages/student/StudentSuggestions';
import { StudentNewsletters } from './pages/student/StudentNewsletters';
import { StudentEvaluation } from './pages/student/StudentEvaluation';
import { InstructorNewsletters } from './pages/instructor/InstructorNewsletters';
import { InstructorDashboard } from './pages/instructor/InstructorDashboard';
import { NewsletterAgent } from './pages/NewsletterAgent';
import { StudioSuggestions } from './pages/StudioSuggestions';
import { StudioEvaluations } from './pages/StudioEvaluations';
import { ContentAgent } from './pages/ContentAgent'; 
import { StudentEvolutionPage } from './pages/StudentEvolution';
import { AppRoute } from './types';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

// Guard for Owner Only Routes
const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  if (!isAuthenticated) return <Navigate to={AppRoute.LOGIN} state={{ from: location }} replace />;

  // Redirect Instructors and Students
  if (user?.isInstructor) return <Navigate to={AppRoute.INSTRUCTOR_DASHBOARD} replace />;
  if (user?.isStudent) return <Navigate to={AppRoute.STUDENT_DASHBOARD} replace />;

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Guard for Shared Routes (Owner AND Instructor)
const SharedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  if (!isAuthenticated) return <Navigate to={AppRoute.LOGIN} state={{ from: location }} replace />;

  // Students have their own dashboard
  if (user?.isStudent) return <Navigate to={AppRoute.STUDENT_DASHBOARD} replace />;

  // Allow Owner and Instructor
  if (user?.isOwner || user?.isInstructor) {
      return <DashboardLayout>{children}</DashboardLayout>;
  }

  return <Navigate to={AppRoute.LOGIN} replace />;
};

// Guard for Instructor Routes
const InstructorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  if (!isAuthenticated) return <Navigate to={AppRoute.LOGIN} state={{ from: location }} replace />;

  // Allow Instructors. Redirect others.
  if (!user?.isInstructor) {
      if (user?.isStudent) return <Navigate to={AppRoute.STUDENT_DASHBOARD} replace />;
      // Owners can theoretically access instructor views if needed, but strictly these are for instructors
      return <Navigate to={AppRoute.DASHBOARD} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Guard for Student Routes
const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  if (!isAuthenticated) return <Navigate to={AppRoute.LOGIN} state={{ from: location }} replace />;

  if (!user?.isStudent) {
      if (user?.isInstructor) return <Navigate to={AppRoute.INSTRUCTOR_DASHBOARD} replace />;
      return <Navigate to={AppRoute.DASHBOARD} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Admin Route
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) return null;
  if (!isAuthenticated || user?.email !== ADMIN_EMAIL) return <Navigate to={AppRoute.LOGIN} replace />;

  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path={AppRoute.LOGIN} element={<Login />} />
      <Route path={AppRoute.REGISTER} element={<Register />} />
      <Route path={AppRoute.INSTRUCTOR_WELCOME} element={<InstructorWelcome />} />
      
      {/* Rotas Exclusivas do Studio (Dono) */}
      <Route path={AppRoute.DASHBOARD} element={<OwnerRoute><Dashboard /></OwnerRoute>} />
      <Route path={AppRoute.PROFILE} element={<OwnerRoute><Profile /></OwnerRoute>} />
      <Route path={AppRoute.INSTRUCTORS} element={<OwnerRoute><Instructors /></OwnerRoute>} />
      <Route path={AppRoute.STRATEGY} element={<OwnerRoute><StrategicPlanning /></OwnerRoute>} />
      <Route path={AppRoute.FINANCE} element={<OwnerRoute><FinancialAgent /></OwnerRoute>} />
      <Route path={AppRoute.PRICING} element={<OwnerRoute><PricingAgent /></OwnerRoute>} />
      <Route path={AppRoute.STUDIO_SUGGESTIONS} element={<OwnerRoute><StudioSuggestions /></OwnerRoute>} />
      <Route path={AppRoute.STUDIO_EVALUATIONS} element={<OwnerRoute><StudioEvaluations /></OwnerRoute>} />
      <Route path={AppRoute.CONTENT_AGENT} element={<OwnerRoute><ContentAgent /></OwnerRoute>} />
      <Route path={AppRoute.SETTINGS} element={<OwnerRoute><Settings /></OwnerRoute>} />
      <Route path={AppRoute.NEWSLETTER_AGENT} element={<OwnerRoute><NewsletterAgent /></OwnerRoute>} />
      
      {/* Rotas Compartilhadas (Dono e Instrutor) */}
      <Route path={AppRoute.STUDENTS} element={<SharedRoute><Students /></SharedRoute>} />
      <Route path={AppRoute.REHAB} element={<SharedRoute><RehabAgent /></SharedRoute>} />
      <Route path={AppRoute.EVOLUTION} element={<SharedRoute><StudentEvolutionPage /></SharedRoute>} />

      {/* Rotas Exclusivas do Instrutor */}
      <Route path={AppRoute.INSTRUCTOR_DASHBOARD} element={<InstructorRoute><InstructorDashboard /></InstructorRoute>} />
      <Route path={AppRoute.INSTRUCTOR_NEWSLETTERS} element={<InstructorRoute><InstructorNewsletters /></InstructorRoute>} />
      
      {/* Rotas do Aluno */}
      <Route path={AppRoute.STUDENT_DASHBOARD} element={<StudentRoute><StudentDashboard /></StudentRoute>} />
      <Route path={AppRoute.STUDENT_RECIPES} element={<StudentRoute><StudentRecipes /></StudentRoute>} />
      <Route path={AppRoute.STUDENT_WORKOUT} element={<StudentRoute><StudentWorkout /></StudentRoute>} />
      <Route path={AppRoute.STUDENT_SUGGESTIONS} element={<StudentRoute><StudentSuggestions /></StudentRoute>} />
      <Route path={AppRoute.STUDENT_NEWSLETTERS} element={<StudentRoute><StudentNewsletters /></StudentRoute>} />
      <Route path={AppRoute.STUDENT_EVALUATION} element={<StudentRoute><StudentEvaluation /></StudentRoute>} />

      <Route path={AppRoute.ADMIN} element={<AdminRoute><AdminPanel /></AdminRoute>} />
      
      <Route path="*" element={<Navigate to={AppRoute.LOGIN} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;