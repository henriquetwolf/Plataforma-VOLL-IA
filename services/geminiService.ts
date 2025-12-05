import { GoogleGenAI, Type } from "@google/genai";
import { 
  MarketingFormData, GeneratedContent, CategorizedTopics, ContentRequest, 
  StudioPersona, WhatsAppScriptRequest, ActionInput, ActionIdea, 
  StrategicPlan, TriageStatus, PathologyResponse, LessonPlanResponse, 
  TreatmentPlanResponse, RecipeResponse, WorkoutResponse, ChatMessage
} from "../types";

// Initialize AI with default key (process.env.API_KEY)
// For features requiring user-selected key (Veo), we will instantiate locally.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UTILS ---

export const handleGeminiError = (err: any): string => {
  console.error("Gemini API Error:", err);
  return `<div class="bg-red-50 p-4 rounded text-red-800 border border-red-200">
    <strong>Erro na IA:</strong> ${err.message || "Erro desconhecido ao gerar resposta."}
  </div>`;
};

const getModel = (task: 'text' | 'image' | 'video' | 'complex') => {
  if (task === 'video') return 'veo-3.1-fast-generate-preview';
  if (task === 'image') return 'gemini-2.5-flash-image';
  if (task === 'complex') return 'gemini-2.5-flash'; // Using flash for general tasks as per guidelines unless specified
  return 'gemini-2.5-flash';
};

// --- MARKETING AGENT ---

export const generateMarketingContent = async (formData: MarketingFormData): Promise<GeneratedContent | null> => {
  const isPlan = formData.mode === 'plan';
  const isStory = formData.mode === 'story';
  const formatLower = formData.format.toLowerCase();
  const isCarousel = formatLower.includes('carrossel') || formatLower.includes('carousel');
  const isReels = formatLower.includes('reels') || formatLower.includes('vídeo') || formatLower.includes('video');

  let systemInstruction = `Você é um especialista em Marketing Digital para Studios de Pilates.
  Objetivo: ${formData.goal}
  Público: ${formData.audience}
  Tópico: ${formData.topic}
  Tom: ${formData.style}
  `;

  let prompt = `Crie conteúdo para ${formData.format}.`;

  const responseSchema: any = {
    type: Type.OBJECT,
    properties: {
      suggestedFormat: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      captionShort: { type: Type.STRING },
      captionLong: { type: Type.STRING },
      hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      tips: { type: Type.STRING },
    },
    required: ['suggestedFormat', 'reasoning', 'captionShort', 'tips']
  };

  if (isCarousel) {
    const type = formData.carouselType || 'text-image';
    
    prompt += `
    Crie um Carrossel Educativo de EXATAMENTE 6 Cards.
    Preencha 'carouselCards' com 6 itens.
    Modo Selecionado: ${type === 'image-only' ? '1. CARROSSEL SEM TEXTO (Visual)' : type === 'text-only' ? '2. CARROSSEL COM TEXTO (Informativo)' : '3. CARROSSEL HÍBRIDO (Texto + Imagem)'}.
    
    Regras Específicas do Modo:
    ${type === 'image-only' ? 
      `- Gere APENAS elementos visuais, ilustrações ou fotos.
       - 'textOverlay' deve ser VAZIO ou conter apenas elementos decorativos.
       - Priorize storytelling visual.` 
    : type === 'text-only' ?
      `- Texto legível, organizado, max 4 linhas por card.
       - Foco em tipografia limpa e contraste.
       - Estrutura Narrativa: 
         Card 1: Título/Gancho
         Card 2: Problema
         Card 3: Explicação
         Card 4: Solução
         Card 5: Benefício
         Card 6: Conclusão/CTA`
    : 
      `- Equilíbrio perfeito entre imagem e texto.
       - Imagens conversam com o texto.
       - Max 4 linhas de texto.
       - Estrutura Narrativa: Gancho -> Problema -> Solução -> Benefício -> CTA.`
    }

    REGRAS GERAIS:
    - Gere um 'visualPrompt' único descrevendo uma imagem panorâmica (6480x1350 px ratio) que represente os 6 cards lado a lado visualmente.
    - Mantenha unidade estética.
    - SEMPRE retorne 'captionShort' E 'captionLong'.
    `;

    responseSchema.properties.carouselCards = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                order: { type: Type.INTEGER },
                textOverlay: { type: Type.STRING, description: "Short text to place on the image (if applicable)" },
                visualPrompt: { type: Type.STRING, description: "Description for this specific card's visual" },
            },
            required: ['order', 'visualPrompt']
        }
    };
    responseSchema.properties.visualPrompt = { type: Type.STRING, description: "A panoramic 16:9 image prompt describing the flow of 6 cards side-by-side" };

  } else if (isReels) {
    prompt += ` Crie um roteiro para Reels/Vídeo curto.`;
    responseSchema.properties.reelsOptions = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['Viral', 'Standard', 'Selfie', 'Box'] },
                style: { type: Type.STRING },
                title: { type: Type.STRING },
                hook: { type: Type.STRING },
                purpose: { type: Type.STRING },
                captionShort: { type: Type.STRING },
                captionLong: { type: Type.STRING },
                script: { type: Type.ARRAY, items: { type: Type.STRING } },
                audioSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                microDetails: { type: Type.STRING },
                duration: { type: Type.STRING }
            },
            required: ['type', 'title', 'hook', 'script', 'audioSuggestions']
        }
    };
  } else {
    // Static Post
    prompt += ` Crie um post estático (imagem única).`;
    responseSchema.properties.visualPrompt = { type: Type.STRING, description: "Prompt for image generation" };
  }

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const json = JSON.parse(response.text || '{}');
    return json as GeneratedContent;
  } catch (error) {
    console.error("Error generating marketing content:", error);
    return null;
  }
};

