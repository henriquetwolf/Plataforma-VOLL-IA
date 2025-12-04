
export interface User {
  id: string;
  dbId?: string; // ID interno do banco de dados (PK da tabela students/instructors)
  email: string;
  name: string;
  password: string;
  isAdmin?: boolean; 
  isInstructor?: boolean; 
  isStudent?: boolean; 
  isOwner?: boolean; // Novo flag para segurança estrita
  studioId?: string; 
}

export interface SystemBanner {
  id: string;
  type: 'studio' | 'instructor';
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  maxStudents: number;
  maxDailyPosts: number; // Novo limitador
}

export interface StudioProfile {
  id: string;
  userId: string;
  studioName: string;
  ownerName: string;
  ownerCpf?: string; // Novo
  ownerBirthDate?: string; // Novo
  ownerPhotoUrl?: string; // Novo: Foto do Proprietário
  cnpj?: string; // Novo
  email?: string; 
  description: string;
  address: string;
  city?: string; // Novo
  state?: string; // Novo
  cep?: string; // Novo
  phone: string;
  whatsapp?: string; // Novo
  instagram?: string; // Novo
  website: string;
  specialties: string[];
  logoUrl?: string;
  brandColor?: string;
  isAdmin: boolean; 
  isActive: boolean;
  maxStudents?: number; // Mantido para legado ou override manual se necessário
  planId?: string; // ID do Plano vinculado
  planName?: string; // Nome do plano (join)
  planLimit?: number; // Limite do plano (join)
  planMaxDailyPosts?: number; // Limite de posts diários do plano
  settings?: {
    sender_email?: string; // Email configurado para envios (Gmail)
    language?: 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ja' | 'ru' | 'ko'; // Language preference
    instructor_permissions?: {
      rehab?: boolean;
      newsletters?: boolean;
      students?: boolean;
    };
    content_persona?: StudioPersona; // Added for Content Agent
  };
}

export interface Instructor {
  id: string;
  studioUserId: string;
  authUserId?: string;
  name: string;
  email: string;
  cpf?: string; 
  phone: string;
  birthDate?: string; // Novo
  address: string;
  city?: string; // Novo
  state?: string; // Novo
  cep?: string; // Novo
  photoUrl?: string; // Novo
  certifications?: string[]; // Novo: Lista de Certificações
  active: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  userId: string;
  authUserId?: string; 
  name: string;
  email: string;
  cpf?: string; 
  phone: string;
  
  // Novos Campos
  photoUrl?: string;
  birthDate?: string;
  goals?: string;
  
  // Endereço
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  
  // Emergência
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  observations?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export enum AppRoute {
  LOGIN = '/login',
  REGISTER = '/register',
  DASHBOARD = '/dashboard',
  INSTRUCTOR_DASHBOARD = '/instructor/dashboard', 
  PROFILE = '/profile',
  STUDENTS = '/students',
  INSTRUCTORS = '/instructors',
  STRATEGY = '/strategy',
  FINANCE = '/finance',
  MENTOR = '/mentor',
  PRICING = '/pricing',
  REHAB = '/rehab',
  ADMIN = '/admin', 
  SETTINGS = '/settings', 
  INSTRUCTOR_WELCOME = '/instructor-welcome',
  
  // Rotas de Newsletter
  NEWSLETTER_AGENT = '/newsletter-agent',
  INSTRUCTOR_NEWSLETTERS = '/instructor/newsletters',
  INSTRUCTOR_SURVEYS = '/instructor/surveys', // Nova rota
  
  // Rotas de Evolução
  EVOLUTION = '/evolution',

  // Rotas do Aluno
  STUDENT_DASHBOARD = '/student/dashboard',
  STUDENT_RECIPES = '/student/recipes',
  STUDENT_WORKOUT = '/student/workout',
  STUDENT_SUGGESTIONS = '/student/suggestions',
  STUDENT_NEWSLETTERS = '/student/newsletters',
  STUDENT_EVALUATION = '/student/evaluation',
  STUDENT_SURVEYS = '/student/surveys', // Nova rota
  
  // Rotas do Studio
  STUDIO_SUGGESTIONS = '/suggestions',
  STUDIO_EVALUATIONS = '/evaluations',
  SURVEY_MANAGER = '/surveys', // Nova rota
  
  // Novo Agente de Conteúdo
  CONTENT_AGENT = '/content-agent',

  ROOT = '/'
}

export type NewsletterAudience = 'students' | 'instructors' | 'both';

export interface Newsletter {
  id: string;
  studioId: string;
  title: string;
  content: string;
  targetAudience: NewsletterAudience;
  createdAt: string;
}

// --- SURVEY TYPES ---

export type SurveyTarget = 'students' | 'instructors' | 'both';
export type QuestionType = 'text' | 'long_text' | 'radio' | 'checkbox' | 'select';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // Para radio, checkbox, select
  required: boolean;
}

