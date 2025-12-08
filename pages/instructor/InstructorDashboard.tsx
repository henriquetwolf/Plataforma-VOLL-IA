
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute } from '../../types';
import { Users, Activity, ArrowRight, User, Building2, Newspaper, CheckCircle2, ClipboardList, TrendingUp, LogOut, Trophy } from 'lucide-react';
import { fetchProfile } from '../../services/storage';
import { getInstructorProfile } from '../../services/instructorService';
import { StudioProfile } from '../../types';

export const InstructorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [studioProfile, setStudioProfile] = useState<StudioProfile | null>(null);
  const [instructor, setInstructor] = useState<any>(null);

  useEffect(() => {
    // Redirecionamento de Segurança
    if (user && !user.isInstructor) {
        if (user.isStudent) navigate(AppRoute.STUDENT_DASHBOARD);
        else navigate(AppRoute.DASHBOARD);
        return;
    }

    const loadData = async () => {
      if (user?.studioId) {
        const profile = await fetchProfile(user.studioId);
        setStudioProfile(profile);
      }
      if (user?.id) {
        const instData = await getInstructorProfile(user.id, user.email);
        setInstructor(instData);
      }
    };
    loadData();
  }, [user, navigate]);

  // Se não for instrutor, não renderiza nada enquanto redireciona
  if (user && !user.isInstructor) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Header Personalizado do Instrutor */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 gap-4 sm:gap-0">
        
        {/* Lado Esquerdo: Foto do Instrutor + Saudação */}
        <div className="flex items-center gap-5 w-full sm:w-auto">
          <div className="h-16 w-16 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-sm">
              {instructor?.photo_url ? (
                <img src={instructor.photo_url} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <span className="uppercase">{user?.name?.charAt(0)}</span>
              )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Olá, {user?.name.split(' ')[0]}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Bem-vindo ao Portal do Instrutor.</p>
          </div>
        </div>

        {/* Lado Direito: Logo do Studio + Logout */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {studioProfile?.logoUrl && (
                <div className="h-12 w-auto bg-white rounded-lg p-1 border border-slate-100 shadow-sm flex items-center">
                    <img 
                        src={studioProfile.logoUrl} 
                        alt="Logo Studio" 
                        className="h-full w-auto object-contain"
                    />
                </div>
            )}
            
            <button 
                onClick={logout} 
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-3 rounded-xl transition-colors border border-transparent hover:border-red-100"
                title="Sair"
            >
                <LogOut className="w-6 h-6"/>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Pilar 1: Meus Alunos */}
        <Link to={AppRoute.STUDENTS} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Users size={120} />
          </div>
          
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Users className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
            Meus Alunos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Visualize a lista de alunos, contatos e fichas técnicas. 
            <span className="block mt-2 text-xs opacity-70">* Visualização e edição permitidas.</span>
          </p>
          
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
            Acessar Lista <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Pilar 2: Guia Clínico */}
        <Link to={AppRoute.REHAB} className="group relative overflow-hidden bg-gradient-to-br from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 rounded-2xl border border-brand-100 dark:border-brand-900/50 shadow-sm hover:shadow-xl hover:border-brand-400 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Activity size={120} />
          </div>
          
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/40 text-brand-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Activity className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 transition-colors">
            Guia Clínico
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Ferramenta de IA para criar planos de aula baseados em patologias e consultar o histórico clínico.
          </p>
          
          <div className="mt-auto pt-4 border-t border-brand-100 dark:border-slate-800 flex items-center text-brand-700 dark:text-brand-400 font-bold text-sm group-hover:gap-2 transition-all">
            Criar Aula <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Pilar 3: Avaliação Física */}
        <Link to={AppRoute.STUDENT_ASSESSMENT} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <ClipboardList size={120} />
          </div>
          
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <ClipboardList className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 transition-colors">
            Avaliação Física
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Realize anamneses completas, testes físicos e análises posturais dos alunos.
          </p>
          
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-emerald-600 font-bold text-sm group-hover:gap-2 transition-all">
            Nova Avaliação <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Pilar 4: Evolução do Aluno */}
        <Link to={AppRoute.EVOLUTION} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <TrendingUp size={120} />
          </div>
          
          <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orange-600 transition-colors">
            Evolução do Aluno
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Registre a evolução diária (estabilidade, força, dor) e acompanhe o progresso técnico.
          </p>
          
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-orange-600 font-bold text-sm group-hover:gap-2 transition-all">
            Registrar <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Pilar 5: Newsletters */}
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

        {/* Pilar 6: Pilates Quest */}
        <Link to={AppRoute.PILATES_QUEST} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-yellow-300 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Trophy size={120} />
          </div>
          
          <div className="w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Trophy className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-yellow-600 transition-colors">
            Pilates Quest
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
            Educação continuada gamificada. Teste seus conhecimentos e suba no ranking.
          </p>
          
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-yellow-600 font-bold text-sm group-hover:gap-2 transition-all">
            Jogar Agora <ArrowRight className="w-4 h-4 ml-1" />
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
