
import { supabase } from './supabase';
import { ClassEvaluation, Instructor, SavedEvaluationAnalysis } from '../types';

/*
  ⚠️ SQL PARA CORREÇÃO DE PERMISSÕES (Rode no Supabase SQL Editor)
  
  -- 1. Limpeza de Políticas Antigas
  DROP POLICY IF EXISTS "Students can insert evaluations" ON class_evaluations;
  DROP POLICY IF EXISTS "Owners can view evaluations" ON class_evaluations;
  DROP POLICY IF EXISTS "Owners can delete evaluations" ON class_evaluations;
  DROP POLICY IF EXISTS "Students can view studio instructors" ON instructors;

  -- 2. Garantir Tabela de Avaliações e RLS
  CREATE TABLE IF NOT EXISTS class_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id uuid REFERENCES studio_profiles(user_id) ON DELETE CASCADE,
    student_id uuid REFERENCES students(id) ON DELETE SET NULL,
    instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL,
    student_name text,
    instructor_name text,
    class_date date NOT NULL,
    rating int NOT NULL,
    feeling text,
    pace text,
    discomfort text,
    suggestions text,
    created_at timestamptz DEFAULT now()
  );

  ALTER TABLE class_evaluations ENABLE ROW LEVEL SECURITY;

  -- 3. Nova Tabela de Análises de IA
  CREATE TABLE IF NOT EXISTS evaluation_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id uuid REFERENCES studio_profiles(user_id) ON DELETE CASCADE,
    title text,
    content text,
    evaluation_count int,
    date_range text,
    created_at timestamptz default now()
  );
  
  ALTER TABLE evaluation_analyses ENABLE ROW LEVEL SECURITY;

  -- 4. Recriar Políticas de Acesso
  
  -- class_evaluations
  CREATE POLICY "Students can insert evaluations" ON class_evaluations
    FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "Owners can view evaluations" ON class_evaluations
    FOR SELECT TO authenticated USING (auth.uid() = studio_id);
    
  CREATE POLICY "Owners can delete evaluations" ON class_evaluations
    FOR DELETE TO authenticated USING (auth.uid() = studio_id);

  -- evaluation_analyses
  CREATE POLICY "Owners can manage analyses" ON evaluation_analyses
    FOR ALL TO authenticated USING (auth.uid() = studio_id);

  -- instructors (lookup)
  CREATE POLICY "Students can view studio instructors" ON instructors
    FOR SELECT TO authenticated
    USING (
      studio_user_id IN (
        SELECT user_id FROM students WHERE auth_user_id = auth.uid()
      )
    );
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

    if (error) {
      console.error('Error saving evaluation:', error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error saving evaluation:', err);
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    return { success: false, error: msg };
  }
};

export const fetchEvaluationsByStudio = async (studioId: string): Promise<ClassEvaluation[]> => {
  try {
    const { data, error } = await supabase
      .from('class_evaluations')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching evaluations:', error.message);
        return [];
    }

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
    console.error('Unexpected error fetching evaluations:', err);
    return [];
  }
};

export const fetchStudentEvaluations = async (studentId: string): Promise<ClassEvaluation[]> => {
  try {
    const { data, error } = await supabase
      .from('class_evaluations')
      .select('*')
      .eq('student_id', studentId)
      .order('class_date', { ascending: false });

    if (error) {
        console.error('Error fetching student evaluations:', error.message);
        return [];
    }

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
    return [];
  }
};

export const deleteEvaluation = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('class_evaluations')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchInstructorsForStudent = async (studioId: string): Promise<Instructor[]> => {
  try {
    if (!studioId) return [];

    // Busca instrutores ativos vinculados ao dono do estúdio
    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .eq('studio_user_id', studioId)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
        console.error("Supabase Error fetching instructors (Check RLS Policy):", error.message);
        return [];
    }

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

// --- ANALYSIS FUNCTIONS ---

export const saveEvaluationAnalysis = async (
  studioId: string,
  title: string,
  content: string,
  evaluationCount: number,
  dateRange: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('evaluation_analyses')
      .insert({
        studio_id: studioId,
        title,
        content,
        evaluation_count: evaluationCount,
        date_range: dateRange
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchEvaluationAnalyses = async (studioId: string): Promise<SavedEvaluationAnalysis[]> => {
  try {
    const { data, error } = await supabase
      .from('evaluation_analyses')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      title: item.title,
      content: item.content,
      evaluationCount: item.evaluation_count,
      dateRange: item.date_range,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const deleteEvaluationAnalysis = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('evaluation_analyses').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
