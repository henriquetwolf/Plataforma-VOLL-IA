


import { GoogleGenAI, Type } from "@google/genai";
import { 
  MarketingFormData, GeneratedContent, CategorizedTopics, ContentRequest, 
  StudioPersona, WhatsAppScriptRequest, ActionInput, ActionIdea, 
  StrategicPlan, TriageStatus, PathologyResponse, LessonPlanResponse, 
  TreatmentPlanResponse, RecipeResponse, WorkoutResponse, ChatMessage,
  LessonExercise
} from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLanguageName = () => {
    return 'Português do Brasil';
};

export const handleGeminiError = (err: any): string => {
  console.error("Gemini API Error:", err);
  return `<div class="bg-red-50 p-4 rounded text-red-800 border border-red-200">
    <strong>Erro na IA:</strong> ${err.message || "Ocorreu um erro inesperado."}
  </div>`;
};

// Helper to clean JSON
const cleanJSON = (text: string) => {
  if (!text) return '{}';
  let cleaned = text.replace(/```json|```/g, '').trim();
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
  const prompt = `
  Atue como um especialista em Marketing Digital para Studios de Pilates no Brasil.
  Sugira 5 temas criativos e específicos para posts no Instagram.
  Objetivo: ${goal}
  Público-Alvo: ${audience}
  
  IMPORTANTE: Responda estritamente em Português do Brasil.
  Retorne APENAS um array JSON de strings com os títulos dos temas.
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
    responseSchema.properties.captionShort = { type: Type.STRING };
    responseSchema.properties.captionLong = { type: Type.STRING };
    responseSchema.properties.visualContent = { type: Type.ARRAY, items: { type: Type.STRING } };
    responseSchema.properties.visualPrompt = { type: Type.STRING, description: "Detailed prompt for image generation model (in English)" };
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
  
  IDIOMA DE SAÍDA: Português do Brasil.
  Nota: O campo 'visualPrompt' deve ser sempre em Inglês (para o gerador de imagem).
  
  Modo: ${formData.mode}
  Objetivo: ${formData.customGoal || formData.goal}
  Público: ${formData.customAudience || formData.audience}
  Tema: ${formData.topic}
  Formato Preferido: ${formData.format}
  Estilo: ${formData.style}
  `;

  if (isPlan) {
    prompt += `
    Crie um plano editorial de 4 semanas.
    Data de Início: ${formData.startDate || 'Hoje'}
    Defina um macro-tema para cada semana.
    Frequência: Sugira a melhor frequência.
    
    IMPORTANTE: No campo 'day', forneça Dia da Semana E Data (DD/MM).
    Distribua formatos (Reels, Carrossel, Estático) de forma estratégica.
    Defina 'isPlan' como true.
    `;
  } else if (isStory) {
    prompt += `
    Crie uma sequência estratégica de Stories (3 a 6 frames).
    Foco em retenção e interação.
    Defina 'isStory' como true.
    `;
  } else {
    prompt += `
    Crie um post único completo.
    Gere 'captionShort' (legenda curta) e 'captionLong' (legenda longa e persuasiva).
    Se o formato for Reels/Vídeo, forneça roteiros em 'reelsOptions' e defina 'isReels' como true.
    Se for Estático/Carrossel, foque em 'visualContent' descrevendo a imagem.
    Se Carrossel, descreva a imagem como uma sequência panorâmica conectada.
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
  const prompt = `
  Atue como um Especialista em Marketing para Pilates.
  Crie conteúdo para Instagram.
  
  IDIOMA: Português do Brasil
  
  Formato: ${request.format}
  Objetivo: ${request.objective}
  Tema: ${request.theme}
  Público: ${request.audience}
  Tom: ${request.tone}
  
  ${request.modificationPrompt ? `Refinamento: ${request.modificationPrompt}` : ''}

  Instruções:
  1. Use emojis relevantes.
  2. Se for Vídeo/Reels, inclua roteiro e sugestão de áudio.
  3. Se for Estático, inclua legenda e descrição da imagem.
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
        
        // Image prompts must be in English for better results with Gemini Image/Imagen
        let prompt = `Create a high quality image for a Pilates studio Instagram post.
        Style: ${request.imageStyle}.
        Theme: ${request.theme}.
        Context: ${contentContext.substring(0, 300)}...
        No text in image. Photorealistic, professional lighting.`;

        if (isCarousel) {
            prompt = `Create a wide panoramic storyboard image (16:9 ratio).
            The image must be visually divided into 6 equal vertical panels side-by-side.
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
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Atue como um consultor financeiro sênior para estúdios fitness.
            Gere uma análise financeira detalhada em formato HTML (use tags <h2>, <p>, <ul>, <li>, <strong>).
            
            IDIOMA DE SAÍDA: Português do Brasil.
            
            Dados do Studio: ${JSON.stringify({inputs, model, results, targetRev, potentialRev})}
            
            Foque na viabilidade dos modelos de contratação (CLT vs PJ vs Autônomo) e dê recomendações práticas.` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateWhatsAppScript = async (request: WhatsAppScriptRequest, lang: string = 'pt'): Promise<string> => {
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um roteiro de mensagem para WhatsApp persuasivo e humano.
            Idioma: Português do Brasil (Natural, Brasileiro).
            Nome do Cliente: ${request.clientName}. 
            Objetivo: ${request.objective}.
            Tom de Voz: ${request.tone}.
            Contexto Extra: ${request.context || 'Nenhum'}.
            
            Use quebras de linha e emojis adequados.` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateActionIdeas = async (input: ActionInput, lang: string = 'pt'): Promise<ActionIdea[]> => {
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Sugira 3 ideias de campanhas ou eventos para um studio de Pilates.
            Idioma: Português do Brasil.
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
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um plano de ação detalhado em formato HTML.
            Idioma: Português do Brasil.
            Ideia Escolhida: ${idea.title}. 
            Contexto do Studio: ${JSON.stringify(input)}.
            
            Inclua: Passo a passo, Cronograma sugerido, Materiais necessários e Dicas de execução.` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const fetchTriageQuestion = async (initialQuery: string, history: ChatMessage[], studentName?: string, lang: string = 'pt'): Promise<{status: TriageStatus, question?: string}> => {
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Atue como um Mentor Clínico Sênior de Pilates.
            Idioma: Português do Brasil.
            Aluno: ${studentName}. Queixa: ${initialQuery}. 
            Histórico da Conversa: ${JSON.stringify(history)}. 
            
            Objetivo: Fazer perguntas para entender a dor e limitação para montar uma aula segura.
            Faça UMA pergunta por vez. Seja empático e técnico.
            Se já tiver informações suficientes (dor, limitação, objetivo), retorne status FINISH. Senão, CONTINUE.`, 
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
    try { 
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Gere um guia clínico de Pilates para: ${query}.
            Idioma: Português do Brasil.
            Equipamentos Disponíveis: ${equipment.join(', ')}. 
            Histórico da Anamnese: ${JSON.stringify(history)}
            
            Forneça objetivos, exercícios indicados e contraindicados.`,
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
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um plano de aula de Pilates completo e seguro.
            Idioma: Português do Brasil.
            Caso/Queixa: ${query}. 
            Equipamentos: ${equipment.join(', ')}. 
            Observações do Aluno: ${observations}. 
            Foco da Sessão: ${focus || 'Geral'}.
            
            Retorne uma sequência de exercícios lógica (Aquecimento -> Principal -> Volta à calma).`, 
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
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Gere um relatório de evolução clínica em formato HTML.
            Idioma: Português do Brasil.
            Contexto: ${context}. 
            Dados das Evoluções: ${JSON.stringify(evolutions)}.
            
            Analise o progresso de dor, força e mobilidade ao longo do tempo.` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateEvaluationAnalysis = async (evaluations: any[], context: string, lang: string = 'pt'): Promise<string> => {
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Analise as avaliações de aula e gere um relatório de qualidade em HTML.
            Idioma: Português do Brasil.
            Contexto: ${context}. 
            Dados das Avaliações: ${JSON.stringify(evaluations)}.
            
            Identifique pontos fortes dos instrutores e áreas de melhoria.` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateSuggestionTrends = async (suggestions: any[], lang: string = 'pt'): Promise<string> => {
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Analise as sugestões dos alunos e identifique tendências. Gere relatório em HTML.
            Idioma: Português do Brasil.
            Sugestões: ${JSON.stringify(suggestions)}.
            
            Agrupe por temas e sugira ações.` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateActionPlanFromSuggestions = async (suggestions: any[], observations: string, lang: string = 'pt'): Promise<string> => {
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Crie um plano de ação prático para resolver as sugestões selecionadas. Formato HTML.
            Idioma: Português do Brasil.
            Obs do Dono: ${observations}. 
            Sugestões Selecionadas: ${JSON.stringify(suggestions)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateMissionOptions = async (studioName: string, lang: string = 'pt'): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie 5 opções de Missão para um studio de Pilates chamado "${studioName}".
      Idioma: Português do Brasil.
      Retorne array JSON de strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateVisionOptions = async (studioName: string, year: string, lang: string = 'pt'): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie 5 opções de Visão de futuro para "${studioName}" para o ano ${year}. Idioma: Português do Brasil. Retorne JSON array.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateSwotSuggestions = async (category: string, lang: string = 'pt'): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Sugira 5 itens de análise SWOT para a categoria "${category}" de um Studio de Pilates. Idioma: Português do Brasil. Retorne JSON array.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateObjectivesSmart = async (swot: any, lang: string = 'pt'): Promise<any[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Com base nesta análise SWOT: ${JSON.stringify(swot)}, crie 3 objetivos SMART com OKRs. Idioma: Português do Brasil. Retorne JSON.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { title: { type: Type.STRING }, keyResults: { type: Type.ARRAY, items: { type: Type.STRING } } }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateActionsSmart = async (objectives: any[], lang: string = 'pt'): Promise<any[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um plano de ação trimestral baseado nestes objetivos: ${JSON.stringify(objectives)}. Idioma: Português do Brasil. Retorne JSON.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { quarter: { type: Type.STRING }, actions: { type: Type.ARRAY, items: { type: Type.STRING } } }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateFullReport = async (planData: StrategicPlan, lang: string = 'pt'): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Gere um relatório completo de Planejamento Estratégico em HTML. Idioma: Português do Brasil. Dados: ${JSON.stringify(planData)}.`
        });
        return response.text || '';
    } catch (e) { return ''; }
};

export const generateTailoredMissions = async (studioName: string, specialties: string[], focus: string, tone: string, lang: string = 'pt'): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie 3 opções de Missão. Studio: ${studioName}. Especialidades: ${specialties.join(', ')}. Foco: ${focus}. Tom: ${tone}. Idioma: Português do Brasil. Retorne JSON array.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const fetchTreatmentPlan = async (query: string, equipment: string[], history?: any[], observations?: string, lang: string = 'pt'): Promise<TreatmentPlanResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um plano de tratamento de Pilates de 4 sessões progressivas.
            Idioma: Português do Brasil.
            Caso: ${query}. Equipamentos: ${equipment.join(', ')}. Obs: ${observations || ''}.
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
                                properties: { sessionNumber: { type: Type.INTEGER }, goal: { type: Type.STRING }, focus: { type: Type.STRING }, apparatusFocus: { type: Type.STRING } }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return null; }
};

export const regenerateSingleExercise = async (query: string, currentExercise: LessonExercise, equipment: string[], lang: string = 'pt'): Promise<LessonExercise> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Sugira um exercício alternativo de Pilates para substituir: "${currentExercise.name}". 
            Idioma: Português do Brasil.
            Caso: ${query}. Equipamentos Disponíveis: ${equipment.join(', ')}.
            Retorne JSON.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { name: { type: Type.STRING }, reps: { type: Type.STRING }, apparatus: { type: Type.STRING }, instructions: { type: Type.STRING }, focus: { type: Type.STRING }, safetyNote: { type: Type.STRING } }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return currentExercise; }
};

export const generateHealthyRecipe = async (goal: string, restrictions: string, lang: string = 'pt'): Promise<RecipeResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie uma receita saudável.
            Idioma: Português do Brasil.
            Objetivo: ${goal}. Restrições: ${restrictions}.
            Retorne JSON.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }, instructions: { type: Type.ARRAY, items: { type: Type.STRING } }, benefits: { type: Type.STRING }, calories: { type: Type.STRING } }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return null; }
};

export const generateRecipeFromIngredients = async (ingredients: string[], extraInfo: string, lang: string = 'pt'): Promise<RecipeResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie uma receita saudável usando estes ingredientes: ${ingredients.join(', ')}.
            Idioma: Português do Brasil.
            Info Extra: ${extraInfo}.
            Retorne JSON.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }, instructions: { type: Type.ARRAY, items: { type: Type.STRING } }, benefits: { type: Type.STRING }, calories: { type: Type.STRING } }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return null; }
};

export const generateHomeWorkout = async (studentName: string, observations: string, equipment: string, duration: string, lang: string = 'pt'): Promise<WorkoutResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie um treino de Pilates em casa para ${studentName}.
            Idioma: Português do Brasil.
            Obs: ${observations}. Equipamento: ${equipment}. Duração: ${duration}.
            Retorne JSON.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, duration: { type: Type.STRING }, focus: { type: Type.STRING }, exercises: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, reps: { type: Type.STRING }, instructions: { type: Type.STRING }, safetyNote: { type: Type.STRING } } } } }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return null; }
};

export const generateNewsletter = async (senderName: string, audience: string, topic: string, style: string, lang: string = 'pt'): Promise<{title: string, content: string} | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crie uma newsletter para um Studio de Pilates.
            Idioma: Português do Brasil.
            Remetente: ${senderName}. Público: ${audience}. Tópico: ${topic}. Estilo: ${style}.
            Retorne JSON com título e conteúdo (HTML simples).`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } } }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return null; }
};
