
import { supabase } from './supabase';

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
    content: {
      text: number;
      image: number;
      video: number;
      drafts: number;
    };
    rehab: number;
    finance: number;
    evaluation: number;
    suggestion: number;
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

    // 2. Fetch raw data with filters
    const results = await Promise.allSettled([
      applyFilter(supabase.from('content_generations').select('studio_id')), 
      applyFilter(supabase.from('content_posts').select('studio_id, data')), 
      applyFilter(supabase.from('rehab_lessons').select('user_id')),
      applyFilter(supabase.from('evaluation_analyses').select('studio_id')),
      applyFilter(supabase.from('financial_simulations').select('user_id')),
      applyFilter(supabase.from('suggestion_action_plans').select('studio_id'))
    ]);

    // 3. Process Data per Studio
    const usageMap = new Map<string, {
        content: { totalGen: number; savedText: number; savedImg: number; savedVid: number };
        rehab: number;
        finance: number;
        evaluation: number;
        suggestion: number;
    }>();

    const getStats = (id: string) => {
        if (!usageMap.has(id)) {
            usageMap.set(id, {
                content: { totalGen: 0, savedText: 0, savedImg: 0, savedVid: 0 },
                rehab: 0,
                finance: 0,
                evaluation: 0,
                suggestion: 0
            });
        }
        return usageMap.get(id)!;
    };

    // --- Content Generations (Log) ---
    if (results[0].status === 'fulfilled' && results[0].value.data) {
        results[0].value.data.forEach((row: any) => {
            getStats(row.studio_id).content.totalGen++;
        });
    }

    // --- Content Posts (Saved) ---
    if (results[1].status === 'fulfilled' && results[1].value.data) {
        results[1].value.data.forEach((row: any) => {
            const stats = getStats(row.studio_id);
            const data = row.data;
            if (data.videoUrl) stats.content.savedVid++;
            else if (data.imageUrl) stats.content.savedImg++;
            else stats.content.savedText++;
        });
    }

    // --- Rehab ---
    if (results[2].status === 'fulfilled' && results[2].value.data) {
        results[2].value.data.forEach((row: any) => getStats(row.user_id).rehab++);
    }

    // --- Evaluation Analysis ---
    if (results[3].status === 'fulfilled' && results[3].value.data) {
        results[3].value.data.forEach((row: any) => getStats(row.studio_id).evaluation++);
    }

    // --- Finance ---
    if (results[4].status === 'fulfilled' && results[4].value.data) {
        results[4].value.data.forEach((row: any) => getStats(row.user_id).finance++);
    }

    // --- Suggestions ---
    if (results[5].status === 'fulfilled' && results[5].value.data) {
        results[5].value.data.forEach((row: any) => getStats(row.studio_id).suggestion++);
    }

    // 4. Calculate Costs
    // Estimated Costs (USD)
    const COST_TEXT = 0.005; // Standard Text Prompt
    const COST_IMG = 0.040;  // Image Generation
    const COST_VID = 0.200;  // Video Generation (Veo)
    const COST_COMPLEX = 0.010; // Rehab / Large Analysis

    let totalGlobalCost = 0;

    const byUser: UserApiCost[] = studios.map(studio => {
      const stats = getStats(studio.user_id);
      
      // Calculate Drafts (Total generations minus saved posts)
      // We assume drafts are Text based for cost estimation to be conservative/realistic
      // If date range is used, totalGen might be less than saved if data is inconsistent, so max(0, ...)
      const totalSaved = stats.content.savedText + stats.content.savedImg + stats.content.savedVid;
      const draftsCount = Math.max(0, stats.content.totalGen - totalSaved);

      // Cost Calculation
      const costContent = 
        (stats.content.savedText * COST_TEXT) +
        (stats.content.savedImg * COST_IMG) +
        (stats.content.savedVid * COST_VID) +
        (draftsCount * COST_TEXT); // Drafts charged as text

      const costAgents = 
        (stats.rehab * COST_COMPLEX) +
        (stats.finance * COST_COMPLEX) +
        (stats.evaluation * COST_COMPLEX) +
        (stats.suggestion * COST_COMPLEX);

      const totalCost = costContent + costAgents;
      totalGlobalCost += totalCost;

      return {
        studioId: studio.user_id,
        studioName: studio.studio_name || 'Studio Sem Nome',
        ownerName: studio.owner_name || 'Desconhecido',
        details: {
            content: {
                text: stats.content.savedText,
                image: stats.content.savedImg,
                video: stats.content.savedVid,
                drafts: draftsCount
            },
            rehab: stats.rehab,
            finance: stats.finance,
            evaluation: stats.evaluation,
            suggestion: stats.suggestion
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
