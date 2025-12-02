
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
*/

interface ServiceResponse {
  success: boolean;
  error?: string;
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
      phone: item.phone || '',
      observations: item.observations || '',
      createdAt: item.created_at
    }));
  } catch (err: any) {
    console.error('Unexpected error fetching students:', err.message || err);
    return [];
  }
};

export const addStudent = async (userId: string, student: Omit<Student, 'id' | 'userId'>): Promise<ServiceResponse> => {
  try {
    const payload = {
      user_id: userId,
      name: student.name.trim(),
      email: sanitize(student.email),
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

// --- NOVA FUNÇÃO: Criar Acesso do Aluno ---
export const createStudentWithAuth = async (
  studentId: string, 
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!password || password.length < 6) {
      return { success: false, error: "Senha deve ter no mínimo 6 caracteres." };
    }

    // Verifica se as chaves estão disponíveis (importadas de services/supabase.ts)
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: "Configuração do Supabase inválida (URL/Key)." };
    }
    
    // Cliente temporário para não deslogar o dono
    // Usamos persistSession: false para garantir isolamento
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // Cria usuário no Auth
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
         return { success: false, error: "Este email já possui uma conta no sistema." };
      }
      return { success: false, error: authError.message };
    }

    const newUserId = authData.user?.id;
    
    if (!newUserId) {
        // Se o auto-confirm estiver desligado, o ID pode vir, mas o login não estará ativo.
        // Em alguns casos, o user pode vir null se houver erro silencioso.
        return { success: false, error: "Erro ao criar ID de login. Verifique se o email é válido." };
    }

    // Vincula na tabela students usando o cliente principal (autenticado como dono/instrutor)
    const { error: dbError } = await supabase
      .from('students')
      .update({ auth_user_id: newUserId })
      .eq('id', studentId);

    if (dbError) {
      return { success: false, error: "Login criado, mas falha ao vincular no aluno: " + dbError.message };
    }

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const revokeStudentAccess = async (studentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
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

export const updateStudent = async (studentId: string, updates: Partial<Student>): Promise<ServiceResponse> => {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.email !== undefined) payload.email = sanitize(updates.email);
    if (updates.phone !== undefined) payload.phone = sanitize(updates.phone);
    if (updates.observations !== undefined) payload.observations = sanitize(updates.observations);

    const { error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', studentId);

    if (error) {
      console.error('Error updating student:', error.message);
      return { success: false, error: error.message };
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

// Busca perfil do aluno logado
export const getStudentProfile = async (authUserId: string) => {
  try {
    // Busca simplificada sem joins complexos para evitar erros de relacionamento
    const { data, error } = await supabase
      .from('students')
      .select('*') 
      .eq('auth_user_id', authUserId)
      .maybeSingle();
      
    if (error) {
        // Log discreto para não poluir, mas ajuda a debugar RLS
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
