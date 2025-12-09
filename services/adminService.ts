import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { createClient } from '@supabase/supabase-js';

export interface AdminStats {
  studios: { total: number; active: number; blocked: number };
  instructors: { total: number; active: number; blocked: number };
  students: { total: number; active: number; blocked: number };
  content: { posts: number; plans: number };
  engagement: { evaluations: number; suggestions: number };
  rehab: { lessons: number };
}

export interface TimelineDataPoint {
  date: string;
  studios: number;
  content: number;
  engagement: number;
}

export interface UserApiCost {
  studioId: string;
  studioName: string;
  ownerName: string;
  details: {
    marketing: number; // Count of marketing calls
    rehab: number;
    finance: number;
    evaluation: number;
    suggestion: number;
    other: number;
  };
  totalCost: number;
}

export const fetchAdminDashboardStats = async (): Promise<AdminStats> => {
  const stats: AdminStats = {
    studios: { total: 0, active: 0, blocked: 0 },
    instructors: { total: 0, active: 0, blocked: 0 },
    students: { total: 0, active: 0, blocked: 0 },
    content: { posts: 0, plans: 0 },
    engagement: { evaluations: 0, suggestions: 0 },
    rehab: { lessons: 0 }
  };

  try {
    // 1. Studios (Owners)
    const { data: studios } = await supabase.from('studio_profiles').select('is_active');
    if (studios) {
      stats.studios.total = studios.length;
      stats.studios.active = studios.filter(s => s.is_active !== false).length;
      stats.studios.blocked = stats.studios.total - stats.studios.active;
    }

    // 2. Instructors
    const { data: instructors } = await supabase.from('instructors').select('active');
    if (instructors) {
      stats.instructors.total = instructors.length;
      stats.instructors.active = instructors.filter(i => i.active).length;
      stats.instructors.blocked = stats.instructors.total - stats.instructors.active;
    }

    // 3. Students
    const { data: students } = await supabase.from('students').select('auth_user_id');
    if (students) {
      stats.students.total = students.length;
      stats.students.active = students.filter(s => s.auth_user_id !== null).length;
      stats.students.blocked = stats.students.total - stats.students.active;
    }

    // 4. Content (Global count)
    const { count: postsCount } = await supabase.from('content_posts').select('*', { count: 'exact', head: true });
    stats.content.posts = postsCount || 0;

    // 5. Engagement
    const { count: evalCount } = await supabase.from('class_evaluations').select('*', { count: 'exact', head: true });
    stats.engagement.evaluations = evalCount || 0;

    const { count: suggCount } = await supabase.from('suggestions').select('*', { count: 'exact', head: true });
    stats.engagement.suggestions = suggCount || 0;

    // 6. Rehab
    const { count: rehabCount } = await supabase.from('rehab_lessons').select('*', { count: 'exact', head: true });
    stats.rehab.lessons = rehabCount || 0;

    return stats;
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return stats;
  }
};

export const fetchAdminTimelineStats = async (startDate: string, endDate: string): Promise<TimelineDataPoint[]> => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch raw dates from tables
    const [studiosRes, contentRes, evalRes] = await Promise.all([
      supabase.from('studio_profiles').select('created_at').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabase.from('content_posts').select('created_at').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabase.from('class_evaluations').select('created_at').gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
    ]);

    const dataMap = new Map<string, TimelineDataPoint>();

    // Helper to initialize or get day
    const getDay = (dateStr: string) => {
      const day = dateStr.split('T')[0];
      if (!dataMap.has(day)) {
        dataMap.set(day, { date: day, studios: 0, content: 0, engagement: 0 });
      }
      return dataMap.get(day)!;
    };

    // Populate Map
    studiosRes.data?.forEach(row => getDay(row.created_at).studios++);
    contentRes.data?.forEach(row => getDay(row.created_at).content++);
    evalRes.data?.forEach(row => getDay(row.created_at).engagement++);

    // Fill missing days
    const result: TimelineDataPoint[] = [];
    const loopDate = new Date(start);
    
    while (loopDate <= end) {
      const dayStr = loopDate.toISOString().split('T')[0];
      if (dataMap.has(dayStr)) {
        result.push(dataMap.get(dayStr)!);
      } else {
        result.push({ date: dayStr, studios: 0, content: 0, engagement: 0 });
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return result;
  } catch (error) {
    console.error("Error fetching timeline stats:", error);
    return [];
  }
};

