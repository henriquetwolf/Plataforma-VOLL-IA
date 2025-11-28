import { supabase } from './supabase';
import { Instructor } from '../types';
import { createClient } from '@supabase/supabase-js';

// Função segura para obter variáveis de ambiente sem quebrar a aplicação
const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const value = import.meta.env[key];
      if (value) return value;
    }
  } catch (e) {
    // Ignora
  }
  
  // Tenta acessar via process.env injetado pelo vite.config.ts
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignora
  }
  
  return '';
};

export const fetchInstructors = async (): Promise<Instructor[]> => {
  try {
    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching instructors:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioUserId: item.studio_user_id,
      authUserId: item.auth_user_id,
      name: item.name,
      email: item.email,
      phone: item.phone || '',
      address: item.address || '',
      active: item.active,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Unexpected error fetching instructors:', err);
    return [];
  }
};

// --- NOVA FUNÇÃO DE CRIAÇÃO COMPLETA (EXPORTADA) ---
export const createInstructorWithAuth = async (
  studioUserId: string, 
  instructor: Omit<Instructor, 'id' | 'studioUserId' | 'active' | 'createdAt'> & { password?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Iniciando criação de instrutor com auth...");

    // 1. Validar se senha foi fornecida
    if (!instructor.password || instructor.password.length < 6) {
      return { success: false, error: "A senha deve ter no mínimo 6 caracteres." };
    }

    // 2. Criar cliente temporário
    // @ts-ignore
    const supabaseUrl = supabase.supabaseUrl;
    // @ts-ignore
    const supabaseKey = supabase.supabaseKey;

    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: "Configuração do Supabase inválida." };
    }
    
    // IMPORTANTE: Criar cliente com persistSession: false para não afetar o login atual do dono
    const tempClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // 3. Criar usuário no Auth
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: instructor.email,
      password: instructor.password,
      options: {
        data: { name: instructor.name }
      }
    });

    if (authError) {
      console.error("Erro ao criar auth:", authError);
      if (authError.message.includes("already registered")) {
         return { success: false, error: "Este email já possui uma conta no sistema." };
      }
      return { success: false, error: "Erro ao criar login: " + authError.message };
    }

    const newUserId = authData.user?.id;

    if (!newUserId) {
      return { success: false, error: "Usuário criado mas ID não retornado. Verifique configurações de email." };
    }

    // 4. Inserir na tabela instructors JÁ VINCULADO
    const { error: dbError } = await supabase
      .from('instructors')
      .insert({
        studio_user_id: studioUserId,
        auth_user_id: newUserId, // VÍNCULO IMEDIATO
        name: instructor.name,
        email: instructor.email,
        phone: instructor.phone,
        address: instructor.address,
        active: true
      });

    if (dbError) {
      console.error("Erro ao salvar no banco:", dbError);
      return { success: false, error: "Conta criada, mas falha ao vincular no estúdio: " + dbError.message };
    }

    return { success: true };

  } catch (err: any) {
    console.error('Error creating instructor:', err);
    return { success: false, error: err.message };
  }
};

export const addInstructor = async (
  studioUserId: string, 
  instructor: Omit<Instructor, 'id' | 'studioUserId' | 'active' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error: dbError } = await supabase
      .from('instructors')
      .insert({
        studio_user_id: studioUserId,
        name: instructor.name,
        email: instructor.email,
        phone: instructor.phone,
        address: instructor.address,
        active: true
      });

    if (dbError) throw dbError;
    return { success: true };
  } catch (err: any) {
    console.error('Error adding instructor:', err);
    return { success: false, error: err.message };
  }
};

export const updateInstructor = async (id: string, updates: Partial<Instructor>): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.email) payload.email = updates.email;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.address) payload.address = updates.address;
    if (updates.active !== undefined) payload.active = updates.active;

    const { error } = await supabase
      .from('instructors')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// EXCLUSÃO REFORÇADA COM LOGS
export const deleteInstructor = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Tentando excluir instrutor ${id}...`);
    
    const { error } = await supabase
      .from('instructors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro Supabase ao excluir instrutor:", error);
      return { success: false, error: error.message };
    }
    
    console.log("Instrutor excluído com sucesso.");
    return { success: true };
  } catch (err: any) {
    console.error("Exceção ao excluir instrutor:", err);
    return { success: false, error: err.message };
  }
};

// CORREÇÃO CRÍTICA: Busca robusta por ID ou EMAIL para garantir vínculo
export const getInstructorProfile = async (authUserId: string, email?: string) => {
  try {
    // 1. Tenta buscar pelo ID de autenticação (se já estiver vinculado)
    const { data, error } = await supabase
      .from('instructors')
      .select('*, studio_profiles:studio_user_id (studio_name)')
      .eq('auth_user_id', authUserId)
      .maybeSingle(); 
      
    if (data) return data;

    // 2. Se não achou pelo ID, TENTA FORÇAR O VÍNCULO PELO EMAIL.
    // Isso é crucial para o primeiro login, onde o ID do Auth pode ainda não estar na tabela
    if (email) {
       console.log("Instrutor não encontrado por ID. Buscando por email:", email);
       
       const { data: pendingInstructor, error: pendingError } = await supabase
        .from('instructors')
        .select('*') 
        .eq('email', email)
        .is('auth_user_id', null) // Busca apenas se ainda não estiver vinculado
        .maybeSingle();

       if (pendingInstructor) {
         console.log("Instrutor pendente encontrado! Realizando vínculo automático...", pendingInstructor);
         
         // VINCULA AGORA! (Update auth_user_id)
         const { error: updateError, data: updatedData } = await supabase
            .from('instructors')
            .update({ auth_user_id: authUserId })
            .eq('id', pendingInstructor.id)
            .select('*, studio_profiles:studio_user_id (studio_name)') // Já busca com join
            .single();
            
         if (!updateError && updatedData) {
             console.log("Vínculo realizado com sucesso!", updatedData);
             return updatedData;
         } else {
             console.error("Falha ao vincular instrutor:", updateError);
         }
       }
    }

    return null;
  } catch (err) {
    console.error("Erro ao buscar perfil de instrutor:", err);
    return null;
  }
};