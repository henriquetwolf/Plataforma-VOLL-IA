
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute } from '../../types';
import { Users, Activity, ArrowRight, User, Building2 } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Header Personalizado do Instrutor */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
            {user?.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Olá, {user?.name}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4" /> Área do Instrutor 
              {studioProfile && (
                <span className="inline-flex items-center gap-1 font-medium text-brand-700 bg-brand-50 px-3 py-0.5 rounded-full text-sm border border-brand-100 ml-2">
                   <Building2 className="w-3 h-3"/> Vinculado a: {studioProfile.studioName}
                </span>
              )}
            </p>
          </div>
        </div>
        {studioProfile?.logoUrl && (
          <img src={studioProfile.logoUrl} alt="Logo Studio" className="h-14 w-auto object-contain opacity-90" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pilar 1: Meus Alunos */}
        <Link to={AppRoute.STUDENTS} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Users size={100} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Alunos do Studio</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">
              Acesse os dados dos alunos vinculados a este studio.
            </p>
            <div className="flex items-center text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
              Ver Lista <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        {/* Pilar 2: Pilates Rehab */}
        <Link to={AppRoute.REHAB} className="group relative overflow-hidden bg-gradient-to-br from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 rounded-2xl border border-brand-100 dark:border-brand-900/50 shadow-sm hover:shadow-xl hover:border-brand-400 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Activity size={100} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/40 text-brand-600 rounded-xl flex items-center justify-center mb-6">
              <Activity className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pilates Rehab</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">
              Ferramentas de reabilitação e planos de aula do studio.
            </p>
            <div className="flex items-center text-brand-700 dark:text-brand-400 font-bold text-sm group-hover:gap-2 transition-all">
              Acessar Agente <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center text-slate-500 text-sm mt-8">
        <p>Você está acessando a <strong>Área do Instrutor</strong>. Os dados exibidos são exclusivos do studio ao qual você está vinculado.</p>
      </div>
    </div>
  );
};
