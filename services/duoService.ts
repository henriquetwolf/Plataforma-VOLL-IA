
import { supabase } from './supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { DuoLesson, DuoUserProgress, DuoQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Static list of topics for levels to guide the AI
const LEVEL_TOPICS = [
  "Princípios Básicos do Pilates (Respiração, Centro)",
  "História de Joseph Pilates",
  "Anatomia Básica para Pilates (Powerhouse)",
  "Exercícios de Mat Pilates (Iniciante)",
  "Reformer: Componentes e Segurança",
  "Patologias da Coluna e Pilates",
  "Cadillac: Exercícios Fundamentais",
  "Chair: Desafios de Equilíbrio",
  "Pilates para Gestantes",
  "Pilates para Idosos",
  "Barrel: Mobilidade de Coluna",
  "Acessórios (Bola, Faixa, Anel)",
  "Biomecânica do Movimento",
  "Avaliação Postural Básica",
  "Planejamento de Aula"
];

// Clean JSON helper
const cleanJSON = (text: string) => {
  if (!text) return '{}';
  let cleaned = text.replace(/```json|```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  if (firstBrace === -1 && firstBracket === -1) return cleaned;

  let start = 0;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
  } else if (firstBracket !== -1) {
      start = firstBracket;
  }
  return cleaned.substring(start);
};

export const fetchUserProgress = async (userId: string, studioId: string, userName: string, userRole: string): Promise<DuoUserProgress> => {
  try {
    const { data, error } = await supabase
      .from('user_duo_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) {
      // Create initial record
      const newRecord = {
        user_id: userId,
        studio_id: studioId,
        user_name: userName,
        user_role: userRole,
        current_level: 1,
        total_volls: 0,
        last_played_at: null,
        streak: 0
      };
      
      const { error: insertError } = await supabase.from('user_duo_progress').insert(newRecord);
      if (insertError) console.error("Error creating duo progress:", insertError);
      
      return {
        userId, userName, studioId, userRole: userRole as any,
        currentLevel: 1, totalVolls: 0, lastPlayedAt: null, streak: 0
      };
    }

    return {
      userId: data.user_id,
      userName: data.user_name,
      studioId: data.studio_id,
      userRole: data.user_role as any,
      currentLevel: data.current_level,
      totalVolls: data.total_volls,
      lastPlayedAt: data.last_played_at,
      streak: data.streak
    };
  } catch (err) {
    console.error(err);
    // Return default on error to not block UI
    return { userId, userName, studioId, userRole: userRole as any, currentLevel: 1, totalVolls: 0, lastPlayedAt: null, streak: 0 };
  }
};

export const generateLessonContent = async (level: number): Promise<DuoLesson> => {
  const topicIndex = (level - 1) % LEVEL_TOPICS.length;
  const topic = LEVEL_TOPICS[topicIndex];
  const realLevel = level;

  const prompt = `
    Crie uma aula de Pilates estilo "Duolingo" (Quiz) sobre o tema: "${topic}".
    Nível: ${realLevel}.
    Gere 5 perguntas de múltipla escolha.
    
    Retorne APENAS um JSON com este formato:
    {
      "title": "Título Criativo da Aula",
      "topic": "${topic}",
      "questions": [
        {
          "question": "Texto da pergunta?",
          "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
          "correctAnswerIndex": 0, // Índice da correta (0-3)
          "explanation": "Breve explicação do porquê."
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            topic: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(cleanJSON(response.text || '{}'));

    // Validação Robusta para forçar o catch em caso de dados inválidos
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Formato de aula inválido ou vazio retornado pela IA.");
    }

    return {
      level: realLevel,
      title: data.title || `Nível ${realLevel}`,
      topic: data.topic || topic,
      questions: data.questions
    };
  } catch (e) {
    console.error("Error generating lesson (Using Fallback):", e);
    // Fallback static lesson if AI fails
    return {
      level: realLevel,
      title: "Princípios do Pilates (Aula de Segurança)",
      topic: "Fundamentos Essenciais",
      questions: [
        {
          question: "Qual destes NÃO é um princípio do Pilates?",
          options: ["Centralização", "Respiração", "Hipertrofia", "Controle"],
          correctAnswerIndex: 2,
          explanation: "Hipertrofia é um objetivo de musculação, não um princípio do método."
        },
        {
          question: "Quem criou o método Pilates?",
          options: ["Joseph Pilates", "Clara Pilates", "Romana Kryzanowska", "Lolita San Miguel"],
          correctAnswerIndex: 0,
          explanation: "Joseph Hubertus Pilates foi o criador."
        },
        {
          question: "O que é o 'Powerhouse'?",
          options: ["Braços fortes", "Centro de força (Core)", "As pernas", "A mente"],
          correctAnswerIndex: 1,
          explanation: "Powerhouse refere-se ao centro de força abdominal e pélvico."
        },
        {
          question: "Qual aparelho é conhecido como 'Cama'?",
          options: ["Chair", "Barrel", "Reformer", "Cadillac"],
          correctAnswerIndex: 3,
          explanation: "O Cadillac parece uma cama com dossel."
        },
        {
          question: "A respiração no Pilates deve ser:",
          options: ["Livre", "Torácica Lateral", "Abdominal apenas", "Apneia"],
          correctAnswerIndex: 1,
          explanation: "Prioriza-se a respiração tridimensional (costelas)."
        }
      ]
    };
  }
};

export const completeLesson = async (userId: string, newVolls: number, currentLevel: number): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];
  
  await supabase
    .from('user_duo_progress')
    .update({
      current_level: currentLevel + 1,
      total_volls: newVolls,
      last_played_at: today
    })
    .eq('user_id', userId);
};

// Helper that fetches, calculates and updates
export const advanceProgress = async (progress: DuoUserProgress, pointsGained: number) => {
  const today = new Date().toISOString().split('T')[0];
  const lastPlayed = progress.lastPlayedAt;
  
  let newStreak = progress.streak;
  
  if (lastPlayed) {
    const d1 = new Date(lastPlayed);
    const d2 = new Date(today);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays === 1) newStreak += 1;
    else if (diffDays > 1) newStreak = 1;
    // If diffDays == 0 (same day), streak doesn't change
  } else {
    newStreak = 1;
  }

  const newTotalVolls = progress.totalVolls + pointsGained;
  const newLevel = progress.currentLevel + 1;

  await supabase.from('user_duo_progress').update({
    current_level: newLevel,
    total_volls: newTotalVolls,
    last_played_at: today,
    streak: newStreak
  }).eq('user_id', progress.userId);

  return { ...progress, currentLevel: newLevel, totalVolls: newTotalVolls, lastPlayedAt: today, streak: newStreak };
};

export const fetchStudioRanking = async (studioId: string): Promise<DuoUserProgress[]> => {
  try {
    const { data, error } = await supabase
      .from('user_duo_progress')
      .select('*')
      .eq('studio_id', studioId)
      .order('total_volls', { ascending: false });

    if (error) throw error;

    return data.map((d: any) => ({
      userId: d.user_id,
      userName: d.user_name,
      studioId: d.studio_id,
      userRole: d.user_role,
      currentLevel: d.current_level,
      totalVolls: d.total_volls,
      lastPlayedAt: d.last_played_at,
      streak: d.streak
    }));
  } catch (err) {
    console.error("Error fetching ranking:", err);
    return [];
  }
};
