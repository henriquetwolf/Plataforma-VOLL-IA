

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserCircle, LogOut, Sparkles, Users, Compass, Sun, Moon, Calculator, Banknote, Activity, ShieldAlert, BookUser, Utensils, MessageSquare, Newspaper, Settings, Home, Wand2, Star, TrendingUp } from 'lucide-react';
import { AppRoute, SystemBanner } from '../types';
import { fetchProfile } from '../services/storage';
import { fetchBannerByType } from '../services/bannerService';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme, setBrandColor } = useTheme();
  const location = useLocation();
  
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [promoBanner, setPromoBanner] = useState<SystemBanner | null>(null);

  useEffect(() => {
    const loadBrandAndPermissions = async () => {
      const targetId = user?.isInstructor || user?.isStudent ? user.studioId : user?.id;
      
      if (targetId) {
        const profile = await fetchProfile(targetId);
        if (profile) {
            if (profile.brandColor) setBrandColor(profile.brandColor);
        }
      }
    };
    loadBrandAndPermissions();
  }, [user, setBrandColor]);

  // Carregar Banner Promocional
  useEffect(() => {
    const loadBanner = async () => {
      if (!user) return;
      
      let bannerType: 'studio' | 'instructor' | null = null;
      
      if (user.isOwner) bannerType = 'studio';
      else if (user.isInstructor) bannerType = 'instructor';
      
      if (bannerType) {
        const banner = await fetchBannerByType(bannerType);
        setPromoBanner(banner);
      }
    };
    loadBanner();
  }, [user]);

  useEffect(() => {
    if (!user) {
        setMenuItems([]);
        return;
    }

    const isSuperAdmin = user.email === ADMIN_EMAIL;
    const isInstructor = user.isInstructor;
    const isStudent = user.isStudent;
    const isOwner = user.isOwner;

    let items = [];

    if (isSuperAdmin) {
      items = [{ type: 'link', label: 'Painel Admin', icon: ShieldAlert, path: AppRoute.ADMIN }];
    } else if (isStudent) {
      items = [
        { type: 'link', label: 'Meu Painel', icon: LayoutDashboard, path: AppRoute.STUDENT_DASHBOARD },
        { type: 'header', label: 'Minhas Aulas' },
        { type: 'link', label: 'Avaliar Aula', icon: Star, path: AppRoute.STUDENT_EVALUATION },
        { type: 'link', label: 'Treino em Casa', icon: Activity, path: AppRoute.STUDENT_WORKOUT },
        { type: 'header', label: 'Comunidade' },
        { type: 'link', label: 'Receitas', icon: Utensils, path: AppRoute.STUDENT_RECIPES },
        { type: 'link', label: 'Caixa de Sugestões', icon: MessageSquare, path: AppRoute.STUDENT_SUGGESTIONS },
        { type: 'link', label: 'Mural de Avisos', icon: Newspaper, path: AppRoute.STUDENT_NEWSLETTERS },
      ];
    } else if (isInstructor) {
      items = [
        { type: 'link', label: 'Home', icon: Home, path: AppRoute.INSTRUCTOR_DASHBOARD },
        { type: 'header', label: 'Operacional' },
        { type: 'link', label: 'Pilates Rehab', icon: Activity, path: AppRoute.REHAB },
        { type: 'link', label: 'Evolução do Aluno', icon: TrendingUp, path: AppRoute.EVOLUTION },
        { type: 'link', label: 'Meus Alunos', icon: Users, path: AppRoute.STUDENTS },
        { type: 'link', label: 'Mural de Avisos', icon: Newspaper, path: AppRoute.INSTRUCTOR_NEWSLETTERS },
      ];
    } else if (isOwner) {
      items = [
        { type: 'link', label: 'Painel Geral', icon: LayoutDashboard, path: AppRoute.DASHBOARD },
        
        { type: 'header', label: '1. Cadastros' },
        { type: 'link', label: 'Perfil do Studio', icon: UserCircle, path: AppRoute.PROFILE },
        { type: 'link', label: 'Equipe', icon: BookUser, path: AppRoute.INSTRUCTORS },
        { type: 'link', label: 'Meus Alunos', icon: Users, path: AppRoute.STUDENTS },
        { type: 'link', label: 'Configurações', icon: Settings, path: AppRoute.SETTINGS },

        { type: 'header', label: '2. Estratégia' },
        { type: 'link', label: 'Planejamento IA', icon: Compass, path: AppRoute.STRATEGY },
        { type: 'link', label: 'Pilates Rehab', icon: Activity, path: AppRoute.REHAB },
        { type: 'link', label: 'Assistente Conteúdo', icon: Wand2, path: AppRoute.CONTENT_AGENT },
        { type: 'link', label: 'Calculadora Financeira', icon: Calculator, path: AppRoute.FINANCE },
        { type: 'link', label: 'Preço Inteligente', icon: Banknote, path: AppRoute.PRICING },
        { type: 'link', label: 'Criador Newsletter', icon: Newspaper, path: AppRoute.NEWSLETTER_AGENT },

        { type: 'header', label: '3. Acompanhamento' },
        { type: 'link', label: 'Evolução do Aluno', icon: TrendingUp, path: AppRoute.EVOLUTION },
        { type: 'link', label: 'Avaliações Aulas', icon: Star, path: AppRoute.STUDIO_EVALUATIONS },
        { type: 'link', label: 'Sugestões Alunos', icon: MessageSquare, path: AppRoute.STUDIO_SUGGESTIONS },
      ];
    }

    setMenuItems(items);
  }, [user]);

  const isSuperAdmin = user?.email === ADMIN_EMAIL;
  const isInstructor = user?.isInstructor;
  const isStudent = user?.isStudent;
  const isOwner = user?.isOwner;

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
          {/* BANNER PROMOCIONAL */}
          {promoBanner && (
            <div className="mb-6 px-1">
              <a 
                href={promoBanner.linkUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`block rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02] ${!promoBanner.linkUrl ? 'cursor-default pointer-events-none' : ''}`}
              >
                <img 
                  src={promoBanner.imageUrl} 
                  alt="Novidade VOLL" 
                  className="w-full h-auto object-cover"
                />
              </a>
            </div>
          )}

          {/* Links do Menu */}
          {menuItems.map((item, index) => {
            if (item.type === 'header') {
                return (
                    <div key={`header-${index}`} className="px-4 mt-6 mb-2">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {item.label}
                        </p>
                    </div>
                );
            }

            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const isHomeInstructor = isInstructor && item.label === 'Home';
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-brand-500 dark:text-brand-400' : isHomeInstructor ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </Link>
            );
          })}
          
          {/* Espaçador final para garantir scroll confortável */}
          <div className="h-12"></div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              isSuperAdmin ? 'bg-purple-100 text-purple-700' : 
              isInstructor ? 'bg-blue-100 text-blue-600' : 
              isStudent ? 'bg-green-100 text-green-600' : 
              'bg-brand-100 text-brand-600'
            }`}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{user?.name}</p>
              {isSuperAdmin && <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Super Admin</p>}
              {isInstructor && <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Instrutor</p>}
              {isStudent && <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Aluno</p>}
              {isOwner && <p className="text-[10px] text-brand-600 font-bold uppercase tracking-wider">Dono</p>}
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