import { supabase } from './supabase';
import { SystemPartner, StudioPartner } from '../types';

/*
  ⚠️ SQL NECESSÁRIO (Rodar no SQL Editor do Supabase):

  -- Tabela de Parceiros do Sistema (Global)
  create table if not exists system_partners (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    discount_value text,
    image_url text,
    link_url text,
    active boolean default true,
    commission text,
    created_at timestamptz default now()
  );

  -- Tabela de Parceiros do Studio (Local)
  create table if not exists studio_partners (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    name text not null,
    description text,
    discount_value text,
    image_url text,
    link_url text,
    commission text,
    created_at timestamptz default now()
  );

  alter table system_partners enable row level security;
  alter table studio_partners enable row level security;

  -- SYSTEM PARTNERS POLICIES
  create policy "Enable read access for authenticated users" on system_partners
    for select to authenticated using (true);

  create policy "Enable write access for admin" on system_partners
    for all to authenticated using (auth.jwt() ->> 'email' = 'henriquetwolf@gmail.com');

  -- STUDIO PARTNERS POLICIES
  -- Donos gerenciam seus parceiros
  create policy "Owners manage their partners" on studio_partners
    for all to authenticated using (auth.uid() = studio_id);

  -- Usuários do studio (instrutores/alunos) podem ver
  create policy "Studio users view partners" on studio_partners
    for select to authenticated using (
      studio_id IN (
        -- Studio ID is user ID for owners
        SELECT auth.uid()
        UNION
        -- Get studio_id for instructors
        SELECT studio_user_id FROM instructors WHERE auth_user_id = auth.uid()
        UNION
        -- Get studio_id for students
        SELECT user_id FROM students WHERE auth_user_id = auth.uid()
      )
    );
*/

// --- SYSTEM PARTNERS (GLOBAL) ---

export const fetchPartners = async (): Promise<SystemPartner[]> => {
  try {
    const { data, error } = await supabase
      .from('system_partners')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partners:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      discountValue: item.discount_value,
      imageUrl: item.image_url,
      linkUrl: item.link_url,
      active: item.active,
      createdAt: item.created_at,
      commission: item.commission
    }));
  } catch (err) {
    console.error("Fetch Partner Exception:", err);
    return [];
  }
};

export const createPartner = async (
  name: string,
  description: string,
  discountValue: string,
  imageUrl?: string,
  linkUrl?: string,
  commission?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('system_partners')
      .insert({
        name,
        description,
        discount_value: discountValue,
        image_url: imageUrl,
        link_url: linkUrl,
        commission: commission,
        active: true
      });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deletePartner = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('system_partners')
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

export const uploadPartnerImage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `partner-${Date.now()}.${fileExt}`;
    const filePath = `partners/${fileName}`;

    // Usando o bucket 'system-assets' (mesmo dos banners)
    const { error: uploadError } = await supabase.storage
      .from('system-assets') 
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading partner image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('system-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error uploading partner image:', err);
    return null;
  }
};

// --- STUDIO PARTNERS (LOCAL/EXCLUSIVE) ---

export const fetchStudioPartners = async (studioId: string): Promise<StudioPartner[]> => {
  try {
    const { data, error } = await supabase
      .from('studio_partners')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching studio partners:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      name: item.name,
      description: item.description,
      discountValue: item.discount_value,
      imageUrl: item.image_url,
      linkUrl: item.link_url,
      commission: item.commission,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const createStudioPartner = async (
  studioId: string,
  name: string,
  description: string,
  discountValue: string,
  imageUrl?: string,
  linkUrl?: string,
  commission?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('studio_partners')
      .insert({
        studio_id: studioId,
        name,
        description,
        discount_value: discountValue,
        image_url: imageUrl,
        link_url: linkUrl,
        commission: commission
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateStudioPartner = async (
  id: string,
  updates: Partial<StudioPartner>
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Mapeia do formato do App (camelCase) para o DB (snake_case)
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.discountValue !== undefined) payload.discount_value = updates.discountValue;
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
    if (updates.linkUrl !== undefined) payload.link_url = updates.linkUrl;
    if (updates.commission !== undefined) payload.commission = updates.commission;

    const { error } = await supabase
      .from('studio_partners')
      .update(payload)
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deleteStudioPartner = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('studio_partners').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};