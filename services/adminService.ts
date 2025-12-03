
import { supabase } from './supabase';

export interface AdminStats {
  studios: { total: number; active: number; blocked: number };
  instructors: { total: number; active: number; blocked: number };
  students: { total: number; active: number; blocked: number };
  content: { posts: number; plans: number };
  engagement: { evaluations: number; suggestions: number };
  rehab: { lessons: number };
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
