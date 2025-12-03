

import { supabase } from './supabase';
import { SystemBanner } from '../types';

// Busca o banner ativo por tipo (studio ou instructor)
export const fetchBannerByType = async (type: 'studio' | 'instructor'): Promise<SystemBanner | null> => {
  try {
    const { data, error } = await supabase
      .from('system_banners')
      .select('*')
      .eq('type', type)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.warn(`Error fetching banner for ${type}:`, error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      type: data.type,
      imageUrl: data.image_url,
      linkUrl: data.link_url,
      active: data.active
    };
  } catch (err) {
    console.error("Fetch Banner Exception:", err);
    return null;
  }
};

// Faz upload da imagem para o bucket 'system-assets'
export const uploadBannerImage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `banner-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('system-assets') // Certifique-se que este bucket existe no Supabase
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading banner:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('system-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error uploading banner:', err);
    return null;
  }
};

// Salva ou atualiza o banner no banco
export const upsertBanner = async (
  type: 'studio' | 'instructor',
  imageUrl: string,
  linkUrl: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Usamos UPSERT baseado na coluna 'type' que deve ser UNIQUE no banco
    const { error } = await supabase
      .from('system_banners')
      .upsert(
        { 
          type, 
          image_url: imageUrl, 
          link_url: linkUrl, 
          active: true 
        }, 
        { onConflict: 'type' }
      );

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};