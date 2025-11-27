
export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

export interface StudioProfile {
  id: string;
  userId: string;
  studioName: string;
  ownerName: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  specialties: string[];
  logoUrl?: string;
  brandColor?: string;
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
  STRATEGY = '/strategy',
  FINANCE = '/finance',
  MENTOR = '/mentor',
  PRICING = '/pricing',
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
    // Studio Capacity
    hoursPerDay: number;
    clientsPerHour: number;
    sessionsPerWeekPerClient: number;
    workingDaysPerMonth: number;
    occupancyRate: number;
    monthlyPricePerClient: number;
    
    // Professional Analysis
    professionalHoursPerWeek: number;
    professionalClientsPerHour: number;
    professionalOccupancyRate: number;

    // Salary Definition
    salaryRevenuePercentage: number;
    baseSalary: number;
    useProposedSalary: boolean;

    // Taxes
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
    
    // Costs
    professionalCost: number; // O custo que sai do caixa do estúdio
    
    // Professional perspective
    grossForProfessional: number;
    taxesProfessional: number;
    netForProfessional: number;
    
    // Studio perspective
    costToStudio: number;
    contributionMargin: number;
    
    isViable: boolean;
}

export interface SavedFinancialSimulation {
  id: string;
  createdAt: string;
  title: string; // Ex: Simulação Instrutor Manhã
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
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
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