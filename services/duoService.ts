
import { supabase } from './supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { DuoLesson, DuoUserProgress, DuoQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Static list of topics for levels to guide the AI
const LEVEL_TOPICS = [
  "História de Joseph Pilates e a Contrologia", // Nível 1
  "Os 6 Princípios Fundamentais do Pilates", // Nível 2
  "Anatomia do Powerhouse (Centro de Força)", // Nível 3
  "Mat Pilates vs Equipamentos: Diferenças", // Nível 4
  "Reformer: Estrutura e Molas", // Nível 5
  "Respiração Tridimensional e Diafragma", // Nível 6
  "Cadillac: A Cama Trapézio", // Nível 7
  "Chair (Cadeira): Desafios de Estabilidade", // Nível 8
  "Barrel: Mobilidade de Coluna e Alongamento", // Nível 9
  "Pilates para Patologias de Coluna (Hérnia)", // Nível 10
  "Pilates para Gestantes: Indicações", // Nível 11
  "Pilates para Idosos: Cuidados", // Nível 12
  "Acessórios: Magic Circle e Bola", // Nível 13
  "Biomecânica: Cadeias Musculares", // Nível 14
  "Avaliação Postural no Studio" // Nível 15
];

// Fallback lessons rotation to ensure variety even if AI fails
const FALLBACK_LESSONS: DuoLesson[] = [
  {
    level: 1,
    title: "História do Pilates",
    topic: "Quem foi Joseph Pilates?",
    questions: [
      { question: "Onde Joseph Pilates nasceu?", options: ["Alemanha", "EUA", "França", "Brasil"], correctAnswerIndex: 0, explanation: "Joseph nasceu em Mönchengladbach, Alemanha, em 1883." },
      { question: "Qual era o nome original do método?", options: ["Pilates", "Contrologia", "Yoga Dinâmico", "Stretching"], correctAnswerIndex: 1, explanation: "Ele chamou seu método de 'Contrologia' (A arte do controle)." },
      { question: "Joseph foi enfermeiro durante qual guerra?", options: ["1ª Guerra Mundial", "2ª Guerra Mundial", "Guerra Civil", "Guerra Fria"], correctAnswerIndex: 0, explanation: "Ele atuou na Inglaterra durante a 1ª Guerra." },
      { question: "Quem foi a esposa e parceira de Joseph?", options: ["Clara", "Maria", "Ana", "Julia"], correctAnswerIndex: 0, explanation: "Clara Pilates foi fundamental no ensino do método." },
      { question: "Joseph migrou para qual cidade nos EUA?", options: ["Nova York", "Los Angeles", "Chicago", "Miami"], correctAnswerIndex: 0, explanation: "Eles abriram o estúdio em NYC, perto de escolas de dança." }
    ]
  },
  {
    level: 2,
    title: "Princípios do Método",
    topic: "Os 6 Princípios",
    questions: [
      { question: "Qual destes é um princípio chave?", options: ["Velocidade", "Centralização", "Força Bruta", "Hipertrofia"], correctAnswerIndex: 1, explanation: "Centralização refere-se ao uso do Powerhouse." },
      { question: "O que significa 'Fluidez' no Pilates?", options: ["Suar muito", "Movimentos contínuos e elegantes", "Beber água", "Rápida execução"], correctAnswerIndex: 1, explanation: "Movimentos sem trancos, com ritmo e graça." },
      { question: "A respiração deve ser:", options: ["Apneia", "Torácica Lateral", "Apenas abdominal", "Curta"], correctAnswerIndex: 1, explanation: "Expansão das costelas lateralmente e posteriormente." },
      { question: "Controle refere-se a:", options: ["Mente sobre músculo", "Professor mandando", "Segurar a respiração", "Rigidez"], correctAnswerIndex: 0, explanation: "A mente comanda o movimento do corpo." },
      { question: "Precisão significa:", options: ["Fazer rápido", "Fazer perfeito (qualidade)", "Fazer muitas repetições", "Usar muita carga"], correctAnswerIndex: 1, explanation: "Poucas repetições com execução perfeita." }
    ]
  },
  {
    level: 3,
    title: "Anatomia do Powerhouse",
    topic: "Centro de Força",
    questions: [
      { question: "Qual músculo é o 'teto' do Powerhouse?", options: ["Diafragma", "Transverso", "Assoalho Pélvico", "Multífidos"], correctAnswerIndex: 0, explanation: "O Diafragma fecha a caixa torácica superiormente." },
      { question: "Qual músculo é o 'cinturão' natural?", options: ["Reto Abdominal", "Transverso do Abdômen", "Oblíquos", "Psoas"], correctAnswerIndex: 1, explanation: "O Transverso estabiliza a coluna lombar." },
      { question: "Onde fica o Assoalho Pélvico?", options: ["Base da pelve", "Costas", "Pescoço", "Coxa"], correctAnswerIndex: 0, explanation: "Sustenta os órgãos pélvicos." },
      { question: "Os Multífidos atuam principalmente na:", options: ["Flexão", "Estabilização da coluna", "Respiração", "Caminhada"], correctAnswerIndex: 1, explanation: "Pequenos músculos que estabilizam as vértebras." },
      { question: "Powerhouse engloba:", options: ["Só abdômen", "Abdômen, Lombar, Pelve e Quadril", "Só Glúteos", "Braços e Pernas"], correctAnswerIndex: 1, explanation: "É o cilindro de força central do corpo." }
    ]
  }
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
  // Cycle through topics based on level (1-based index)
  const topicIndex = (level - 1) % LEVEL_TOPICS.length;
  const topic = LEVEL_TOPICS[topicIndex];
  
  // Select fallback based on rotation to ensure distinct static lessons too
  const fallbackLesson = FALLBACK_LESSONS[(level - 1) % FALLBACK_LESSONS.length];

  const prompt = `
    Crie um Quiz Educativo de Pilates (Estilo Duolingo) sobre o TEMA: "${topic}".
    Nível: ${level}.
    EXATAMENTE 5 perguntas.
    
    Retorne JSON puro:
    {
      "title": "Título da Aula",
      "topic": "${topic}",
      "questions": [
        {
          "question": "Pergunta?",
          "options": ["A", "B", "C", "D"],
          "correctAnswerIndex": 0,
          "explanation": "Explicação"
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
      }
    });

    const text = response.text || '{}';
    const data = JSON.parse(cleanJSON(text));

    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Formato de aula inválido.");
    }

    return {
      level: level,
      title: data.title || topic,
      topic: data.topic || topic,
      questions: data.questions
    };
  } catch (e) {
    console.error("Error generating lesson (Using Fallback):", e);
    // Return fallback immediately to prevent user blockage
    return {
        ...fallbackLesson,
        level: level 
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
