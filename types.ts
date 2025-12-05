

export type MarketingMode = 'single' | 'plan' | 'story';

export interface MarketingFormData {
  mode: MarketingMode;
  // Legacy single string fields (kept for compatibility or singular logic if needed)
  goal: string; 
  audience: string;
  // New Array fields for multi-selection
  goals?: string[];
  audiences?: string[];
  
  customGoal?: string; 
  customAudience?: string;
  topic: string;
  format: string; 
  style: string;
  // New fields for Planner
  frequency?: number;
  selectedFormats?: string[];
  startDate?: string; // Added Start Date
  // New field for Carousel specific mode
  carouselType?: 'image-only' | 'text-only' | 'text-image';
}

export interface ReelOption {
  type: 'Viral' | 'Standard' | 'Selfie' | 'Box'; // New field for specific types
  style: string; // Keeping for compatibility
  title: string;
  hook: string; // "Gancho Inicial"
  purpose: string;
  captionShort: string;
  captionLong: string;
  script: string[];
  audioSuggestions: string[]; // Array for "Viral/Trend" and "Emotional/Cinematic"
  microDetails: string; // "Microdetalhes"
  duration: string;
}

export interface ContentItem {
  day: string;
  format: string;
  idea: string;
  generatedPostId?: string; // Links to SavedPost ID
}

export interface WeekPlan {
  weekNumber: number;
  theme: string;
  posts: ContentItem[];
}

export interface StoryFrame {
  order: number;
  type: 'video' | 'static' | 'poll' | 'box' | 'repost';
  action: string;
  spokenText?: string;
  directAction: string;
  emotion: string;
}

export interface StorySequence {
  category: string;
  reasoning: string;
  frames: StoryFrame[];
}

export interface CarouselCard {
  order: number;
  textOverlay: string;
  visualPrompt: string;
  generatedImage?: string;
  title?: string;
  content?: string;
}

export interface GeneratedContent {
  suggestedFormat: string;
  reasoning: string;
  hashtags?: string[];
  tips: string;
  captionShort?: string;
  captionLong?: string;
  visualContent?: string[];
  visualPrompt?: string; 
  generatedImage?: string;
  isReels?: boolean;
  reelsOptions?: ReelOption[];
  isPlan?: boolean;
  weeks?: WeekPlan[];
  isStory?: boolean;
  storySequence?: StorySequence;
  carouselCards?: CarouselCard[]; // New field for carousel cards
}

export interface CategorizedTopics {
  cliche: string[];
  innovative: string[];
  visceral: string[];
}

export interface SavedContent extends GeneratedContent {
  id: string;
  date: string;
  topic: string;
}

// ... existing types below ...
// (Retaining the rest of the file content as is, starting from ClassEvaluation Types)
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

