
import React, { createContext, useContext, useState, useEffect } from 'react';

// Top 10 Languages
export type Language = 
  | 'pt' // Portuguese (Brazil)
  | 'en' // English (US)
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'zh' // Chinese
  | 'ja' // Japanese
  | 'ru' // Russian
  | 'ko'; // Korean

export type Terminology = 'student' | 'client';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  terminology: Terminology;
  setTerminology: (term: Terminology) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

type TranslationDict = Record<string, string>;

const translations: Record<Language, TranslationDict> = {
  pt: {
    // Menu & General
    'general_panel': 'Painel Geral',
    'registrations': 'Cadastros',
    'studio_profile': 'Perfil do Studio',
    'team': 'Equipe',
    'students': 'Meus Alunos',
    'settings': 'Configurações',
    'strategy': 'Estratégia',
    'planning_ai': 'Planejamento Estratégico',
    'pilates_rehab': 'Pilates Rehab',
    'content_agent': 'Instagram',
    'finance_calc': 'Cálculo de Contratação',
    'smart_pricing': 'Precificação',
    'newsletter': 'Criador Newsletter',
    'tracking': 'Acompanhamento',
    'student_evolution': 'Evolução do Aluno',
    'class_ratings': 'Avaliações Aulas',
    'suggestions': 'Sugestões Alunos',
    'surveys_title': 'Pesquisas',
    'dark_mode': 'Escuro',
    'light_mode': 'Claro',
    'logout': 'Sair',
    'admin_panel': 'Painel Admin',
    'owner': 'Dono',
    'instructor': 'Instrutor',
    'student': 'Aluno',
    'save_all': 'Salvar Tudo',
    'save': 'Salvar',
    'cancel': 'Cancelar',
    'edit': 'Editar',
    'delete': 'Excluir',
    'loading': 'Carregando...',
    'search': 'Buscar...',
    'actions': 'Ações',
    'active': 'Ativo',
    'inactive': 'Inativo',
    'new': 'Novo',
    'view_details': 'Ver Detalhes',
    'back': 'Voltar',
    'next': 'Próximo',
    'history': 'Histórico',
    'clear': 'Limpar',
    'welcome_platform': 'Bem-vindo à Plataforma VOLL IA',
    'access_area': 'Acesse seus treinos e receitas',
    'instructor_portal': 'Portal do Instrutor',
    'student_area': 'Área do Aluno',
    'enter_button': 'Entrar',
    'email_label': 'Email',
    'password_label': 'Senha',
    'login_error': 'Email ou senha incorretos.',
    'generate_btn': 'Gerar Conteúdo',
    'result_title': 'Resultado Gerado',
    'what_create': 'O que você quer criar hoje?',
    'format_label': 'Formato',
    'objective_label': 'Objetivo',
    'theme_label': 'Tema',
    'audience_label': 'Público Alvo',
    'finance_title': 'Agente Financeiro',
    'finance_subtitle': 'Simule cenários de contratação e viabilidade.',
    'rehab_title': 'Guia Clínico & Rehab',
    'clinical_guide': 'Guia Clínico',
    'clinical_guide_desc': 'Inteligência Artificial para auxiliar no raciocínio clínico e montagem de aulas.',
    'select_student_required': 'Selecione um aluno para iniciar',
    'main_complaint': 'Qual a queixa principal, patologia ou objetivo?',
    'consult': 'Consultar',
    'lesson_plan': 'Plano de Aula',
    'exercise_bank': 'Banco de Exercícios',
    'reference': 'Referência',
    'create_exercise': 'Criar Exercício',
    'marketing_title': 'Agente de Marketing',
    'content_subtitle': 'Crie conteúdo estratégico de alta conversão em segundos.',
    'creations_today': 'Criações Hoje',
    'download_pdf': 'Baixar PDF',
    
    // Dashboard Cards
    'step_1_title': 'Cadastros & Organização',
    'step_1_desc': 'A base do seu estúdio. Mantenha os dados sempre atualizados.',
    'step_2_title': 'Planejamento e Execução',
    'step_2_desc': 'Ferramentas inteligentes para gerir o dia a dia e definir o futuro.',
    'step_3_title': 'Acompanhamento & Qualidade',
    'step_3_desc': 'Monitore resultados, satisfação e evolução dos alunos.',
    'card_profile_desc': 'Configure sua marca, contatos e preferências do sistema.',
    'card_team_desc': 'Gerencie cadastros e controle de acesso da sua equipe.',
    'card_students_desc': 'Fichas de cadastro, contatos e gestão de acesso ao app.',
    'card_strategy_desc': 'Defina visão, missão e plano de ação anual com consultoria IA.',
    'card_rehab_desc': 'Guia de patologias e gerador de aulas com triagem clínica.',
    'card_content_desc': 'Crie posts, legendas e calendários para redes sociais.',
    'card_finance_desc': 'Simule cenários de contratação e custos operacionais.',
    'card_pricing_desc': 'Calcule o preço ideal da sua hora-aula e mensalidades.',
    'card_newsletter_desc': 'Escreva comunicados e avisos profissionais em segundos.',
    'card_evolution_desc': 'Registre progresso, dores e gere relatórios de desempenho.',
    'card_ratings_desc': 'Monitore o feedback diário dos alunos sobre as aulas.',
    'card_suggestions_desc': 'Analise feedbacks e crie planos de melhoria com IA.',
    'card_surveys_desc': 'Crie e gerencie pesquisas de satisfação personalizadas.',
    'access_link': 'Acessar',

    // Settings
    'settings_title': 'Configurações do Studio',
    'settings_subtitle': 'Gerencie preferências e idioma da plataforma.',
    'email_integration': 'Integração de Email',
    'email_desc': 'Conecte seu Gmail para facilitar o envio de mensagens.',
    'language_settings': 'Preferências de Idioma',
    'language_desc': 'Escolha o idioma de exibição da plataforma.',
    'terminology_settings': 'Nomenclatura do Sistema',
    'terminology_desc': 'Escolha como se referir aos seus alunos/clientes em todo o sistema.',

    // Content Agent
    'mode_single': 'Post Único',
    'mode_story': 'Sequência de Stories',
    'mode_plan': 'Plano 4 Semanas',
    'goal_attract': 'Atrair Novos Alunos',
    'goal_retain': 'Fidelizar / Engajar',
    'goal_educate': 'Educativo / Informativo',
    'goal_inspire': 'Inspiracional / Motivacional',
    'goal_sell': 'Vendas / Promoção',
    'generate_suggestions': 'Gerar Sugestões com IA',
    'topic_placeholder': 'Ex: Benefícios do Pilates para dor nas costas...',
    'btn_generate_content': 'Gerar Conteúdo',
    'btn_generate_plan': 'Gerar Planejamento',
    'chosen_strategy': 'Estratégia Escolhida',
    'caption': 'Legenda',
    'visual_description': 'Descrição Visual',
    'save_post': 'Salvar Post',
    'copy': 'Copiar',

    // Financial Agent
    'calc_studio_capacity': '1. Capacidade do Estúdio',
    'calc_professional_data': '2. Dados do Profissional',
    'calc_financial_model': '3. Modelo Financeiro (Metas)',
    'lbl_monthly_price': 'Mensalidade Média',
    'lbl_occupancy': 'Taxa de Ocupação',
    'lbl_hours_day': 'Horas/Dia',
    'lbl_clients_hour': 'Alunos/Hora',
    'lbl_prof_hours': 'Horas Semanais Prof.',
    'lbl_commission': '% Repasse (Comissão)',
    'lbl_payroll': 'Folha (Max %)',
    'lbl_operating': 'Custos Oper. (%)',
    'lbl_profit': 'Lucro/Reserva (%)',
    'generate_analysis': 'Gerar Análise IA',
    'analysis_result': 'Análise Financeira',
  },
  en: {
    // Menu & General
    'general_panel': 'Dashboard',
    'registrations': 'Registration',
    'studio_profile': 'Studio Profile',
    'team': 'Team',
    'students': 'My Students',
    'settings': 'Settings',
    'strategy': 'Strategy',
    'planning_ai': 'Strategic Planning',
    'pilates_rehab': 'Pilates Rehab',
    'content_agent': 'Instagram',
    'finance_calc': 'Hiring Calculator',
    'smart_pricing': 'Smart Pricing',
    'newsletter': 'Newsletter Creator',
    'tracking': 'Tracking',
    'student_evolution': 'Student Evolution',
    'class_ratings': 'Class Ratings',
    'suggestions': 'Student Suggestions',
    'surveys_title': 'Surveys',
    'dark_mode': 'Dark',
    'light_mode': 'Light',
    'logout': 'Logout',
    'admin_panel': 'Admin Panel',
    'owner': 'Owner',
    'instructor': 'Instructor',
    'student': 'Student',
    'save_all': 'Save All',
    'save': 'Save',
    'cancel': 'Cancel',
    'edit': 'Edit',
    'delete': 'Delete',
    'loading': 'Loading...',
    'search': 'Search...',
    'actions': 'Actions',
    'active': 'Active',
    'inactive': 'Inactive',
    'new': 'New',
    'view_details': 'View Details',
    'back': 'Back',
    'next': 'Next',
    'history': 'History',
    'clear': 'Clear',
    'welcome_platform': 'Welcome to VOLL IA Platform',
    'access_area': 'Access your workouts and recipes',
    'instructor_portal': 'Instructor Portal',
    'student_area': 'Student Area',
    'enter_button': 'Sign In',
    'email_label': 'Email',
    'password_label': 'Password',
    'login_error': 'Invalid email or password.',
    'generate_btn': 'Generate Content',
    'result_title': 'Generated Result',
    'what_create': 'What do you want to create today?',
    'format_label': 'Format',
    'objective_label': 'Objective',
    'theme_label': 'Theme',
    'audience_label': 'Target Audience',
    'finance_title': 'Financial Agent',
    'finance_subtitle': 'Simulate hiring scenarios and feasibility.',
    'rehab_title': 'Clinical & Rehab Guide',
    'clinical_guide': 'Clinical Guide',
    'clinical_guide_desc': 'Artificial Intelligence to assist in clinical reasoning and class planning.',
    'select_student_required': 'Select a student to start',
    'main_complaint': 'What is the main complaint, pathology, or goal?',
    'consult': 'Consult',
    'lesson_plan': 'Lesson Plan',
    'exercise_bank': 'Exercise Bank',
    'reference': 'Reference',
    'create_exercise': 'Create Exercise',
    'marketing_title': 'Marketing Agent',
    'content_subtitle': 'Create high-converting strategic content in seconds.',
    'creations_today': 'Creations Today',
    'download_pdf': 'Download PDF',

    // Dashboard Cards
    'step_1_title': 'Records & Organization',
    'step_1_desc': 'The foundation of your studio. Keep data up to date.',
    'step_2_title': 'Planning & Execution',
    'step_2_desc': 'Smart tools to manage daily operations and define the future.',
    'step_3_title': 'Tracking & Quality',
    'step_3_desc': 'Monitor results, satisfaction, and student progress.',
    'card_profile_desc': 'Configure your brand, contacts, and system preferences.',
    'card_team_desc': 'Manage records and access control for your team.',
    'card_students_desc': 'Registration forms, contacts, and app access management.',
    'card_strategy_desc': 'Define vision, mission, and annual action plan with AI consulting.',
    'card_rehab_desc': 'Pathology guide and class generator with clinical triage.',
    'card_content_desc': 'Create posts, captions, and calendars for social media.',
    'card_finance_desc': 'Simulate hiring scenarios and operating costs.',
    'card_pricing_desc': 'Calculate the ideal price for your classes and monthly plans.',
    'card_newsletter_desc': 'Write professional announcements and notices in seconds.',
    'card_evolution_desc': 'Register progress, pain points, and generate performance reports.',
    'card_ratings_desc': 'Monitor daily student feedback on classes.',
    'card_suggestions_desc': 'Analyze feedback and create improvement plans with AI.',
    'card_surveys_desc': 'Create and manage personalized satisfaction surveys.',
    'access_link': 'Access',

    // Settings
    'settings_title': 'Studio Settings',
    'settings_subtitle': 'Manage platform preferences and language.',
    'email_integration': 'Email Integration',
    'email_desc': 'Connect your Gmail to easily send messages.',
    'language_settings': 'Language Preferences',
    'language_desc': 'Choose the display language for the platform.',
    'terminology_settings': 'System Terminology',
    'terminology_desc': 'Choose how to refer to your students/clients across the system.',

    // Content Agent
    'mode_single': 'Single Post',
    'mode_story': 'Story Sequence',
    'mode_plan': '4-Week Plan',
    'goal_attract': 'Attract New Students',
    'goal_retain': 'Retain / Engage',
    'goal_educate': 'Educate / Inform',
    'goal_inspire': 'Inspire / Motivate',
    'goal_sell': 'Sales / Promo',
    'generate_suggestions': 'Generate AI Suggestions',
    'topic_placeholder': 'Ex: Pilates benefits for back pain...',
    'btn_generate_content': 'Generate Content',
    'btn_generate_plan': 'Generate Plan',
    'chosen_strategy': 'Chosen Strategy',
    'caption': 'Caption',
    'visual_description': 'Visual Description',
    'save_post': 'Save Post',
    'copy': 'Copy',

    // Financial Agent
    'calc_studio_capacity': '1. Studio Capacity',
    'calc_professional_data': '2. Professional Data',
    'calc_financial_model': '3. Financial Model (Targets)',
    'lbl_monthly_price': 'Average Monthly Fee',
    'lbl_occupancy': 'Occupancy Rate',
    'lbl_hours_day': 'Hours/Day',
    'lbl_clients_hour': 'Clients/Hour',
    'lbl_prof_hours': 'Instructor Weekly Hours',
    'lbl_commission': 'Commission %',
    'lbl_payroll': 'Payroll (Max %)',
    'lbl_operating': 'Operating Costs (%)',
    'lbl_profit': 'Profit/Reserves (%)',
    'generate_analysis': 'Generate AI Analysis',
    'analysis_result': 'Financial Analysis',
  },
  es: {
    // Menu & General
    'general_panel': 'Panel General',
    'registrations': 'Registros',
    'studio_profile': 'Perfil del Estudio',
    'team': 'Equipo',
    'students': 'Mis Alumnos',
    'settings': 'Configuración',
    'strategy': 'Estrategia',
    'planning_ai': 'Planeación Estratégica',
    'pilates_rehab': 'Pilates Rehab',
    'content_agent': 'Instagram',
    'finance_calc': 'Cálculo de Contratación',
    'smart_pricing': 'Precios Inteligentes',
    'newsletter': 'Creador de Boletines',
    'tracking': 'Seguimiento',
    'student_evolution': 'Evolución del Alumno',
    'class_ratings': 'Calificación de Clases',
    'suggestions': 'Sugerencias',
    'surveys_title': 'Encuestas',
    'dark_mode': 'Oscuro',
    'light_mode': 'Claro',
    'logout': 'Salir',
    'welcome_platform': 'Bienvenido a la Plataforma VOLL IA',
    'step_1_title': 'Registros y Organización',
    'step_1_desc': 'La base de su estudio. Mantenga los datos actualizados.',
    'card_profile_desc': 'Configure su marca, contactos y preferencias del sistema.',
    'settings_title': 'Configuración del Estudio',
    'terminology_settings': 'Terminología del Sistema',
    'terminology_desc': 'Elija cómo referirse a sus alumnos/clientes en el sistema.',
    'enter_button': 'Entrar',
    'email_label': 'Correo electrónico',
    'password_label': 'Contraseña',
    'generate_btn': 'Generar Contenido',
    'result_title': 'Resultado Generado',
    'finance_title': 'Agente Financiero',
    'finance_subtitle': 'Simule escenarios de contratación.',
    'rehab_title': 'Guía Clínica & Rehab',
    'marketing_title': 'Agente de Marketing',
    'content_subtitle': 'Cree contenido estratégico en segundos.',
    'clinical_guide': 'Guía Clínica',
    'clinical_guide_desc': 'Inteligencia Artificial para ayudar en el razonamiento clínico.',
    'main_complaint': '¿Cuál es la queja principal o patología?',
    'consult': 'Consultar',
    
    // Content Agent
    'mode_single': 'Post Único',
    'mode_story': 'Secuencia de Historias',
    'mode_plan': 'Plan de 4 Semanas',
    'goal_attract': 'Atraer Nuevos Alumnos',
    'generate_suggestions': 'Generar Sugerencias con IA',
    'btn_generate_content': 'Generar Contenido',
    'save_post': 'Guardar Post',

    // Financial Agent
    'calc_studio_capacity': '1. Capacidad del Estudio',
    'calc_professional_data': '2. Datos del Profesional',
    'generate_analysis': 'Generar Análisis IA',
  },
  fr: {
    'general_panel': 'Tableau de Bord',
    'students': 'Mes Élèves',
    'settings': 'Paramètres',
    'welcome_platform': 'Bienvenue sur la plateforme VOLL IA',
    'terminology_settings': 'Terminologie du Système',
    'enter_button': 'Entrer',
    'email_label': 'E-mail',
    'password_label': 'Mot de passe',
    'generate_btn': 'Générer du contenu',
    'result_title': 'Résultat généré',
    'finance_title': 'Agent Financier',
    'rehab_title': 'Guide Clinique',
    'marketing_title': 'Agent Marketing',
    'generate_analysis': 'Générer une analyse IA',
  },
  de: {
    'general_panel': 'Dashboard',
    'students': 'Meine Schüler',
    'settings': 'Einstellungen',
    'welcome_platform': 'Willkommen bei der VOLL IA Plattform',
    'terminology_settings': 'Systemterminologie',
    'enter_button': 'Anmelden',
    'email_label': 'E-Mail',
    'password_label': 'Passwort',
    'generate_btn': 'Inhalt generieren',
    'result_title': 'Generiertes Ergebnis',
    'generate_analysis': 'KI-Analyse generieren',
  },
  it: {
    'general_panel': 'Pannello di Controllo',
    'students': 'I Miei Studenti',
    'settings': 'Impostazioni',
    'welcome_platform': 'Benvenuto nella Piattaforma VOLL IA',
    'terminology_settings': 'Terminologia di Sistema',
    'enter_button': 'Accedi',
    'email_label': 'Email',
    'password_label': 'Password',
    'generate_btn': 'Genera contenuto',
    'result_title': 'Risultato generato',
    'generate_analysis': 'Genera Analisi IA',
  },
  zh: {
    'general_panel': '仪表板',
    'students': '我的学生',
    'settings': '设置',
    'welcome_platform': '欢迎使用 VOLL IA 平台',
    'terminology_settings': '系统术语',
    'enter_button': '登录',
    'email_label': '电子邮件',
    'password_label': '密码',
    'generate_btn': '生成内容',
    'result_title': '生成结果',
    'generate_analysis': '生成 AI 分析',
  },
  ja: {
    'general_panel': 'ダッシュボード',
    'students': '私の生徒',
    'settings': '設定',
    'welcome_platform': 'VOLL IA プラットフォームへようこそ',
    'terminology_settings': 'システム用語',
    'enter_button': 'ログイン',
    'email_label': 'メール',
    'password_label': 'パスワード',
    'generate_btn': 'コンテンツを生成',
    'result_title': '生成結果',
    'generate_analysis': 'AI分析を生成',
  },
  ru: {
    'general_panel': 'Панель управления',
    'students': 'Мои студенты',
    'settings': 'Настройки',
    'welcome_platform': 'Добро пожаловать на платформу VOLL IA',
    'terminology_settings': 'Терминология системы',
    'enter_button': 'Войти',
    'email_label': 'Электронная почта',
    'password_label': 'Пароль',
    'generate_btn': 'Создать контент',
    'result_title': 'Сгенерированный результат',
    'generate_analysis': 'Создать анализ ИИ',
  },
  ko: {
    'general_panel': '대시보드',
    'students': '나의 학생들',
    'settings': '설정',
    'welcome_platform': 'VOLL IA 플랫폼에 오신 것을 환영합니다',
    'terminology_settings': '시스템 용어',
    'enter_button': '로그인',
    'email_label': '이메일',
    'password_label': '비밀번호',
    'generate_btn': '콘텐츠 생성',
    'result_title': '생성된 결과',
    'generate_analysis': 'AI 분석 생성',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'pt';
  });
  
  const [terminology, setTerminology] = useState<Terminology>(() => {
    return (localStorage.getItem('app_terminology') as Terminology) || 'student';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app_terminology', terminology);
  }, [terminology]);

  const t = (key: string): string => {
    const dict = translations[language] || translations['pt'];
    // Fallback to Portuguese if key missing in selected language
    let text = dict[key] || translations['pt'][key] || key;

    // Terminology Replacement Logic (Applied to the translated string)
    if (terminology === 'client') {
      // Portuguese replacements
      text = text.replace(/Aluno/g, 'Cliente');
      text = text.replace(/Alunos/g, 'Clientes');
      text = text.replace(/Aluna/g, 'Cliente');
      text = text.replace(/Alunas/g, 'Clientes');
      text = text.replace(/aluno/g, 'cliente');
      text = text.replace(/alunos/g, 'clientes');
      
      // English replacements
      text = text.replace(/Student/g, 'Client');
      text = text.replace(/Students/g, 'Clients');
      text = text.replace(/student/g, 'client');
      text = text.replace(/students/g, 'clients');
      
      // Spanish replacements
      text = text.replace(/Alumno/g, 'Cliente');
      text = text.replace(/Alumnos/g, 'Clientes');
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, terminology, setTerminology, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
