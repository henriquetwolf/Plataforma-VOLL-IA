




import { supabase } from './supabase';
import { StudioProfile, SubscriptionPlan } from '../types';

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
  max_students?: number; 
  plan_id?: string;
  settings?: any; // JSONB
  // Join fields
  subscription_plans?: {
    name: string;
    max_students: number;
    max_daily_posts: number;
  }
}

// Converter do formato do App (camelCase) para o DB (snake_case)
const toDBProfile = (profile: Partial<StudioProfile>): Partial<DBProfile> => {
  // Preserve existing settings and merge new fields into it
  const settings = {
    ...(profile.settings || {}),
    cnpj: profile.cnpj,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp,
    owner_cpf: profile.ownerCpf
  };

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
    max_students: profile.maxStudents, 
    plan_id: profile.planId, // Mapeamento novo
    // REMOVIDO: is_active não deve ser atualizado por aqui para evitar que 
    // o usuário sobrescreva o bloqueio do admin ao salvar o perfil.
    settings: settings
  };
};

// Converter do DB (snake_case) para o App (camelCase)
const fromDBProfile = (dbProfile: DBProfile): StudioProfile => {
  const defaultSettings = { 
    sender_email: '', 
    language: 'pt',
    instructor_permissions: { rehab: true, newsletters: true, students: true } 
  };

  const dbSettings = dbProfile.settings || {};

  const settings = {
    ...defaultSettings,
    ...dbSettings,
    sender_email: dbSettings.sender_email || defaultSettings.sender_email,
    language: dbSettings.language || defaultSettings.language,
    instructor_permissions: {
      ...defaultSettings.instructor_permissions,
      ...(dbSettings.instructor_permissions || {})
    }
  };

  // Lógica defensiva para is_active
  const isActive = dbProfile.is_active !== false;

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
    isActive: isActive, 
    maxStudents: dbProfile.max_students,
    planId: dbProfile.plan_id,
    planName: dbProfile.subscription_plans?.name,
    planLimit: dbProfile.subscription_plans?.max_students,
    planMaxDailyPosts: dbProfile.subscription_plans?.max_daily_posts,
    settings: settings,
    // Extrair campos estendidos do settings
    cnpj: dbSettings.cnpj,
    instagram: dbSettings.instagram,
    whatsapp: dbSettings.whatsapp,
    ownerCpf: dbSettings.owner_cpf
  };
};

export const fetchProfile = async (userId: string): Promise<StudioProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('studio_profiles')
      .select('*, subscription_plans(name, max_students, max_daily_posts)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile for user', userId, ':', JSON.stringify(error));
      return null;
    }

    if (!data) {
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
    // Primeiro buscamos o perfil atual para garantir que o merge do settings não sobrescreva dados
    const { data: currentData } = await supabase
        .from('studio_profiles')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();
    
    const currentSettings = currentData?.settings || {};
    
    // Mesclamos os settings atuais com os novos dados do profile
    const mergedProfile = {
        ...profile,
        settings: {
            ...currentSettings,
            ...(profile.settings || {})
        }
    };

    const dbPayload = toDBProfile(mergedProfile);
    
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

// --- PLANOS DE ASSINATURA ---

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('max_students', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return [];
    }

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      maxStudents: p.max_students,
      maxDailyPosts: p.max_daily_posts || 5 // Default fallback
    }));
  } catch (err) {
    return [];
  }
};

export const updateSubscriptionPlan = async (id: string, updates: { maxStudents?: number, maxDailyPosts?: number }): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload: any = {};
    if (updates.maxStudents !== undefined) payload.max_students = updates.maxStudents;
    if (updates.maxDailyPosts !== undefined) payload.max_daily_posts = updates.maxDailyPosts;

    const { error } = await supabase
      .from('subscription_plans')
      .update(payload)
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// --- FUNÇÕES ADMIN ---

export const fetchAllProfiles = async (): Promise<{ data: StudioProfile[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('studio_profiles')
      .select('*, subscription_plans(name, max_students, max_daily_posts)')
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

export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> => {
  try {
    // Atualiza APENAS o campo is_active para evitar sobrescrever outros dados
    const { error, data } = await supabase
      .from('studio_profiles')
      .update({ is_active: isActive })
      .eq('user_id', userId)
      .select(); 

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "Registro não encontrado ou bloqueado por RLS." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// Admin reset password feature
export const adminResetPassword = async (targetUserId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Uses the existing RPC function which needs to be available in DB
    const { error } = await supabase.rpc('update_user_password', {
      target_id: targetUserId,
      new_password: newPassword
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};