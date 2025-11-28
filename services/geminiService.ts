import { GoogleGenAI } from "@google/genai";
import { StrategicPlan, CalculatorInputs, FinancialModel, CompensationResult, PathologyResponse, LessonPlanResponse, LessonExercise, ChatMessage, TriageStep, TriageStatus, RecipeResponse, WorkoutResponse } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn("[Gemini Service] API Key não encontrada. Configure a variável de ambiente 'API_KEY' no Vercel.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const cleanAndParseJSON = (text: string) => {
  try {
    if (!text) return null;
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Erro ao fazer parse do JSON da IA:", e);
    return null;
  }
};

export const handleGeminiError = (error: any): string => {
  const errStr = error.toString();
  const errMsg = error.message || '';
  
  console.error("Gemini API Error:", error);

  if (errStr.includes("403") || errMsg.includes("leaked") || errMsg.includes("PERMISSION_DENIED")) {
    return `
      <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg mb-6 text-left shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="font-bold text-lg">Erro de Segurança (Chave Bloqueada)</p>
        </div>
        <p class="mb-3">A chave de API configurada foi <strong>bloqueada pelo Google</strong> por ter sido exposta.</p>
        <div class="bg-white p-4 rounded border border-red-200">
          <p class="text-sm font-bold text-slate-700 mb-2">Como resolver:</p>
          <ol class="list-decimal ml-5 text-sm text-slate-600 space-y-2">
            <li>Gere uma nova chave no Google AI Studio.</li>
            <li>No Vercel, atualize a variável <code>API_KEY</code>.</li>
            <li>Faça um Redeploy.</li>
          </ol>
        </div>
      </div>
    `;
  }
  
  if (!apiKey) {
    return `<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4">⚠️ Chave de API não configurada no Vercel.</div>`;
  }

  return `<div class="bg-orange-50 border-l-4 border-orange-500 p-4">Erro na IA: ${errMsg.substring(0, 100)}...</div>`;
};

// --- AGENTES DO ALUNO ---

export const generateHealthyRecipe = async (goal: string, restrictions: string): Promise<RecipeResponse | null> => {
  if (!apiKey) throw new Error("API Key missing");

  const prompt = `
    Atue como Nutricionista Funcional. Crie uma receita saudável.
    Objetivo: ${goal || 'Alimentação Saudável'}.
    Restrições/Preferências: ${restrictions || 'Nenhuma'}.
    
    Retorne JSON: {
      "title": "Nome Criativo",
      "ingredients": ["Item 1", "Item 2"],
      "instructions": ["Passo 1", "Passo 2"],
      "benefits": "Explicação curta dos benefícios para a saúde.",
      "calories": "Estimativa calórica (opcional)"
    }
  `;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "");
  } catch (error) { throw error; }
};

export const generateHomeWorkout = async (studentName: string, observations: string, equipment: string, duration: string): Promise<WorkoutResponse | null> => {
  if (!apiKey) throw new Error("API Key missing");

  const prompt = `
    Atue como Instrutor de Pilates. Crie um treino para fazer em casa para o aluno ${studentName}.
    Histórico/Observações Clínicas (IMPORTANTE): "${observations || 'Sem observações'}".
    Equipamento disponível em casa: ${equipment || 'Apenas colchonete'}.
    Duração desejada: ${duration}.

    Crie um treino seguro, evitando movimentos contra-indicados pelo histórico.
    
    Retorne JSON: {
      "title": "Título do Treino",
      "duration": "Duração est.",
      "focus": "Foco (ex: Mobilidade de coluna)",
      "exercises": [
        { "name": "Nome", "reps": "Reps", "instructions": "Como fazer", "safetyNote": "Atenção especial" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "");
  } catch (error) { throw error; }
};

// Funções placeholder para manter compatibilidade
export const generateStudioDescription = async (a: string, b: string, c: string[]) => { if(!apiKey) return "Erro"; return "Descrição..."; };
export const generateMissionOptions = async (a: string) => { if(!apiKey) return []; return ["Missão 1"]; };
export const generateVisionOptions = async (a: string, b: string) => { if(!apiKey) return []; return ["Visão 1"]; };
export const generateTailoredMissions = async (a: string, b: string[], c: string, d: string) => { if(!apiKey) return []; return ["Missão A"]; };
export const generateSwotSuggestions = async (a: string) => { if(!apiKey) return []; return ["Sugestão 1"]; };
export const generateObjectivesSmart = async (a: any) => { if(!apiKey) return []; return []; };
export const generateActionsSmart = async (a: any[]) => { if(!apiKey) return []; return []; };
export const generateFullReport = async (a: StrategicPlan) => { if(!apiKey) return "Erro"; return "<p>Relatório</p>"; };
export const generateFinancialAnalysis = async (a: CalculatorInputs, b: FinancialModel, c: CompensationResult[], d: number, e: number, f: number, g: number) => { if(!apiKey) return "Erro"; return "<p>Análise</p>"; };

export const fetchPathologyData = async (query: string, equipment: string[], history?: ChatMessage[]): Promise<PathologyResponse | null> => {
  if (!apiKey) throw new Error("API Key missing");
  const historyText = history ? history.map(m => `${m.role === 'ai' ? 'P' : 'R'}: ${m.text}`).join('\n') : "Sem histórico.";
  const prompt = `Atue como Fisioterapeuta. Patologia: "${query}". Contexto: ${historyText}. Equipamentos: ${equipment.join(', ')}. JSON: { pathologyName, summary, objectives: [], indicated: [{name, reason, details, apparatus}], contraindicated: [{name, reason, details, apparatus:"N/A"}] }`;
  try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); return cleanAndParseJSON(response.text || ""); } catch (error) { throw error; }
};

export const fetchTriageQuestion = async (query: string, history: ChatMessage[]): Promise<TriageStep> => {
  if (!apiKey) throw new Error("API Key missing");
  const prompt = `Triagem Pilates. Queixa: "${query}". Histórico: ${JSON.stringify(history)}. Se suficiente, JSON { "status": "FINISH" }. Se não, JSON { "status": "CONTINUE", "question": "..." }.`;
  try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); return cleanAndParseJSON(response.text || "") || { status: TriageStatus.FINISH }; } catch (error) { throw error; }
};

export const fetchLessonPlan = async (query: string, equipment: string[], history?: ChatMessage[]): Promise<LessonPlanResponse | null> => {
  if (!apiKey) throw new Error("API Key missing");
  const historyText = history ? JSON.stringify(history) : "N/A";
  const prompt = `Crie Plano Aula Pilates. Aluno: "${query}". Contexto: ${historyText}. Equipamentos: ${equipment.join(', ')}. JSON: { pathologyName, goal, duration, exercises: [{name, apparatus, reps, focus, instructions}] }`;
  try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); return cleanAndParseJSON(response.text || ""); } catch (error) { throw error; }
};

export const regenerateSingleExercise = async (query: string, oldExercise: LessonExercise, equipment: string[]): Promise<LessonExercise> => {
  if (!apiKey) throw new Error("API Key missing");
  const prompt = `Substitua exercício "${oldExercise.name}" para "${query}". Equipamentos: ${equipment.join(', ')}. JSON: { name, reps, apparatus, instructions, focus }`;
  try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); return cleanAndParseJSON(response.text || ""); } catch (error) { throw error; }
};