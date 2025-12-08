
import { supabase } from './supabase';
import { SystemPartner } from '../types';

/*
  ⚠️ SQL NECESSÁRIO (Rodar no SQL Editor do Supabase):

  create table if not exists system_partners (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    discount_value text,
    image_url text,
    link_url text,
    active boolean default true,
    created_at timestamptz default now()
  );

  alter table system_partners enable row level security;

  -- Admin global (definido por email na policy ou app logic) gerencia
  -- Por simplicidade, vamos permitir leitura para autenticados e escrita baseada em lógica de app (ou policy específica se tiver user roles no db)
  
  create policy "Enable read access for authenticated users" on system_partners
    for select to authenticated using (true);

  -- Política de escrita idealmente restrita ao admin
  -- Para este MVP, assumimos que a lógica de UI protege a escrita, 
  -- mas em produção use: (auth.jwt() ->> 'email' = 'henriquetwolf@gmail.com')
  create policy "Enable write access for admin" on system_partners
    for all to authenticated using (auth.jwt() ->> 'email' = 'henriquetwolf@gmail.com');
*/

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
      createdAt: item.created_at
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
  linkUrl?: string
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
