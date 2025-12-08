
// ... existing imports ...
import { GoogleGenAI, Type } from "@google/genai";
import { 
  MarketingFormData, GeneratedContent, CategorizedTopics, ContentRequest, 
  StudioPersona, WhatsAppScriptRequest, ActionInput, ActionIdea, 
  StrategicPlan, TriageStatus, PathologyResponse, LessonPlanResponse, 
  TreatmentPlanResponse, RecipeResponse, WorkoutResponse, ChatMessage
} from "../types";

// ... existing setup (ai const) ...
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const handleGeminiError = (err: any): string => {
  console.error("Gemini API Error:", err);
  return `<div class="bg-red-50 p-4 rounded text-red-800 border border-red-200">
    <strong>Erro na IA:</strong> ${err.message || "Erro desconhecido ao gerar resposta."}
  </div>`;
};

// Helper to clean JSON
const cleanJSON = (text: string) => {
  if (!text) return '{}';
  return text.replace(/```json|```/g, '').trim();
};

// --- NEW MARKETING AGENT ---

export const generateTopicSuggestions = async (goal: string, audience: string): Promise<string[]> => {
  const prompt = `
  Como um especialista em marketing para Studios de Pilates, sugira 5 tópicos criativos e específicos para posts no Instagram.
  Objetivo: ${goal}
  Público: ${audience}
  
  Retorne APENAS um array JSON de strings com os títulos dos tópicos.
  Exemplo: ["Benefícios do Pilates na gravidez", "Como aliviar dor nas costas"]
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

export const generateMarketingContent = async (formData: MarketingFormData): Promise<GeneratedContent | null> => {
  const isPlan = formData.mode === 'plan';
  const isStory = formData.mode === 'story';
  
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
              }
            }
          }
        }
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
            }
          }
        }
      }
    };
  } else {
    // Single Post
    responseSchema.properties.captionShort = { type: Type.STRING };
    responseSchema.properties.captionLong = { type: Type.STRING };
    responseSchema.properties.visualContent = { type: Type.ARRAY, items: { type: Type.STRING } };
    
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
  Gere conteúdo para Instagram com base nestes dados:
  
  Modo: ${formData.mode}
  Objetivo: ${formData.customGoal || formData.goal}
  Público: ${formData.customAudience || formData.audience}
  Tópico: ${formData.topic}
  Formato Preferido: ${formData.format}
  Estilo: ${formData.style}
  `;

  if (isPlan) {
    prompt += `
    Crie um planejamento de 4 semanas.
    Data de Início do Planejamento: ${formData.startDate || 'Hoje'}
    Para cada semana, defina um tema macro.
    Sugira 3 posts por semana (Dias alternados).
    IMPORTANTE: No campo 'day', forneça o Dia da Semana E a Data exata (dia/mês), calculado a partir da Data de Início. Exemplo: 'Segunda (23/10)'.
    IMPORTANTE: Distribua os formatos sugeridos. PRIORIZE 'Post Estático' (maioria das sugestões). Use 'Carrossel' e 'Reels' apenas ocasionalmente para variar.
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
    return null;
  }
};

export async function* generatePilatesContentStream(request: ContentRequest, systemInstruction: string) {
  const prompt = `
  Atue como um especialista em Marketing Digital para Pilates.
  Crie um conteúdo para Instagram com os seguintes detalhes:
  
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

// UPDATE generatePilatesImage to support the new flow
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
                    // For carousel, we use 16:9 to simulate the wide strip of 6 cards
                    aspectRatio: isCarousel ? '16:9' : '1:1'
                }
            }
        });

        // Find image part
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

export const generatePilatesVideo = async (promptText: string, onStatus: (msg: string) => void): Promise<string | null> => {
    try {
        if (!(window as any).aistudio?.hasSelectedApiKey()) {
            throw new Error("API Key not selected for Veo.");
        }
        onStatus("Iniciando geração de vídeo (Veo)...");
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `Cinematic pilates video: ${promptText.substring(0, 300)}`,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
        });
        while (!operation.done) {
            onStatus("Processando vídeo...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
            const blob = await res.blob();
            return URL.createObjectURL(blob);
        }
        return null;
    } catch (e) { console.error("Video gen error", e); return null; }
};

