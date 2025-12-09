
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'; // Importa chaves exportadas
import { Instructor } from '../types';
import { createClient } from '@supabase/supabase-js';

/*
  ⚠️ SQL NECESSÁRIO PARA ALTERAÇÃO DE SENHA NA EDIÇÃO E NOVOS CAMPOS:
  
  create or replace function update_user_password(target_id uuid, new_password text)
  returns void
  language plpgsql
  security definer
  set search_path = extensions, public, auth
  as $$
  begin
    update auth.users
    set encrypted_password = crypt(new_password, gen_salt('bf'))
    where id = target_id;
  end;
  $$;

  ALTER TABLE instructors 
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS certifications text[];
*/

export const fetchInstructors = async (studioId?: string): Promise<Instructor[]> => {
  try {
    let query = supabase.from('instructors').select('*');

    if (studioId) {
      query = query.eq('studio_user_id', studioId);
    }

    // Ordenação Alfabética
    const { data, error } = await query.order('name', { ascending: true });

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
      birthDate: item.birth_date || '',
      address: item.address || '',
      city: item.city || '',
      state: item.state || '',
      cep: item.cep || '',
      photoUrl: item.photo_url || '',
      certifications: item.certifications || [],
      active: item.active,
      createdAt: item.created_at
    }));
  } catch (err: any) {
    console.error('Unexpected error fetching instructors:', err.message || err);
    return [];
  }
};

export const uploadInstructorPhoto = async (studioId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `instructor-${studioId}-${Date.now()}.${fileExt}`;
    // Usaremos o bucket 'studio-logos' (ou crie 'instructor-photos' no Supabase)
    const filePath = `instructors/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-logos') 
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading instructor photo:', JSON.stringify(uploadError));
      return null;
    }

    const { data } = supabase.storage
      .from('studio-logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error uploading photo:', err);
    return null;
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
        birth_date: instructor.birthDate ? instructor.birthDate : null,
        address: instructor.address,
        city: instructor.city,
        state: instructor.state,
        cep: instructor.cep,
        photo_url: instructor.photoUrl,
        certifications: instructor.certifications,
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

export const updateInstructor = async (
  id: string, 
  updates: Partial<Instructor>,
  newPassword?: string // Parâmetro opcional para atualização de senha
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Atualizar dados cadastrais
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.email) payload.email = updates.email;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.address) payload.address = updates.address;
    if (updates.cpf) payload.cpf = updates.cpf;
    if (updates.birthDate !== undefined) payload.birth_date = updates.birthDate;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.state !== undefined) payload.state = updates.state;
    if (updates.cep !== undefined) payload.cep = updates.cep;
    if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
    if (updates.certifications !== undefined) payload.certifications = updates.certifications;
    if (updates.active !== undefined) payload.active = updates.active;

    const { error } = await supabase
      .from('instructors')
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    // 2. Atualizar Senha (Se fornecida e válida)
    if (newPassword && newPassword.trim().length >= 6) {
        // Primeiro, precisamos do ID de Auth (auth_user_id) deste instrutor
        const { data: instructorData, error: fetchError } = await supabase
            .from('instructors')
            .select('auth_user_id')
            .eq('id', id)
            .single();
            
        if (fetchError || !instructorData?.auth_user_id) {
            console.warn("Não foi possível encontrar o vínculo de login para alterar a senha.");
            // Não retornamos erro fatal aqui para não bloquear a atualização dos outros dados
        } else {
            // Chamada RPC para a função SQL criada
            const { error: rpcError } = await supabase.rpc('update_user_password', {
                target_id: instructorData.auth_user_id,
                new_password: newPassword
            });

            if (rpcError) {
                console.error("Erro ao atualizar senha via RPC:", rpcError);
                return { success: true, error: "Dados salvos, mas houve erro ao atualizar a senha: " + rpcError.message };
            }
        }
    }

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
    
    // 1. Buscar o auth_user_id antes de deletar
    const { data: instructor } = await supabase.from('instructors').select('auth_user_id').eq('id', id).single();

    // 2. Se tiver login, tenta deletar via RPC (Hard Delete)
    if (instructor?.auth_user_id) {
        const { error: rpcError } = await supabase.rpc('delete_user_completely', { target_id: instructor.auth_user_id });
        // Se sucesso no RPC, o delete da tabela já ocorreu via cascade (se configurado) ou ocorreu no auth
        // Se RPC falhar (não existe), segue para delete normal
        if (!rpcError) return { success: true };
    }

    // 3. Fallback: Exclui da tabela (Soft delete / Email preso)
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
