// ... existing imports ...
import { GoogleGenAI, Type } from "@google/genai";
import { 
  MarketingFormData, GeneratedContent, CategorizedTopics, ContentRequest, 
  StudioPersona, WhatsAppScriptRequest, ActionInput, ActionIdea, 
  StrategicPlan, TriageStatus, PathologyResponse, LessonPlanResponse, 
  TreatmentPlanResponse, RecipeResponse, WorkoutResponse, ChatMessage,
  LessonExercise
} from "../types";

// ... existing setup (ai const) ...
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLanguageName = (lang: string) => {
    const map: Record<string, string> = {
        pt: 'Português do Brasil',
        en: 'English (US)',
        es: 'Español',
        fr: 'Français',
        de: 'Deutsch',
        it: 'Italiano',
        zh: 'Chinese (Simplified)',
        ja: 'Japanese',
        ru: 'Russian',
        ko: 'Korean'
    };
    return map[lang] || 'Português do Brasil';
};

export const handleGeminiError = (err: any): string => {
  console.error("Gemini API Error:", err);
  return `<div class="bg-red-50 p-4 rounded text-red-800 border border-red-200">
    <strong>Erro na IA:</strong> ${err.message || "Erro desconhecido ao gerar resposta."}
  </div>`;
};

// Helper to clean JSON
const cleanJSON = (text: string) => {
  if (!text) return '{}';
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json|```/g, '').trim();
  // Find the first '{' or '[' to ensure we strip preamble text
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

// --- NEW MARKETING AGENT ---

export const generateTopicSuggestions = async (goal: string, audience: string, lang: string = 'pt'): Promise<string[]> => {
  const languageName = getLanguageName(lang);
  const prompt = `
  Atue como um especialista em marketing para Studios de Pilates.
  Sugira 5 tópicos criativos e específicos para posts no Instagram.
  Objetivo: ${goal}
  Público: ${audience}
  
  IMPORTANTE: Responda estritamente em ${languageName}.
  Retorne APENAS um array JSON de strings com os títulos dos tópicos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
          responseMimeType: 'application/json',
          responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
          }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) {
    console.error("Error generating topics:", e);
    return [];
  }
};

