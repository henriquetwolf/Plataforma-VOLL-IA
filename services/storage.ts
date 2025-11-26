import { supabase } from './supabase';
import { StudioProfile } from '../types';

// Mapeamento de tipos para coincidir com o banco de dados (snake_case)
interface DBProfile {
  id?: string;
  user_id: string;
  studio_name?: string;
  owner_name?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  specialties?: string[];
}

// Converter do formato do App (camelCase) para o DB (snake_case)
const toDBProfile = (profile: Partial<StudioProfile>): Partial<DBProfile> => {
  return {
    studio_name: profile.studioName,
    owner_name: profile.ownerName,
    description: profile.description,
    address: profile.address,
    phone: profile.phone,
    website: profile.website,
    specialties: profile.specialties,
  };
};

// Converter do DB (snake_case) para o App (camelCase)
const fromDBProfile = (dbProfile: DBProfile): StudioProfile => {
  return {
    id: dbProfile.id || '',
    userId: dbProfile.user_id,
    studioName: dbProfile.studio_name || '',
    ownerName: dbProfile.owner_name || '',
    description: dbProfile.description || '',
    address: dbProfile.address || '',
    phone: dbProfile.phone || '',
    website: dbProfile.website || '',
    specialties: dbProfile.specialties || [],
  };
};

export const fetchProfile = async (userId: string): Promise<StudioProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('studio_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (!data) return null;

    return fromDBProfile(data as DBProfile);
  } catch (err) {
    console.error('Unexpected error fetching profile:', err);
    return null;
  }
};

export const upsertProfile = async (userId: string, profile: Partial<StudioProfile>): Promise<boolean> => {
  try {
    const dbPayload = toDBProfile(profile);
    
    // O upsert do Supabase gerencia insert ou update baseado na chave única (user_id)
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
      console.error('Error saving profile:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error saving profile:', err);
    return false;
  }
};