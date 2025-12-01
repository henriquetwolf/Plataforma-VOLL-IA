
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

// Nova função para criação manual completa
export const createStudioExercise = async (
  studioId: string,
  data: Partial<StudioExercise>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      studio_id: studioId,
      name: data.name,
      description: data.description,
      equipment: data.equipment,
      focus: data.focus,
      reps: data.reps,
      instructor_comments: data.instructorComments,
      image_url: data.imageUrl
    };

    const { error } = await supabase
      .from('studio_exercises')
      .insert(payload);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// Nova função para atualização
export const updateStudioExercise = async (
  id: string,
  updates: Partial<StudioExercise>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload: any = {
      name: updates.name,
      description: updates.description,
      equipment: updates.equipment,
      focus: updates.focus,
      reps: updates.reps,
      instructor_comments: updates.instructorComments,
    };
    
    if (updates.imageUrl) {
        payload.image_url = updates.imageUrl;
    }

    const { error } = await supabase
      .from('studio_exercises')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const uploadExerciseImage = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `ex-${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Tenta upload no bucket 'exercise-images'
    // Nota: O bucket precisa existir no Supabase Storage e ter políticas públicas de leitura
    const { error: uploadError } = await supabase.storage
      .from('exercise-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('exercise-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error uploading image:', err);
    return null;
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