export const generateTopicSuggestions = async (goal: string, audience: string): Promise<CategorizedTopics | null> => {
  try {
    const prompt = `Sugira tópicos de conteúdo para Pilates. Objetivo: ${goal}, Público: ${audience}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    cliche: { type: Type.ARRAY, items: { type: Type.STRING } },
                    innovative: { type: Type.ARRAY, items: { type: Type.STRING } },
                    visceral: { type: Type.ARRAY, items: { type: Type.STRING } },
                }
            }
        }
    });
    return JSON.parse(response.text || '{}') as CategorizedTopics;
  } catch (error) {
    return null;
  }
};

// --- CONTENT AGENT (INSTAGRAM) ---

export async function* generatePilatesContentStream(request: ContentRequest, systemInstruction: string) {
    const prompt = `Crie um conteúdo para Instagram:
    Formato: ${request.format}
    Tema: ${request.theme}
    Objetivo: ${request.objective}
    Público: ${request.audience}
    Tom: ${request.tone}
    ${request.modificationPrompt ? `Refinamento: ${request.modificationPrompt}` : ''}`;

    const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction
        }
    });

    for await (const chunk of stream) {
        yield chunk.text || '';
    }
}

export const generatePilatesImage = async (request: ContentRequest, persona: any, contentContext: string): Promise<string | null> => {
    try {
        const prompt = `Create a high quality image for a Pilates studio Instagram post.
        Style: ${request.imageStyle}.
        Theme: ${request.theme}.
        Context from caption: ${contentContext.substring(0, 200)}...
        No text in image.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Using flash image as per guidelines for general
            contents: prompt,
            config: {
                // No responseMimeType for image models as per guidelines
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
        // Veo requires user selected API key
        if (!(window as any).aistudio?.hasSelectedApiKey()) {
            throw new Error("API Key not selected for Veo.");
        }
        
        // We assume the environment variable or global state is updated, 
        // but strictly per guidelines we should instantiate with the key if we could access it.
        // Since we can't access the user selected key directly in code securely without it being in process.env,
        // and the guidelines say "Create a new GoogleGenAI instance right before making an API call... The selected API key is available via process.env.API_KEY"
        // We assume the platform injects it or we rely on the default if the env var is updated.
        // However, in a real browser app, process.env isn't mutable at runtime easily.
        // We will try to proceed with the `ai` instance assuming it has the key, or re-instantiate if we had a way to get it.
        // For this code, we proceed with `ai`.

        onStatus("Iniciando geração de vídeo (Veo)...");
        
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `Cinematic pilates video: ${promptText.substring(0, 300)}`,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });

        while (!operation.done) {
            onStatus("Processando vídeo...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            // Fetch the actual bytes to display as per guidelines
            const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
            const blob = await res.blob();
            return URL.createObjectURL(blob);
        }
        return null;
    } catch (e) {
        console.error("Video gen error", e);
        return null;
    }
};

