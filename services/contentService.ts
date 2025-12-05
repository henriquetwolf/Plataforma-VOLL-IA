
import { supabase } from './supabase';
import { StudioPersona, SavedPost, StrategicContentPlan } from '../types';

// --- PERSONA ---
// Stored in studio_profiles.settings -> content_persona

export const saveStudioPersona = async (studioId: string, persona: StudioPersona) => {
  try {
    // First fetch current settings
    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('settings')
      .eq('user_id', studioId)
      .single();

    const currentSettings = profile?.settings || {};
    const newSettings = { ...currentSettings, content_persona: persona };

    const { error } = await supabase
      .from('studio_profiles')
      .update({ settings: newSettings })
      .eq('user_id', studioId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error saving persona:", err);
    return { success: false, error: err.message };
  }
};

export const fetchStudioPersona = async (studioId: string): Promise<StudioPersona | null> => {
  try {
    const { data, error } = await supabase
      .from('studio_profiles')
      .select('settings')
      .eq('user_id', studioId)
      .single();

    if (error) throw error;
    return data?.settings?.content_persona || null;
  } catch (err) {
    return null;
  }
};

// --- SAVED POSTS ---
// Assumes table 'content_posts' exists: id, studio_id, data (jsonb), created_at

export const savePost = async (studioId: string, post: SavedPost) => {
  try {
    const { error } = await supabase
      .from('content_posts')
      .insert({
        id: post.id,
        studio_id: studioId,
        data: post
      });

    if (error) {
       console.error("Supabase Save Post Error:", error);
       return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchSavedPosts = async (studioId: string): Promise<SavedPost[]> => {
  try {
    // PERFORMANCE FIX: Limit to 15 items to avoid loading too many base64 images
    const { data, error } = await supabase
      .from('content_posts')
      .select('data')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;
    return data.map((row: any) => row.data);
  } catch (err) {
    console.error("Error fetching posts:", err);
    return [];
  }
};

export const deleteSavedPost = async (postId: string) => {
    try {
        const { error } = await supabase.from('content_posts').delete().eq('id', postId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};

// --- USAGE TRACKING (NEW) ---
// Registra o uso independente se o post foi salvo ou deletado depois

export const recordGenerationUsage = async (studioId: string) => {
    try {
        // Tabela simples de log: id, studio_id, created_at
        await supabase.from('content_generations').insert({ studio_id: studioId });
    } catch (e) {
        console.error("Error logging generation usage:", e);
    }
};

export const getTodayPostCount = async (studioId: string): Promise<number> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 1. Tenta contar na tabela de logs (persistente mesmo se deletar post)
        const { count: logCount, error: logError } = await supabase
            .from('content_generations')
            .select('*', { count: 'exact', head: true })
            .eq('studio_id', studioId)
            .gte('created_at', today.toISOString());

        if (!logError && logCount !== null) {
            return logCount;
        }

        // 2. Fallback: Conta posts salvos (se a tabela nova não existir ou der erro)
        const { count } = await supabase
            .from('content_posts')
            .select('*', { count: 'exact', head: true })
            .eq('studio_id', studioId)
            .gte('created_at', today.toISOString());
        
        return count || 0;
    } catch (e) {
        console.error("Exception counting posts:", e);
        return 0;
    }
};

// --- STRATEGIC PLANS (CONTENT PLANS) ---
// Assumes table 'content_plans' exists: id, studio_id, data (jsonb), created_at

export const saveContentPlan = async (studioId: string, plan: StrategicContentPlan) => {
    try {
        const { error } = await supabase
          .from('content_plans')
          .insert({
            id: plan.id,
            studio_id: studioId,
            data: plan
          });
    
        if (error) throw error;
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
};

export const fetchContentPlans = async (studioId: string): Promise<StrategicContentPlan[]> => {
    try {
        const { data, error } = await supabase
          .from('content_plans')
          .select('data')
          .eq('studio_id', studioId)
          .order('created_at', { ascending: false })
          .limit(10); // Limit to avoid heavy load
    
        if (error) throw error;
        return data.map((row: any) => row.data);
      } catch (err) {
        return [];
      }
};

export const deleteContentPlan = async (planId: string) => {
    try {
        const { error } = await supabase.from('content_plans').delete().eq('id', planId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};
