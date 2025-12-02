
import { supabase } from './supabase';
import { StudentEvolution, SavedEvolutionReport } from '../types';

/*
  ⚠️ SUPABASE SQL REQUIRED:
  
  create table if not exists student_evolutions (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null, -- references studio_profiles(user_id)
    student_id uuid not null references students(id) on delete cascade,
    instructor_id uuid references instructors(id) on delete set null,
    instructor_name text,
    student_name text,
    date date default current_date,
    
    stability text,
    mobility text,
    strength text,
    coordination text,
    
    pain boolean default false,
    pain_location text,
    limitation boolean default false,
    limitation_details text,
    contraindication boolean default false,
    contraindication_details text,
    
    observations text,
    
    created_at timestamptz default now()
  );

  create table if not exists evolution_reports (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null,
    title text,
    content text,
    filter_description text,
    record_count int,
    created_at timestamptz default now()
  );

  alter table student_evolutions enable row level security;
  alter table evolution_reports enable row level security;

  create policy "Instructors can manage evolutions" on student_evolutions
    for all to authenticated using (
        exists (
            select 1 from instructors where auth_user_id = auth.uid() and studio_user_id = student_evolutions.studio_id
        ) or auth.uid() = studio_id
    );

  create policy "Owners can manage reports" on evolution_reports
    for all to authenticated using (auth.uid() = studio_id);
*/

export const saveEvolution = async (
  evolution: Omit<StudentEvolution, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      studio_id: evolution.studioId,
      student_id: evolution.studentId,
      student_name: evolution.studentName,
      instructor_id: evolution.instructorId,
      instructor_name: evolution.instructorName,
      date: evolution.date,
      stability: evolution.stability,
      mobility: evolution.mobility,
      strength: evolution.strength,
      coordination: evolution.coordination,
      pain: evolution.pain,
      pain_location: evolution.painLocation,
      limitation: evolution.limitation,
      limitation_details: evolution.limitationDetails,
      contraindication: evolution.contraindication,
      contraindication_details: evolution.contraindicationDetails,
      observations: evolution.observations // Include observations
    };

    const { error } = await supabase
      .from('student_evolutions')
      .insert(payload);

    if (error) {
      console.error('Error saving evolution:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchEvolutionsByStudent = async (studentId: string): Promise<StudentEvolution[]> => {
  try {
    const { data, error } = await supabase
      .from('student_evolutions')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching evolutions:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      studentId: item.student_id,
      studentName: item.student_name,
      instructorId: item.instructor_id,
      instructorName: item.instructor_name,
      date: item.date,
      stability: item.stability,
      mobility: item.mobility,
      strength: item.strength,
      coordination: item.coordination,
      pain: item.pain,
      painLocation: item.pain_location,
      limitation: item.limitation,
      limitationDetails: item.limitation_details,
      contraindication: item.contraindication,
      contraindicationDetails: item.contraindication_details,
      observations: item.observations,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

// Fetch ALL evolutions for the studio (for filtering)
export const fetchStudioEvolutions = async (studioId: string): Promise<StudentEvolution[]> => {
  try {
    const { data, error } = await supabase
      .from('student_evolutions')
      .select('*')
      .eq('studio_id', studioId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching studio evolutions:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      studentId: item.student_id,
      studentName: item.student_name,
      instructorId: item.instructor_id,
      instructorName: item.instructor_name,
      date: item.date,
      stability: item.stability,
      mobility: item.mobility,
      strength: item.strength,
      coordination: item.coordination,
      pain: item.pain,
      painLocation: item.pain_location,
      limitation: item.limitation,
      limitationDetails: item.limitation_details,
      contraindication: item.contraindication,
      contraindicationDetails: item.contraindication_details,
      observations: item.observations,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const deleteEvolution = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('student_evolutions').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// --- REPORT FUNCTIONS ---

export const saveEvolutionReport = async (
  studioId: string,
  title: string,
  content: string,
  filterDescription: string,
  recordCount: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('evolution_reports')
      .insert({
        studio_id: studioId,
        title,
        content,
        filter_description: filterDescription,
        record_count: recordCount
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchEvolutionReports = async (studioId: string): Promise<SavedEvolutionReport[]> => {
  try {
    const { data, error } = await supabase
      .from('evolution_reports')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((item: any) => ({
      id: item.id,
      studioId: item.studio_id,
      title: item.title,
      content: item.content,
      filterDescription: item.filter_description,
      recordCount: item.record_count,
      createdAt: item.created_at
    }));
  } catch (err) {
    return [];
  }
};

export const deleteEvolutionReport = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('evolution_reports').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
