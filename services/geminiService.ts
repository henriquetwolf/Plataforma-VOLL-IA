import { GoogleGenAI } from "@google/genai";

const getApiKey = (): string | undefined => {
  try {
    // Tentativa 1: Vite import.meta.env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const viteKey = import.meta.env.API_KEY || import.meta.env.VITE_API_KEY;
      if (viteKey) return viteKey;
    }
  } catch (e) {}

  try {
    // Tentativa 2: process.env (Node/Webpack fallback)
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
    // Retornamos null para lidar com o erro graciosamente na UI
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
  if (!ai) return "Erro: Chave de API da IA não configurada. Verifique suas configurações na Vercel.";

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
    return "Falha ao gerar descrição. Verifique se sua API Key é válida e tem cota disponível.";
  }
};