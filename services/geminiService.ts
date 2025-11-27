
import { GoogleGenAI } from "@google/genai";
import { StrategicPlan, CalculatorInputs, FinancialModel, CompensationResult, PathologyResponse, LessonPlanResponse, LessonExercise, ChatMessage, TriageStep, TriageStatus } from "../types";

// A chave é injetada pelo vite.config.ts através do process.env.API_KEY
// Certifique-se de configurar a variável "API_KEY" no painel da Vercel
const apiKey = process.env.API_KEY;

// Log de diagnóstico seguro (mostra apenas se carregou ou não)
if (!apiKey) {
  console.warn("[Gemini Service] API Key não encontrada. Configure a variável de ambiente 'API_KEY' no Vercel.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Helper para limpar JSON vindo da IA
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

const handleGeminiError = (error: any): string => {
  const errStr = error.toString();
  const errMsg = error.message || '';
  
  console.error("Gemini API Error:", error);

  if (errStr.includes("403") || errMsg.includes("leaked") || errMsg.includes("PERMISSION_DENIED")) {
    return `
      <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg mb-4 text-left" role="alert">
        <p class="font-bold text-lg mb-2">⛔ Erro de Segurança (Google)</p>
        <p class="mb-2">A chave de API configurada foi <strong>bloqueada por vazamento</strong>.</p>
        <p class="text-sm text-red-600 mb-4">Isso ocorre automaticamente quando a chave é exposta em locais públicos (como chats ou repositórios).</p>
        
        <div class="bg-white p-4 rounded border border-red-200">
          <p class="text-sm font-bold text-slate-700 mb-2">Como resolver:</p>
          <ol class="list-decimal ml-5 text-sm text-slate-600 space-y-1">
            <li>Gere uma nova chave no <a href="https://aistudio.google.com/" target="_blank" class="text-blue-600 underline hover:text-blue-800">Google AI Studio</a>.</li>
            <li>Vá no painel da <strong>Vercel</strong> > Settings > Environment Variables.</li>
            <li>Atualize o valor da variável <code>API_KEY</code>.</li>
            <li><strong>IMPORTANTE:</strong> Não cole a chave nova em chats públicos.</li>
            <li>Faça um <strong>Redeploy</strong> na Vercel para aplicar.</li>
          </ol>
        </div>
      </div>
    `;
  }
  
  if (!apiKey) {
    return `
      <div class="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
        <p class="font-bold">⚠️ Chave de API não configurada</p>
        <p>Adicione a variável <code>API_KEY</code> nas configurações de Environment Variables do Vercel.</p>
      </div>
    `;
  }

  return `
    <div class="bg-orange-50 border-l-4 border-orange-500 text-orange-700 p-4" role="alert">
      <p class="font-bold">Erro na IA</p>
      <p>Ocorreu um erro na comunicação. Tente novamente mais tarde.</p>
      <p class="text-xs mt-1 opacity-75">Detalhe: ${errMsg}</p>
    </div>
  `;
};

export const generateStudioDescription = async (
  studioName: string,
  ownerName: string,
  specialties: string[]
): Promise<string> => {
  if (!apiKey) return "⚠️ Configure a API_KEY no Vercel para usar este recurso.";

  const prompt = `
    Você é um redator especialista em marketing para negócios de bem-estar e fitness no Brasil.
    Escreva uma descrição profissional, convidativa e concisa (máximo de 100 palavras) para um estúdio de Pilates.
    A resposta deve ser em Português do Brasil.
    
    Nome do Studio: ${studioName}
    Nome do Proprietário(a): ${ownerName}
    Especialidades: ${specialties.join(", ")}
    
    O tom deve ser acolhedor, profissional e focado em saúde.
    Não use formatação markdown (como negrito). Apenas texto simples.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a descrição.";
  } catch (error: any) {
    if (error.message?.includes("leaked")) return "Erro: Chave API bloqueada. Verifique Vercel.";
    return "Erro ao gerar descrição.";
  }
};

export const generateMissionOptions = async (studioName: string): Promise<string[]> => {
  if (!apiKey) return ["⚠️ API Key ausente"];
  const prompt = `Atue como um consultor de branding para Pilates. Crie 3 opções distintas de MISSÃO para o estúdio "${studioName}". Retorne APENAS um array JSON.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "") || [];
  } catch (error) { return []; }
};

