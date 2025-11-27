import { supabase } from './supabase';
import { SavedPricingAnalysis, PricingInputs } from '../types';

export const savePricingAnalysis = async (
  userId: string,
  name: string,
  inputs: PricingInputs
): Promise<{ success: boolean; error?: string; id?: string }> => {
  try {
    const { data, error } = await supabase
      .from('pricing_analyses')
      .insert({
        user_id: userId,
        name: name,
        data: inputs
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving pricing analysis:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar.' };
  }
};

export const fetchPricingAnalyses = async (): Promise<SavedPricingAnalysis[]> => {
  try {
    const { data, error } = await supabase
      .from('pricing_analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pricing analyses:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      date: item.created_at, // Usa data de criação como referência
      inputs: item.data,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const deletePricingAnalysis = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('pricing_analyses')
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