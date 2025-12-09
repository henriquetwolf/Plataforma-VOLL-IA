
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
  city?: string; // Coluna Real
  state?: string; // Coluna Real
  cep?: string; // Coluna Real
  owner_birth_date?: string; // Coluna Real
  phone?: string;
  website?: string;
  specialties?: string[];
  logo_url?: string;
  brand_color?: string;
  is_admin?: boolean;
  is_active?: boolean;
  max_students?: number; 
  plan_id?: string;
  plan_expiration_date?: string; // Nova coluna
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
    owner_cpf: profile.ownerCpf,
    owner_photo_url: profile.ownerPhotoUrl,
  };

  return {
    studio_name: profile.studioName,
    owner_name: profile.ownerName,
    email: profile.email,
    description: profile.description,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    cep: profile.cep,
    owner_birth_date: profile.ownerBirthDate,
    phone: profile.phone,
    website: profile.website,
    specialties: profile.specialties,
    logo_url: profile.logoUrl,
    brand_color: profile.brandColor,
    is_admin: profile.isAdmin,
    max_students: profile.maxStudents, 
    plan_id: profile.planId,
    plan_expiration_date: profile.planExpirationDate,
    settings: settings
  };
};

// Converter do DB (snake_case) para o App (camelCase)
const fromDBProfile = (dbProfile: DBProfile): StudioProfile => {
  const defaultSettings = { 
    sender_email: '', 
    language: 'pt',
    terminology: 'student', // Default to student
    instructor_permissions: { rehab: true, newsletters: true, students: true } 
  };

  const dbSettings = dbProfile.settings || {};

  const settings = {
    ...defaultSettings,
    ...dbSettings,
    sender_email: dbSettings.sender_email || defaultSettings.sender_email,
    language: dbSettings.language || defaultSettings.language,
    terminology: dbSettings.terminology || defaultSettings.terminology,
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
    city: dbProfile.city || dbSettings.city || '', // Fallback para settings se coluna vazia
    state: dbProfile.state || dbSettings.state || '',
    cep: dbProfile.cep || dbSettings.cep || '',
    ownerBirthDate: dbProfile.owner_birth_date || dbSettings.owner_birth_date || '',
    phone: dbProfile.phone || '',
    website: dbProfile.website || '',
    specialties: dbProfile.specialties || [],
    logoUrl: dbProfile.logo_url || '',
    brandColor: dbProfile.brand_color || '#14b8a6',
    isAdmin: dbProfile.is_admin || false,
    isActive: isActive, 
    maxStudents: dbProfile.max_students,
    planId: dbProfile.plan_id,
    planExpirationDate: dbProfile.plan_expiration_date,
    planName: dbProfile.subscription_plans?.name,
    planLimit: dbProfile.subscription_plans?.max_students,
    planMaxDailyPosts: dbProfile.subscription_plans?.max_daily_posts,
    settings: settings,
    // Extrair campos estendidos do settings
    cnpj: dbSettings.cnpj,
    instagram: dbSettings.instagram,
    whatsapp: dbSettings.whatsapp,
    ownerCpf: dbSettings.owner_cpf,
    ownerPhotoUrl: dbSettings.owner_photo_url,
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

export const uploadOwnerPhoto = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `owner-${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-logos') // Reuse existing bucket
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading owner photo:', JSON.stringify(uploadError));
      return null;
    }

    const { data } = supabase.storage
      .from('studio-logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error uploading owner photo:', err);
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

export const fetchGlobalAdmins = async (): Promise<StudioProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('studio_profiles')
      .select('*')
      .eq('is_admin', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching global admins:', error);
      return [];
    }

    return data.map(fromDBProfile);
  } catch (err) {
    console.error('Error in fetchGlobalAdmins:', err);
    return [];
  }
};

export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Atualiza o status do Dono
    const { error } = await supabase
      .from('studio_profiles')
      .update({ is_active: isActive })
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. CASCATA: Se estiver desativando (bloqueando), bloqueia também a equipe e alunos
    if (!isActive) {
        // Desativar Instrutores vinculados a este studio
        // (Isso impede o login deles no AuthContext)
        await supabase
            .from('instructors')
            .update({ active: false })
            .eq('studio_user_id', userId);

        // Revogar acesso de Alunos vinculados a este studio
        // (Remove o auth_user_id, impedindo login)
        await supabase
            .from('students')
            .update({ auth_user_id: null })
            .eq('user_id', userId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deleteStudioProfile = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Tenta deletar o usuário COMPLETAMENTE via RPC (Que apaga tudo: Auth, Studio, Alunos, Instrutores)
    // Isso libera o email para ser usado novamente.
    // Requer a função 'delete_user_completely' no Supabase atualizada.
    const { error: rpcError } = await supabase.rpc('delete_user_completely', { target_id: userId });

    if (rpcError) {
        console.warn("RPC delete_user_completely falhou. Tentando exclusão manual em cascata no Frontend.", rpcError);
        
        // FALLBACK: Deleta dependências manualmente antes de deletar o perfil
        // Isso garante que os dados sumam, mesmo que os logins dos alunos/instrutores fiquem órfãos no Auth
        
        // 1. Deletar Instrutores (Dados)
        await supabase.from('instructors').delete().eq('studio_user_id', userId);
        
        // 2. Deletar Alunos (Dados)
        await supabase.from('students').delete().eq('user_id', userId);
        
        // 3. Deletar Perfil do Studio
        const { error } = await supabase
          .from('studio_profiles')
          .delete()
          .eq('user_id', userId);

        if (error) {
          return { success: false, error: error.message };
        }
        
        return { success: true }; 
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
