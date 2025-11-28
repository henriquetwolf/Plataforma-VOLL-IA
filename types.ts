export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  isAdmin?: boolean; 
  isInstructor?: boolean; // Novo: Identifica se é instrutor
  studioId?: string; // Novo: ID do dono do estúdio (se for instrutor)
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
  PROFILE = '/profile',
  STUDENTS = '/students',
  INSTRUCTORS = '/instructors', // Nova rota
  STRATEGY = '/strategy',
  FINANCE = '/finance',
  MENTOR = '/mentor',
  PRICING = '/pricing',
  REHAB = '/rehab',
  ADMIN = '/admin', 
  INSTRUCTOR_WELCOME = '/instructor-welcome', // Nova rota
  ROOT = '/'
}

// Estratégia
export enum StrategyStep {
  Welcome,
  Vision,
  SWOT,
  Goals,
  Actions,
  Review,
  GeneratedPlan
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

// --- Tipos da Calculadora Financeira ---

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

// --- Tipos do Agente de Precificação ---

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

// --- Tipos do Agente de Reabilitação (Pilates Rehab) ---

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