
import { supabase } from './supabase';
import { Suggestion, SuggestionActionPlan } from '../types';

// --- SUGESTÕES ---

export const sendSuggestion = async (
  studioId: string,
  studentId: string,
  studentName: string,
  content: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('suggestions')
      .insert({
        studio_id: studioId,
        student_id: studentId,
        student_name: studentName,
        content: content,
        is_read: false
      });

    if (error) {
      console.error('Error sending suggestion:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado.' };
  }
};

export const fetchSuggestionsByStudio = async (studioId: string): Promise<Suggestion[]> => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      studentId: item.student_id,
      studentName: item.student_name,
      content: item.content,
      isRead: item.is_read,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const fetchAllSuggestions = async (): Promise<(Suggestion & { studioName?: string })[]> => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all suggestions:', JSON.stringify(error));
      return [];
    }

    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      studentId: item.student_id,
      studentName: item.student_name,
      content: item.content,
      isRead: item.is_read,
      createdAt: item.created_at,
      studioName: 'Carregando...' // Placeholder, será preenchido no AdminPanel
    }));
  } catch (err: any) {
    console.error('Unexpected error fetching suggestions:', JSON.stringify(err));
    return [];
  }
};

// --- PLANOS DE AÇÃO ---

export const saveSuggestionActionPlan = async (
  studioId: string,
  title: string,
  selectedSuggestions: Suggestion[],
  ownerObservations: string,
  aiActionPlan: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('suggestion_action_plans')
      .insert({
        studio_id: studioId,
        title: title,
        data: {
          selectedSuggestions,
          ownerObservations,
          aiActionPlan
        }
      });

    if (error) {
      console.error('Error saving action plan:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchSuggestionActionPlans = async (studioId: string): Promise<SuggestionActionPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('suggestion_action_plans')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching action plans:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      title: item.title,
      createdAt: item.created_at,
      selectedSuggestions: item.data.selectedSuggestions,
      ownerObservations: item.data.ownerObservations,
      aiActionPlan: item.data.aiActionPlan
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const deleteSuggestionActionPlan = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('suggestion_action_plans')
      .delete()
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