export const generateMarketingContent = async (formData: MarketingFormData, lang: string = 'pt'): Promise<GeneratedContent | null> => {
  const isPlan = formData.mode === 'plan';
  const isStory = formData.mode === 'story';
  const languageName = getLanguageName(lang);
  
  // Base schema properties common to all
  const baseProperties: any = {
    suggestedFormat: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
    tips: { type: Type.STRING },
  };

  let responseSchema: any = {
    type: Type.OBJECT,
    properties: baseProperties,
    required: ['suggestedFormat', 'reasoning', 'hashtags', 'tips']
  };

  // Adjust schema based on mode
  if (isPlan) {
    responseSchema.properties.isPlan = { type: Type.BOOLEAN };
    responseSchema.properties.weeks = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          weekNumber: { type: Type.INTEGER },
          theme: { type: Type.STRING },
          posts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                format: { type: Type.STRING },
                idea: { type: Type.STRING }
              },
              required: ['day', 'format', 'idea']
            }
          }
        },
        required: ['weekNumber', 'theme', 'posts']
      }
    };
  } else if (isStory) {
    responseSchema.properties.isStory = { type: Type.BOOLEAN };
    responseSchema.properties.storySequence = {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING },
        reasoning: { type: Type.STRING },
        frames: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              order: { type: Type.INTEGER },
              type: { type: Type.STRING },
              action: { type: Type.STRING },
              spokenText: { type: Type.STRING },
              directAction: { type: Type.STRING },
              emotion: { type: Type.STRING }
            },
            required: ['order', 'type', 'action']
          }
        }
      }
    };
  } else {
    // Single Post
    responseSchema.properties.captionShort = { type: Type.STRING };
    responseSchema.properties.captionLong = { type: Type.STRING };
    responseSchema.properties.visualContent = { type: Type.ARRAY, items: { type: Type.STRING } };
    responseSchema.properties.visualPrompt = { type: Type.STRING, description: "Detailed prompt for image generation model (in English)" };
    
    // Check if it might be reels to add reels options
    responseSchema.properties.isReels = { type: Type.BOOLEAN };
    responseSchema.properties.reelsOptions = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING },
          title: { type: Type.STRING },
          purpose: { type: Type.STRING },
          captionShort: { type: Type.STRING },
          captionLong: { type: Type.STRING },
          script: { type: Type.ARRAY, items: { type: Type.STRING } },
          audioSuggestion: { type: Type.STRING },
          duration: { type: Type.STRING }
        }
      }
    };
  }

  let prompt = `
  Atue como um Especialista em Marketing Digital para Studios de Pilates.
  Gere conteúdo para Instagram com base nestes dados.
  
  IDIOMA DE RESPOSTA: ${languageName} (O conteúdo final deve estar neste idioma).
  Nota: O campo 'visualPrompt' deve ser sempre em Inglês para o gerador de imagens.
  
  Modo: ${formData.mode}
  Objetivo: ${formData.customGoal || formData.goal}
  Público: ${formData.customAudience || formData.audience}
  Tópico: ${formData.topic}
  Formato Preferido: ${formData.format}
  Estilo: ${formData.style}
  `;

  if (isPlan) {
    prompt += `
    Crie um planejamento editorial de 4 semanas.
    Data de Início do Planejamento: ${formData.startDate || 'Hoje'}
    Para cada semana, defina um tema macro coerente.
    
    Frequência Solicitada: ${formData.format}
    (Distribua os posts nos dias da semana conforme essa frequência).

    IMPORTANTE: No campo 'day', forneça o Dia da Semana E a Data exata (dia/mês), calculado a partir da Data de Início. Exemplo: 'Segunda (23/10)'.
    IMPORTANTE: Distribua os formatos sugeridos (Reels, Carrossel, Estático) de forma estratégica.
    Preencha 'isPlan' como true.
    `;
  } else if (isStory) {
    prompt += `
    Crie uma sequência estratégica de Stories (3 a 6 frames).
    Foco em retenção e interação.
    Use gatilhos mentais adequados ao objetivo.
    Preencha 'isStory' como true e detalhe a 'storySequence'.
    `;
  } else {
    prompt += `
    Crie um post único completo.
    Gere sempre 'captionShort' e 'captionLong'.
    Se o formato for Reels ou Vídeo, forneça roteiro detalhado em 'reelsOptions' (pelo menos 2 opções diferentes) e marque 'isReels' como true.
    Se for Estático ou Carrossel, foque em 'visualContent' descrevendo a imagem/design em detalhes.
    IMPORTANTE: Se for carrossel, descreva a imagem como uma sequência conectada (panorâmica).
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) {
    console.error("Marketing Gen Error:", e);
    throw e;
  }
};

export async function* generatePilatesContentStream(request: ContentRequest, systemInstruction: string, lang: string = 'pt') {
  const languageName = getLanguageName(lang);
  const prompt = `
  Atue como um especialista em Marketing Digital para Pilates.
  Crie um conteúdo para Instagram com os seguintes detalhes:
  
  IDIOMA DE SAÍDA: ${languageName}
  
  Formato: ${request.format}
  Objetivo: ${request.objective}
  Tema: ${request.theme}
  Público: ${request.audience}
  Tom de Voz: ${request.tone}
  
  ${request.modificationPrompt ? `IMPORTANTE - Refinamento: ${request.modificationPrompt}` : ''}

  Instruções:
  1. Use emojis para estruturar a resposta.
  2. Se for Vídeo/Reels, inclua roteiro, áudio e legenda.
  3. Se for Post Estático, inclua legenda e descrição da imagem.
  `;

  try {
    const result = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction
      }
    });

    for await (const chunk of result) {
      yield chunk.text || '';
    }
  } catch (e) {
    console.error("Gemini Stream Error:", e);
    throw e;
  }
}

export const generatePilatesImage = async (request: ContentRequest, persona: any, contentContext: string): Promise<string | null> => {
    try {
        const isCarousel = request.format.toLowerCase().includes('carrossel') || request.format.toLowerCase().includes('carousel');
        
        let prompt = `Create a high quality image for a Pilates studio Instagram post.
        Style: ${request.imageStyle}.
        Theme: ${request.theme}.
        Context: ${contentContext.substring(0, 300)}...
        No text in image.`;

        if (isCarousel) {
            prompt = `Create a wide panoramic storyboard image (16:9 ratio).
            The image must be visually divided into 6 equal vertical panels side-by-side, representing a sequence.
            Each panel represents a slide of a carousel.
            Style: ${request.imageStyle}.
            Theme: ${request.theme}.
            Context Description: ${contentContext.substring(0, 500)}...
            Ensure distinct separation or seamless flow between the 6 panels. No text.`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: prompt,
            config: {
                imageConfig: {
                    aspectRatio: isCarousel ? '16:9' : '1:1'
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Image gen error", e);
        return null;
    }
};

export const generateFinancialAnalysis = async (inputs: any, model: any, results: any, targetRev: number, potentialRev: number, maxCap: number, profRev: number, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Atue como um consultor financeiro sênior especializado em studios.
            Gere uma análise financeira detalhada em formato HTML (com <h2>, <p>, <ul>, <li>, <strong>) e estilo profissional.
            
            IDIOMA DE SAÍDA: ${languageName}
            
            Dados do Studio: ${JSON.stringify({inputs, model, results, targetRev, potentialRev})}
            ` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateWhatsAppScript = async (request: WhatsAppScriptRequest, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um script de WhatsApp persuasivo e humano.
            Idioma: ${languageName}.
            Cliente: ${request.clientName}. 
            Objetivo: ${request.objective}.
            Tom: ${request.tone}.
            Contexto: ${request.context || 'Nenhum'}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateActionIdeas = async (input: ActionInput, lang: string = 'pt'): Promise<ActionIdea[]> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Sugira 3 ideias de campanha/evento para um studio de pilates.
            Idioma: ${languageName}.
            Tema: ${input.theme}. 
            Objetivo: ${input.objective}.`, 
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            id: { type: Type.STRING }, 
                            title: { type: Type.STRING }, 
                            summary: { type: Type.STRING }, 
                            effort: { type: Type.STRING } 
                        } 
                    } 
                } 
            } 
        }); 
        return JSON.parse(cleanJSON(response.text || '[]')); 
    } catch (e) { return []; }
};

export const generateActionPlanDetail = async (idea: ActionIdea, input: ActionInput, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um plano de ação detalhado em formato HTML.
            Idioma: ${languageName}.
            Ideia: ${idea.title}. 
            Contexto: ${JSON.stringify(input)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const fetchTriageQuestion = async (initialQuery: string, history: ChatMessage[], studentName?: string, lang: string = 'pt'): Promise<{status: TriageStatus, question?: string}> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Atue como um Mentor Clínico de Pilates Sênior.
            Idioma: ${languageName}.
            Aluno: ${studentName}. Queixa: ${initialQuery}. 
            Histórico da conversa: ${JSON.stringify(history)}. 
            
            Seu objetivo é fazer perguntas para entender a dor e limitação do aluno para montar uma aula.
            Faça UMA pergunta por vez.
            Se já tiver informações suficientes (dor, limitação, objetivo), retorne status FINISH. Caso contrário, CONTINUE e faça a próxima pergunta.`, 
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: { 
                        status: { type: Type.STRING }, 
                        question: { type: Type.STRING } 
                    } 
                } 
            } 
        }); 
        return JSON.parse(cleanJSON(response.text || '{}')); 
    } catch (e) { return { status: TriageStatus.FINISH }; }
};

