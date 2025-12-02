
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Student } from '../types';
import { createClient } from '@supabase/supabase-js';

/*
  ⚠️ CORREÇÃO DE RECURSÃO INFINITA (ERROR 42P17)
  
  Se você encontrar o erro "infinite recursion detected", execute este SQL no Supabase:

  -- 1. Função segura para checar se é instrutor (SECURITY DEFINER)
  create or replace function is_instructor_at_studio(target_studio_id uuid)
  returns boolean language sql security definer set search_path = public as $$
    select exists (
      select 1 from instructors
      where auth_user_id = auth.uid() and studio_user_id = target_studio_id
    );
  $$;

  -- 2. Função segura para pegar ID do studio do aluno (SECURITY DEFINER)
  create or replace function get_my_studio_id_as_student()
  returns uuid language sql security definer set search_path = public as $$
    select user_id from students where auth_user_id = auth.uid() limit 1;
  $$;

  -- 3. Atualizar Políticas para usar as funções
  drop policy if exists "Instructors can view studio students" on students;
  create policy "Instructors can view studio students" on students
    for select to authenticated using ( is_instructor_at_studio(user_id) );

  drop policy if exists "Students can view studio instructors" on instructors;
  create policy "Students can view studio instructors" on instructors
    for select to authenticated using ( studio_user_id = get_my_studio_id_as_student() );
    
  -- 4. Função para reativação de aluno (Busca ID por email)
  create or replace function get_user_id_by_email(email_input text)
  returns uuid language plpgsql security definer as $$
  begin
    return (select id from auth.users where email = email_input);
  end;
  $$;
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
    
    // Filter by studio owner ID if provided (for instructors seeing owner's students)
    if (studioId) {
        query = query.eq('user_id', studioId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P17') {
         console.error("🚨 ERRO CRÍTICO DE RECURSÃO (RLS). Execute o SQL que está no topo de services/studentService.ts no Supabase.");
      }
      // Log formatted error message instead of JSON string to avoid confusion
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
      createdAt: item.created_at
    }));
  } catch (err: any) {
    console.error('Unexpected error fetching students:', err.message || err);
    return [];
  }
};

// --- FUNÇÃO ANTIGA (SEM AUTH AUTOMÁTICO) - Mantida para fallback ---
export const addStudent = async (userId: string, student: Omit<Student, 'id' | 'userId'>): Promise<ServiceResponse> => {
  try {
    const payload = {
      user_id: userId,
      name: student.name.trim(),
      email: sanitize(student.email),
      cpf: sanitize(student.cpf),
      address: sanitize(student.address),
      phone: sanitize(student.phone),
      observations: sanitize(student.observations)
    };

    const { error } = await supabase
      .from('students')
      .insert(payload);

    if (error) {
      console.error('Error adding student:', error.message);
      return { success: false, error: error.message || 'Erro desconhecido ao adicionar aluno' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error adding student:', err);
    return { success: false, error: err.message || JSON.stringify(err) };
  }
};

// --- NOVA FUNÇÃO: CRIAR ALUNO COM ACESSO AUTOMÁTICO ---
export const createStudentWithAutoAuth = async (
  studioUserId: string,
  student: Omit<Student, 'id' | 'userId' | 'authUserId'>,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
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
          role: 'student', // Marcação importante
          studio_id: studioUserId // Vínculo de backup
        }
      }
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
         return { success: false, error: "Este email já possui uma conta no sistema." };
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
      observations: sanitize(student.observations)
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

// --- Função para criar acesso posteriormente (para alunos antigos ou reativar) ---
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

    // Tenta criar
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'student' }
      }
    });

    let newUserId = authData.user?.id;

    // Se der erro de "já registrado", tentamos recuperar o ID e atualizar a senha (REATIVAÇÃO)
    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("User already exists")) {
         
         // 1. Recuperar ID via RPC (Função segura no DB)
         const { data: existingUserId, error: rpcError } = await supabase.rpc('get_user_id_by_email', { email_input: email });

         if (rpcError || !existingUserId) {
             console.error("RPC Error:", rpcError);
             return { success: false, error: "Este email já possui conta, mas não foi possível reativá-la automaticamente. Verifique se o SQL 'get_user_id_by_email' foi criado no Supabase." };
         }

         newUserId = existingUserId;

         // 2. Atualizar a senha para a nova que o usuário digitou (para garantir acesso)
         const { error: pwdError } = await supabase.rpc('update_user_password', {
            target_id: newUserId,
            new_password: password
         });
         
         if (pwdError) {
             console.warn("Aviso: Falha ao atualizar senha na reativação.", pwdError);
             // Não retornamos erro fatal, apenas avisamos, pois o vínculo ainda pode ocorrer
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

    // Retorna mensagem específica se foi reativação ou criação
    const msg = authError ? "Acesso reativado com sucesso! A senha foi atualizada." : undefined;

    return { success: true, message: msg };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const revokeStudentAccess = async (studentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Remove o vínculo auth_user_id da tabela students
    const { error, data } = await supabase
      .from('students')
      .update({ auth_user_id: null })
      .eq('id', studentId)
      .select();

    if (error) {
      console.error("Erro ao revogar acesso do aluno:", error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
        return { success: false, error: "Registro não encontrado ou permissão negada (RLS)." };
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
                console.error("Error updating password:", rpcError);
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
        console.warn("getStudentProfile fetch error (RLS likely):", error.message);
        return null;
    }
    if (data) return data;
    return null;
  } catch (err) {
    console.error("getStudentProfile exception:", err);
    return null;
  }
};
