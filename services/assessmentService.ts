
import { supabase } from './supabase';
import { StudentAssessment } from '../types';

/*
  ⚠️ SQL NECESSÁRIO (Rodar no SQL Editor do Supabase):

  create table if not exists student_assessments (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    student_id uuid references students(id) on delete set null,
    instructor_id uuid references instructors(id) on delete set null,
    student_name text,
    instructor_name text,
    type text, -- 'simple' or 'custom'
    title text,
    content jsonb, -- The form data
    created_at timestamptz default now()
  );

  alter table student_assessments enable row level security;

  -- Policies
  create policy "Owners manage all assessments" on student_assessments
    for all to authenticated using (auth.uid() = studio_id);

  create policy "Instructors manage studio assessments" on student_assessments
    for all to authenticated using (
        exists (
            select 1 from instructors where auth_user_id = auth.uid() and studio_user_id = student_assessments.studio_id
        )
    );
*/

export const saveAssessment = async (
  studioId: string,
  data: Omit<StudentAssessment, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('student_assessments')
      .insert({
        studio_id: studioId,
        student_id: data.studentId,
        instructor_id: data.instructorId,
        student_name: data.studentName,
        instructor_name: data.instructorName,
        type: data.type,
        title: data.title,
        content: data.content
      });

    if (error) {
      console.error('Error saving assessment:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchAssessments = async (studioId: string): Promise<StudentAssessment[]> => {
  try {
    const { data, error } = await supabase
      .from('student_assessments')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assessments:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      studentId: item.student_id,
      instructorId: item.instructor_id,
      studentName: item.student_name,
      instructorName: item.instructor_name,
      type: item.type,
      title: item.title,
      content: item.content,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const fetchAssessmentsByStudent = async (studentId: string): Promise<StudentAssessment[]> => {
  try {
    const { data, error } = await supabase
      .from('student_assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student assessments:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      studentId: item.student_id,
      instructorId: item.instructor_id,
      studentName: item.student_name,
      instructorName: item.instructor_name,
      type: item.type,
      title: item.title,
      content: item.content,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const deleteAssessment = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('student_assessments').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