export interface Survey {
  id: string;
  studioId: string;
  title: string;
  description?: string;
  targetAudience: SurveyTarget;
  questions: SurveyQuestion[];
  isActive: boolean;
  createdAt: string;
  responseCount?: number; // Calculado
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  userName: string;
  userType: 'student' | 'instructor';
  answers: { questionId: string; value: string | string[] }[];
  createdAt: string;
}

// --- END SURVEY TYPES ---

export interface Suggestion {
  id: string;
  studioId: string;
  studentId: string;
  studentName: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export interface SuggestionActionPlan {
  id: string;
  studioId: string;
  title: string;
  selectedSuggestions: Suggestion[];
  ownerObservations: string;
  aiActionPlan: string;
  createdAt: string;
}

export interface RecipeResponse {
  title: string;
  ingredients: string[];
  instructions: string[];
  benefits: string;
  calories?: string;
}

export interface WorkoutResponse {
  title: string;
  duration: string;
  focus: string;
  exercises: {
    name: string;
    reps: string;
    instructions: string;
    safetyNote?: string;
  }[];
}

export interface StrategicPlan {
  studioName: string;
  planningYear: string;
  vision: string;
  mission: string;
  values?: string; // New field
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  objectives: { title: string; keyResults: string[] }[];
  quarterlyActions: { quarter: string; actions: string[] }[];
}

export interface SavedPlan {
  id: string;
  createdAt: string;
  planData: StrategicPlan;
  report: string;
}

export interface CalculatorInputs {
    hoursPerDay: number;
    clientsPerHour: number;
    sessionsPerWeekPerClient: number;
    workingDaysPerMonth: number;
    occupancyRate: number;
    monthlyPricePerClient: number;
    professionalHoursPerWeek: number;
    professionalClientsPerHour: number;
    professionalOccupancyRate: number;
    salaryRevenuePercentage: number;
    baseSalary: number;
    useProposedSalary: boolean;
    issPercentage: number;
    pjSimplesPercentage: number;
    otherChargesPercentage: number;
}

export interface FinancialModel {
    payroll: number;
    operatingCosts: number;
    reserves: number;
    workingCapital: number;
}

export interface CompensationResult {
    scenarioName: string;
    grossRevenue: number;
    taxDeduction: number;
    netRevenue: number;
    professionalCost: number;
    grossForProfessional: number;
    taxesProfessional: number;
    netForProfessional: number;
    costToStudio: number;
    contributionMargin: number;
    isViable: boolean;
}

export interface SavedFinancialSimulation {
  id: string;
  createdAt: string;
  title: string;
  inputs: CalculatorInputs;
  financialModel: FinancialModel;
  results: CompensationResult[];
  metrics: {
    targetRevenue: number;
    potentialRevenue: number;
    maxCapacity: number;
    professionalRevenue: number;
  };
  aiAnalysis: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'ai';
  text?: string;
  content?: string; 
  timestamp?: Date;
}

export interface Competitor {
  id: string;
  name: string;
  distance: number;
  price2x: number;
  valuePerception: 'higher' | 'similar' | 'lower';
}

export interface PricingInputs {
  studioInfo: {
    name: string;
    owner: string;
    date: string;
    address: string;
  };
  fixedCosts: {
    rent: number;
    utilities: number;
    accounting: number;
    ownerSalary: number;
    staffSalary: number;
    consumables: number;
    marketing: number;
    other: number;
  };
  variableCosts: {
    creditCardFee: number;
    taxes: number;
    depreciation: number;
    emergencyReserveContribution: number;
  };
  profitMargin: number;
  capacity: {
    clientsPerHour: number;
    hoursPerDay: number;
    workingDays: {
      mon: boolean;
      tue: boolean;
      wed: boolean;
      thu: boolean;
      fri: boolean;
      sat: boolean;
    };
    occupancyRate: number;
    capacity: number;
  };
  marketAnalysis: {
    competitors: Competitor[];
  };
}

export interface CalculatedResultsPricing {
  totalFixedCosts: number;
  targetRevenue: number;
  realSessionsPerMonth: number;
  equivalentClients2x: number;
  pricePerSession: number;
  packages: {
    '1x': number;
    '2x': number;
    '3x': number;
  };
  financialPlanning: {
    payroll: number;
    operational: number;
    reserve: number;
    workingCapital: number;
  };
  breakEven: {
    sessionsPerMonth: number;
    monthlyRevenue: number;
  };
  emergencyReserve: {
    totalNeeded: number;
    monthlySaving12Months: number;
    monthlySaving24Months: number;
    monthsToBuildAtBreakEven: number;
  };
  isValid: boolean;
}

export interface SimulationResultsPricing {
    newRevenue: number;
    newProfitValue: number;
    newProfitMargin: number;
    isSimulating: boolean;
    simulatedSessionsPerMonth: number;
}

export interface SavedPricingAnalysis {
  id: string;
  name: string;
  date: string;
  inputs: PricingInputs;
  createdAt: string;
}

export interface PriceCompositionData {
    fixedCost: number;
    variableCost: number;
    reserve: number;
    profit: number;
    total: number;
}

export interface ExerciseRecommendation {
  name: string;
  reason: string;
  details: string;
  apparatus: string; 
}

export interface PathologyResponse {
  pathologyName: string;
  summary: string;
  objectives: string[];
  indicated: ExerciseRecommendation[];
  contraindicated: ExerciseRecommendation[];
}

export interface LessonExercise {
  name: string;
  reps: string;
  apparatus: string;
  instructions: string;
  focus: string;
  userNotes?: string;
}

export interface LessonPlanResponse {
  pathologyName: string;
  goal: string;
  duration: string;
  exercises: LessonExercise[]; 
}

export interface SavedRehabLesson extends LessonPlanResponse {
  id: string;
  patientName: string;
  customName: string;
  createdAt: string;
}

export interface StudioExercise {
  id: string;
  studioId: string;
  name: string;
  description: string;
  equipment: string;
  focus: string;
  reps: string;
  instructorComments?: string;
  imageUrl?: string;
  createdAt: string;
}

export enum TriageStatus {
  CONTINUE = 'CONTINUE',
  FINISH = 'FINISH'
}

export interface TriageStep {
  status: TriageStatus;
  question?: string;
  reasoning?: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum StrategyStep {
  Welcome,
  Vision,
  SWOT,
  Goals,
  Actions,
  Review,
  GeneratedPlan
}

// --- Content Agent Types ---

export interface StudioInfo {
    name?: string;
    phone?: string;
    address?: string;
    whatsapp?: string;
}

export interface LogoConfig {
    enabled: boolean;
    type: 'normal' | 'watermark';
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size: 'small' | 'medium' | 'large';
}

export interface ContentRequest {
    format: string;
    objective: string;
    customObjective?: string;
    theme: string;
    audience: string;
    customAudience?: string;
    tone: string;
    imageStyle: string;
    studioInfo?: StudioInfo;
    modificationPrompt?: string;
    logoConfig?: LogoConfig;
}

export interface PerformanceMetrics {
    likes?: number;
    comments?: number;
    notes?: string;
}

export interface SavedPost {
    id: string;
    request: ContentRequest;
    content: string;
    imageUrl: string | null;
    videoUrl?: string | null;
    createdAt: string;
    performance?: PerformanceMetrics;
}

export interface StudioPersona {
    philosophy: string;
    differentiators: string;
    instructorProfile: string;
    languageToAvoid: string;
}

export interface StrategicContentPlan {
    id: string;
    createdAt: string;
    startDate?: string;
    frequency?: number;
    goals: {
        mainObjective: string;
        targetAudience: string[];
        keyThemes: string[];
    };
    weeks: {
        week: string; // "Semana 1"
        theme: string;
        ideas: {
            day: string;
            theme: string;
            format: string;
            objective: string;
            generatedPostId?: string; // Links to SavedPost ID
        }[];
    }[];
}

// --- Class Evaluation Types ---

export interface ClassEvaluation {
  id: string;
  studioId: string;
  studentId: string;
  studentName: string;
  instructorId: string;
  instructorName: string;
  classDate: string;
  rating: number; // 1-5
  feeling: string;
  pace: string;
  discomfort?: string;
  suggestions?: string;
  createdAt: string;
}

export interface SavedEvaluationAnalysis {
  id: string;
  studioId: string;
  title: string;
  content: string; // HTML report
  evaluationCount: number;
  dateRange?: string;
  createdAt: string;
}

// --- Student Evolution Types ---

export interface StudentEvolution {
  id: string;
  studioId: string;
  studentId: string;
  studentName: string;
  instructorId?: string;
  instructorName?: string;
  date: string;
  
  // 1. Execução
  stability: string;
  mobility: string;
  strength: string;
  coordination: string;
  
  // 2. Queixas e Cuidados
  pain: boolean;
  painLocation?: string;
  limitation: boolean;
  limitationDetails?: string;
  contraindication: boolean;
  contraindicationDetails?: string;
  
  // 3. Observations
  observations?: string;

  createdAt: string;
}

export interface SavedEvolutionReport {
  id: string;
  studioId: string;
  title: string;
  content: string; // HTML report
  filterDescription: string; // Ex: "Aluno: João, Instrutor: Maria, Fev/2025"
  recordCount: number;
  createdAt: string;
}