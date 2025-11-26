import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { AppRoute, StudioProfile } from '../types';
import { UserCircle, Calendar, Users, TrendingUp } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Olá, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            {profile?.studioName ? `Gerenciando ${profile.studioName}` : 'Bem-vindo ao seu novo painel de controle.'}
          </p>
        </div>
        
        {!profile?.studioName && (
           <Link to={AppRoute.PROFILE} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200">
             Completar Cadastro
           </Link>
        )}
      </div>

      {!profile?.studioName ? (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-sm text-brand-500">
            <UserCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-brand-900 mb-2">Vamos começar?</h3>
          <p className="text-brand-700 mb-6 max-w-md mx-auto">
            O perfil do seu estúdio está incompleto. Adicione os detalhes do seu negócio para desbloquear os recursos de IA e ferramentas de gestão.
          </p>
          <Link to={AppRoute.PROFILE} className="text-brand-700 font-bold hover:underline">
            Ir para Perfil &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Alunos Ativos</p>
                <p className="text-2xl font-bold text-slate-900">0</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Em breve</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Aulas Hoje</p>
                <p className="text-2xl font-bold text-slate-900">0</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Em breve</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Faturamento (Mês)</p>
                <p className="text-2xl font-bold text-slate-900">R$ 0</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Em breve</div>
          </div>
        </div>
      )}
    </div>
  );
};
