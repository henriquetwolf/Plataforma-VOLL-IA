

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

// Helper type for translation object
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
    
    // Content Agent
    'content_title': 'Instagram',
    'content_subtitle': 'Crie posts, imagens e vídeos alinhados à sua marca.',
    'tab_persona': 'Minha Marca',
    'tab_generator': 'Criar',
    'tab_planner': 'Planejador',
    'persona_title': 'Definição da Persona do Studio',
    'persona_desc': 'A IA usará estas informações para escrever como você.',
    'philosophy_label': 'Filosofia do Studio',
    'differentiators_label': 'Diferenciais',
    'avoid_terms_label': 'Linguagem a Evitar',
    'save_persona_btn': 'Salvar Persona',
    'creations_today': 'Criações Hoje',
    'limit_reached': 'Limite Diário Atingido',
    'limit_desc': 'Você atingiu o limite de criações.',
    'what_create': 'O que vamos criar hoje?',
    'theme_label': 'Tema do Conteúdo',
    'format_label': 'Formato',
    'objective_label': 'Objetivo',
    'audience_label': 'Público',
    'visual_style_label': 'Estilo Visual',
    'logo_config_label': 'Configuração de Logo',
    'generate_btn': 'Gerar Conteúdo',
    'recent_posts': 'Posts Salvos Recentemente',
    'result_title': 'Resultado Gerado',
    'download_media': 'Baixar Mídia',
    'observations_label': 'Observações',
    'refine_btn': 'Regenerar',
    'new_plan': 'Gerar Novo Plano Estratégico',
    'duration_label': 'Duração do Plano',
    'frequency_label': 'Posts por Semana',
    'start_date_label': 'Data de Início',
    'generate_calendar_btn': 'Gerar Calendário',
    'saved_plans': 'Planos Salvos',

    // Financial Agent
    'finance_title': 'Cálculo de Contratação',
    'finance_subtitle': 'Simule custos de contratação e viabilidade econômica.',
    'projected_revenue': 'Faturamento Projetado',
    'compare_models': 'Comparativo de Modelos',
    'cost_details': 'Detalhamento dos Custos',
    'ai_analysis': 'Análise Inteligente',
    'generate_analysis_btn': 'Gerar Parecer',
    'save_simulation_btn': 'Salvar Análise',
    'download_pdf': 'Baixar PDF',

    // Pricing Agent
    'pricing_title': 'Precificação',
    'pricing_subtitle': 'Defina sua precificação com base em custos reais.',
    'step_by_step': 'Passo a Passo',
    'full_view': 'Visão Completa',
    'step': 'Passo',
    'studio_info_title': 'Informações do Studio',
    'fixed_costs_title': 'Custos Fixos Mensais',
    'variable_costs_title': 'Custos Variáveis e Lucro',
    'capacity_title': 'Capacidade Operacional',
    'market_title': 'Análise de Mercado (Opcional)',
    'pricing_history': 'Histórico de Precificação',
    
    // Settings
    'settings_title': 'Configurações do Studio',
    'settings_subtitle': 'Gerencie preferências e idioma da plataforma.',
    'email_integration': 'Integração de Email',
    'email_desc': 'Conecte seu Gmail para facilitar o envio de mensagens.',
    'language_settings': 'Preferências de Idioma',
    'language_desc': 'Escolha o idioma de exibição da plataforma.',
    'terminology_settings': 'Nomenclatura do Sistema',
    'terminology_desc': 'Escolha como se referir aos seus alunos/clientes em todo o sistema.',

    // Login
    'welcome_login': 'Bem-vindo(a)',
    'login_subtitle': 'Faça login para acessar a plataforma',
    'email_label': 'Email',
    'password_label': 'Senha',
    'enter_button': 'Entrar',
    'no_account': 'Não tem conta?',
    'register_link': 'Cadastrar Studio',
    'login_error': 'Email ou senha incorretos.',

    // Dashboard
    'hello': 'Olá',
    'dashboard_welcome': 'Bem-vindo ao painel de gestão do',
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

    // Profile
    'profile_basic_info': 'Informações Básicas',
    'studio_name_label': 'Nome do Studio',
    'owner_name_label': 'Nome do Proprietário(a)',
    'bio_label': 'Biografia do Studio',
    'ai_write_btn': 'IA Escreva para mim',
    'visual_identity': 'Identidade Visual',
    'logo_label': 'Logomarca',
    'brand_color_label': 'Cor Principal',
    'services_label': 'Serviços',
    'specialties_label': 'Especialidades',
    'contact_label': 'Contato',
    'address_label': 'Endereço',
    'phone_label': 'Telefone',
    'website_label': 'Site',
    'save_profile_btn': 'Salvar Perfil',

    // Students
    'students_title': 'Alunos do Studio',
    'my_students_title': 'Meus Alunos',
    'students_subtitle': 'Gerencie o cadastro e acesso ao portal.',
    'new_student_btn': 'Novo Aluno',
    'name_col': 'Nome',
    'contact_col': 'Contato',
    'access_col': 'Acesso',
    'student_name_label': 'Nome Completo',
    'student_email_label': 'Email (Login)',
    'student_cpf_label': 'CPF',
    'student_obs_label': 'Observações Clínicas',
    'save_student_btn': 'Cadastrar e Liberar Acesso',
    'update_student_btn': 'Salvar Alterações',
    'no_students_found': 'Nenhum aluno encontrado.',

    // Admin
    'admin_title': 'Painel Admin Global',
    'admin_subtitle': 'Gestão completa de usuários e métricas.',
    'admin_tab_dashboard': 'Dashboard',
    'admin_tab_list': 'Lista Completa',
    'admin_tab_owners': 'Donos',
    'admin_tab_instructors': 'Instrutores',
    'admin_tab_students': 'Alunos',
    'admin_tab_suggestions': 'Sugestões',
    'admin_tab_costs': 'Custo API',
    'admin_kpi_studios': 'Total Studios',
    'admin_kpi_students': 'Total Alunos',
    'admin_kpi_content': 'Conteúdo Gerado',
    'admin_kpi_engagement': 'Engajamento',
    'admin_timeline_title': 'Evolução no Tempo',
    'admin_dist_users': 'Distribuição de Usuários Ativos',
    'admin_vol_prod': 'Volume de Produção',
    'admin_avg_instructors': 'Média Instrutores',
    'admin_avg_students': 'Média Alunos',
    'admin_avg_posts': 'Média Posts',
    'admin_avg_engagement': 'Média Engajamento',
    'admin_cost_total': 'Custo Total Estimado',
    'admin_cost_per_user': 'Custo por Usuário',

    // Strategy Agent
    'strategy_agent_title': 'Planejamento Estratégico',
    'strategy_agent_desc': 'Transforme seus objetivos em um plano de ação claro e prático.',
    'create_plan': 'Criar Novo Plano',
    'view_history': 'Ver Histórico',
    'business_identity': 'Identidade do Negócio',
    'mission': 'Missão',
    'vision': 'Visão',
    'swot_analysis': 'Análise SWOT',
    'strengths': 'Forças',
    'weaknesses': 'Fraquezas',
    'opportunities': 'Oportunidades',
    'threats': 'Ameaças',
    'strategic_objectives': 'Objetivos Estratégicos',
    'action_plan': 'Plano de Ação',
    'generate_report': 'Gerar Relatório',
    'review': 'Revisão',
    
    // Rehab Agent
    'rehab_agent_title': 'Pilates Rehab',
    'clinical_guide': 'Guia Clínico Inteligente',
    'clinical_guide_desc': 'Selecione um aluno e descreva a patologia para gerar um plano de aula seguro.',
    'select_student_required': '1. Seleccione o Aluno (Obrigatório)',
    'main_complaint': '2. Queixa Principal (Ex: Hérnia, Dor no Ombro...)',
    'consult': 'Consultar',
    'reference': 'Referência',
    'lesson_plan': 'Plano de Aula',
    'exercise_bank': 'Banco de Exercícios',
    'indicated': 'Indicados',
    'contraindicated': 'Contra-Indicados',
    'save_to_bank': 'Salvar no Banco',
    'create_exercise': 'Novo Exercício',

    // Newsletter Agent
    'newsletter_title': 'Criador de Newsletter',
    'newsletter_subtitle': 'Crie comunicados profissionais com ajuda da IA.',
    'create_new': 'Criar Nova',
    'target_audience': 'Público Alvo',
    'topic_label': 'Tópico / Assunto',
    'style_label': 'Estilo do Texto',
    'generate_newsletter': 'Gerar Newsletter',
    'preview': 'Pré-visualização',
    'generated_success': 'Gerado com Sucesso',
    'discard': 'Descartar',
    'audience_students': 'Alunos',
    'audience_instructors': 'Instrutores',
    'audience_both': 'Geral',

    // Evolution
    'evolution_title': 'Evolução do Aluno',
    'evolution_subtitle': 'Acompanhamento de progresso e relatórios.',
    'new_entry': 'Nova Avaliação',
    'reports_analysis': 'Relatórios & Análise',
    'individual_record': 'Registro Individual',
    'execution': 'Execução',
    'stability': 'Estabilidade',
    'mobility': 'Mobilidade',
    'strength': 'Força',
    'coordination': 'Coordenação',
    'complaints_care': 'Queixas e Cuidados',
    'pain': 'Dor',
    'limitation': 'Limitação',
    'contraindication': 'Contraindicação',
    'save_evaluation': 'Salvar Avaliação',
    'recent_history': 'Histórico Recente',
    'generate_evolution_report': 'Gerar Relatório de Evolução IA',
    'evolution_filters': 'Filtros de Análise',

    // Evaluations (Ratings)
    'evaluations_title': 'Avaliações das Aulas',
    'evaluations_subtitle': 'Feedback recebido dos alunos após as aulas.',
    'evaluations_list': 'Lista de Avaliações',
    'saved_reports': 'Relatórios Salvos',
    'average': 'Média',
    'analyze_ai': 'Analisar com IA',
    'filters': 'Filtros',
    'all_instructors': 'Todos Instrutores',
    'all_students': 'Todos Alunos',
    'all_period': 'Todo o Período',
    'last_week': 'Última Semana',
    'last_month': 'Último Mês',
    'quality_report': 'Relatório de Qualidade',

    // Suggestions
    'suggestions_title': 'Gestão de Sugestões',
    'suggestions_subtitle': 'Transforme feedback dos alunos em planos de ação práticos.',
    'inbox': 'Caixa de Entrada',
    'analyze_list': 'Analisar Lista',
    'generate_action_plan': 'Gerar Plano de Ação',
    'recent_suggestions': 'Sugestões Recentes',
    'action_plan_generated': 'Plano de Ação Gerado',
    'trends_report': 'Relatório de Tendências',
  },
  en: {
    // ... existing EN translations ...
    'terminology_settings': 'System Terminology',
    'terminology_desc': 'Choose how to refer to your students/clients across the system.',
    // ... rest of keys ...
    'general_panel': 'Dashboard',
    'registrations': 'Records',
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
    'suggestions': 'Suggestions',
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
    'content_title': 'Instagram',
    'content_subtitle': 'Create posts, images, and videos aligned with your brand.',
    'tab_persona': 'My Brand',
    'tab_generator': 'Create',
    'tab_planner': 'Planner',
    'persona_title': 'Studio Persona Definition',
    'persona_desc': 'AI will use this info to write like you.',
    'philosophy_label': 'Studio Philosophy',
    'differentiators_label': 'Differentiators',
    'avoid_terms_label': 'Terms to Avoid',
    'save_persona_btn': 'Save Persona',
    'creations_today': 'Creations Today',
    'limit_reached': 'Daily Limit Reached',
    'limit_desc': 'You have reached the creation limit.',
    'what_create': 'What are we creating today?',
    'theme_label': 'Content Theme',
    'format_label': 'Format',
    'objective_label': 'Objective',
    'audience_label': 'Audience',
    'visual_style_label': 'Visual Style',
    'logo_config_label': 'Logo Configuration',
    'generate_btn': 'Generate Content',
    'recent_posts': 'Recently Saved Posts',
    'result_title': 'Generated Result',
    'download_media': 'Download Media',
    'observations_label': 'Observations',
    'refine_btn': 'Regenerate',
    'new_plan': 'Generate New Strategic Plan',
    'duration_label': 'Plan Duration',
    'frequency_label': 'Posts per Week',
    'start_date_label': 'Start Date',
    'generate_calendar_btn': 'Generate Calendar',
    'saved_plans': 'Saved Plans',
    'finance_title': 'Hiring Calculator',
    'finance_subtitle': 'Simulate hiring costs and economic viability.',
    'projected_revenue': 'Projected Revenue',
    'compare_models': 'Model Comparison',
    'cost_details': 'Cost Details',
    'ai_analysis': 'Smart Analysis',
    'generate_analysis_btn': 'Generate Analysis',
    'save_simulation_btn': 'Save Analysis',
    'download_pdf': 'Download PDF',
    'pricing_title': 'Smart Pricing',
    'pricing_subtitle': 'Define your pricing based on real costs.',
    'step_by_step': 'Step by Step',
    'full_view': 'Full View',
    'step': 'Step',
    'studio_info_title': 'Studio Info',
    'fixed_costs_title': 'Monthly Fixed Costs',
    'variable_costs_title': 'Variable Costs & Profit',
    'capacity_title': 'Operational Capacity',
    'market_title': 'Market Analysis (Optional)',
    'pricing_history': 'Pricing History',
    'settings_title': 'Studio Settings',
    'settings_subtitle': 'Manage platform preferences and language.',
    'email_integration': 'Email Integration',
    'email_desc': 'Connect your Gmail to easily send messages.',
    'language_settings': 'Language Preferences',
    'language_desc': 'Choose the display language for your user.',
    'welcome_login': 'Welcome',
    'login_subtitle': 'Login to access the platform',
    'email_label': 'Email',
    'password_label': 'Password',
    'enter_button': 'Sign In',
    'no_account': 'No account?',
    'register_link': 'Register Studio',
    'login_error': 'Invalid email or password.',
    'hello': 'Hello',
    'dashboard_welcome': 'Welcome to the management dashboard of',
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
    'profile_basic_info': 'Basic Information',
    'studio_name_label': 'Studio Name',
    'owner_name_label': 'Owner Name',
    'bio_label': 'Studio Biography',
    'ai_write_btn': 'AI Write for me',
    'visual_identity': 'Visual Identity',
    'logo_label': 'Logo',
    'brand_color_label': 'Main Color',
    'services_label': 'Services',
    'specialties_label': 'Specialties',
    'contact_label': 'Contact',
    'address_label': 'Address',
    'phone_label': 'Phone',
    'website_label': 'Website',
    'save_profile_btn': 'Save Profile',
    'students_title': 'Studio Students',
    'my_students_title': 'My Students',
    'students_subtitle': 'Manage registration and portal access.',
    'new_student_btn': 'New Student',
    'name_col': 'Name',
    'contact_col': 'Contact',
    'access_col': 'Access',
    'student_name_label': 'Full Name',
    'student_email_label': 'Email (Login)',
    'student_cpf_label': 'ID/SSN',
    'student_obs_label': 'Clinical Observations',
    'save_student_btn': 'Register & Grant Access',
    'update_student_btn': 'Save Changes',
    'no_students_found': 'No students found.',
    'admin_title': 'Global Admin Panel',
    'admin_subtitle': 'Complete management of users and metrics.',
    'admin_tab_dashboard': 'Dashboard',
    'admin_tab_list': 'Full List',
    'admin_tab_owners': 'Owners',
    'admin_tab_instructors': 'Instructors',
    'admin_tab_students': 'Students',
    'admin_tab_suggestions': 'Suggestions',
    'admin_tab_costs': 'API Cost',
    'admin_kpi_studios': 'Total Studios',
    'admin_kpi_students': 'Total Students',
    'admin_kpi_content': 'Content Generated',
    'admin_kpi_engagement': 'Engagement',
    'admin_timeline_title': 'Evolution Over Time',
    'admin_dist_users': 'Active User Distribution',
    'admin_vol_prod': 'Production Volume',
    'admin_avg_instructors': 'Avg Instructors',
    'admin_avg_students': 'Avg Students',
    'admin_avg_posts': 'Avg Posts',
    'admin_avg_engagement': 'Avg Engagement',
    'admin_cost_total': 'Total Estimated Cost',
    'admin_cost_per_user': 'Cost per User',
    'strategy_agent_title': 'Strategic Planning',
    'strategy_agent_desc': 'Transform your goals into a clear and practical action plan.',
    'create_plan': 'Create New Plan',
    'view_history': 'View History',
    'business_identity': 'Business Identity',
    'mission': 'Mission',
    'vision': 'Vision',
    'swot_analysis': 'SWOT Analysis',
    'strengths': 'Strengths',
    'weaknesses': 'Weaknesses',
    'opportunities': 'Opportunities',
    'threats': 'Threats',
    'strategic_objectives': 'Strategic Objectives',
    'action_plan': 'Action Plan',
    'generate_report': 'Generate Report',
    'review': 'Review',
    'rehab_agent_title': 'Pilates Rehab',
    'clinical_guide': 'Smart Clinical Guide',
    'clinical_guide_desc': 'Select a student and describe the pathology to generate a safe lesson plan.',
    'select_student_required': '1. Select Student (Required)',
    'main_complaint': '2. Main Complaint (e.g., Hernia, Shoulder Pain...)',
    'consult': 'Consult',
    'reference': 'Reference',
    'lesson_plan': 'Lesson Plan',
    'exercise_bank': 'Exercise Bank',
    'indicated': 'Indicated',
    'contraindicated': 'Contraindicated',
    'save_to_bank': 'Save to Bank',
    'create_exercise': 'New Exercise',
    'newsletter_title': 'Newsletter Creator',
    'newsletter_subtitle': 'Create professional announcements with AI help.',
    'create_new': 'Create New',
    'target_audience': 'Target Audience',
    'topic_label': 'Topic / Subject',
    'style_label': 'Text Style',
    'generate_newsletter': 'Generate Newsletter',
    'preview': 'Preview',
    'generated_success': 'Generated Successfully',
    'discard': 'Discard',
    'audience_students': 'Students',
    'audience_instructors': 'Instructors',
    'audience_both': 'General',
    'evolution_title': 'Student Evolution',
    'evolution_subtitle': 'Progress tracking and reports.',
    'new_entry': 'New Entry',
    'reports_analysis': 'Reports & Analysis',
    'individual_record': 'Individual Record',
    'execution': 'Execution',
    'stability': 'Stability',
    'mobility': 'Mobility',
    'strength': 'Strength',
    'coordination': 'Coordination',
    'complaints_care': 'Complaints & Care',
    'pain': 'Pain',
    'limitation': 'Limitation',
    'contraindication': 'Contraindication',
    'save_evaluation': 'Save Evaluation',
    'recent_history': 'Recent History',
    'generate_evolution_report': 'Generate AI Evolution Report',
    'evolution_filters': 'Analysis Filters',
    'evaluations_title': 'Class Ratings',
    'evaluations_subtitle': 'Feedback received from students after classes.',
    'evaluations_list': 'Evaluations List',
    'saved_reports': 'Saved Reports',
    'average': 'Average',
    'analyze_ai': 'Analyze with AI',
    'filters': 'Filters',
    'all_instructors': 'All Instructors',
    'all_students': 'All Students',
    'all_period': 'All Period',
    'last_week': 'Last Week',
    'last_month': 'Last Month',
    'quality_report': 'Quality Report',
    'suggestions_title': 'Suggestions Management',
    'suggestions_subtitle': 'Transform student feedback into practical action plans.',
    'inbox': 'Inbox',
    'analyze_list': 'Analyze List',
    'generate_action_plan': 'Generate Action Plan',
    'recent_suggestions': 'Recent Suggestions',
    'action_plan_generated': 'Action Plan Generated',
    'trends_report': 'Trends Report',
  },
  es: {
    // ... existing ES translations ...
    'surveys_title': 'Encuestas',
    'card_surveys_desc': 'Cree y gestione encuestas de satisfacción personalizadas.',
    // ...
  },
  fr: {
    // ... existing FR translations ...
    'surveys_title': 'Enquêtes',
    'card_surveys_desc': 'Créez et gérez des enquêtes de satisfaction personnalisées.',
    // ...
  },
  de: {
    // ... existing DE translations ...
    'surveys_title': 'Umfragen',
    'card_surveys_desc': 'Erstellen und verwalten Sie personalisierte Zufriedenheitsumfragen.',
    // ...
  },
  it: {
    // ... existing IT translations ...
    'surveys_title': 'Sondaggi',
    'card_surveys_desc': 'Crea e gestisci sondaggi di soddisfazione personalizzati.',
    // ...
  },
  zh: {
    // ... existing ZH translations ...
    'surveys_title': '调查',
    'card_surveys_desc': '创建和管理个性化满意度调查。',
    // ...
  },
  ja: {
    // ... existing JA translations ...
    'surveys_title': 'アンケート',
    'card_surveys_desc': 'パーソナライズされた満足度調査を作成および管理します。',
    // ...
  },
  ru: {
    // ... existing RU translations ...
    'surveys_title': 'Опросы',
    'card_surveys_desc': 'Создавайте и управляйте персонализированными опросами удовлетворенности.',
    // ...
  },
  ko: {
    // ... existing KO translations ...
    'surveys_title': '설문조사',
    'card_surveys_desc': '개인화된 만족도 설문조사를 만들고 관리합니다.',
    // ...
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
    let text = dict[key] || translations['pt'][key] || key;

    // Terminology Replacement Logic
    if (terminology === 'client') {
      text = text.replace(/Aluno/g, 'Cliente');
      text = text.replace(/Alunos/g, 'Clientes');
      text = text.replace(/Aluna/g, 'Cliente');
      text = text.replace(/Alunas/g, 'Clientes');
      text = text.replace(/aluno/g, 'cliente');
      text = text.replace(/alunos/g, 'clientes');
      text = text.replace(/aluna/g, 'cliente');
      text = text.replace(/alunas/g, 'clientes');
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