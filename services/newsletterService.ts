
import { supabase } from './supabase';
import { Newsletter, NewsletterAudience } from '../types';

export const saveNewsletter = async (
  studioId: string,
  title: string,
  content: string,
  targetAudience: NewsletterAudience
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('newsletters')
      .insert({
        studio_id: studioId,
        title,
        content,
        target_audience: targetAudience
      });

    if (error) {
      console.error('Error saving newsletter:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchNewslettersByStudio = async (studioId: string): Promise<Newsletter[]> => {
  try {
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching newsletters:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      title: item.title,
      content: item.content,
      targetAudience: item.target_audience,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const fetchStudentNewsletters = async (studioId: string): Promise<Newsletter[]> => {
  try {
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('studio_id', studioId)
      .in('target_audience', ['students', 'both'])
      .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      title: item.title,
      content: item.content,
      targetAudience: item.target_audience,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const fetchInstructorNewsletters = async (studioId: string): Promise<Newsletter[]> => {
  try {
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('studio_id', studioId)
      .in('target_audience', ['instructors', 'both'])
      .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      title: item.title,
      content: item.content,
      targetAudience: item.target_audience,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const deleteNewsletter = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('newsletters').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