export const generateVisionOptions = async (studioName: string, year: string): Promise<string[]> => {
  if (!apiKey) return ["⚠️ API Key ausente"];
  const prompt = `Atue como estrategista. Crie 3 opções de VISÃO para "${studioName}" em ${year}. Retorne APENAS um array JSON.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "") || [];
  } catch (error) { return []; }
};

export const generateTailoredMissions = async (studioName: string, specialties: string[], focus: string, tone: string): Promise<string[]> => {
  if (!apiKey) return ["⚠️ Chave de API não configurada."];
  const prompt = `Crie 4 opções de Missão para "${studioName}" (Especialidades: ${specialties.join(', ')}). Foco: ${focus}, Tom: ${tone}. Retorne JSON Array.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "") || [];
  } catch (error) { return ["Erro ao gerar missões."]; }
};

export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
  if (!apiKey) return ["⚠️ API Key ausente"];
  const prompt = `Liste 5 exemplos de "${category}" para Pilates. Retorne JSON Array.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "") || [];
  } catch (error) { return []; }
};

export const generateObjectivesSmart = async (swotData: any): Promise<any[]> => {
  if (!apiKey) return [];
  const prompt = `Baseado na SWOT: ${JSON.stringify(swotData)}, crie 3 Objetivos com Key Results. Retorne JSON [{title, keyResults}].`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "") || [];
  } catch (error) { return []; }
};

export const generateActionsSmart = async (objectives: any[]): Promise<any[]> => {
  if (!apiKey) return [];
  const prompt = `Baseado nos objetivos: ${JSON.stringify(objectives)}, crie plano trimestral. Retorne JSON [{quarter, actions}].`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return cleanAndParseJSON(response.text || "") || [];
  } catch (error) { return []; }
};

export const generateFullReport = async (data: StrategicPlan): Promise<string> => {
  if (!apiKey) return "<p>⚠️ Erro: Chave de API não configurada.</p>";
  const prompt = `Consultor Sênior Pilates. Relatório Estratégico HTML para ${data.studioName}. Dados: ${JSON.stringify(data)}.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "";
  } catch (error: any) { return handleGeminiError(error); }
};

export const generateFinancialAnalysis = async (
    inputs: CalculatorInputs,
    financialModel: FinancialModel,
    results: CompensationResult[],
    targetRevenue: number,
    potentialRevenue: number,
    maxCapacity: number,
    professionalRevenue: number
): Promise<string> => {
    if (!apiKey) return "<p>⚠️ Chave de API não configurada.</p>";

    const prompt = `
        Atue como um Consultor Financeiro Especialista em Estúdios de Pilates.
        Analise os dados de simulação de contratação abaixo e forneça um parecer técnico em HTML.

        DADOS DO ESTÚDIO:
        - Receita Alvo: R$ ${targetRevenue.toFixed(2)} (Ocupação: ${inputs.occupancyRate}%)
        - Capacidade Máxima: ${maxCapacity} alunos
        - Receita Potencial Total: R$ ${potentialRevenue.toFixed(2)}
        - Receita Gerada pelo Profissional: R$ ${professionalRevenue.toFixed(2)}
        
        MODELO FINANCEIRO ATUAL:
        - Teto Folha: ${financialModel.payroll}%
        - Teto Custos Operacionais: ${financialModel.operatingCosts}%
        - Meta de Lucro/Reservas: ${financialModel.reserves}%

        CENÁRIOS DE CONTRATAÇÃO SIMULADOS:
        ${JSON.stringify(results.map(r => ({
            modelo: r.scenarioName,
            custoEstudio: r.costToStudio,
            liquidoProfissional: r.netForProfessional,
            margemContribuicao: r.contributionMargin,
            viavel: r.isViable
        })))}

        INSTRUÇÕES:
        1. Gere uma resposta em HTML formatado (sem tags <html> ou <body>).
        2. Analise a viabilidade de cada cenário (CLT vs PJ vs Autônomo).
        3. Dê uma recomendação clara de qual é o melhor modelo para o estúdio (menor risco/custo) e para o profissional (maior líquido).
        4. Alerte se o custo do profissional estiver comprometendo a margem do estúdio (idealmente custo total < 40% da receita gerada).
        5. Seja direto e profissional.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "<p>Erro ao gerar análise.</p>";
    } catch (error: any) {
        return handleGeminiError(error);
    }
};

// --- FUNÇÕES DE REABILITAÇÃO (Pilates Rehab) ---

export const fetchPathologyData = async (query: string, equipment: string[], history?: ChatMessage[]): Promise<PathologyResponse | null> => {
  if (!apiKey) return null;

  const historyText = history 
    ? history.map(m => `${m.role === 'ai' ? 'Pergunta' : 'Resposta'}: ${m.text}`).join('\n')
    : "Nenhum histórico de triagem disponível.";

  const prompt = `
    Atue como um Especialista Sênior em Pilates Clínico e Fisioterapia.
    
    PATOLOGIA/SINTOMA: "${query}"
    
    CONTEXTO DO PACIENTE (TRIAGEM):
    ${historyText}

    EQUIPAMENTOS DISPONÍVEIS: ${equipment.join(', ')}

    Gere um relatório técnico em formato JSON com:
    1. pathologyName: Nome técnico da condição.
    2. summary: Resumo clínico focado em reabilitação (max 200 caracteres).
    3. objectives: Lista de 3 a 5 objetivos do Pilates para este caso.
    4. indicated: Lista de 3 exercícios ESPECÍFICOS E INDICADOS. Para cada um inclua: { name, reason, details (reps/series), apparatus }.
    5. contraindicated: Lista de 3 movimentos/exercícios CONTRA-INDICADOS. Para cada um: { name, reason, details, apparatus: "N/A" }.

    Retorne APENAS o JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error) {
    console.error("Erro ao buscar patologia:", error);
    return null;
  }
};

