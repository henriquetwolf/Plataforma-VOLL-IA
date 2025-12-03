
import { supabase } from './supabase';
import { Survey, SurveyQuestion, SurveyResponse, SurveyTarget } from '../types';

/*
  ⚠️ SQL REQUIRED FOR SURVEYS (Run in Supabase SQL Editor):

  -- Tabela de Pesquisas
  create table if not exists surveys (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    title text not null,
    description text,
    target_audience text not null, -- 'students', 'instructors', 'both'
    is_active boolean default true,
    created_at timestamptz default now()
  );

  -- Tabela de Perguntas
  create table if not exists survey_questions (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references surveys(id) on delete cascade,
    text text not null,
    type text not null, -- 'text', 'select', etc.
    options jsonb, -- Array de strings para opções
    required boolean default true,
    "order" int default 0,
    created_at timestamptz default now()
  );

  -- Tabela de Respostas (Agrupada por submissão de usuário)
  create table if not exists survey_responses (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references surveys(id) on delete cascade,
    user_id uuid not null, -- ID do usuário autenticado (Auth ID)
    user_name text,
    user_type text, -- 'student' or 'instructor'
    answers jsonb not null, -- Array de { questionId: string, value: string | string[] }
    created_at timestamptz default now()
  );

  -- RLS Policies
  alter table surveys enable row level security;
  alter table survey_questions enable row level security;
  alter table survey_responses enable row level security;

  -- Surveys: Dono gerencia, Alunos/Instrutores leem se alvo
  create policy "Owners manage their surveys" on surveys
    for all to authenticated using (auth.uid() = studio_id);

  create policy "Users read targeted surveys" on surveys
    for select to authenticated using (true); -- Simplificação: Filtro será feito na query

  -- Questions: Leitura pública para autenticados
  create policy "Read questions" on survey_questions
    for select to authenticated using (true);
  
  create policy "Owners manage questions" on survey_questions
    for all to authenticated using (
      exists (select 1 from surveys where id = survey_questions.survey_id and studio_id = auth.uid())
    );

  -- Responses: Usuários inserem suas respostas, Dono lê todas do seu studio
  create policy "Users insert own responses" on survey_responses
    for insert to authenticated with check (auth.uid() = user_id);

  create policy "Users read own responses" on survey_responses
    for select to authenticated using (auth.uid() = user_id);

  create policy "Owners read studio responses" on survey_responses
    for select to authenticated using (
      exists (select 1 from surveys where id = survey_responses.survey_id and studio_id = auth.uid())
    );
*/

// --- OWNER ACTIONS ---

export const createSurvey = async (
  studioId: string,
  title: string,
  description: string,
  targetAudience: SurveyTarget,
  questions: Omit<SurveyQuestion, 'id'>[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Create Survey
    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        studio_id: studioId,
        title,
        description,
        target_audience: targetAudience,
        is_active: true
      })
      .select()
      .single();

    if (surveyError) throw surveyError;

    // 2. Create Questions
    const questionsPayload = questions.map((q, idx) => ({
      survey_id: surveyData.id,
      text: q.text,
      type: q.type,
      options: q.options,
      required: q.required,
      order: idx
    }));

    const { error: questionsError } = await supabase
      .from('survey_questions')
      .insert(questionsPayload);

    if (questionsError) throw questionsError;

    return { success: true };
  } catch (err: any) {
    console.error('Error creating survey:', err);
    return { success: false, error: err.message };
  }
};

export const fetchSurveysByStudio = async (studioId: string): Promise<Survey[]> => {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, survey_responses(count)')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((s: any) => ({
      id: s.id,
      studioId: s.studio_id,
      title: s.title,
      description: s.description,
      targetAudience: s.target_audience,
      isActive: s.is_active,
      createdAt: s.created_at,
      responseCount: s.survey_responses ? s.survey_responses[0]?.count : 0,
      questions: [] // Fetched separately if needed details
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const fetchSurveyDetailsWithResults = async (surveyId: string): Promise<{ survey: Survey; responses: SurveyResponse[] } | null> => {
  try {
    // Fetch Survey & Questions
    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .select('*, survey_questions(*)')
      .eq('id', surveyId)
      .single();

    if (surveyError) throw surveyError;

    // Fetch Responses
    const { data: responseData, error: responseError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId);

    if (responseError) throw responseError;

    const survey: Survey = {
      id: surveyData.id,
      studioId: surveyData.studio_id,
      title: surveyData.title,
      description: surveyData.description,
      targetAudience: surveyData.target_audience,
      isActive: surveyData.is_active,
      createdAt: surveyData.created_at,
      questions: surveyData.survey_questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        required: q.required
      })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    };

    const responses: SurveyResponse[] = responseData.map((r: any) => ({
      id: r.id,
      surveyId: r.survey_id,
      userId: r.user_id,
      userName: r.user_name,
      userType: r.user_type,
      answers: r.answers,
      createdAt: r.created_at
    }));

    return { survey, responses };
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const toggleSurveyStatus = async (id: string, isActive: boolean): Promise<void> => {
  await supabase.from('surveys').update({ is_active: isActive }).eq('id', id);
};

export const deleteSurvey = async (id: string): Promise<void> => {
  await supabase.from('surveys').delete().eq('id', id);
};

// --- USER ACTIONS (Student/Instructor) ---

export const fetchAvailableSurveys = async (studioId: string, userType: 'student' | 'instructor', userId: string): Promise<Survey[]> => {
  try {
    // 1. Get active surveys matching audience
    const audienceFilter = userType === 'student' ? ['students', 'both'] : ['instructors', 'both'];
    
    const { data: surveys, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('studio_id', studioId)
      .eq('is_active', true)
      .in('target_audience', audienceFilter)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Check which ones user already answered
    const { data: myResponses } = await supabase
      .from('survey_responses')
      .select('survey_id')
      .eq('user_id', userId);

    const answeredIds = new Set(myResponses?.map((r: any) => r.survey_id));

    // 3. Filter out answered ones
    const availableSurveys = surveys.filter((s: any) => !answeredIds.has(s.id));

    return availableSurveys.map((s: any) => ({
      id: s.id,
      studioId: s.studio_id,
      title: s.title,
      description: s.description,
      targetAudience: s.target_audience,
      isActive: s.is_active,
      createdAt: s.created_at,
      questions: [] // Will fetch when user clicks to answer
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const fetchSurveyQuestions = async (surveyId: string): Promise<SurveyQuestion[]> => {
  const { data } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('survey_id', surveyId)
    .order('order', { ascending: true });

  if (!data) return [];

  return data.map((q: any) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options,
    required: q.required
  }));
};

export const submitSurveyResponse = async (
  surveyId: string,
  userId: string,
  userName: string,
  userType: 'student' | 'instructor',
  answers: { questionId: string; value: string | string[] }[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: surveyId,
        user_id: userId,
        user_name: userName,
        user_type: userType,
        answers: answers
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