export const fetchPathologyData = async (query: string, equipment: string[], history?: ChatMessage[], lang: string = 'pt'): Promise<PathologyResponse | null> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Gere um guia clínico de Pilates para o caso: ${query}.
            Idioma: ${languageName}.
            Equipamentos disponíveis: ${equipment.join(', ')}. 
            Histórico da Anamnese: ${JSON.stringify(history)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        pathologyName: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                        indicated: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    apparatus: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    details: { type: Type.STRING }
                                }
                            }
                        },
                        contraindicated: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    apparatus: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    details: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return null; }
};

export const fetchLessonPlan = async (query: string, equipment: string[], history?: any[], observations?: string, focus?: string, lang: string = 'pt'): Promise<LessonPlanResponse | null> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um plano de aula de Pilates completo e seguro.
            Idioma: ${languageName}.
            Caso: ${query}. 
            Equipamentos: ${equipment.join(', ')}. 
            Obs: ${observations}. 
            Foco da sessão: ${focus || 'Geral'}.`, 
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: { 
                        pathologyName: { type: Type.STRING }, 
                        goal: { type: Type.STRING }, 
                        duration: { type: Type.STRING }, 
                        exercises: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: { 
                                    name: {type:Type.STRING}, 
                                    reps: {type:Type.STRING}, 
                                    apparatus: {type:Type.STRING}, 
                                    instructions: {type:Type.STRING}, 
                                    focus: {type:Type.STRING}, 
                                    safetyNote: {type:Type.STRING} 
                                } 
                            } 
                        } 
                    } 
                } 
            } 
        }); 
        return JSON.parse(cleanJSON(response.text || '{}')); 
    } catch (e) { return null; }
};

export const generateEvolutionReport = async (evolutions: any[], context: string, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Gere um relatório de evolução clínica em HTML.
            Idioma: ${languageName}.
            Contexto: ${context}. 
            Dados das avaliações: ${JSON.stringify(evolutions)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateEvaluationAnalysis = async (evaluations: any[], context: string, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Analise estas avaliações de aula e gere um relatório de qualidade em HTML.
            Idioma: ${languageName}.
            Contexto: ${context}. 
            Dados: ${JSON.stringify(evaluations)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateSuggestionTrends = async (suggestions: any[], lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Analise as sugestões dos alunos e identifique tendências. Gere relatório HTML.
            Idioma: ${languageName}.
            Dados: ${JSON.stringify(suggestions)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateActionPlanFromSuggestions = async (suggestions: any[], observations: string, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um plano de ação para resolver os pontos levantados nas sugestões. Formato HTML.
            Idioma: ${languageName}.
            Obs do Dono: ${observations}. 
            Sugestões Selecionadas: ${JSON.stringify(suggestions)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

// --- NEW STRATEGIC FUNCTIONS ---

export const generateMissionOptions = async (studioName: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie 5 opções de Missão para um studio de Pilates chamado "${studioName}".
      Retorne apenas um array JSON de strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateVisionOptions = async (studioName: string, year: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie 5 opções de Visão para um studio de Pilates chamado "${studioName}" para o ano de ${year}.
      Retorne apenas um array JSON de strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Sugira 5 itens comuns para a categoria "${category}" na análise SWOT de um Studio de Pilates.
      Retorne apenas um array JSON de strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateObjectivesSmart = async (swot: any): Promise<{title: string, keyResults: string[]}[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Com base nesta análise SWOT: ${JSON.stringify(swot)}, crie 3 Objetivos Estratégicos usando metodologia OKR.
      Para cada objetivo, defina 2-3 Resultados Chave (Key Results).
      Retorne JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              keyResults: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateActionsSmart = async (objectives: any[]): Promise<{quarter: string, actions: string[]}[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Com base nestes objetivos: ${JSON.stringify(objectives)}, crie um plano de ação trimestral (4 trimestres).
      Retorne JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              quarter: { type: Type.STRING },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateFullReport = async (planData: StrategicPlan): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Atue como um consultor de negócios sênior.
      Gere um relatório estratégico completo em HTML para o studio "${planData.studioName}".
      Dados: ${JSON.stringify(planData)}.
      O relatório deve ser profissional, inspirador e acionável. Use tags HTML como <h2>, <h3>, <p>, <ul>, <li>.`
    });
    return response.text || '';
  } catch (e) { return '<p>Erro ao gerar relatório.</p>'; }
};

