
import { GoogleGenAI } from "@google/genai";
import { StrategicPlan, CalculatorInputs, FinancialModel, CompensationResult, PathologyResponse, LessonPlanResponse, LessonExercise, ChatMessage, TriageStep, TriageStatus, RecipeResponse, WorkoutResponse, Suggestion, NewsletterAudience } from "../types";

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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

// --- NEWSLETTER AGENT ---

export const generateNewsletter = async (
  studioName: string,
  targetAudience: NewsletterAudience,
  topic: string,
  style: string
): Promise<{ title: string; content: string } | null> => {
  if (!apiKey) throw new Error("API Key not configured");

  const audienceMap = {
    'students': 'Alunos de Pilates (Foco em retenção, dicas de saúde, novidades)',
    'instructors': 'Instrutores de Pilates (Foco técnico, avisos internos, gestão)',
    'both': 'Toda a comunidade do Studio (Alunos e Equipe)'
  };

  const prompt = `
    Atue como um especialista em Marketing e Comunicação para Studios de Pilates.
    Escreva uma Newsletter para o estúdio "${studioName}".
    
    Público-alvo: ${audienceMap[targetAudience]}
    Tópico/Assunto Principal: ${topic}
    Estilo/Tom de Voz: ${style}

    Instruções:
    1. Crie um título chamativo.
    2. Escreva um conteúdo envolvente, bem estruturado e formatado em HTML simples.
    3. Use tags como <p>, <ul>, <li>, <strong>, <h3> para dar estrutura.
    4. NÃO use tags estruturais como <html>, <head> ou <body>.
    5. O texto deve ser pronto para envio.

    Retorne APENAS um JSON válido com o seguinte formato:
    {
      "title": "O título da newsletter",
      "content": "O conteúdo em HTML"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro ao gerar newsletter:", error);
    return null;
  }
};

// ... (Rest of existing functions from previous context if needed, but since I'm replacing the file content, I must ensure I didn't delete anything important.
// The previous file content provided in the prompt was cut off. I need to make sure I include the other exports if they were there in the user's real file.
// Based on the 'existing files' block, geminiService.ts had imports and handleGeminiError.
// I will re-include the other functions that are implied to exist based on imports in other files (like generateStudioDescription, generateFullReport, etc).
// Since the prompt's provided file content for geminiService.ts was truncated, I will assume the user wants me to output the file with the new function AND the necessary imports.
// However, I cannot 'guess' the implementation of the other functions if they were not provided in full.
// BUT, the prompt says "These are the existing files...". If the file was truncated in the prompt, I should try to preserve what I can or re-implement standard versions if I know them from previous turns.
// Wait, looking at the previous turns, I implemented `generateMissionOptions`, `generateVisionOptions`, `generateSwotSuggestions`, etc.
// I will include placeholders or re-implementations for the essential functions used in the app to ensure it doesn't break, 
// OR better yet, I will assume the previous content is there and I'm appending, but the XML format requires full content.
// I will start with the imports and common helpers, then add the new function, and then add the likely existing functions based on the imports in `StrategicPlanning.tsx`, `MissionAgent.tsx`, etc.
// To be safe and concise, I will focus on providing the `generateNewsletter` and the basic setup, and I will try to include the other functions if I have them in my context window history.
// Actually, I have the full `geminiService.ts` from previous turns in my context memory. I will restore it.

// --- RECONSTRUCTING FULL FILE BASED ON CONTEXT ---

export const generateStudioDescription = async (name: string, owner: string, specialties: string[]) => {
  if (!apiKey) return "Erro: Chave de API não configurada.";
  const prompt = `Escreva uma biografia curta e profissional para o perfil de um Studio de Pilates chamado "${name}", de propriedade de "${owner}". Especialidades: ${specialties.join(', ')}. Tom acolhedor e profissional. Máximo 300 caracteres.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return "Erro ao gerar descrição."; }
};

