
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { AppRoute, StudioProfile } from '../types';
import { Users, Sparkles, Compass, ArrowRight, Building2, Calculator, Banknote, Activity, MessageSquare } from 'lucide-react';
import { fetchProfile } from '../services/storage';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      // Se for instrutor, usa o studioId. Se for dono, usa o id.
      const targetId = user?.isInstructor ? user.studioId : user?.id;
      
      if (targetId) {
        const data = await fetchProfile(targetId);
        setProfile(data);
      }
      setLoading(false);
    };
    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // Definir links visíveis baseado no papel
  const isInstructor = user?.isInstructor;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           {profile?.logoUrl && (
             <img src={profile.logoUrl} alt="Logo Studio" className="h-16 w-16 object-contain rounded-lg bg-white p-1 border border-slate-100 shadow-sm" />
           )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Olá, {user?.name.split(' ')[0]}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {profile?.studioName 
                ? `${isInstructor ? 'Instrutor em' : 'Gerenciando'} ${profile.studioName}` 
                : 'Bem-vindo à Plataforma VOLL IA.'}
            </p>
          </div>
        </div>
      </div>

      {/* Seção 1: Gestão Rápida */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Gestão do Studio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Alunos */}
          <Link 
            to={AppRoute.STUDENTS} 
            className="group bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800 transition-all flex items-center gap-5"
          >
            <div className="h-14 w-14 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Alunos</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Acesso às fichas e histórico.</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Card Perfil (Visível para todos, mas editável só por dono) */}
          <Link 
            to={AppRoute.PROFILE} 
            className="group bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800 transition-all flex items-center gap-5"
          >
            <div className="h-14 w-14 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">Perfil do Studio</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Informações do local.</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {/* Seção 2: Agentes de IA */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-brand-100 dark:bg-brand-900 rounded-lg">
            <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Agentes de Inteligência</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* Agente: Pilates Rehab (Disponível para todos) */}
          <Link 
            to={AppRoute.REHAB} 
            className="group relative overflow-hidden bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10 p-6 rounded-xl shadow-sm border border-brand-100 dark:border-brand-900/50 hover:border-brand-400 dark:hover:border-brand-700 hover:shadow-lg transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Pilates Rehab</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Guia de patologias e gerador de aulas com triagem clínica inteligente.
              </p>
              
              <span className="inline-flex items-center text-sm font-bold text-brand-700 dark:text-brand-400 group-hover:gap-2 transition-all">
                Acessar Agente <ArrowRight className="h-4 w-4 ml-1" />
              </span>
            </div>
          </Link>

          {/* Outros Agentes (Apenas para Donos) */}
          {!isInstructor && (
            <>
              {/* Agente: Analisador de Feedback (Novo) */}
              <Link 
                to={AppRoute.STUDIO_SUGGESTIONS} 
                className="group relative overflow-hidden bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10 p-6 rounded-xl shadow-sm border border-brand-100 dark:border-brand-900/50 hover:border-brand-400 dark:hover:border-brand-700 hover:shadow-lg transition-all"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MessageSquare size={120} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Analisador de Feedback</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">Crie planos de ação com base em sugestões.</p>
                  <span className="inline-flex items-center text-sm font-bold text-brand-700 dark:text-brand-400 group-hover:gap-2 transition-all">Acessar Agente <ArrowRight className="h-4 w-4 ml-1" /></span>
                </div>
              </Link>

              <Link 
                to={AppRoute.STRATEGY} 
                className="group relative overflow-hidden bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10 p-6 rounded-xl shadow-sm border border-brand-100 dark:border-brand-900/50 hover:border-brand-400 dark:hover:border-brand-700 hover:shadow-lg transition-all"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Compass size={120} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Compass className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Planejador Estratégico</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">Consultor virtual sênior.</p>
                  <span className="inline-flex items-center text-sm font-bold text-brand-700 dark:text-brand-400 group-hover:gap-2 transition-all">Acessar Agente <ArrowRight className="h-4 w-4 ml-1" /></span>
                </div>
              </Link>

              <Link 
                to={AppRoute.FINANCE} 
                className="group relative overflow-hidden bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10 p-6 rounded-xl shadow-sm border border-brand-100 dark:border-brand-900/50 hover:border-brand-400 dark:hover:border-brand-700 hover:shadow-lg transition-all"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calculator size={120} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calculator className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Calculadora Financeira</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">Simule custos de contratação.</p>
                  <span className="inline-flex items-center text-sm font-bold text-brand-700 dark:text-brand-400 group-hover:gap-2 transition-all">Acessar Agente <ArrowRight className="h-4 w-4 ml-1" /></span>
                </div>
              </Link>

              <Link 
                to={AppRoute.PRICING} 
                className="group relative overflow-hidden bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10 p-6 rounded-xl shadow-sm border border-brand-100 dark:border-brand-900/50 hover:border-brand-400 dark:hover:border-brand-700 hover:shadow-lg transition-all"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Banknote size={120} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Banknote className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Preço Certo (PCI)</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">Calcule o preço ideal.</p>
                  <span className="inline-flex items-center text-sm font-bold text-brand-700 dark:text-brand-400 group-hover:gap-2 transition-all">Acessar Agente <ArrowRight className="h-4 w-4 ml-1" /></span>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
