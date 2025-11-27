
import { supabase } from './supabase';
import { SavedRehabLesson, LessonPlanResponse } from '../types';

export const saveRehabLesson = async (
  userId: string,
  patientName: string,
  pathologyName: string,
  lessonData: LessonPlanResponse
): Promise<{ success: boolean; error?: string; id?: string }> => {
  try {
    const { data, error } = await supabase
      .from('rehab_lessons')
      .insert({
        user_id: userId,
        patient_name: patientName,
        pathology_name: pathologyName,
        data: lessonData
      })
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

export const fetchRehabLessons = async (): Promise<SavedRehabLesson[]> => {
  try {
    const { data, error } = await supabase
      .from('rehab_lessons')
      .select('*')
      .order('created_at', { ascending: false });

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
