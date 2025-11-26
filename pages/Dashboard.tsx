import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { AppRoute, StudioProfile } from '../types';
import { UserCircle, Users, Sparkles, Compass, ArrowRight, Building2 } from 'lucide-react';
import { fetchProfile } from '../services/storage';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const data = await fetchProfile(user.id);
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Olá, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            {profile?.studioName 
              ? `Gerenciando ${profile.studioName}` 
              : 'Bem-vindo ao PilatesFlow.'}
          </p>
        </div>
      </div>

      {/* Seção 1: Gestão Rápida */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Gestão do Studio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Alunos */}
          <Link 
            to={AppRoute.STUDENTS} 
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-5"
          >
            <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">Meus Alunos</h3>
              <p className="text-slate-500 text-sm mt-1">Gerencie matrículas, fichas e contatos.</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Card Perfil */}
          <Link 
            to={AppRoute.PROFILE} 
            className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-5"
          >
            <div className="h-14 w-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-purple-700 transition-colors">Perfil do Studio</h3>
              <p className="text-slate-500 text-sm mt-1">Dados comerciais, serviços e biografia.</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {/* Seção 2: Agentes de IA */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-brand-100 rounded-lg">
            <Sparkles className="h-5 w-5 text-brand-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700">Agentes de Inteligência</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Agente: Planejamento Estratégico */}
          <Link 
            to={AppRoute.STRATEGY} 
            className="group relative overflow-hidden bg-gradient-to-br from-white to-brand-50/30 p-6 rounded-xl shadow-sm border border-brand-100 hover:border-brand-400 hover:shadow-lg transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Compass size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Compass className="h-6 w-6" />
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 mb-2">Planejador Estratégico</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Consultor virtual sênior. Cria análise SWOT, define Missão/Visão e monta planos de ação trimestrais para seu negócio.
              </p>
              
              <span className="inline-flex items-center text-sm font-bold text-brand-700 group-hover:gap-2 transition-all">
                Acessar Agente <ArrowRight className="h-4 w-4 ml-1" />
              </span>
            </div>
          </Link>

          {/* Placeholder para Futuros Agentes */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-opacity cursor-not-allowed bg-slate-50">
            <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-500">Novo Agente em Breve</h3>
            <p className="text-xs text-slate-400 mt-2">
              Gerador de Posts, Criador de Aulas e muito mais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};