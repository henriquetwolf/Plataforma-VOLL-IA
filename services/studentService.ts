import { supabase } from './supabase';
import { Student } from '../types';

interface ServiceResponse {
  success: boolean;
  error?: string;
}

// Helper para converter string vazia em null (evita erros de constraint unique ou formato no banco)
const sanitize = (value: string | undefined | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const fetchStudents = async (): Promise<Student[]> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      observations: item.observations || '',
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Unexpected error fetching students:', err);
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
      console.error('Error adding student:', error);
      return { success: false, error: error.message || 'Erro desconhecido ao adicionar aluno' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error adding student:', err);
    return { success: false, error: err.message || JSON.stringify(err) };
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
      console.error('Error updating student:', error);
      return { success: false, error: error.message || 'Erro ao atualizar aluno' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error updating student:', err);
    return { success: false, error: err.message || JSON.stringify(err) };
  }
};

export const deleteStudent = async (studentId: string): Promise<ServiceResponse> => {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Error deleting student:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error deleting student:', err);
    return { success: false, error: err.message || JSON.stringify(err) };
  }
};