export const fetchTriageQuestion = async (query: string, history: ChatMessage[]): Promise<TriageStep> => {
  if (!apiKey) return { status: TriageStatus.FINISH, reasoning: "Erro API" };

  const prompt = `
    Você é um Fisioterapeuta realizando uma triagem para Pilates.
    Queixa principal: "${query}".
    
    Histórico da conversa:
    ${history.map(m => `${m.role}: ${m.text}`).join('\n')}

    Se você JÁ TEM informações suficientes (nível de dor, limitações de movimento, histórico cirúrgico, fase da lesão) para montar uma aula segura, responda com JSON: { "status": "FINISH" }.
    
    Se precisar de mais detalhes críticos, faça UMA ÚNICA pergunta curta e direta. Responda com JSON: { "status": "CONTINUE", "question": "Sua pergunta aqui?" }.
    
    Máximo de 5 perguntas no total (se o histórico já tiver 5 trocas, finalize).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "") || { status: TriageStatus.FINISH };
  } catch (error) {
    return { status: TriageStatus.FINISH };
  }
};

export const fetchLessonPlan = async (query: string, equipment: string[], history?: ChatMessage[]): Promise<LessonPlanResponse | null> => {
  if (!apiKey) return null;

  const historyText = history 
    ? history.map(m => `${m.role === 'ai' ? 'Pergunta' : 'Resposta'}: ${m.text}`).join('\n')
    : "Sem triagem.";

  const prompt = `
    Crie um Plano de Aula de Pilates completo e personalizado.
    
    Aluno/Patologia: "${query}"
    Contexto Clínico: ${historyText}
    Equipamentos: ${equipment.join(', ')}

    Estrutura da Aula (JSON):
    - pathologyName: Nome da condição
    - goal: Objetivo principal da aula (1 frase)
    - duration: Duração estimada
    - exercises: Array com 6 a 8 exercícios. Cada um com:
      - name: Nome do exercício
      - apparatus: Aparelho usado
      - reps: Repetições/Tempo
      - focus: Foco do exercício (ex: Mobilidade, Força)
      - instructions: Instrução técnica curta e direta.

    Priorize segurança e adaptações baseadas no contexto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error) {
    return null;
  }
};

export const regenerateSingleExercise = async (query: string, oldExercise: LessonExercise, equipment: string[]): Promise<LessonExercise> => {
  if (!apiKey) throw new Error("API Key missing");

  const prompt = `
    Substitua o exercício de Pilates "${oldExercise.name}" (${oldExercise.apparatus}) por uma alternativa para um aluno com "${query}".
    Motivo: Variedade ou adaptação.
    Equipamentos disponíveis: ${equipment.join(', ')}.
    
    Retorne um único objeto JSON: { name, reps, apparatus, instructions, focus }.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const result = cleanAndParseJSON(response.text || "");
    if (!result) throw new Error("Falha no parse");
    return result;
  } catch (error) {
    throw error;
  }
};