export const fetchApiUsageStats = async (startDate?: string, endDate?: string): Promise<{ total: number; byUser: UserApiCost[] }> => {
  try {
    // 1. Get all studios
    const { data: studios, error: studioError } = await supabase
      .from('studio_profiles')
      .select('user_id, studio_name, owner_name');

    if (studioError || !studios) throw studioError || new Error('No studios found');

    // Helper to apply filters
    const applyFilter = (query: any) => {
        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query = query.lte('created_at', end.toISOString());
        }
        return query;
    };

    // 2. Fetch Usage Logs (Source of Truth for Costs)
    const { data: logs, error: logsError } = await applyFilter(supabase.from('content_generations').select('studio_id, agent_type'));

    if (logsError) throw logsError;

    // 3. Process Data per Studio
    const usageMap = new Map<string, {
        marketing: number;
        marketingImg: number;
        rehab: number;
        finance: number;
        evaluation: number;
        suggestion: number;
        other: number;
    }>();

    const getStats = (id: string) => {
        if (!usageMap.has(id)) {
            usageMap.set(id, { marketing: 0, marketingImg: 0, rehab: 0, finance: 0, evaluation: 0, suggestion: 0, other: 0 });
        }
        return usageMap.get(id)!;
    };

    if (logs) {
        logs.forEach((log: any) => {
            const stats = getStats(log.studio_id);
            const type = log.agent_type || 'marketing_text'; // Default legacy
            
            if (type === 'marketing_text' || type === 'marketing_plan') stats.marketing++;
            else if (type === 'marketing_image') stats.marketingImg++;
            else if (type === 'rehab') stats.rehab++;
            else if (type === 'finance') stats.finance++;
            else if (type === 'evaluation') stats.evaluation++;
            else if (type === 'suggestion') stats.suggestion++;
            else stats.other++;
        });
    }

    // 4. Calculate Costs
    const COSTS = {
        TEXT: 0.005,
        IMG: 0.040,
        COMPLEX: 0.010, // Rehab, Finance, etc.
        SIMPLE: 0.005
    };

    let totalGlobalCost = 0;

    const byUser: UserApiCost[] = studios.map(studio => {
      const stats = getStats(studio.user_id);
      
      const costMarketing = (stats.marketing * COSTS.TEXT) + (stats.marketingImg * COSTS.IMG);
      const costRehab = stats.rehab * COSTS.COMPLEX;
      const costFinance = stats.finance * COSTS.COMPLEX;
      const costEval = stats.evaluation * COSTS.COMPLEX;
      const costSugg = stats.suggestion * COSTS.COMPLEX;
      const costOther = stats.other * COSTS.SIMPLE;

      const totalCost = costMarketing + costRehab + costFinance + costEval + costSugg + costOther;
      totalGlobalCost += totalCost;

      return {
        studioId: studio.user_id,
        studioName: studio.studio_name || 'Studio Sem Nome',
        ownerName: studio.owner_name || 'Desconhecido',
        details: {
            marketing: stats.marketing + stats.marketingImg, // Total Marketing Interactions
            rehab: stats.rehab,
            finance: stats.finance,
            evaluation: stats.evaluation,
            suggestion: stats.suggestion,
            other: stats.other
        },
        totalCost
      };
    });

    // Sort by cost desc
    byUser.sort((a, b) => b.totalCost - a.totalCost);

    return {
      total: totalGlobalCost,
      byUser
    };

  } catch (error) {
    console.error("Error fetching API usage:", error);
    return { total: 0, byUser: [] };
  }
};

export const registerNewStudio = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return { success: false, error: "Configuração do Supabase inválida." };
    }

    // Create temp client to avoid replacing current admin session
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    const { data, error } = await tempClient.auth.signUp({
        email,
        password,
        options: {
            data: { name: name }
        }
    });

    if (error) return { success: false, error: error.message };
    
    if (data.user) {
        // Try inserting profile with main client (Admin)
        const { error: profileError } = await supabase
            .from('studio_profiles')
            .insert({
                user_id: data.user.id,
                owner_name: name,
                email: email,
                studio_name: 'Studio ' + name,
                is_active: true
            });

         if (profileError) {
             console.error("Profile creation error:", profileError);
             return { success: false, error: "Usuário criado, mas erro no perfil: " + profileError.message };
         }

        return { success: true };
    }
    
    return { success: false, error: "Erro desconhecido na criação." };

  } catch (e: any) {
      return { success: false, error: e.message };
  }
};