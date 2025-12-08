import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute } from '../../types';
import { Utensils, Activity, ArrowRight, LogOut, Star, User, MessageSquare, ClipboardList, Newspaper, Dices, Sparkles, Tag } from 'lucide-react';
import { fetchProfile } from '../../services/storage';
import { getStudentProfile } from '../../services/studentService';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [studioLogo, setStudioLogo] = useState<string | null>(null);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);

  useEffect(() => {
    // Redirecionamento de Segurança
    if (user && !user.isStudent) {
        if (user.isInstructor) navigate(AppRoute.INSTRUCTOR_DASHBOARD);
        else navigate(AppRoute.DASHBOARD);
        return;
    }

    const loadData = async () => {
        // 1. Carregar Logo do Studio
        if (user?.studioId) {
            try {
                const profile = await fetchProfile(user.studioId);
                if (profile?.logoUrl) {
                    setStudioLogo(profile.logoUrl);
                }
            } catch (e) {
                console.error("Erro ao carregar logo do studio", e);
            }
        }

        // 2. Carregar Foto do Aluno
        if (user?.id) {
            try {
                const studentData = await getStudentProfile(user.id);
                if (studentData?.photo_url) {
                    setStudentPhoto(studentData.photo_url);
                }
            } catch (e) {
                console.error("Erro ao carregar foto do aluno", e);
            }
        }
    };
    loadData();

  }, [user, navigate]);

  if (user && !user.isStudent) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 gap-4 sm:gap-0">
        
        {/* Lado Esquerdo: Foto do Aluno + Saudação */}
        <div className="flex items-center gap-5 w-full sm:w-auto">
          {studentPhoto ? (
            <img 
                src={studentPhoto} 
                alt="Foto do Aluno" 
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-100 dark:border-brand-900 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center font-bold text-2xl shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
                {user?.name.charAt(0)}
            </div>
          )}
          
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Olá, {user?.name.split(' ')[0]}!</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Bem-vindo à sua área exclusiva.</p>
          </div>
        </div>
        
        {/* Lado Direito: Logo do Studio + Logout */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {studioLogo && (
                <div className="h-12 w-auto bg-white rounded-lg p-1 border border-slate-100 shadow-sm flex items-center">
                    <img 
                        src={studioLogo} 
                        alt="Logo do Studio" 
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
        
        {/* Sorte do Dia (NEW) */}
        <Link to={AppRoute.STUDENT_DAILY_LUCK} className="group bg-gradient-to-br from-yellow-50 to-amber-100 p-8 rounded-2xl shadow-sm border border-yellow-200 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Sparkles size={80} />
          </div>
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-yellow-600 shadow-sm group-hover:scale-110 transition-transform">
                <Dices className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-yellow-800 mb-2">Sorte do Dia!</h2>
            <p className="text-yellow-700/80 text-sm mb-6">Gire a roleta e descubra qual aula ou desafio te espera hoje.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-yellow-700 group-hover:gap-2 transition-all">Girar Roleta <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        {/* Parceiros e Descontos (NEW) */}
        <Link to={AppRoute.STUDENT_PARTNERS} className="group bg-gradient-to-br from-pink-50 to-rose-100 p-8 rounded-2xl shadow-sm border border-pink-200 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Tag size={80} />
          </div>
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-pink-600 shadow-sm group-hover:scale-110 transition-transform">
                <Tag className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-pink-800 mb-2">Clube de Benefícios</h2>
            <p className="text-pink-700/80 text-sm mb-6">Descontos exclusivos em parceiros do estúdio.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-pink-700 group-hover:gap-2 transition-all">Ver Parceiros <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        {/* Receitas */}
        <Link to={AppRoute.STUDENT_RECIPES} className="group bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-2xl shadow-sm border border-green-200 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-green-600 shadow-sm group-hover:scale-110 transition-transform">
                <Utensils className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-green-800 mb-2">Receitas Saudáveis</h2>
            <p className="text-green-700/80 text-sm mb-6">Crie receitas deliciosas e saudáveis personalizadas para seu objetivo.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-green-700 group-hover:gap-2 transition-all">Acessar <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        {/* Treino */}
        <Link to={AppRoute.STUDENT_WORKOUT} className="group bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl shadow-sm border border-blue-200 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-blue-800 mb-2">Treino em Casa</h2>
            <p className="text-blue-700/80 text-sm mb-6">Exercícios de Pilates seguros baseados no seu histórico clínico.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-blue-700 group-hover:gap-2 transition-all">Acessar <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        {/* Avaliação */}
        <Link to={AppRoute.STUDENT_EVALUATION} className="group bg-gradient-to-br from-yellow-50 to-orange-100 p-8 rounded-2xl shadow-sm border border-yellow-200 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-yellow-600 shadow-sm group-hover:scale-110 transition-transform">
                <Star className="w-7 h-7 fill-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-yellow-800 mb-2">Avaliar Aula</h2>
            <p className="text-yellow-700/80 text-sm mb-6">Conte como foi sua aula hoje e ajude-nos a melhorar.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-yellow-700 group-hover:gap-2 transition-all">Avaliar Agora <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        {/* Sugestões */}
        <Link to={AppRoute.STUDENT_SUGGESTIONS} className="group bg-gradient-to-br from-purple-50 to-fuchsia-100 p-8 rounded-2xl shadow-sm border border-purple-200 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-purple-600 shadow-sm group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-purple-800 mb-2">Sugestões</h2>
            <p className="text-purple-700/80 text-sm mb-6">Envie ideias, elogios ou sugestões diretamente para o estúdio.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-purple-700 group-hover:gap-2 transition-all">Enviar <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        {/* Pesquisas */}
        <Link to={AppRoute.STUDENT_SURVEYS} className="group bg-gradient-to-br from-cyan-50 to-sky-100 p-8 rounded-2xl shadow-sm border border-cyan-200 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-cyan-600 shadow-sm group-hover:scale-110 transition-transform">
                <ClipboardList className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-cyan-800 mb-2">Pesquisas</h2>
            <p className="text-cyan-700/80 text-sm mb-6">Responda às pesquisas de satisfação e nos ajude a evoluir.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-cyan-700 group-hover:gap-2 transition-all">Responder <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

        {/* Mural de Avisos */}
        <Link to={AppRoute.STUDENT_NEWSLETTERS} className="group bg-gradient-to-br from-orange-50 to-amber-100 p-8 rounded-2xl shadow-sm border border-orange-200 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                <Newspaper className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-orange-800 mb-2">Mural de Avisos</h2>
            <p className="text-orange-700/80 text-sm mb-6">Fique por dentro das novidades e comunicados importantes.</p>
          </div>
          <span className="inline-flex items-center text-sm font-bold text-orange-700 group-hover:gap-2 transition-all">Ver Avisos <ArrowRight className="ml-1 w-4 h-4"/></span>
        </Link>

      </div>
    </div>
  );
};