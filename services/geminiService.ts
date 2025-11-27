import { GoogleGenAI } from "@google/genai";
import { StrategicPlan } from "../types";

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
    if (!text) return [];
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Erro ao fazer parse do JSON da IA:", e);
    return [];
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
    // Retorna mensagem de erro simples para campos de texto curtos
    if (error.message?.includes("leaked")) return "Erro: Chave API bloqueada. Verifique Vercel.";
    return "Erro ao gerar descrição.";
  }
};

// --- GERAÇÃO DE OPÇÕES PARA MISSÃO E VISÃO (ESTRATÉGIA) ---

export const generateMissionOptions = async (studioName: string): Promise<string[]> => {
  if (!apiKey) return ["⚠️ API Key ausente"];

  const prompt = `
    Atue como um consultor de branding para Pilates. Crie 3 opções distintas de MISSÃO para o estúdio "${studioName}".
    
    Opção 1: Focada em reabilitação e cuidado.
    Opção 2: Focada em performance e corpo forte.
    Opção 3: Focada em bem-estar mental e equilíbrio.

    Retorne APENAS um array JSON de strings. Exemplo: ["Texto 1", "Texto 2", "Texto 3"].
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const generateVisionOptions = async (studioName: string, year: string): Promise<string[]> => {
  if (!apiKey) return ["⚠️ API Key ausente"];

  const prompt = `
    Atue como um estrategista de negócios. Crie 3 opções de VISÃO de futuro para o estúdio "${studioName}" para o ano de ${year}.
    
    Opção 1: Focada em expansão e crescimento.
    Opção 2: Focada em ser referência técnica/qualidade.
    Opção 3: Focada em experiência do cliente e comunidade.

    Retorne APENAS um array JSON de strings. Exemplo: ["Texto 1", "Texto 2", "Texto 3"].
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error) {
    console.error(error);
    return [];
  }
};

// --- GERAÇÃO AVANÇADA DE MISSÃO (AGENTE ESPECÍFICO) ---

export const generateTailoredMissions = async (
  studioName: string,
  specialties: string[],
  focus: string,
  tone: string
): Promise<string[]> => {
  if (!apiKey) return ["⚠️ Chave de API não configurada. Verifique as configurações do Vercel."];

  const prompt = `
    Atue como um especialista em Branding para Studios de Pilates.
    Crie 4 opções de Declaração de Missão para o estúdio abaixo, seguindo estritamente o foco e o tom solicitados.

    Dados do Studio:
    - Nome: ${studioName}
    - Especialidades: ${specialties.join(', ')}
    
    Parâmetros Criativos:
    - Foco Principal: ${focus}
    - Tom de Voz: ${tone}

    As missões devem ser inspiradoras, claras e memoráveis (máximo 2 frases cada).
    
    Retorne ESTRITAMENTE um array JSON de strings. 
    Exemplo: ["Missão opção 1...", "Missão opção 2...", "Missão opção 3...", "Missão opção 4..."]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error: any) {
    console.error(error);
    return ["Erro ao gerar missões. Verifique a chave de API."];
  }
};

// --- SUGESTÕES DE SWOT ---

export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
  if (!apiKey) return ["⚠️ API Key ausente"];

  const prompt = `
    Liste 5 exemplos comuns de "${category}" para um Estúdio de Pilates no Brasil.
    Seja específico (ex: não diga apenas "Localização", diga "Localização com pouco estacionamento").
    Retorne APENAS um array JSON de strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error) {
    console.error(error);
    return [];
  }
};

// --- GERAÇÃO INTELIGENTE DE OBJETIVOS E AÇÕES ---

