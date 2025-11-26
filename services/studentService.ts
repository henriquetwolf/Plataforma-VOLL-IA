import { supabase } from './supabase';
import { Student } from '../types';

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
      email: item.email,
      phone: item.phone,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Unexpected error fetching students:', err);
    return [];
  }
};

export const addStudent = async (userId: string, student: Omit<Student, 'id' | 'userId'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('students')
      .insert({
        user_id: userId,
        name: student.name,
        email: student.email,
        phone: student.phone
      });

    if (error) {
      console.error('Error adding student:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error adding student:', err);
    return false;
  }
};

export const deleteStudent = async (studentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Error deleting student:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error deleting student:', err);
    return false;
  }
};