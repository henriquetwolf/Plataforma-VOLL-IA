
import { supabase } from './supabase';
import { SavedWhatsAppScript } from '../types';

/*
  ⚠️ SQL NECESSÁRIO (Rodar no SQL Editor do Supabase):

  create table if not exists whatsapp_scripts (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    title text not null,
    content text not null,
    category text,
    created_at timestamptz default now()
  );

  alter table whatsapp_scripts enable row level security;

  create policy "Owners can manage their whatsapp scripts" on whatsapp_scripts
    for all to authenticated using (auth.uid() = studio_id);
*/

export const saveWhatsAppScript = async (
  studioId: string,
  title: string,
  content: string,
  category: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('whatsapp_scripts')
      .insert({
        studio_id: studioId,
        title,
        content,
        category
      });

    if (error) {
      console.error('Error saving whatsapp script:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchWhatsAppScripts = async (studioId: string): Promise<SavedWhatsAppScript[]> => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_scripts')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching whatsapp scripts:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      title: item.title,
      content: item.content,
      category: item.category,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const deleteWhatsAppScript = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('whatsapp_scripts').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
