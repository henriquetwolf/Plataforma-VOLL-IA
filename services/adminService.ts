
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
    // Clone start date to avoid modifying the original 'start' variable loop issue
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