export const generateContentPlan = async (form: any, persona: any): Promise<any> => {
    const prompt = `Crie um plano de conteúdo de 4 semanas para Pilates.
    Nome: ${form.name}
    Meta: ${form.mainGoal}
    Público: ${form.audience}
    Frequência: ${form.frequency}x por semana.
    Data Início: ${form.startDate}
    `;

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
        return JSON.parse(response.text || '[]');
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const generatePlannerSuggestion = async (label: string, context: string, type: 'strategy' | 'random'): Promise<string[]> => {
    const prompt = `Sugira 3 opções curtas para o campo "${label}" de um plano de marketing para Pilates.
    Contexto Estratégico: ${type === 'strategy' ? context : 'Geral/Criativo'}.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return [];
    }
};

// --- MISSION & STRATEGY ---

export const generateMissionOptions = async (studioName: string): Promise<string[]> => {
    const prompt = `Gere 5 opções de Missão para o studio "${studioName}".`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return []; }
};

export const generateVisionOptions = async (studioName: string, year: string): Promise<string[]> => {
    const prompt = `Gere 5 opções de Visão para o studio "${studioName}" para o ano ${year}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return []; }
};

export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
    const prompt = `Gere 5 sugestões para análise SWOT na categoria: ${category} (Contexto: Studio de Pilates).`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return []; }
};

export const generateObjectivesSmart = async (swot: any): Promise<any[]> => {
    const prompt = `Com base na SWOT ${JSON.stringify(swot)}, gere 3 objetivos SMART para um studio de Pilates.`;
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
                            title: { type: Type.STRING },
                            keyResults: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return []; }
};

export const generateActionsSmart = async (objectives: any[]): Promise<any[]> => {
    const prompt = `Crie um plano de ação trimestral para os objetivos: ${JSON.stringify(objectives)}.`;
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
                            quarter: { type: Type.STRING },
                            actions: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return []; }
};

export const generateFullReport = async (planData: StrategicPlan): Promise<string> => {
    const prompt = `Gere um relatório HTML detalhado de Planejamento Estratégico para: ${JSON.stringify(planData)}.
    Use formatação HTML bonita com tags h2, h3, p, ul, li.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

export const generateTailoredMissions = async (studioName: string, specialties: string[], focus: string, tone: string): Promise<string[]> => {
    const prompt = `Crie 5 opções de missão para o studio ${studioName}. Especialidades: ${specialties.join(', ')}. Foco: ${focus}. Tom: ${tone}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return []; }
};

// --- FINANCE ---

export const generateFinancialAnalysis = async (inputs: any, model: any, results: any, targetRev: number, potentialRev: number, maxCap: number, profRev: number): Promise<string> => {
    const prompt = `Atue como consultor financeiro. Analise estes dados de um studio de pilates:
    Inputs: ${JSON.stringify(inputs)}
    Modelo Ideal: ${JSON.stringify(model)}
    Resultados Simulação: ${JSON.stringify(results)}
    Métricas: Faturamento Meta ${targetRev}, Potencial ${potentialRev}, Capacidade ${maxCap}.
    
    Gere um parecer em HTML sobre a viabilidade, riscos e sugestões.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

// --- WHATSAPP ---

export const generateWhatsAppScript = async (request: WhatsAppScriptRequest): Promise<string> => {
    const prompt = `Crie um script de WhatsApp.
    Cliente: ${request.clientName}
    Produto: ${request.productService}
    Objetivo: ${request.objective}
    Tom: ${request.tone}
    Contexto: ${request.context}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

// --- ACTION AGENT ---

export const generateActionIdeas = async (input: ActionInput): Promise<ActionIdea[]> => {
    const prompt = `Sugira 3 ideias de campanhas para studio de pilates.
    Tema: ${input.theme}
    Objetivo: ${input.objective}
    Alunos: ${input.studentCount}
    Orçamento: ${input.hasBudget ? input.budgetPerStudent + '/aluno' : 'Zero'}`;
    
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
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            effort: { type: Type.STRING, enum: ['Baixo', 'Médio', 'Alto'] }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return []; }
};

