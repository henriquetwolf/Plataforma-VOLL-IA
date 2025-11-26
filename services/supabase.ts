import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhyhqzwqhipaxlzbuvtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWhxendxaGlwYXhsemJ1dnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk5MjEsImV4cCI6MjA3OTczNTkyMX0.wjeIpkWVwPIlePh5b4bJUCGelhwtUaGFiPhIYTmzhZU';

export const supabase = createClient(supabaseUrl, supabaseKey);