export const generateContentPlan = async (form: any, persona: any): Promise<any> => {
    const prompt = `Crie um plano de conteúdo de 4 semanas para Pilates.
    Nome: ${form.name}
    Meta: ${form.mainGoal}
    Público: ${form.audience}
    Frequência: ${form.frequency}x por semana.
    Data Início: ${form.startDate}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            week: { type: Type.STRING },
                            theme: { type: Type.STRING },
                            ideas: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        day: { type: Type.STRING },
                                        theme: { type: Type.STRING },
                                        format: { type: Type.STRING },
                                        objective: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generatePlannerSuggestion = async (label: string, context: string, type: 'strategy' | 'random'): Promise<string[]> => {
    const prompt = `Sugira 3 opções curtas para o campo "${label}" de um plano de marketing para Pilates. Contexto: ${type === 'strategy' ? context : 'Geral'}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateMissionOptions = async (studioName: string): Promise<string[]> => {
    const prompt = `Gere 5 opções de Missão para o studio "${studioName}".`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } } });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateVisionOptions = async (studioName: string, year: string): Promise<string[]> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Gere 5 opções de Visão para o studio "${studioName}" ano ${year}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } } }); return JSON.parse(cleanJSON(response.text || '[]')); } catch (e) { return []; }
};
export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Gere 5 sugestões SWOT: ${category} (Pilates).`, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } } }); return JSON.parse(cleanJSON(response.text || '[]')); } catch (e) { return []; }
};
export const generateObjectivesSmart = async (swot: any): Promise<any[]> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Gere 3 objetivos SMART baseados em: ${JSON.stringify(swot)}`, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, keyResults: { type: Type.ARRAY, items: { type: Type.STRING } } } } } } }); return JSON.parse(cleanJSON(response.text || '[]')); } catch (e) { return []; }
};
export const generateActionsSmart = async (objectives: any[]): Promise<any[]> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Plano ação trimestral para: ${JSON.stringify(objectives)}`, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { quarter: { type: Type.STRING }, actions: { type: Type.ARRAY, items: { type: Type.STRING } } } } } } }); return JSON.parse(cleanJSON(response.text || '[]')); } catch (e) { return []; }
};
export const generateFullReport = async (planData: StrategicPlan): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Relatório HTML Planejamento Estratégico: ${JSON.stringify(planData)}` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateTailoredMissions = async (studioName: string, specialties: string[], focus: string, tone: string): Promise<string[]> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `5 opções missão studio ${studioName}. Esp: ${specialties}. Foco: ${focus}. Tom: ${tone}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } } }); return JSON.parse(cleanJSON(response.text || '[]')); } catch (e) { return []; }
};
export const generateFinancialAnalysis = async (inputs: any, model: any, results: any, targetRev: number, potentialRev: number, maxCap: number, profRev: number): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Análise financeira HTML studio pilates. Dados: ${JSON.stringify({inputs, model, results, targetRev, potentialRev})}` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateWhatsAppScript = async (request: WhatsAppScriptRequest): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Script WhatsApp. Cliente: ${request.clientName}. Obj: ${request.objective}.` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateActionIdeas = async (input: ActionInput): Promise<ActionIdea[]> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `3 ideias campanha pilates. Tema: ${input.theme}. Obj: ${input.objective}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, summary: { type: Type.STRING }, effort: { type: Type.STRING } } } } } }); return JSON.parse(cleanJSON(response.text || '[]')); } catch (e) { return []; }
};
export const generateActionPlanDetail = async (idea: ActionIdea, input: ActionInput): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Plano ação HTML detalhado para ideia: ${idea.title}. Contexto: ${JSON.stringify(input)}` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateNewsletter = async (userName: string, audience: string, topic: string, style: string): Promise<{title: string, content: string} | null> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Newsletter HTML. Remetente: ${userName}. Público: ${audience}. Tópico: ${topic}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return null; }
};
export const fetchTriageQuestion = async (initialQuery: string, history: ChatMessage[], studentName?: string): Promise<{status: TriageStatus, question?: string}> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Mentor Clínico Pilates. Aluno: ${studentName}. Queixa: ${initialQuery}. Hist: ${JSON.stringify(history)}. Decida CONTINUE/FINISH. Se continue, faça pergunta.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { status: { type: Type.STRING }, question: { type: Type.STRING } } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return { status: TriageStatus.FINISH }; }
};
export const fetchPathologyData = async (query: string, equipment: string[], history?: ChatMessage[]): Promise<PathologyResponse | null> => {
    try { 
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Guia clínico: ${query}. Equip: ${equipment}. Hist: ${JSON.stringify(history)}`,
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
export const fetchLessonPlan = async (query: string, equipment: string[], history?: any[], observations?: string, focus?: string): Promise<LessonPlanResponse | null> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Plano aula Pilates. Caso: ${query}. Equip: ${equipment}. Obs: ${observations}. Foco: ${focus}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { pathologyName: { type: Type.STRING }, goal: { type: Type.STRING }, duration: { type: Type.STRING }, exercises: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, reps: {type:Type.STRING}, apparatus: {type:Type.STRING}, instructions: {type:Type.STRING}, focus: {type:Type.STRING}, safetyNote: {type:Type.STRING} } } } } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return null; }
};
export const fetchTreatmentPlan = async (query: string, equipment: string[], history?: any[], observations?: string): Promise<TreatmentPlanResponse | null> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Plano tratamento 4 sessões. Caso: ${query}. Equip: ${equipment}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { pathologyName: { type: Type.STRING }, overview: { type: Type.STRING }, sessions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sessionNumber: { type: Type.INTEGER }, goal: { type: Type.STRING }, focus: { type: Type.STRING }, apparatusFocus: { type: Type.STRING } } } } } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return null; }
};
export const regenerateSingleExercise = async (query: string, currentExercise: any, equipment: string[]): Promise<any> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Alternativa exercicio "${currentExercise.name}". Caso: ${query}. Equip: ${equipment}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, reps: {type:Type.STRING}, apparatus: {type:Type.STRING}, instructions: {type:Type.STRING}, focus: {type:Type.STRING}, safetyNote: {type:Type.STRING} } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return currentExercise; }
};
export const generateEvolutionReport = async (evolutions: any[], context: string): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Relatório evolução HTML. Contexto: ${context}. Dados: ${JSON.stringify(evolutions)}` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateEvaluationAnalysis = async (evaluations: any[], context: string): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Análise avaliações HTML. Contexto: ${context}. Dados: ${JSON.stringify(evaluations)}` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateActionPlanFromSuggestions = async (suggestions: any[], observations: string): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Plano ação melhoria HTML. Obs: ${observations}. Sugestões: ${JSON.stringify(suggestions)}` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateSuggestionTrends = async (suggestions: any[]): Promise<string> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Análise tendências sugestões HTML. Dados: ${JSON.stringify(suggestions)}` }); return response.text || ''; } catch (e) { return ''; }
};
export const generateHealthyRecipe = async (goal: string, restrictions: string): Promise<RecipeResponse | null> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Receita saudável JSON. Obj: ${goal}. Restr: ${restrictions}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }, instructions: { type: Type.ARRAY, items: { type: Type.STRING } }, benefits: { type: Type.STRING }, calories: { type: Type.STRING } } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return null; }
};
export const generateRecipeFromIngredients = async (ingredients: string[], extraInfo: string): Promise<RecipeResponse | null> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Receita com ${ingredients}. Extra: ${extraInfo}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }, instructions: { type: Type.ARRAY, items: { type: Type.STRING } }, benefits: { type: Type.STRING }, calories: { type: Type.STRING } } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return null; }
};
export const generateHomeWorkout = async (studentName: string, observations: string, equipment: string, duration: string): Promise<WorkoutResponse | null> => {
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Treino casa JSON. Aluno: ${studentName}. Obs: ${observations}. Equip: ${equipment}. Dur: ${duration}.`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, duration: { type: Type.STRING }, focus: { type: Type.STRING }, exercises: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, reps: { type: Type.STRING }, instructions: { type: Type.STRING }, safetyNote: { type: Type.STRING } } } } } } } }); return JSON.parse(cleanJSON(response.text || '{}')); } catch (e) { return null; }
};