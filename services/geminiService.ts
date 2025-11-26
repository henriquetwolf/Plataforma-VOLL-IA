import { GoogleGenAI } from "@google/genai";
import { StrategicPlan } from "../types";

const getApiKey = (): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const value = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
      if (value) return value;
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {}

  return undefined;
};

const getAiClient = () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn("API Key do Gemini não encontrada.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper para limpar JSON vindo da IA (remove markdown ```json ... ```)
const cleanAndParseJSON = (text: string) => {
  try {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Erro ao fazer parse do JSON da IA:", e);
    return null;
  }
};

export const generateStudioDescription = async (
  studioName: string,
  ownerName: string,
  specialties: string[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Erro: Chave de API da IA não configurada.";

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
    return "Falha ao gerar descrição.";
  }
};

// --- GERAÇÃO DE OPÇÕES PARA MISSÃO E VISÃO ---

export const generateMissionOptions = async (studioName: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return ["Erro: API Key não configurada."];

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
    const parsed = cleanAndParseJSON(response.text || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const generateVisionOptions = async (studioName: string, year: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return ["Erro: API Key não configurada."];

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
    const parsed = cleanAndParseJSON(response.text || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

// --- SUGESTÕES DE SWOT ---

export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return [];

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
    const parsed = cleanAndParseJSON(response.text || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

// --- GERAÇÃO INTELIGENTE DE OBJETIVOS E AÇÕES ---

export const generateObjectivesSmart = async (swotData: any): Promise<any[]> => {
  const ai = getAiClient();
  if (!ai) return [];

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
    const parsed = cleanAndParseJSON(response.text || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const generateActionsSmart = async (objectives: any[]): Promise<any[]> => {
  const ai = getAiClient();
  if (!ai) return [];

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
    const parsed = cleanAndParseJSON(response.text || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

// --- RELATÓRIO FINAL ---

export const generateFullReport = async (data: StrategicPlan): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "<p>Erro: Chave de API não configurada.</p>";

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
    return "<p>Erro ao gerar relatório completo. Tente novamente.</p>";
  }
};