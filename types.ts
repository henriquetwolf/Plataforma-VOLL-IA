
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
  ROOT = '/'
}