export const generateTailoredMissions = async (studioName: string, specialties: string[], focus: string, tone: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie 3 opções de Missão para o studio "${studioName}".
      Especialidades: ${specialties.join(', ')}.
      Foco: ${focus}.
      Tom de voz: ${tone}.
      Retorne JSON array de strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

export const fetchTreatmentPlan = async (query: string, equipment: string[], history?: any[], observations?: string): Promise<TreatmentPlanResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie um plano de tratamento de Pilates de 4 sessões (fases) para o caso: ${query}.
      Equipamentos: ${equipment.join(', ')}.
      Obs: ${observations || ''}.
      Retorne JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pathologyName: { type: Type.STRING },
            overview: { type: Type.STRING },
            sessions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sessionNumber: { type: Type.INTEGER },
                  goal: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  apparatusFocus: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) { return null; }
};

export const regenerateSingleExercise = async (query: string, currentExercise: LessonExercise, equipment: string[]): Promise<LessonExercise> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Sugira um exercício alternativo de Pilates para substituir: "${currentExercise.name}".
      Contexto/Caso: ${query}.
      Equipamentos disponíveis: ${equipment.join(', ')}.
      Deve ser diferente do anterior.
      Retorne JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            reps: { type: Type.STRING },
            apparatus: { type: Type.STRING },
            instructions: { type: Type.STRING },
            focus: { type: Type.STRING },
            safetyNote: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) { return currentExercise; }
};

export const generateHealthyRecipe = async (goal: string, restrictions: string): Promise<RecipeResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie uma receita saudável. Objetivo: ${goal}. Restrições: ${restrictions}.
      Retorne JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            benefits: { type: Type.STRING },
            calories: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) { return null; }
};

export const generateRecipeFromIngredients = async (ingredients: string[], extraInfo: string): Promise<RecipeResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie uma receita saudável usando: ${ingredients.join(', ')}. Extra info: ${extraInfo}.
      Retorne JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            benefits: { type: Type.STRING },
            calories: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) { return null; }
};

export const generateHomeWorkout = async (studentName: string, observations: string, equipment: string, duration: string): Promise<WorkoutResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie um treino de Pilates em casa para ${studentName}.
      Obs Clínicas: ${observations}.
      Equipamento: ${equipment}.
      Duração: ${duration}.
      Retorne JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            duration: { type: Type.STRING },
            focus: { type: Type.STRING },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  reps: { type: Type.STRING },
                  instructions: { type: Type.STRING },
                  safetyNote: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) { return null; }
};

export const generateNewsletter = async (senderName: string, audience: string, topic: string, style: string): Promise<{title: string, content: string} | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie uma newsletter para um studio de Pilates.
      Remetente: ${senderName}.
      Público: ${audience}.
      Tópico: ${topic}.
      Estilo: ${style}.
      Retorne JSON com título e conteúdo (em HTML simples).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) { return null; }
};