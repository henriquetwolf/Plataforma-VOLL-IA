
export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  isAdmin?: boolean; 
  isInstructor?: boolean; 
  isStudent?: boolean; 
  isOwner?: boolean; // Novo flag para segurança estrita
  studioId?: string; 
}

export interface StudioProfile {
  id: string;
  userId: string;
  studioName: string;
  ownerName: string;
  email?: string; 
  description: string;
  address: string;
  phone: string;
  website: string;
  specialties: string[];
  logoUrl?: string;
  brandColor?: string;
  isAdmin: boolean; 
  isActive: boolean;
  settings?: {
    sender_email?: string; // Email configurado para envios (Gmail)
    instructor_permissions?: {
      rehab?: boolean;
      newsletters?: boolean;
      students?: boolean;
    }
  };
}

export interface Instructor {
  id: string;
  studioUserId: string;
  authUserId?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  userId: string;
  authUserId?: string; 
  name: string;
  email: string;
  phone: string;
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
  
  // Rotas do Aluno
  STUDENT_DASHBOARD = '/student/dashboard',
  STUDENT_RECIPES = '/student/recipes',
  STUDENT_WORKOUT = '/student/workout',
  STUDENT_SUGGESTIONS = '/student/suggestions',
  STUDENT_NEWSLETTERS = '/student/newsletters',
  
  // Rotas do Studio
  STUDIO_SUGGESTIONS = '/suggestions',

  ROOT = '/'
}

// ... (Rest of the file remains unchanged)
export type NewsletterAudience = 'students' | 'instructors' | 'both';

export interface Newsletter {
  id: string;
  studioId: string;
  title: string;
  content: string;
  targetAudience: NewsletterAudience;
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