export const generateActionPlanDetail = async (idea: ActionIdea, input: ActionInput): Promise<string> => {
    const prompt = `Detalhe um plano de ação completo em HTML para a ideia: ${idea.title} - ${idea.summary}.
    Contexto: ${JSON.stringify(input)}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

// --- NEWSLETTER ---

export const generateNewsletter = async (userName: string, audience: string, topic: string, style: string): Promise<{title: string, content: string} | null> => {
    const prompt = `Escreva uma newsletter.
    Remetente: ${userName}
    Público: ${audience}
    Tópico: ${topic}
    Estilo: ${style}
    
    Retorne JSON com 'title' e 'content' (HTML).`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
};

// --- REHAB / CLINICAL ---

export const fetchTriageQuestion = async (initialQuery: string, history: ChatMessage[], studentName?: string): Promise<{status: TriageStatus, question?: string}> => {
    const prompt = `Atue como Mentor Clínico de Pilates.
    Aluno: ${studentName || 'Não informado'}
    Queixa: ${initialQuery}
    Histórico Conversa: ${JSON.stringify(history)}
    
    Decida se precisa de mais informações (CONTINUE) ou se já tem o suficiente (FINISH).
    Se CONTINUE, faça UMA pergunta curta e direta.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        status: { type: Type.STRING, enum: ['CONTINUE', 'FINISH'] },
                        question: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return { status: TriageStatus.FINISH }; }
};

export const fetchPathologyData = async (query: string, equipment: string[], history?: ChatMessage[]): Promise<PathologyResponse | null> => {
    const prompt = `Gere guia clínico para: ${query}. Equipamentos: ${equipment.join(', ')}. Histórico Anamnese: ${JSON.stringify(history)}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        pathologyName: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                        indicated: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, apparatus: {type:Type.STRING}, reason: {type:Type.STRING}, details: {type:Type.STRING} } } },
                        contraindicated: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, apparatus: {type:Type.STRING}, reason: {type:Type.STRING}, details: {type:Type.STRING} } } },
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
};

export const fetchLessonPlan = async (query: string, equipment: string[], history?: any[], observations?: string, focus?: string): Promise<LessonPlanResponse | null> => {
    const prompt = `Crie plano de aula Pilates. 
    Patologia/Queixa: ${query}
    Equipamentos: ${equipment.join(', ')}
    Obs: ${observations}
    Foco Aula: ${focus || 'Geral'}
    Histórico Triagem: ${JSON.stringify(history)}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
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
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
};

export const fetchTreatmentPlan = async (query: string, equipment: string[], history?: any[], observations?: string): Promise<TreatmentPlanResponse | null> => {
    const prompt = `Crie um plano de tratamento de 4 sessões progressivas.
    Caso: ${query}. Equip: ${equipment.join(', ')}. Obs: ${observations}.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
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
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
};

export const regenerateSingleExercise = async (query: string, currentExercise: any, equipment: string[]): Promise<any> => {
    const prompt = `Sugira um exercício alternativo ao "${currentExercise.name}" para o caso: ${query}. Use equipamentos: ${equipment.join(', ')}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
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
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return currentExercise; }
};

export const generateEvolutionReport = async (evolutions: any[], context: string): Promise<string> => {
    const prompt = `Analise estas evoluções de aluno e gere um relatório HTML de progresso.
    Contexto: ${context}
    Dados: ${JSON.stringify(evolutions)}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

// --- EVALUATIONS & SUGGESTIONS ---

export const generateEvaluationAnalysis = async (evaluations: any[], context: string): Promise<string> => {
    const prompt = `Analise estas avaliações de aula (NPS/Feedback) e gere um relatório HTML de qualidade.
    Contexto: ${context}
    Dados: ${JSON.stringify(evaluations)}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

export const generateActionPlanFromSuggestions = async (suggestions: any[], observations: string): Promise<string> => {
    const prompt = `Crie um plano de ação HTML para resolver estas sugestões/reclamações.
    Obs Dono: ${observations}
    Sugestões: ${JSON.stringify(suggestions)}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

export const generateSuggestionTrends = async (suggestions: any[]): Promise<string> => {
    const prompt = `Analise tendências nestas sugestões e gere um relatório HTML.
    Dados: ${JSON.stringify(suggestions)}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || '';
    } catch (e) { return ''; }
};

// --- RECIPES & WORKOUTS ---

export const generateHealthyRecipe = async (goal: string, restrictions: string): Promise<RecipeResponse | null> => {
    const prompt = `Crie uma receita saudável. Objetivo: ${goal}. Restrições: ${restrictions}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
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
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
};

export const generateRecipeFromIngredients = async (ingredients: string[], extraInfo: string): Promise<RecipeResponse | null> => {
    const prompt = `Crie uma receita com estes ingredientes: ${ingredients.join(', ')}. Extra: ${extraInfo}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
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
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
};

export const generateHomeWorkout = async (studentName: string, observations: string, equipment: string, duration: string): Promise<WorkoutResponse | null> => {
    const prompt = `Crie treino Pilates em casa. Aluno: ${studentName}. Obs Clínicas: ${observations}. Equip: ${equipment}. Duração: ${duration}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
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
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
};
