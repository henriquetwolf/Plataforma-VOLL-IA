
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute } from '../../types';
import { Users, Activity, ArrowRight, User, Building2, Newspaper, CheckCircle2 } from 'lucide-react';
import { fetchProfile } from '../../services/storage';
import { StudioProfile } from '../../types';

export const InstructorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [studioProfile, setStudioProfile] = useState<StudioProfile | null>(null);

  useEffect(() => {
    // Redirecionamento de Segurança
    if (user && !user.isInstructor) {
        if (user.isStudent) navigate(AppRoute.STUDENT_DASHBOARD);
        else navigate(AppRoute.DASHBOARD);
        return;
    }

    const loadStudioData = async () => {
      if (user?.studioId) {
        const profile = await fetchProfile(user.studioId);
        setStudioProfile(profile);
      }
    };
    loadStudioData();
  }, [user, navigate]);

  // Se não for instrutor, não renderiza nada enquanto redireciona
  if (user && !user.isInstructor) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Header Personalizado do Instrutor */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <User size={150} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Olá, {user?.name.split(' ')[0]}!
              </h1>
              <div className="flex items-center gap-2 mt-2 text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-sm font-medium">
                   <User className="w-4 h-4" /> Portal do Instrutor
                </span>
                {studioProfile && (
                  <span className="flex items-center gap-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full text-sm font-medium border border-brand-100 dark:border-brand-800">
                     <Building2 className="w-4 h-4"/> {studioProfile.studioName}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {studioProfile?.logoUrl && (
            <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
               <img src={studioProfile.logoUrl} alt="Logo Studio" className="h-16 w-auto object-contain" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pilar 1: Meus Alunos */}
        <Link to={AppRoute.STUDENTS} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Users size={120} />
          </div>
          
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Users className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
            Alunos do Studio
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Visualize a lista de alunos, contatos e fichas técnicas. 
            <span className="block mt-2 text-xs opacity-70">* Visualização e edição permitidas.</span>
          </p>
          
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
            Acessar Lista <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Pilar 2: Pilates Rehab */}
        <Link to={AppRoute.REHAB} className="group relative overflow-hidden bg-gradient-to-br from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 rounded-2xl border border-brand-100 dark:border-brand-900/50 shadow-sm hover:shadow-xl hover:border-brand-400 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Activity size={120} />
          </div>
          
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/40 text-brand-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Activity className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 transition-colors">
            Pilates Rehab & Aulas
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Ferramenta de IA para criar planos de aula baseados em patologias e consultar o histórico clínico.
          </p>
          
          <div className="mt-auto pt-4 border-t border-brand-100 dark:border-slate-800 flex items-center text-brand-700 dark:text-brand-400 font-bold text-sm group-hover:gap-2 transition-all">
            Criar Aula <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Pilar 3: Newsletters */}
        <Link to={AppRoute.INSTRUCTOR_NEWSLETTERS} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Newspaper size={120} />
          </div>
          
          <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Newspaper className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 transition-colors">
            Mural de Avisos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Fique por dentro dos comunicados internos, novidades e recados da gestão do studio.
          </p>
          
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-purple-600 font-bold text-sm group-hover:gap-2 transition-all">
            Ver Comunicados <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
        <CheckCircle2 className="w-3 h-3 text-green-500" />
        <span>Ambiente seguro. Acesso restrito a funcionalidades operacionais.</span>
      </div>
    </div>
  );
};
