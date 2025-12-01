
import { supabase } from './supabase';
import { StudioExercise, LessonExercise } from '../types';

export const saveStudioExercise = async (
  studioId: string,
  exercise: LessonExercise,
  comments?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('studio_exercises')
      .insert({
        studio_id: studioId,
        name: exercise.name,
        description: exercise.instructions,
        equipment: exercise.apparatus,
        focus: exercise.focus,
        reps: exercise.reps,
        instructor_comments: comments || ''
      });

    if (error) {
      console.error('Error saving exercise:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchStudioExercises = async (studioId: string): Promise<StudioExercise[]> => {
  try {
    const { data, error } = await supabase
      .from('studio_exercises')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      name: item.name,
      description: item.description,
      equipment: item.equipment,
      focus: item.focus,
      reps: item.reps,
      instructorComments: item.instructor_comments,
      imageUrl: item.image_url,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const deleteStudioExercise = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('studio_exercises').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
