
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Student } from '../types';
import { createClient } from '@supabase/supabase-js';
import { fetchProfile } from './storage';

/*
  ⚠️ SQL NECESSÁRIO NO SUPABASE (Execute no SQL Editor):

  ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS goals text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
*/

interface ServiceResponse {
  success: boolean;
  error?: string;
  message?: string;
}

const sanitize = (value: string | undefined | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const fetchStudents = async (studioId?: string): Promise<Student[]> => {
  try {
    let query = supabase.from('students').select('*');
    
    if (studioId) {
        query = query.eq('user_id', studioId);
    }

    // Alterado para ordenar por nome em ordem alfabética
    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Error fetching students:', error.message || error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      authUserId: item.auth_user_id, 
      name: item.name,
      email: item.email || '',
      cpf: item.cpf || '',
      address: item.address || '',
      phone: item.phone || '',
      observations: item.observations || '',
      photoUrl: item.photo_url || '',
      city: item.city || '',
      state: item.state || '',
      cep: item.cep || '',
      birthDate: item.birth_date || '',
      goals: item.goals || '',
      emergencyContactName: item.emergency_contact_name || '',
      emergencyContactPhone: item.emergency_contact_phone || '',
      createdAt: item.created_at
    }));
  } catch (err: any) {
    console.error('Unexpected error fetching students:', err.message || err);
    return [];
  }
};

