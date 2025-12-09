
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { AppRoute, StudioProfile } from '../types';
import { 
  Users, Sparkles, Compass, ArrowRight, Building2, Calculator, 
  Banknote, Activity, MessageSquare, Newspaper, Wand2, Star, 
  BookUser, TrendingUp, Layers, LineChart, ClipboardList, User, MessageCircle, FileText, Bell, CheckCircle, Rocket, Trophy, GraduationCap, Tag
} from 'lucide-react';
import { fetchProfile } from '../services/storage';
import { fetchDashboardNotifications, DashboardNotification, dismissNotificationLocal } from '../services/notificationService';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  // REDIRECT IMMEDIATELY if Instructor
  if (user?.isInstructor) {
      return <Navigate to={AppRoute.INSTRUCTOR_DASHBOARD} replace />;
  }

  useEffect(() => {
    const loadData = async () => {
      // Se for dono, usa o id.
      const targetId = user?.id;
      
      if (targetId) {
        const [profileData, notifs] = await Promise.all([
            fetchProfile(targetId),
            fetchDashboardNotifications(targetId)
        ]);
        setProfile(profileData);
        setNotifications(notifs);
      }
      setLoading(false);
    };
    loadData();
  }, [user, navigate]);

  const handleNotificationClick = async (notif: DashboardNotification) => {
    // 1. Remove from UI immediately
    setNotifications(prev => prev.filter(n => n !== notif));

    // 2. Perform logic (Dismiss)
    dismissNotificationLocal(notif.type);

    // 3. Navigate
    navigate(notif.link);
  };

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
        {t('access_link')} <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-12">
      
      {/* Cabeçalho de Boas-vindas */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        {/* Lado Esquerdo: Foto Proprietário + Texto */}
        <div className="flex flex-col md:flex-row items-center gap-6 z-10">
            {/* Foto Proprietário */}
            {profile?.ownerPhotoUrl ? (
                <img 
                    src={profile.ownerPhotoUrl} 
                    alt="Proprietário" 
                    className="w-24 h-24 rounded-full border-4 border-white/20 object-cover shadow-lg flex-shrink-0" 
                />
            ) : (
                <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <User className="w-10 h-10 text-white/80" />
                </div>
            )}

            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                    {t('hello')}, {user?.name.split(' ')[0]}!
                </h1>
                <p className="text-slate-300 text-lg max-w-xl">
                    {t('dashboard_welcome')} <span className="font-semibold text-white">{profile?.studioName || 'Studio'}</span>. 
                </p>
            </div>
        </div>
        
        {/* Lado Direito: Logo do Studio */}
        <div className="z-10 mt-4 md:mt-0">
            {profile?.logoUrl ? (
            <img src={profile.logoUrl} alt="Logo Studio" className="w-24 h-24 object-contain bg-white rounded-xl p-2 shadow-lg" />
            ) : (
            <div className="w-24 h-24 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="w-10 h-10 text-white" />
            </div>
            )}
        </div>
      </div>

      {/* NOTIFICATIONS SECTION */}
      {notifications.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-600 animate-pulse" /> Notificações & Alertas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notifications.map((notif, index) => (
                    <div 
                        key={index} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 rounded-xl border shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-1 cursor-pointer ${
                            notif.type === 'content_plan' ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800' :
                            'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                        }`}
                    >
                        <div className={`p-2 rounded-lg shrink-0 ${
                            notif.type === 'content_plan' ? 'bg-purple-100 text-purple-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                            {(notif.type === 'survey_student' || notif.type === 'survey_instructor') && <ClipboardList className="w-5 h-5" />}
                            {notif.type === 'content_plan' && <Wand2 className="w-5 h-5" />}
                        </div>
                        <div>
                            <h4 className={`font-bold text-sm ${
                                notif.type === 'content_plan' ? 'text-purple-800 dark:text-purple-300' :
                                'text-blue-800 dark:text-blue-300'
                            }`}>
                                {notif.message}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{notif.detail}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}

      {/* ETAPA 1: CADASTROS (Fundação) */}
      <section>
        <StepHeader 
          step="1" 
          title={t('step_1_title')} 
          description={t('step_1_desc')}
          colorClass="border-blue-500"
          icon={Layers}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-6 md:ml-8 lg:ml-8">
          <ActionCard 
            to={AppRoute.PROFILE}
            title={t('studio_profile')}
            desc={t('card_profile_desc')}
            icon={Building2}
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
          <ActionCard 
            to={AppRoute.INSTRUCTORS}
            title={t('team')}
            desc={t('card_team_desc')}
            icon={BookUser}
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
          <ActionCard 
            to={AppRoute.STUDENTS}
            title={t('students')}
            desc={t('card_students_desc')}
            icon={Users}
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
        </div>
      </section>

      {/* ETAPA 2: PLANEJAMENTO E EXECUÇÃO (Ação) */}
      <section>
        <StepHeader 
          step="2" 
          title={t('step_2_title')} 
          description={t('step_2_desc')}
          colorClass="border-brand-500"
          icon={Sparkles}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-6 md:ml-8 lg:ml-8">
          <ActionCard 
            to={AppRoute.STRATEGY}
            title={t('planning_ai')}
            desc={t('card_strategy_desc')}
            icon={Compass}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.ACTION_AGENT}
            title="Agente de Ação"
            desc="Crie campanhas e eventos para o studio."
            icon={Rocket}
            color="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.CONTENT_AGENT}
            title={t('content_agent')}
            desc={t('card_content_desc')}
            icon={Wand2}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.WHATSAPP_AGENT}
            title="WhatsApp"
            desc="Crie scripts de vendas e atendimento prontos para usar."
            icon={MessageCircle}
            color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.REHAB}
            title={t('pilates_rehab')}
            desc={t('card_rehab_desc')}
            icon={Activity}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.FINANCE}
            title={t('finance_calc')}
            desc={t('card_finance_desc')}
            icon={Calculator}
            color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.PRICING}
            title={t('smart_pricing')}
            desc={t('card_pricing_desc')}
            icon={Banknote}
            color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.NEWSLETTER_AGENT}
            title={t('newsletter')}
            desc={t('card_newsletter_desc')}
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
          title={t('step_3_title')} 
          description={t('step_3_desc')}
          colorClass="border-emerald-500"
          icon={LineChart}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-6 md:ml-8 lg:ml-8">
          <ActionCard 
            to={AppRoute.STUDENT_ASSESSMENT}
            title="Avaliação Física"
            desc="Anamnese e testes físicos completos."
            icon={ClipboardList}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.EVOLUTION}
            title={t('student_evolution')}
            desc={t('card_evolution_desc')}
            icon={TrendingUp}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.STUDIO_EVALUATIONS}
            title={t('class_ratings')}
            desc={t('card_ratings_desc')}
            icon={Star}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.SURVEY_MANAGER}
            title={t('surveys_title')}
            desc={t('card_surveys_desc')}
            icon={FileText}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
          />
          <ActionCard 
            to={AppRoute.STUDIO_SUGGESTIONS}
            title={t('suggestions')}
            desc={t('card_suggestions_desc')}
            icon={MessageSquare}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            isAi
          />
        </div>
      </section>

      {/* ETAPA 4: COMUNIDADE E EDUCAÇÃO */}
      <section>
        <StepHeader 
          step="4" 
          title="Comunidade e Educação" 
          description="Desenvolvimento técnico e benefícios exclusivos."
          colorClass="border-yellow-500"
          icon={GraduationCap}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-6 md:ml-8 lg:ml-8">
          <ActionCard 
            to={AppRoute.PILATES_QUEST}
            title="Pilates Quest"
            desc="Educação diária gamificada sobre o método."
            icon={Trophy}
            color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
            isAi
          />
          <ActionCard 
            to={AppRoute.STUDENT_PARTNERS}
            title="Parceiros e Descontos"
            desc="Clube de benefícios e parcerias exclusivas."
            icon={Tag}
            color="bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400"
          />
        </div>
      </section>

    </div>
  );
};