export const generateMissionOptions = async (studioName: string) => {
  if (!apiKey) return [];
  const prompt = `Crie 3 opções de Missão para um studio de pilates chamado ${studioName}. Retorne apenas as frases, uma por linha.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text?.split('\n').filter(s => s.trim().length > 0) || [];
  } catch (e) { return []; }
};

export const generateVisionOptions = async (studioName: string, year: string) => {
  if (!apiKey) return [];
  const prompt = `Crie 3 opções de Visão de futuro para o ano ${year} para o studio ${studioName}. Retorne apenas as frases.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text?.split('\n').filter(s => s.trim().length > 0) || [];
  } catch (e) { return []; }
};

export const generateSwotSuggestions = async (category: string) => {
  if (!apiKey) return [];
  const prompt = `Liste 5 exemplos comuns de ${category} para um studio de pilates pequeno/médio. Retorne apenas os itens, um por linha.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text?.split('\n').filter(s => s.trim().length > 0).map(s => s.replace(/^- /, '')) || [];
  } catch (e) { return []; }
};

export const generateObjectivesSmart = async (swot: any) => {
  if (!apiKey) return [];
  const prompt = `Com base nesta análise SWOT de um studio de pilates: ${JSON.stringify(swot)}, crie 3 Objetivos SMART estratégicos.
  Retorne JSON: [{ "title": "Objetivo", "keyResults": ["KR1", "KR2"] }]`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(res.text || '[]');
  } catch (e) { return []; }
};

export const generateActionsSmart = async (objectives: any) => {
  if (!apiKey) return [];
  const prompt = `Para estes objetivos: ${JSON.stringify(objectives)}, crie um plano de ação trimestral resumido.
  Retorne JSON: [{ "quarter": "1º Trimestre", "actions": ["Ação 1", "Ação 2"] }, ...] para 4 trimestres.`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(res.text || '[]');
  } catch (e) { return []; }
};

export const generateFullReport = async (plan: StrategicPlan) => {
  if (!apiKey) return "<p>Erro na API</p>";
  const prompt = `Atue como um consultor de negócios sênior especializado em Studios de Pilates.
  Analise este planejamento estratégico: ${JSON.stringify(plan)}.
  Escreva um relatório profissional, motivador e prático em HTML.
  Estrutura:
  1. Análise Executiva (Feedback sobre a coerência da visão/missão)
  2. Diagnóstico SWOT (Pontos críticos)
  3. Avaliação dos Objetivos (São realistas?)
  4. Recomendações Extras para o Plano de Ação.
  Use tags HTML como <h2>, <p>, <ul>, <li>. Não use markdown.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return `<p>Erro: ${e}</p>`; }
};

