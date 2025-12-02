
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { AppRoute, StudioProfile } from '../types';
import { 
  Users, Sparkles, Compass, ArrowRight, Building2, Calculator, 
  Banknote, Activity, MessageSquare, Newspaper, Wand2, Star, 
  BookUser, TrendingUp, CheckCircle2, Layers, LineChart
} from 'lucide-react';
import { fetchProfile } from '../services/storage';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // REDIRECT IMMEDIATELY if Instructor
  if (user?.isInstructor) {
      return <Navigate to={AppRoute.INSTRUCTOR_DASHBOARD} replace />;
  }

  useEffect(() => {
    const loadProfile = async () => {
      // Se for dono, usa o id.
      const targetId = user?.id;
      
      if (targetId) {
        const data = await fetchProfile(targetId);
        setProfile(data);
      }
      setLoading(false);
    };
    loadProfile();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const StepHeader = ({ step, title, description, colorClass, icon: Icon }: any) => {
    // Extrai a cor base para o fundo do número
    const bgClass = colorClass.replace('border-', 'bg-').replace('500', '600');
    
    return (
        <div className={`relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-5 rounded-2xl border-l-4 ${colorClass} bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md`}>
            {/* Ícone de fundo decorativo */}
            <Icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 ${colorClass.replace('border-', 'text-')} pointer-events-none`} />
            
            <div className={`w-12 h-12 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-bold text-xl shadow-md ${bgClass}`}>
                {step}
            </div>
            <div className="z-10">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{description}</p>
            </div>
        </div>
    );
  };

  const ActionCard = ({ to, title, desc, icon: Icon, color, isAi = false }: any) => (
    <Link 
      to={to} 
      className={`group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden ${isAi ? 'border-brand-200 dark:border-brand-900' : ''}`}
    >
      {isAi && (
        <div className="absolute top-0 right-0 px-2 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-bl-xl text-[10px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 z-10">
          <Sparkles className="w-3 h-3" /> IA
        </div>
      )}
      
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <h3 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-grow">
        {desc}
      </p>
      
      <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-brand-600 transition-colors mt-auto">
        Acessar <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-12">
      
      {/* Cabeçalho de Boas-vindas */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        {profile?.logoUrl ? (
          <img src={profile.logoUrl} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-xl p-1 shadow-lg z-10" />
        ) : (
          <div className="w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm z-10">
            <Building2 className="w-10 h-10 text-white" />
          </div>
        )}
        
        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-3xl font-bold mb-2">
            Olá, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            Bem-vindo ao painel de gestão do <span className="font-semibold text-white">{profile?.studioName || 'seu Studio'}</span>. 
            Siga as etapas abaixo para organizar e crescer seu negócio.
          </p>
        </div>
      </div>

      {/* ETAPA 1: CADASTROS (Fundação) */}
      <section>
        <StepHeader 
          step="1" 
          title="Cadastros & Organização" 
          description="A base do seu estúdio. Mantenha os dados sempre atualizados."
          colorClass="border-blue-500"
          icon={Layers}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-6 md:ml-8 lg:ml-8">
          <ActionCard 
            to={AppRoute.PROFILE}
            title="Perfil do Studio"
            desc="Configure sua marca, contatos e preferências do sistema."
            icon={Building2}
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
          <ActionCard 
            to={AppRoute.INSTRUCTORS}
            title="Equipe de Instrutores"
            desc="Gerencie cadastros e controle de acesso da sua equipe."
            icon={BookUser}
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
          <ActionCard 
            to={AppRoute.STUDENTS}
            title="Meus Alunos"
            desc="Fichas de cadastro, contatos e gestão de acesso ao app."
            icon={Users}
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
        </div>
      </section>

      {/* ETAPA 2: PLANEJAMENTO E EXECUÇÃO (Ação) */}
      <section>
        <StepHeader 
          step="2" 
          title="Planejamento e Execução" 
          description="Ferramentas inteligentes para gerir o dia a dia e definir o futuro."
          colorClass="border-brand-500"
          icon={Sparkles}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-6 md:ml-8 lg:ml-8">
          <ActionCard 
            to={AppRoute.STRATEGY}
            title="Planejamento Estratégico"
            desc="Defina visão, missão e plano de ação anual com consultoria IA."
            icon={Compass}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.REHAB}
            title="Pilates Rehab"
            desc="Guia de patologias e gerador de aulas com triagem clínica."
            icon={Activity}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.CONTENT_AGENT}
            title="Assistente de Conteúdo"
            desc="Crie posts, legendas e calendários para redes sociais."
            icon={Wand2}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.FINANCE}
            title="Calculadora Financeira"
            desc="Simule cenários de contratação e custos operacionais."
            icon={Calculator}
            color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.PRICING}
            title="Preço Inteligente"
            desc="Calcule o preço ideal da sua hora-aula e mensalidades."
            icon={Banknote}
            color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.NEWSLETTER_AGENT}
            title="Criador de Newsletter"
            desc="Escreva comunicados e avisos profissionais em segundos."
            icon={Newspaper}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
            isAi
          />
        </div>
      </section>

      {/* ETAPA 3: ACOMPANHAMENTO (Feedback) */}
      <section>
        <StepHeader 
          step="3" 
          title="Acompanhamento & Qualidade" 
          description="Monitore resultados, satisfação e evolução dos alunos."
          colorClass="border-emerald-500"
          icon={LineChart}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-6 md:ml-8 lg:ml-8">
          <ActionCard 
            to={AppRoute.EVOLUTION}
            title="Evolução do Aluno"
            desc="Registre progresso, dores e gere relatórios de desempenho."
            icon={TrendingUp}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.STUDIO_EVALUATIONS}
            title="Avaliações das Aulas"
            desc="Monitore o feedback diário dos alunos sobre as aulas."
            icon={Star}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.STUDIO_SUGGESTIONS}
            title="Caixa de Sugestões"
            desc="Analise feedbacks e crie planos de melhoria com IA."
            icon={MessageSquare}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            isAi
          />
        </div>
      </section>

    </div>
  );
};
