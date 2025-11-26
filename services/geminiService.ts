import { GoogleGenAI } from "@google/genai";

const getApiKey = (): string | undefined => {
  // 1. Tentar ler de import.meta.env (Padrão Vite) de forma segura
  try {
    // @ts-ignore
    if (import.meta && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  // 2. Tentar ler de process.env (Fallback para Node/Alguns builds)
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

export const generateStudioDescription = async (
  studioName: string,
  ownerName: string,
  specialties: string[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Erro: Chave de API da IA não configurada corretamente.";

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
    return "Falha ao gerar descrição devido a um erro de conexão com a IA.";
  }
};