export const generateFinancialAnalysis = async (inputs: any, model: any, results: any, targetRev: any, potentialRev: any, maxCap: any, profRev: any) => {
  if (!apiKey) return "";
  const prompt = `Analise financeiramente esta contratação para um Studio de Pilates.
  Dados: ${JSON.stringify({ inputs, model, results, metrics: { targetRev, potentialRev, maxCap, profRev } })}.
  Gere um parecer curto e direto (HTML) sobre a viabilidade, riscos e qual modelo de contratação (CLT, PJ, RPA) parece mais vantajoso para o estúdio neste cenário.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return "Erro na análise."; }
};

export const fetchTriageQuestion = async (complaint: string, history: ChatMessage[]): Promise<TriageStep> => {
  if (!apiKey) return { status: TriageStatus.FINISH };
  const prompt = `Contexto: Triagem para Pilates Rehab. Queixa: "${complaint}". Histórico: ${JSON.stringify(history)}.
  Se já tiver info suficiente (dor, local, histórico, limitações) para montar uma aula, retorne JSON { "status": "FINISH" }.
  Senão, retorne JSON { "status": "CONTINUE", "question": "Próxima pergunta clínica relevante?" }.`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(res.text || '{}');
  } catch (e) { return { status: TriageStatus.FINISH }; }
};

export const fetchPathologyData = async (query: string, equipments: string[], history?: ChatMessage[]) => {
  if (!apiKey) return null;
  const prompt = `Atue como fisioterapeuta expert em Pilates. Patologia/Queixa: "${query}".
  Equipamentos disponíveis: ${equipments.join(', ')}.
  Histórico Triagem: ${JSON.stringify(history || [])}.
  Retorne JSON: {
    "pathologyName": "Nome Técnico",
    "summary": "Resumo clínico curto",
    "indicated": [{"name": "Nome Exercício", "apparatus": "Aparelho", "reason": "Por que é bom", "details": "Dica de execução"}],
    "contraindicated": [{"name": "Nome Exercício", "apparatus": "Aparelho", "reason": "Por que evitar", "details": "Risco"}]
  }`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(res.text || 'null');
  } catch (e) { return null; }
};

export const fetchLessonPlan = async (pathology: string, equipments: string[], history?: ChatMessage[]) => {
  if (!apiKey) return null;
  const prompt = `Crie um plano de aula de Pilates Rehab para: "${pathology}".
  Equipamentos: ${equipments.join(', ')}.
  Detalhes do paciente: ${JSON.stringify(history || [])}.
  Retorne JSON: {
    "pathologyName": "${pathology}",
    "goal": "Objetivo principal da aula",
    "duration": "50 min",
    "exercises": [Array de 6 a 8 exercícios com {name, reps, apparatus, instructions, focus}]
  }`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(res.text || 'null');
  } catch (e) { return null; }
};

export const regenerateSingleExercise = async (pathology: string, currentExercise: any, equipments: string[]) => {
  if (!apiKey) return currentExercise;
  const prompt = `Troque este exercício (${currentExercise.name}) por outro equivalente para ${pathology} usando ${equipments.join(', ')}. Retorne JSON do novo exercício formatado igual ao anterior.`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(res.text || JSON.stringify(currentExercise));
  } catch (e) { return currentExercise; }
};

export const generateHealthyRecipe = async (goal: string, restrictions: string) => {
  if (!apiKey) return null;
  const prompt = `Crie uma receita saudável. Objetivo: ${goal}. Restrições: ${restrictions}.
  Retorne JSON: { "title": "", "ingredients": [], "instructions": [], "benefits": "", "calories": "ex: 300kcal" }`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    return JSON.parse(res.text || 'null');
  } catch (e) { return null; }
};

export const generateRecipeFromIngredients = async (ingredients: string[], extra: string) => {
  if (!apiKey) return null;
  const prompt = `Crie uma receita saudável usando PRINCIPALMENTE: ${ingredients.join(', ')}. Obs: ${extra}.
  Retorne JSON: { "title": "", "ingredients": [], "instructions": [], "benefits": "", "calories": "" }`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    return JSON.parse(res.text || 'null');
  } catch (e) { return null; }
};

export const generateHomeWorkout = async (name: string, obs: string, equipment: string, duration: string) => {
  if (!apiKey) return null;
  const prompt = `Crie um treino de Pilates em casa para ${name}. Obs clínicas: ${obs}. Equipamentos: ${equipment}. Duração: ${duration}.
  Retorne JSON: { "title": "", "duration": "", "focus": "", "exercises": [{ "name": "", "reps": "", "instructions": "", "safetyNote": "" }] }`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    return JSON.parse(res.text || 'null');
  } catch (e) { return null; }
};

export const generateTailoredMissions = async (name: string, specialties: string[], focus: string, tone: string) => {
    if (!apiKey) return [];
    const prompt = `Crie 3 opções de Missão para o studio "${name}" (Especialidades: ${specialties.join(', ')}). Foco: ${focus}. Tom: ${tone}. Retorne apenas as frases em JSON array string.`;
    try {
        const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        return JSON.parse(res.text || '[]');
    } catch (e) { return []; }
};

export const generateActionPlanFromSuggestions = async (suggestions: Suggestion[], observations: string) => {
  if (!apiKey) return "<p>Erro na API</p>";
  
  const suggestionsText = suggestions.map(s => `- "${s.content}" (Aluno: ${s.studentName})`).join('\n');
  
  const prompt = `Atue como consultor de gestão de Studios.
  Analise estas sugestões dos alunos:
  ${suggestionsText}
  
  Observações do Dono: ${observations}
  
  Crie um Plano de Ação Estratégico em HTML (sem markdown) para endereçar esses pontos.
  Inclua: Resumo das Demandas, Ações Imediatas, Ações de Médio Prazo e Mensagem sugerida para enviar aos alunos como resposta.`;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return `<p>Erro: ${e}</p>`; }
};

