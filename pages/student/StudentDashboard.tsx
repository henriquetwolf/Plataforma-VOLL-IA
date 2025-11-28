import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { AppRoute } from '../../types';
import { Utensils, Activity, ArrowRight, LogOut } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Olá, {user?.name}!</h1>
          <p className="text-slate-500">Bem-vindo à sua área exclusiva.</p>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-red-500 p-2"><LogOut className="w-6 h-6"/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to={AppRoute.STUDENT_RECIPES} className="group bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-2xl shadow-sm border border-green-200 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-green-600 shadow-sm group-hover:scale-110 transition-transform">
            <Utensils className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Receitas Saudáveis</h2>
          <p className="text-green-700/80 text-sm mb-6">Crie receitas deliciosas e saudáveis personalizadas para seu objetivo.</p>
          <span className="inline-flex items-center text-sm font-bold text-green-700 group-hover:gap-2 transition-all">Acessar <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        <Link to={AppRoute.STUDENT_WORKOUT} className="group bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl shadow-sm border border-blue-200 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-blue-800 mb-2">Treino em Casa</h2>
          <p className="text-blue-700/80 text-sm mb-6">Exercícios de Pilates seguros baseados no seu histórico clínico.</p>
          <span className="inline-flex items-center text-sm font-bold text-blue-700 group-hover:gap-2 transition-all">Acessar <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>
      </div>
    </div>
  );
};