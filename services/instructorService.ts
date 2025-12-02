
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'; // Importa chaves exportadas
import { Instructor } from '../types';
import { createClient } from '@supabase/supabase-js';

export const fetchInstructors = async (studioId?: string): Promise<Instructor[]> => {
  try {
    let query = supabase.from('instructors').select('*');

    if (studioId) {
      query = query.eq('studio_user_id', studioId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Improved error logging
      console.error('Error fetching instructors:', error.message || error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioUserId: item.studio_user_id,
      authUserId: item.auth_user_id,
      name: item.name,
      email: item.email,
      cpf: item.cpf || '',
      phone: item.phone || '',
      address: item.address || '',
      active: item.active,
      createdAt: item.created_at
    }));
  } catch (err: any) {
    console.error('Unexpected error fetching instructors:', err.message || err);
    return [];
  }
};

// --- FUNÇÃO DE CRIAÇÃO COM LOGIN ---
export const createInstructorWithAuth = async (
  studioUserId: string, 
  instructor: Omit<Instructor, 'id' | 'studioUserId' | 'active' | 'createdAt'>,
  password: string // Senha manual agora obrigatória
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Iniciando criação de instrutor com auth...");

    if (!password || password.length < 6) {
      return { success: false, error: "A senha deve ter no mínimo 6 caracteres." };
    }

    // 2. Criar cliente temporário usando as chaves exportadas do supabase.ts
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: "Configuração do Supabase inválida." };
    }
    
    // IMPORTANTE: Criar cliente com persistSession: false para não deslogar o dono
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // 3. Criar usuário no Auth COM METADATA DE ROLE E STUDIO_ID
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: instructor.email,
      password: password, 
      options: {
        data: { 
            name: instructor.name,
            role: 'instructor', // MARCAÇÃO CRÍTICA PARA IDENTIFICAÇÃO
            studio_id: studioUserId // VÍNCULO DE BACKUP NO METADATA
        }
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

    // 4. Inserir na tabela instructors JÁ VINCULADO (auth_user_id preenchido)
    // Usamos o cliente principal (autenticado como dono) para ter permissão de escrita
    const { error: dbError } = await supabase
      .from('instructors')
      .insert({
        studio_user_id: studioUserId,
        auth_user_id: newUserId, // VÍNCULO IMEDIATO
        name: instructor.name,
        email: instructor.email,
        cpf: instructor.cpf,
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

export const updateInstructor = async (id: string, updates: Partial<Instructor>): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.email) payload.email = updates.email;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.address) payload.address = updates.address;
    if (updates.cpf) payload.cpf = updates.cpf;
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

export const toggleInstructorStatus = async (id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error, data } = await supabase
      .from('instructors')
      .update({ active: isActive })
      .eq('id', id)
      .select();

    if (error) {
      console.error("Erro ao atualizar status do instrutor:", error);
      return { success: false, error: error.message };
    }
    
    if (!data || data.length === 0) {
       return { success: false, error: "Registro não encontrado ou permissão negada (RLS)." };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exceção toggleInstructorStatus:", err);
    return { success: false, error: err.message };
  }
};

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
    
    return { success: true };
  } catch (err: any) {
    console.error("Exceção ao excluir instrutor:", err);
    return { success: false, error: err.message };
  }
};

export const getInstructorProfile = async (authUserId: string, email?: string) => {
  try {
    // Busca por ID primeiro (com JOIN para pegar o nome do studio)
    const { data, error } = await supabase
      .from('instructors')
      .select('*, studio_profiles:studio_user_id (studio_name)')
      .eq('auth_user_id', authUserId)
      .maybeSingle(); 
      
    if (data) return data;

    // Se falhar o Join (por RLS), tenta buscar apenas o instrutor (Fallback)
    // Isso garante que conseguimos pegar o `studio_user_id` para fazer o login
    if (error) {
       console.warn("Falha ao ler perfil completo. Tentando leitura básica.", error.message);
       const { data: simpleData } = await supabase
        .from('instructors')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
        
       if (simpleData) return simpleData;
    }

    // Se não achou por ID e tem email, tenta vincular (fallback legado)
    if (email) {
       const { data: pendingInstructor } = await supabase
        .from('instructors')
        .select('*') 
        .eq('email', email)
        .is('auth_user_id', null)
        .maybeSingle();

       if (pendingInstructor) {
         const { error: updateError, data: updatedData } = await supabase
            .from('instructors')
            .update({ auth_user_id: authUserId })
            .eq('id', pendingInstructor.id)
            .select('*, studio_profiles:studio_user_id (studio_name)')
            .single();
            
         if (!updateError && updatedData) {
             return updatedData;
         }
       }
    }
    return null;
  } catch (err) {
    console.error("Erro ao buscar perfil de instrutor:", err);
    return null;
  }
};
