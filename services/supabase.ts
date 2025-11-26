import { createClient } from '@supabase/supabase-js';

// Access environment variables directly via process.env.
// This allows Vite's 'define' plugin to statically replace the strings.
const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_ANON_KEY;

// Fallback keys provided by the user for preview/dev environments
// IN PRODUCTION: Configure these in your Vercel/Netlify dashboard
const FALLBACK_URL = 'https://bhyhqzwqhipaxlzbuvtw.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWhxendxaGlwYXhsemJ1dnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk5MjEsImV4cCI6MjA3OTczNTkyMX0.wjeIpkWVwPIlePh5b4bJUCGelhwtUaGFiPhIYTmzhZU';

const supabaseUrl = envUrl || FALLBACK_URL;
const supabaseKey = envKey || FALLBACK_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro Crítico: Variáveis de ambiente do Supabase não encontradas e fallbacks falharam.');
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseKey
);