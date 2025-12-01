
import { supabase } from './supabase';
import { StudioProfile } from '../types';

// Mapeamento de tipos para coincidir com o banco de dados (snake_case)
interface DBProfile {
  id?: string;
  user_id: string;
  studio_name?: string;
  owner_name?: string;
  email?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  specialties?: string[];
  logo_url?: string;
  brand_color?: string;
  is_admin?: boolean;
  is_active?: boolean;
  settings?: any; // JSONB
}

// Converter do formato do App (camelCase) para o DB (snake_case)
const toDBProfile = (profile: Partial<StudioProfile>): Partial<DBProfile> => {
  return {
    studio_name: profile.studioName,
    owner_name: profile.ownerName,
    email: profile.email,
    description: profile.description,
    address: profile.address,
    phone: profile.phone,
    website: profile.website,
    specialties: profile.specialties,
    logo_url: profile.logoUrl,
    brand_color: profile.brandColor,
    is_admin: profile.isAdmin,
    is_active: profile.isActive,
    settings: profile.settings
  };
};

// Converter do DB (snake_case) para o App (camelCase)
const fromDBProfile = (dbProfile: DBProfile): StudioProfile => {
  const defaultSettings = { 
    instructor_permissions: { rehab: true, newsletters: true, students: true } 
  };

  const dbSettings = dbProfile.settings || {};

  // Merge robusto (Deep Merge) para garantir que todas as chaves existam e não sejam undefined
  const settings = {
    ...defaultSettings,
    ...dbSettings,
    instructor_permissions: {
      ...defaultSettings.instructor_permissions,
      ...(dbSettings.instructor_permissions || {})
    }
  };

  return {
    id: dbProfile.id || '',
    userId: dbProfile.user_id,
    studioName: dbProfile.studio_name || '',
    ownerName: dbProfile.owner_name || '',
    email: dbProfile.email || '',
    description: dbProfile.description || '',
    address: dbProfile.address || '',
    phone: dbProfile.phone || '',
    website: dbProfile.website || '',
    specialties: dbProfile.specialties || [],
    logoUrl: dbProfile.logo_url || '',
    brandColor: dbProfile.brand_color || '#14b8a6',
    isAdmin: dbProfile.is_admin || false,
    isActive: dbProfile.is_active !== false,
    settings: settings
  };
};

export const fetchProfile = async (userId: string): Promise<StudioProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('studio_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // maybeSingle retorna null em vez de erro se não achar

    if (error) {
      if (error.code === '42P17') {
        console.warn('Infinite recursion in RLS policy detected. Check Supabase policies.');
        return null;
      }
      // Log detalhado para debug de permissão
      console.error('Error fetching profile for user', userId, ':', JSON.stringify(error));
      return null;
    }

    if (!data) {
      console.log(`Perfil não encontrado para ID: ${userId}. Verifique se a política RLS "Instructors view studio profile" está ativa.`);
      return null;
    }

    return fromDBProfile(data as DBProfile);
  } catch (err) {
    console.error('Unexpected error fetching profile:', err);
    return null;
  }
};

export const upsertProfile = async (userId: string, profile: Partial<StudioProfile>): Promise<{ success: boolean; error?: string }> => {
  try {
    const dbPayload = toDBProfile(profile);
    
    const { error } = await supabase
      .from('studio_profiles')
      .upsert(
        { 
          ...dbPayload, 
          user_id: userId 
        }, 
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving profile:', JSON.stringify(error));
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error saving profile:', err);
    return { success: false, error: err.message || 'Erro inesperado' };
  }
};

export const uploadLogo = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading logo:', JSON.stringify(uploadError));
      return null;
    }

    const { data } = supabase.storage
      .from('studio-logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error uploading logo:', err);
    return null;
  }
};

// --- FUNÇÕES ADMIN ---

export const fetchAllProfiles = async (): Promise<{ data: StudioProfile[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('studio_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin Fetch Error:', error);
      return { data: [], error };
    }
    
    return { data: data.map(fromDBProfile), error: null };
  } catch (err) {
    return { data: [], error: err };
  }
};

export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<boolean> => {
  try {
    console.log(`Tentando atualizar status do usuário ${userId} para ${isActive}...`);
    
    const { error, data } = await supabase
      .from('studio_profiles')
      .update({ is_active: isActive })
      .eq('user_id', userId)
      .select(); 

    if (error) {
      console.error("Erro no toggleUserStatus:", error.message, error.details);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("FALHA: Nenhum registro foi atualizado. Verifique a permissão 'Admins Update All' no Supabase.");
      return false;
    }

    console.log("Status atualizado com sucesso:", data);
    return true;
  } catch (err) {
    console.error("Exceção no toggleUserStatus:", err);
    return false;
  }
};
