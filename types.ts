
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