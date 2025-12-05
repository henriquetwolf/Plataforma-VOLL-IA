
import { supabase } from './supabase';
import { SavedPlan } from '../types';

/*
  ⚠️ SQL NECESSÁRIO (Rodar no SQL Editor):
  
  create table if not exists strategic_plans (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    title text,
    data jsonb,
    created_at timestamptz default now()
  );

  alter table strategic_plans enable row level security;

  create policy "Owners manage strategic plans" on strategic_plans
    for all to authenticated using (auth.uid() = studio_id);
*/

export const saveStrategicPlan = async (
  studioId: string,
  plan: SavedPlan
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('strategic_plans')
      .insert({
        studio_id: studioId,
        title: plan.planData.studioName,
        data: plan
      });

    if (error) {
      console.error('Error saving strategic plan:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchStrategicPlans = async (studioId: string): Promise<SavedPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('data')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => item.data);
  } catch (err) {
    console.error("Error fetching strategic plans:", err);
    return [];
  }
};

export const deleteStrategicPlan = async (planId: string, studioId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Note: We are filtering by data->id since the table ID might be different from internal plan ID,
    // but typically we use the DB ID. Here we assume 'planId' matches the internal ID stored in JSON.
    // Ideally, migration should use the DB ID. 
    // To be safe, we delete based on matching the internal ID within the JSON data column.
    
    // However, Supabase delete on JSON property is tricky. 
    // Let's first find the row ID.
    const { data } = await supabase
        .from('strategic_plans')
        .select('id, data')
        .eq('studio_id', studioId);
        
    const targetRow = data?.find((row: any) => row.data.id === planId);
    
    if (targetRow) {
        const { error } = await supabase
            .from('strategic_plans')
            .delete()
            .eq('id', targetRow.id);
            
        if (error) throw error;
        return { success: true };
    }
    
    return { success: false, error: "Plano não encontrado." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
