
import React, { createContext, useContext, useState, useEffect } from 'react';

// Force absolute default to PT
export type Language = 'pt'; 

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
    'settings_subtitle': 'Gerencie preferências da plataforma.',
    'email_integration': 'Integração de Email',
    'email_desc': 'Conecte seu Gmail para facilitar o envio de mensagens.',
    'language_settings': 'Preferências de Idioma',
    'language_desc': 'Idioma padrão definido como Português (Brasil).',
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
    
    // Admin
    'admin_tab_dashboard': 'Dashboard',
    'admin_tab_costs': 'Custos API',
    'admin_tab_list': 'Todos',
    'admin_tab_owners': 'Studios',
    'admin_tab_instructors': 'Instrutores',
    'admin_tab_students': 'Alunos',
    'admin_tab_suggestions': 'Feedback',
    'admin_cost_total': 'Custo Total Estimado',
    'admin_cost_per_user': 'Detalhamento por Studio',
    'admin_kpi_studios': 'Studios',
    'admin_kpi_students': 'Alunos Totais',
    'admin_kpi_content': 'Conteúdos Gerados',
    'admin_kpi_engagement': 'Engajamento',
    'admin_timeline_title': 'Crescimento e Uso',
    'admin_dist_users': 'Distribuição de Usuários',
    'admin_vol_prod': 'Volume de Produção',
    'admin_avg_instructors': 'Média Instrutores',
    'admin_avg_students': 'Média Alunos',
    'admin_avg_posts': 'Posts / Studio',
    'admin_avg_engagement': 'Avaliações / Aluno',
    'trends_report': 'Relatório de Tendências',
    'analyze_list': 'Analisar Lista',
    'filters': 'Filtros',
    'recent_suggestions': 'Sugestões Recentes',
    'generate_action_plan': 'Gerar Plano de Ação',
    'action_plan_generated': 'Plano de Ação Gerado',
    'saved_plans': 'Planos Salvos',
    'inbox': 'Caixa de Entrada',
    'average': 'Média Geral',
    'all_instructors': 'Todos Instrutores',
    'all_students': 'Todos Alunos',
    'all_period': 'Todo o Período',
    'last_week': 'Última Semana',
    'last_month': 'Último Mês',
    'analyze_ai': 'Analisar com IA',
    'evaluations_title': 'Avaliações de Aulas',
    'evaluations_subtitle': 'Monitore a qualidade das aulas e satisfação.',
    'evaluations_list': 'Lista de Avaliações',
    'saved_reports': 'Relatórios Salvos',
    'quality_report': 'Relatório de Qualidade',
    'evolution_title': 'Evolução do Aluno',
    'evolution_subtitle': 'Acompanhamento técnico e físico.',
    'new_entry': 'Novo Registro',
    'reports_analysis': 'Relatórios & Análise',
    'individual_record': 'Ficha Individual',
    'execution': 'Execução do Movimento',
    'stability': 'Estabilidade',
    'mobility': 'Mobilidade',
    'strength': 'Força',
    'coordination': 'Coordenação',
    'complaints_care': 'Queixas e Cuidados',
    'pain': 'Dor',
    'limitation': 'Limitação',
    'contraindication': 'Contraindicação',
    'observations_label': 'Observações Gerais',
    'save_evaluation': 'Salvar Avaliação',
    'recent_history': 'Histórico Recente',
    'evolution_filters': 'Filtros de Evolução',
    'generate_evolution_report': 'Gerar Relatório de Evolução',
    'suggestions_title': 'Sugestões & Feedback',
    'suggestions_subtitle': 'O que seus alunos estão dizendo.',
    'pricing_title': 'Precificação Inteligente',
    'pricing_subtitle': 'Calcule o valor ideal da sua hora/aula.',
    'pricing_history': 'Histórico de Precificação',
    'step_by_step': 'Passo a Passo',
    'full_view': 'Visão Completa',
    'step': 'Passo',
    'studio_info_title': 'Informações do Studio',
    'fixed_costs_title': 'Custos Fixos',
    'variable_costs_title': 'Variáveis & Lucro',
    'capacity_title': 'Capacidade',
    'market_title': 'Mercado',
    'newsletter_title': 'Agente de Newsletter',
    'newsletter_subtitle': 'Crie comunicados e emails para seus alunos.',
    'create_new': 'Criar Nova',
    'target_audience': 'Público Alvo',
    'audience_students': 'Alunos',
    'audience_instructors': 'Instrutores',
    'audience_both': 'Ambos',
    'topic_label': 'Tópico / Assunto',
    'style_label': 'Tom de Voz',
    'generate_newsletter': 'Gerar Newsletter',
    'preview': 'Prévia',
    'generated_success': 'Gerado com Sucesso',
    'discard': 'Descartar'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always force PT
  const [language, setLanguage] = useState<Language>('pt');
  
  const [terminology, setTerminology] = useState<Terminology>(() => {
    return (localStorage.getItem('app_terminology') as Terminology) || 'student';
  });

  useEffect(() => {
    localStorage.setItem('app_terminology', terminology);
  }, [terminology]);

  const t = (key: string): string => {
    const dict = translations['pt'];
    // Default to PT dictionary
    let text = dict[key] || key;

    // Terminology Replacement Logic (Applied to the translated string)
    if (terminology === 'client') {
      text = text.replace(/Aluno/g, 'Cliente');
      text = text.replace(/Alunos/g, 'Clientes');
      text = text.replace(/Aluna/g, 'Cliente');
      text = text.replace(/Alunas/g, 'Clientes');
      text = text.replace(/aluno/g, 'cliente');
      text = text.replace(/alunos/g, 'clientes');
      
      text = text.replace(/Student/g, 'Client');
      text = text.replace(/Students/g, 'Clients');
      text = text.replace(/student/g, 'client');
      text = text.replace(/students/g, 'clients');
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
