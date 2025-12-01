
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { AppRoute } from '../../types';
import { Users, Activity, Newspaper, ArrowRight, User } from 'lucide-react';
import { fetchProfile } from '../../services/storage';
import { StudioProfile } from '../../types';

export const InstructorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [studioProfile, setStudioProfile] = useState<StudioProfile | null>(null);

  useEffect(() => {
    const loadStudioData = async () => {
      if (user?.studioId) {
        const profile = await fetchProfile(user.studioId);
        setStudioProfile(profile);
      }
    };
    loadStudioData();
  }, [user]);

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
              <User className="w-4 h-4" /> Painel do Instrutor 
              {studioProfile && <span className="font-medium text-brand-600"> @ {studioProfile.studioName}</span>}
            </p>
          </div>
        </div>
        {studioProfile?.logoUrl && (
          <img src={studioProfile.logoUrl} alt="Logo Studio" className="h-12 w-auto object-contain opacity-80" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pilar 1: Meus Alunos */}
        <Link to={AppRoute.STUDENTS} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Users size={100} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Meus Alunos</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">
              Acesse a lista completa de alunos do studio, fichas de cadastro e histórico.
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
              Inteligência Artificial para criar planos de aula clínicos e consultar patologias.
            </p>
            <div className="flex items-center text-brand-700 dark:text-brand-400 font-bold text-sm group-hover:gap-2 transition-all">
              Acessar Agente <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        {/* Pilar 3: Newsletter */}
        <Link to={AppRoute.NEWSLETTER_AGENT} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Newspaper size={100} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl flex items-center justify-center mb-6">
              <Newspaper className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Criador Newsletter</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">
              Crie comunicados e avisos para os alunos ou equipe de forma rápida.
            </p>
            <div className="flex items-center text-purple-600 font-bold text-sm group-hover:gap-2 transition-all">
              Criar Aviso <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center text-slate-500 text-sm">
        <p>Você está acessando a <strong>Área do Instrutor</strong>. Funcionalidades administrativas (Financeiro, Estratégia) são restritas ao Dono do Studio.</p>
      </div>
    </div>
  );
};
