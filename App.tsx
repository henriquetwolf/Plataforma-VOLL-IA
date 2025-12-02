
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
      
      {/* Rotas do Studio (Dono) */}
      <Route path={AppRoute.DASHBOARD} element={<OwnerRoute><Dashboard /></OwnerRoute>} />
      <Route path={AppRoute.PROFILE} element={<OwnerRoute><Profile /></OwnerRoute>} />
      <Route path={AppRoute.STUDENTS} element={<OwnerRoute><Students /></OwnerRoute>} />
      <Route path={AppRoute.INSTRUCTORS} element={<OwnerRoute><Instructors /></OwnerRoute>} />
      <Route path={AppRoute.STRATEGY} element={<OwnerRoute><StrategicPlanning /></OwnerRoute>} />
      <Route path={AppRoute.FINANCE} element={<OwnerRoute><FinancialAgent /></OwnerRoute>} />
      <Route path={AppRoute.PRICING} element={<OwnerRoute><PricingAgent /></OwnerRoute>} />
      <Route path={AppRoute.STUDIO_SUGGESTIONS} element={<OwnerRoute><StudioSuggestions /></OwnerRoute>} />
      <Route path={AppRoute.STUDIO_EVALUATIONS} element={<OwnerRoute><StudioEvaluations /></OwnerRoute>} />
      <Route path={AppRoute.CONTENT_AGENT} element={<OwnerRoute><ContentAgent /></OwnerRoute>} />
      <Route path={AppRoute.SETTINGS} element={<OwnerRoute><Settings /></OwnerRoute>} />
      <Route path={AppRoute.NEWSLETTER_AGENT} element={<OwnerRoute><NewsletterAgent /></OwnerRoute>} />
      
      {/* Rotas Híbridas (Owner pode acessar Rehab, mas Instructor tem sua rota) */}
      {/* Rehab Agent is special: Owner can access via normal route, Instructor via protected route below or shared? */}
      {/* Assuming RehabAgent handles permission internally, but routing should be strict. */}
      {/* Let's allow Owner to Rehab via OwnerRoute, but Instructor needs to access it too. */}
      {/* Since Instructor uses DashboardLayout inside the page logic for RehabAgent sometimes? No, layout is in Route. */}
      
      {/* Rehab para Dono */}
      <Route path={AppRoute.REHAB} element={<OwnerRoute><RehabAgent /></OwnerRoute>} />

      {/* Rotas do Instrutor */}
      <Route path={AppRoute.INSTRUCTOR_DASHBOARD} element={<InstructorRoute><InstructorDashboard /></InstructorRoute>} />
      <Route path={AppRoute.INSTRUCTOR_NEWSLETTERS} element={<InstructorRoute><InstructorNewsletters /></InstructorRoute>} />
      {/* Rehab para Instrutor - Reuse component but wrapped in InstructorRoute? 
          Actually AppRoute.REHAB is the path. 
          If instructor goes to /rehab, they hit OwnerRoute and get bounced.
          We need a shared route or separate path. 
          Currently RehabAgent handles `isAuthorized` check internally.
          Let's make /rehab accessible to BOTH but guarded inside.
      */}
      {/* Changing Strategy: A generic ProtectedRoute for Shared Resources */}
      
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
      <ThemeProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
