
import { supabase } from './supabase';
import { SavedRehabLesson, LessonPlanResponse, SavedTreatmentPlan, TreatmentPlanResponse, ChatMessage } from '../types';

export const saveRehabLesson = async (
  userId: string,
  patientName: string,
  pathologyName: string,
  lessonData: LessonPlanResponse,
  studentId?: string
): Promise<{ success: boolean; error?: string; id?: string }> => {
  try {
    const payload: any = {
      user_id: userId,
      patient_name: patientName,
      pathology_name: pathologyName,
      data: lessonData
    };

    if (studentId) {
      payload.student_id = studentId;
    }

    const { data, error } = await supabase
      .from('rehab_lessons')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving rehab lesson:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar.' };
  }
};

export const fetchRehabLessons = async (studioId?: string): Promise<SavedRehabLesson[]> => {
  try {
    let query = supabase.from('rehab_lessons').select('*');
    
    // Filter by studio owner ID if provided (for instructors)
    if (studioId) {
        query = query.eq('user_id', studioId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rehab lessons:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      patientName: item.patient_name,
      customName: `${item.pathology_name} - ${new Date(item.created_at).toLocaleDateString()}`,
      createdAt: item.created_at,
      ...item.data 
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const fetchRehabLessonsByStudent = async (studentId: string): Promise<SavedRehabLesson[]> => {
  try {
    const { data, error } = await supabase
      .from('rehab_lessons')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student lessons:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      patientName: item.patient_name,
      customName: `${item.pathology_name} - ${new Date(item.created_at).toLocaleDateString()}`,
      createdAt: item.created_at,
      ...item.data
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const deleteRehabLesson = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rehab_lessons')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// --- TREATMENT PLAN FUNCTIONS ---

export const saveTreatmentPlan = async (
  userId: string,
  patientName: string,
  pathologyName: string,
  planData: TreatmentPlanResponse,
  assessmentContext?: ChatMessage[],
  studentId?: string
): Promise<{ success: boolean; error?: string; id?: string }> => {
  try {
    const payload: any = {
      user_id: userId,
      patient_name: patientName,
      pathology_name: pathologyName,
      plan_data: planData,
      assessment_context: assessmentContext || null
    };

    if (studentId) {
      payload.student_id = studentId;
    }

    const { data, error } = await supabase
      .from('treatment_plans')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving treatment plan:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchTreatmentPlans = async (studioId?: string): Promise<SavedTreatmentPlan[]> => {
  try {
    let query = supabase.from('treatment_plans').select('*');
    
    if (studioId) {
        query = query.eq('user_id', studioId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching treatment plans:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      patientName: item.patient_name,
      createdAt: item.created_at,
      assessmentContext: item.assessment_context,
      ...item.plan_data
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const deleteTreatmentPlan = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('treatment_plans')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};