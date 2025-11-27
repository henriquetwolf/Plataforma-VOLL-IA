import { supabase } from './supabase';
import { SavedFinancialSimulation } from '../types';

export const saveSimulation = async (
  userId: string, 
  title: string, 
  data: Omit<SavedFinancialSimulation, 'id' | 'createdAt' | 'title'>
): Promise<{ success: boolean; error?: string; id?: string }> => {
  try {
    const { data: insertedData, error } = await supabase
      .from('financial_simulations')
      .insert({
        user_id: userId,
        title: title,
        content: data // Armazena inputs, results, metrics, etc. como JSON
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving simulation:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: insertedData.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar.' };
  }
};

export const fetchSimulations = async (): Promise<SavedFinancialSimulation[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_simulations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching simulations:', error);
      return [];
    }

    // Mapeia do formato do DB para o formato da App
    return data.map((item: any) => ({
      id: item.id,
      createdAt: item.created_at,
      title: item.title,
      ...item.content // Espalha inputs, financialModel, results, metrics, aiAnalysis
    }));
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

export const deleteSimulation = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('financial_simulations')
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