import { createClient } from '@supabase/supabase-js';

// Função segura para ler variáveis de ambiente sem quebrar a aplicação
const getEnv = (key: string, fallback: string): string => {
  try {
    // Tenta ler do import.meta.env (Vite)
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Silencia erros de acesso
  }
  return fallback;
};

// Usa a função segura com seus dados como fallback garantido
const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://bhyhqzwqhipaxlzbuvtw.supabase.co');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWhxendxaGlwYXhsemJ1dnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk5MjEsImV4cCI6MjA3OTczNTkyMX0.wjeIpkWVwPIlePh5b4bJUCGelhwtUaGFiPhIYTmzhZU');

export const supabase = createClient(supabaseUrl, supabaseKey);