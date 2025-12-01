
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserCircle, LogOut, Sparkles, Users, Compass, Sun, Moon, Calculator, Banknote, Activity, ShieldAlert, BookUser, Utensils, MessageSquare } from 'lucide-react';
import { AppRoute } from '../types';
import { fetchProfile } from '../services/storage';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme, setBrandColor } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const loadBrand = async () => {
      // Se for instrutor ou aluno, carrega perfil do dono do estúdio
      const targetId = user?.isInstructor || user?.isStudent ? user.studioId : user?.id;
      
      if (targetId) {
        const profile = await fetchProfile(targetId);
        if (profile?.brandColor) setBrandColor(profile.brandColor);
      }
    };
    loadBrand();
  }, [user, setBrandColor]);

  const isSuperAdmin = user?.email === ADMIN_EMAIL;
  const isInstructor = user?.isInstructor;
  const isStudent = user?.isStudent;

  let navItems = [];

  if (isSuperAdmin) {
    navItems = [{ label: 'Painel Admin', icon: ShieldAlert, path: AppRoute.ADMIN }];
  } else if (isStudent) {
    // Menu do Aluno
    navItems = [
      { label: 'Meu Painel', icon: LayoutDashboard, path: AppRoute.STUDENT_DASHBOARD },
      { label: 'Receitas', icon: Utensils, path: AppRoute.STUDENT_RECIPES },
      { label: 'Treino em Casa', icon: Activity, path: AppRoute.STUDENT_WORKOUT },
      { label: 'Caixa de Sugestões', icon: MessageSquare, path: AppRoute.STUDENT_SUGGESTIONS },
    ];
  } else if (isInstructor) {
    navItems = [
      { label: 'Painel Geral', icon: LayoutDashboard, path: AppRoute.DASHBOARD },
      { label: 'Alunos', icon: Users, path: AppRoute.STUDENTS },
      { label: 'Pilates Rehab', icon: Activity, path: AppRoute.REHAB },
    ];
  } else {
    // Dono do Estúdio (Vê tudo)
    navItems = [
      { label: 'Painel Geral', icon: LayoutDashboard, path: AppRoute.DASHBOARD },
      { label: 'Meus Alunos', icon: Users, path: AppRoute.STUDENTS },
      { label: 'Equipe', icon: BookUser, path: AppRoute.INSTRUCTORS },
      { label: 'Sugestões Alunos', icon: MessageSquare, path: AppRoute.STUDIO_SUGGESTIONS },
      { label: 'Planejamento IA', icon: Compass, path: AppRoute.STRATEGY },
      { label: 'Calculadora Financeira', icon: Calculator, path: AppRoute.FINANCE },
      { label: 'Preço Inteligente', icon: Banknote, path: AppRoute.PRICING },
      { label: 'Pilates Rehab', icon: Activity, path: AppRoute.REHAB },
      { label: 'Perfil do Studio', icon: UserCircle, path: AppRoute.PROFILE },
    ];
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col fixed h-full z-10 transition-colors duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <Sparkles className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight">Plataforma VOLL IA</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
              isSuperAdmin ? 'bg-purple-100 text-purple-700' : 
              isInstructor ? 'bg-blue-100 text-blue-600' : 
              isStudent ? 'bg-green-100 text-green-600' : 
              'bg-brand-100 text-brand-600'
            }`}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{user?.name}</p>
              {isSuperAdmin && <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Super Admin</p>}
              {isInstructor && <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Instrutor</p>}
              {isStudent && <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Aluno</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
             <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
            <button onClick={logout} className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-transparent hover:border-red-100">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <Sparkles className="h-6 w-6" />
            <span className="font-bold text-lg">Plataforma VOLL IA</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={logout} className="text-slate-500 dark:text-slate-400">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};