// ... existing types from Content Agent, WhatsApp, Action, etc (no changes needed there) ...
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
    inputs?: {
        name: string;
        mainGoal: string;
        audience: string;
        message: string;
        differentiators: string;
        objections: string;
        tone: string;
        events: string;
        frequency: number;
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

export interface WhatsAppScriptRequest {
  objective: string;
  clientName?: string;
  productService?: string;
  tone: string;
  context?: string;
}

export interface SavedWhatsAppScript {
  id: string;
  studioId: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface ActionInput {
  theme: string;
  objective: string;
  studentCount: number;
  hasBudget: boolean;
  budgetPerStudent?: number;
}

export interface ActionIdea {
  id: string;
  title: string;
  summary: string;
  effort: 'Baixo' | 'Médio' | 'Alto';
}

export interface SavedActionPlan {
  id: string;
  studioId: string;
  title: string;
  theme: string;
  content: string; // HTML report
  inputs: ActionInput;
  createdAt: string;
}

export interface User {
  id: string;
  dbId?: string; 
  email: string;
  name: string;
  password: string;
  isAdmin?: boolean; 
  isInstructor?: boolean; 
  isStudent?: boolean; 
  isOwner?: boolean; 
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
  maxDailyPosts: number;
}

export interface StudioProfile {
  id: string;
  userId: string;
  studioName: string;
  ownerName: string;
  ownerCpf?: string; 
  ownerBirthDate?: string; 
  ownerPhotoUrl?: string; 
  cnpj?: string; 
  email?: string; 
  description: string;
  address: string;
  city?: string; 
  state?: string; 
  cep?: string; 
  phone: string;
  whatsapp?: string; 
  instagram?: string; 
  website: string;
  specialties: string[];
  logoUrl?: string;
  brandColor?: string;
  isAdmin: boolean; 
  isActive: boolean;
  maxStudents?: number; 
  planId?: string; 
  planName?: string; 
  planLimit?: number; 
  planMaxDailyPosts?: number; 
  settings?: {
    sender_email?: string; 
    language?: 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ja' | 'ru' | 'ko'; 
    instructor_permissions?: {
      rehab?: boolean;
      newsletters?: boolean;
      students?: boolean;
    };
    content_persona?: StudioPersona; 
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
  birthDate?: string; 
  address: string;
  city?: string; 
  state?: string; 
  cep?: string; 
  photoUrl?: string; 
  certifications?: string[]; 
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
  photoUrl?: string;
  birthDate?: string;
  goals?: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
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
  NEWSLETTER_AGENT = '/newsletter-agent',
  INSTRUCTOR_NEWSLETTERS = '/instructor/newsletters',
  INSTRUCTOR_SURVEYS = '/instructor/surveys', 
  EVOLUTION = '/evolution',
  STUDENT_DASHBOARD = '/student/dashboard',
  STUDENT_RECIPES = '/student/recipes',
  STUDENT_WORKOUT = '/student/workout',
  STUDENT_SUGGESTIONS = '/student/suggestions',
  STUDENT_NEWSLETTERS = '/student/newsletters',
  STUDENT_EVALUATION = '/student/evaluation',
  STUDENT_SURVEYS = '/student/surveys', 
  STUDIO_SUGGESTIONS = '/suggestions',
  STUDIO_EVALUATIONS = '/evaluations',
  SURVEY_MANAGER = '/surveys', 
  STUDENT_ASSESSMENT = '/assessments', 
  CONTENT_AGENT = '/content-agent',
  WHATSAPP_AGENT = '/whatsapp-agent',
  ACTION_AGENT = '/action-agent',
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

export type SurveyTarget = 'students' | 'instructors' | 'both';
export type QuestionType = 'text' | 'long_text' | 'radio' | 'checkbox' | 'select';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; 
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
  responseCount?: number; 
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

export interface StudentAssessment {
  id: string;
  studioId: string;
  studentId: string;
  instructorId?: string;
  studentName: string;
  instructorName?: string;
  type: 'simple' | 'custom';
  title: string;
  content: any; 
  createdAt: string;
}

export interface AssessmentTemplate {
  id: string;
  studioId: string;
  title: string;
  fields: any[]; 
  createdAt: string;
}

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
  values?: string; 
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
  videoUrl?: string; 
}

export interface LessonPlanResponse {
  pathologyName: string;
  goal: string;
  duration: string;
  exercises: LessonExercise[]; 
}

export interface TreatmentSession {
  sessionNumber: number;
  goal: string;
  focus: string;
  apparatusFocus: string;
}

export interface TreatmentPlanResponse {
  pathologyName: string;
  overview: string;
  sessions: TreatmentSession[];
}

export interface SavedRehabLesson extends LessonPlanResponse {
  id: string;
  patientName: string;
  customName: string;
  createdAt: string;
  treatmentPhase?: number; 
}

export interface SavedTreatmentPlan extends TreatmentPlanResponse {
  id: string;
  patientName: string;
  createdAt: string;
  assessmentContext?: ChatMessage[]; 
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