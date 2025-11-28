import { createClient } from '@supabase/supabase-js';

// Chaves de fallback fornecidas (Segurança para evitar que o app trave se as env vars falharem)
const FALLBACK_URL = 'https://bhyhqzwqhipaxlzbuvtw.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWhxendxaGlwYXhsemJ1dnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk5MjEsImV4cCI6MjA3OTczNTkyMX0.wjeIpkWVwPIlePh5b4bJUCGelhwtUaGFiPhIYTmzhZU';

// Função segura para obter variáveis de ambiente sem quebrar a aplicação
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const value = import.meta.env[key];
      if (value) return value;
    }
  } catch (e) {
    // Ignora erros de acesso e retorna fallback
  }
  
  // Tenta acessar via process.env se disponível
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignora
  }

  return fallback;
};

export const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', FALLBACK_URL);
export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', FALLBACK_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);