export const uploadStudentPhoto = async (studioId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `student-${studioId}-${Date.now()}.${fileExt}`;
    // Usaremos o bucket 'studio-logos' para simplificar, mas idealmente seria 'students'
    const filePath = `students/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-logos') 
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading student photo:', JSON.stringify(uploadError));
      return null;
    }

    const { data } = supabase.storage
      .from('studio-logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error uploading student photo:', err);
    return null;
  }
};

// --- NOVA FUNÇÃO: CRIAR ALUNO COM ACESSO AUTOMÁTICO (NOVO CADASTRO) ---
export const createStudentWithAutoAuth = async (
  studioUserId: string,
  student: Omit<Student, 'id' | 'userId' | 'authUserId'>,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // --- VERIFICAÇÃO DE PLANO DO STUDIO ---
    // 1. Obter o perfil do studio E o limite do plano associado
    const { data: profile, error: profileError } = await supabase
        .from('studio_profiles')
        .select('max_students, subscription_plans(max_students)')
        .eq('user_id', studioUserId)
        .single();

    if (profileError) {
        return { success: false, error: "Erro ao verificar plano do studio." };
    }

    // Prioriza o limite do PLANO. Se não tiver plano, usa o limite manual legado.
    // Se ambos nulos, assume ilimitado.
    // @ts-ignore
    let limit = profile?.subscription_plans?.max_students;
    if (limit === undefined || limit === null) {
        limit = profile?.max_students;
    }

    if (limit !== undefined && limit !== null) {
        // 2. Contar alunos atuais
        const { count, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', studioUserId);
        
        if (countError) {
            return { success: false, error: "Erro ao verificar contagem de alunos." };
        }

        if (count !== null && count >= limit) {
            return { 
                success: false, 
                error: `Limite de alunos atingido (${limit}). Entre em contato com o suporte para alterar seu plano.` 
            };
        }
    }
    // --------------------------------------

    if (!password || password.length < 6) {
      return { success: false, error: "A senha deve ter no mínimo 6 caracteres." };
    }

    // 1. Criar cliente temporário para não deslogar o dono
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: "Configuração do Supabase inválida." };
    }

    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // 2. Criar usuário no Auth
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: student.email,
      password: password,
      options: {
        data: {
          name: student.name,
          role: 'student', // Marcação importante para AuthContext
          studio_id: studioUserId
        }
      }
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
         return { success: false, error: "Este email já possui uma conta no sistema. Use a opção de ativar acesso na lista de alunos." };
      }
      return { success: false, error: "Erro ao criar login: " + authError.message };
    }

    const newUserId = authData.user?.id;

    if (!newUserId) {
      return { success: false, error: "Erro: Usuário criado mas ID não retornado." };
    }

    // 3. Inserir na tabela students JÁ VINCULADO
    const payload = {
      user_id: studioUserId,
      auth_user_id: newUserId, // VÍNCULO IMEDIATO
      name: student.name.trim(),
      email: sanitize(student.email),
      cpf: sanitize(student.cpf),
      address: sanitize(student.address),
      phone: sanitize(student.phone),
      observations: sanitize(student.observations),
      photo_url: student.photoUrl,
      city: sanitize(student.city),
      state: sanitize(student.state),
      cep: sanitize(student.cep),
      birth_date: sanitize(student.birthDate),
      goals: sanitize(student.goals),
      emergency_contact_name: sanitize(student.emergencyContactName),
      emergency_contact_phone: sanitize(student.emergencyContactPhone)
    };

    const { error: dbError } = await supabase
      .from('students')
      .insert(payload);

    if (dbError) {
      console.error("Erro ao salvar no banco:", dbError);
      return { success: false, error: "Conta de login criada, mas falha ao salvar dados do aluno: " + dbError.message };
    }

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// --- FUNÇÃO PARA ATIVAR ACESSO (ALUNO JÁ EXISTENTE OU REATIVAÇÃO) ---
export const createStudentWithAuth = async (
  studentId: string, 
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    if (!password || password.length < 6) {
      return { success: false, error: "Senha deve ter no mínimo 6 caracteres." };
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: "Configuração do Supabase inválida (URL/Key)." };
    }
    
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // Tenta criar usuário novo
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'student' }
      }
    });

    let newUserId = authData.user?.id;
    let isReactivation = false;

    // Se der erro de "já registrado", tentamos recuperar o ID e atualizar a senha (REATIVAÇÃO)
    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("User already exists")) {
         
         // 1. Recuperar ID via RPC (Função segura no DB)
         const { data: existingUserId, error: rpcError } = await supabase.rpc('get_user_id_by_email', { email_input: email });

         if (rpcError || !existingUserId) {
             console.error("RPC Error:", rpcError);
             return { success: false, error: "Este email já possui conta, mas não foi possível recuperar o ID. Peça ao administrador para verificar a função 'get_user_id_by_email'." };
         }

         newUserId = existingUserId;
         isReactivation = true;

         // 2. Atualizar a senha para a nova que o usuário digitou (para garantir acesso)
         const { error: pwdError } = await supabase.rpc('update_user_password', {
            target_id: newUserId,
            new_password: password
         });
         
         if (pwdError) {
             console.warn("Aviso: Falha ao atualizar senha na reativação.", pwdError);
         }
      } else {
         return { success: false, error: authError.message };
      }
    }
    
    if (!newUserId) {
        return { success: false, error: "Erro ao obter ID de login." };
    }

    // Vincula na tabela students
    const { error: dbError } = await supabase
      .from('students')
      .update({ auth_user_id: newUserId })
      .eq('id', studentId);

    if (dbError) {
      return { success: false, error: "Login validado, mas falha ao vincular no cadastro do aluno: " + dbError.message };
    }

    // Retorna mensagem específica se foi reativação
    const msg = isReactivation ? "Acesso REATIVADO com sucesso! A senha foi atualizada para a nova definida." : undefined;

    return { success: true, message: msg };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const revokeStudentAccess = async (studentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Apenas remove o vínculo auth_user_id da tabela students.
    // O usuário no Auth continua existindo, mas sem vínculo, o AuthContext bloqueia o acesso.
    const { error, data } = await supabase
      .from('students')
      .update({ auth_user_id: null })
      .eq('id', studentId)
      .select();

    if (error) {
      console.error("Erro ao revogar acesso do aluno:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateStudent = async (studentId: string, updates: Partial<Student>, password?: string): Promise<ServiceResponse> => {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.email !== undefined) payload.email = sanitize(updates.email);
    if (updates.phone !== undefined) payload.phone = sanitize(updates.phone);
    if (updates.cpf !== undefined) payload.cpf = sanitize(updates.cpf);
    if (updates.address !== undefined) payload.address = sanitize(updates.address);
    if (updates.observations !== undefined) payload.observations = sanitize(updates.observations);
    
    // New Fields
    if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
    if (updates.city !== undefined) payload.city = sanitize(updates.city);
    if (updates.state !== undefined) payload.state = sanitize(updates.state);
    if (updates.cep !== undefined) payload.cep = sanitize(updates.cep);
    if (updates.birthDate !== undefined) payload.birth_date = sanitize(updates.birthDate);
    if (updates.goals !== undefined) payload.goals = sanitize(updates.goals);
    if (updates.emergencyContactName !== undefined) payload.emergency_contact_name = sanitize(updates.emergencyContactName);
    if (updates.emergencyContactPhone !== undefined) payload.emergency_contact_phone = sanitize(updates.emergencyContactPhone);

    const { error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', studentId);

    if (error) {
      console.error('Error updating student:', error.message);
      return { success: false, error: error.message };
    }

    // Update Password if provided
    if (password && password.length >= 6) {
        const { data: studentData } = await supabase
            .from('students')
            .select('auth_user_id')
            .eq('id', studentId)
            .single();
            
        if (studentData?.auth_user_id) {
            const { error: rpcError } = await supabase.rpc('update_user_password', {
                target_id: studentData.auth_user_id,
                new_password: password
            });
            
            if (rpcError) {
                return { success: true, error: "Dados salvos, mas erro ao atualizar senha: " + rpcError.message };
            }
        }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deleteStudent = async (studentId: string): Promise<ServiceResponse> => {
  try {
    // 1. Remover registros dependentes para evitar erro de Foreign Key
    // Exclui planos de reabilitação vinculados
    await supabase.from('rehab_lessons').delete().eq('student_id', studentId);
    
    // Exclui evoluções do aluno
    await supabase.from('student_evolutions').delete().eq('student_id', studentId);
    
    // Exclui sugestões
    await supabase.from('suggestions').delete().eq('student_id', studentId);
    
    // Exclui avaliações de aula
    await supabase.from('class_evaluations').delete().eq('student_id', studentId);

    // 2. Excluir o aluno
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Error deleting student:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const getStudentProfile = async (authUserId: string) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*') 
      .eq('auth_user_id', authUserId)
      .maybeSingle();
      
    if (error) {
        console.warn("getStudentProfile fetch error:", error.message);
        return null;
    }
    return data;
  } catch (err) {
    return null;
  }
};
