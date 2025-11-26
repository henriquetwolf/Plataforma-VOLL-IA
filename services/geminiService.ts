import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  // Tenta pegar a chave de diferentes fontes de forma segura
  let apiKey = '';
  
  // Se estivermos em um ambiente com process (ex: Vercel build)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    // @ts-ignore
    apiKey = process.env.API_KEY;
  }
  
  // Se estivermos no Vite (import.meta.env)
  // @ts-ignore
  if (!apiKey && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.API_KEY) {
    // @ts-ignore
    apiKey = import.meta.env.API_KEY;
  }

  if (!apiKey) {
    console.warn("API Key do Gemini não encontrada. Configure a variável de ambiente API_KEY.");
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
  if (!ai) return "Erro: Chave de API da IA não configurada. Verifique suas variáveis de ambiente na Vercel.";

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