export const generateObjectivesSmart = async (swotData: any): Promise<any[]> => {
  if (!apiKey) return [];

  const swotSummary = JSON.stringify(swotData);

  const prompt = `
    Com base nesta Análise SWOT de um estúdio de Pilates: ${swotSummary}
    
    Crie 3 Objetivos Estratégicos inteligentes. Para cada objetivo, defina 2 a 3 Resultados Chave (Key Results) mensuráveis.
    
    Retorne ESTRITAMENTE um JSON no seguinte formato, sem texto adicional:
    [
      {
        "title": "Título do Objetivo (ex: Aumentar retenção)",
        "keyResults": ["Resultado Chave 1", "Resultado Chave 2"]
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const generateActionsSmart = async (objectives: any[]): Promise<any[]> => {
  if (!apiKey) return [];

  const objsSummary = JSON.stringify(objectives);

  const prompt = `
    Com base nestes Objetivos Estratégicos de um estúdio de Pilates: ${objsSummary}
    
    Crie um plano de ação trimestral (Q1, Q2, Q3, Q4) com ações práticas para atingir esses objetivos.
    
    Retorne ESTRITAMENTE um JSON no seguinte formato:
    [
      { "quarter": "1º Trimestre", "actions": ["Ação 1", "Ação 2", "Ação 3"] },
      { "quarter": "2º Trimestre", "actions": ["Ação 1", "Ação 2"] },
      { "quarter": "3º Trimestre", "actions": ["Ação 1", "Ação 2"] },
      { "quarter": "4º Trimestre", "actions": ["Ação 1", "Ação 2"] }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return cleanAndParseJSON(response.text || "");
  } catch (error) {
    console.error(error);
    return [];
  }
};

// --- RELATÓRIO FINAL ---

export const generateFullReport = async (data: StrategicPlan): Promise<string> => {
  if (!apiKey) return "<p>⚠️ Erro: Chave de API não configurada no Vercel (API_KEY).</p>";

  const swotText = `
    Forças: ${data.swot.strengths.join('; ')}
    Fraquezas: ${data.swot.weaknesses.join('; ')}
    Oportunidades: ${data.swot.opportunities.join('; ')}
    Ameaças: ${data.swot.threats.join('; ')}
  `;

  const objectivesText = data.objectives.map(obj => 
    `Objetivo: ${obj.title}\nResultados Chave: ${obj.keyResults.join(', ')}`
  ).join('\n\n');

  const actionsText = data.quarterlyActions.map(q => 
    `${q.quarter}: ${q.actions.join(', ')}`
  ).join('\n');

  const prompt = `
    Atue como um Consultor de Negócios Sênior especializado em Estúdios de Pilates.
    Analise os dados estruturados abaixo e gere um RELATÓRIO ESTRATÉGICO COMPLETO e PROFISSIONAL.

    DADOS DO ESTÚDIO:
    Nome: ${data.studioName}
    Ano: ${data.planningYear}
    Missão: ${data.mission}
    Visão: ${data.vision}

    ANÁLISE SWOT FORNECIDA:
    ${swotText}

    OBJETIVOS DEFINIDOS:
    ${objectivesText}

    AÇÕES TRIMESTRAIS PLANEJADAS:
    ${actionsText}

    INSTRUÇÕES DE SAÍDA:
    1. Gere um código HTML limpo (apenas o conteúdo dentro do <body>, sem as tags html/body).
    2. Use classes do Tailwind CSS para estilização se possível, ou CSS inline discreto.
    3. Estruture o relatório nas seguintes seções:
       - <h2>Sumário Executivo</h2>: Uma síntese motivadora da visão e missão.
       - <h2>Diagnóstico Estratégico</h2>: Análise da SWOT fornecida, destacando como aproveitar forças/oportunidades e mitigar fraquezas/ameaças.
       - <h2>Plano de Metas</h2>: Refine os objetivos citados, sugerindo métricas (KPIs) claras se não houver.
       - <h2>Roadmap de Execução</h2>: Detalhe as ações trimestrais, sugerindo prioridades.
       - <h2>Recomendações Finais do Consultor IA</h2>: Dicas extras de marketing e gestão baseadas no perfil do estúdio.

    O tom deve ser de consultoria premium, encorajador e prático.
    Língua: Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "<p>Não foi possível gerar o relatório.</p>";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};