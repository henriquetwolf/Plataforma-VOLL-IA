import { GoogleGenAI } from "@google/genai";
import { StrategicPlan } from "../types";

// Chave da API Hardcoded para garantir funcionamento no Vercel
const API_KEY = 'AIzaSyDDYobnlgxF7iYC-g7uYYc85ipJTA6hSis';

console.log("Iniciando serviço Gemini...");

// Inicialização direta do cliente
const ai = new GoogleGenAI({ apiKey: API_KEY });

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

export const generateStudioDescription = async (
  studioName: string,
  ownerName: string,
  specialties: string[]
): Promise<string> => {
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
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Falha ao gerar descrição. Verifique se a chave de API é válida para este domínio.";
  }
};

// --- GERAÇÃO DE OPÇÕES PARA MISSÃO E VISÃO (ESTRATÉGIA) ---

export const generateMissionOptions = async (studioName: string): Promise<string[]> => {
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
  } catch (error) {
    console.error("Erro ao gerar missões personalizadas:", error);
    return [];
  }
};

// --- SUGESTÕES DE SWOT ---

export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
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
  } catch (error) {
    console.error("Gemini Full Report Error:", error);
    return `
      <div class="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
        <h3 class="text-red-800 font-bold mb-2">Erro na Geração</h3>
        <p class="text-red-600">Ocorreu um erro ao conectar com a IA. Verifique se o domínio do Vercel está autorizado no Google Cloud Console ou se a chave de API está correta.</p>
        <p class="text-xs text-red-400 mt-2">Detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}</p>
      </div>
    `;
  }
};