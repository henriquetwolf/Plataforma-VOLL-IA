
import { supabase } from './supabase';
import { ClassEvaluation, Instructor } from '../types';

/*
  SQL Requirement for Supabase:
  
  create table if not exists class_evaluations (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid references studio_profiles(user_id) on delete cascade,
    student_id uuid references students(id) on delete set null,
    instructor_id uuid references instructors(id) on delete set null,
    student_name text,
    instructor_name text,
    class_date date not null,
    rating int not null,
    feeling text,
    pace text,
    discomfort text,
    suggestions text,
    created_at timestamptz default now()
  );

  alter table class_evaluations enable row level security;

  create policy "Students can insert evaluations" on class_evaluations
    for insert to authenticated with check (true);

  create policy "Owners can view evaluations" on class_evaluations
    for select to authenticated using (auth.uid() = studio_id);
    
  create policy "Owners can delete evaluations" on class_evaluations
    for delete to authenticated using (auth.uid() = studio_id);
*/

export const saveEvaluation = async (
  evaluation: Omit<ClassEvaluation, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      studio_id: evaluation.studioId,
      student_id: evaluation.studentId,
      instructor_id: evaluation.instructorId,
      student_name: evaluation.studentName,
      instructor_name: evaluation.instructorName,
      class_date: evaluation.classDate,
      rating: evaluation.rating,
      feeling: evaluation.feeling,
      pace: evaluation.pace,
      discomfort: evaluation.discomfort,
      suggestions: evaluation.suggestions
    };

    const { error } = await supabase
      .from('class_evaluations')
      .insert(payload);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error saving evaluation:', err);
    return { success: false, error: err.message };
  }
};

export const fetchEvaluationsByStudio = async (studioId: string): Promise<ClassEvaluation[]> => {
  try {
    const { data, error } = await supabase
      .from('class_evaluations')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      studentId: item.student_id,
      studentName: item.student_name,
      instructorId: item.instructor_id,
      instructorName: item.instructor_name,
      classDate: item.class_date,
      rating: item.rating,
      feeling: item.feeling,
      pace: item.pace,
      discomfort: item.discomfort,
      suggestions: item.suggestions,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Error fetching evaluations:', err);
    return [];
  }
};

export const fetchInstructorsForStudent = async (studioId: string): Promise<Instructor[]> => {
  try {
    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .eq('studio_user_id', studioId)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      studioUserId: item.studio_user_id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      active: item.active,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Error fetching instructors for student:', err);
    return [];
  }
};