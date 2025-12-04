
import { supabase } from './supabase';
import { SavedActionPlan } from '../types';

/*
  ⚠️ SQL NECESSÁRIO (Rodar no SQL Editor do Supabase):

  create table if not exists action_plans (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    title text not null,
    theme text,
    content text,
    inputs jsonb,
    created_at timestamptz default now()
  );

  alter table action_plans enable row level security;

  create policy "Owners manage action plans" on action_plans
    for all to authenticated using (auth.uid() = studio_id);
*/

export const saveActionPlan = async (
  studioId: string,
  title: string,
  theme: string,
  content: string,
  inputs: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('action_plans')
      .insert({
        studio_id: studioId,
        title,
        theme,
        content,
        inputs
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

export const fetchActionPlans = async (studioId: string): Promise<SavedActionPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('action_plans')
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
      theme: item.theme,
      content: item.content,
      inputs: item.inputs,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const deleteActionPlan = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('action_plans').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};