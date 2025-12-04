
import { supabase } from './supabase';
import { StrategicContentPlan } from '../types';

export interface DashboardNotification {
  type: 'survey_student' | 'survey_instructor' | 'content_plan';
  count?: number;
  message: string;
  detail?: string;
  link: string;
}

export const dismissNotificationLocal = (type: string) => {
  if (type === 'content_plan') {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('pilates_dismiss_content', today);
  } else if (type.startsWith('survey')) {
    // Store timestamp of dismissal to filter out older responses
    localStorage.setItem('pilates_dismiss_survey', new Date().toISOString());
  }
};

export const fetchDashboardNotifications = async (studioId: string): Promise<DashboardNotification[]> => {
  const notifications: DashboardNotification[] = [];

  try {
    // 1. Recent Survey Responses (Last 24h + Local Dismissal Check)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const lastDismissedSurvey = localStorage.getItem('pilates_dismiss_survey');
    
    // Determine the cutoff time: Max(24h ago, lastDismissedTime)
    // This ensures we show new responses that arrived AFTER the user clicked
    let cutoffTime = yesterday;
    if (lastDismissedSurvey) {
        const dismissedDate = new Date(lastDismissedSurvey);
        if (dismissedDate > yesterday) {
            cutoffTime = dismissedDate;
        }
    }

    const { data: surveys } = await supabase
        .from('surveys')
        .select('id')
        .eq('studio_id', studioId);
    
    if (surveys && surveys.length > 0) {
        const surveyIds = surveys.map(s => s.id);
        const { data: responses } = await supabase
            .from('survey_responses')
            .select('user_type, created_at')
            .in('survey_id', surveyIds)
            .gte('created_at', cutoffTime.toISOString());

        if (responses && responses.length > 0) {
            const studentCount = responses.filter(r => r.user_type === 'student').length;
            const instructorCount = responses.filter(r => r.user_type === 'instructor').length;

            if (studentCount > 0) {
                notifications.push({
                    type: 'survey_student',
                    count: studentCount,
                    message: `${studentCount} resposta(s) de alunos em pesquisas`,
                    detail: 'Novas respostas recentes',
                    link: '/surveys'
                });
            }
            if (instructorCount > 0) {
                notifications.push({
                    type: 'survey_instructor',
                    count: instructorCount,
                    message: `${instructorCount} resposta(s) de instrutores`,
                    detail: 'Novas respostas recentes',
                    link: '/surveys'
                });
            }
        }
    }

    // 2. Today's Content Plan (Local Dismissal Check)
    const dismissedContentDate = localStorage.getItem('pilates_dismiss_content');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Only fetch if not dismissed today
    if (dismissedContentDate !== todayStr) {
        const { data: plans } = await supabase
            .from('content_plans')
            .select('data')
            .eq('studio_id', studioId);

        if (plans) {
            // Map JS getDay() (0=Sun) to common Portuguese/English names found in plans
            const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDayIndex = today.getDay(); // 0-6
            
            // Loop through plans to find match
            for (const row of plans) {
                const plan: StrategicContentPlan = row.data;
                if (!plan.startDate || !plan.weeks) continue;

                const start = new Date(plan.startDate);
                // Adjust timezone offset issues roughly or assume local string
                // Simply calculating diffDays
                const diffTime = Math.abs(today.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays >= 0 && diffDays < 35) {
                    const currentWeekIndex = Math.floor(diffDays / 7);
                    const currentWeek = plan.weeks[currentWeekIndex];

                    if (currentWeek && currentWeek.ideas) {
                        const todaysIdea = currentWeek.ideas.find(idea => {
                            const d = idea.day.toLowerCase();
                            return d.includes(dayNames[currentDayIndex]) || 
                                   d.includes(dayNamesEn[currentDayIndex]) ||
                                   d.includes(`dia ${currentDayIndex + 1}`);
                        });

                        if (todaysIdea) {
                            notifications.push({
                                type: 'content_plan',
                                message: `Post planejado para hoje: ${todaysIdea.format}`,
                                detail: `Tema: "${todaysIdea.theme}"`,
                                link: '/content-agent'
                            });
                            // Found one, break to avoid duplicates
                            break; 
                        }
                    }
                }
            }
        }
    }

  } catch (err) {
    console.error("Error fetching notifications", err);
  }

  return notifications;
};
