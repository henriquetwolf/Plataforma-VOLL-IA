
import { GoogleGenAI, Type } from "@google/genai";
import { 
  StrategicPlan, CalculatorInputs, FinancialModel, CompensationResult, 
  PathologyResponse, LessonPlanResponse, LessonExercise, ChatMessage, 
  TriageStep, TriageStatus, RecipeResponse, WorkoutResponse, Suggestion, 
  NewsletterAudience, ContentRequest, StudioPersona, ClassEvaluation,
  StudioInfo, StudentEvolution, TreatmentPlanResponse, WhatsAppScriptRequest,
  ActionInput, ActionIdea, MarketingFormData, GeneratedContent, CategorizedTopics
} from "../types";

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to handle JSON parsing from Gemini response
const cleanAndParseJSON = (text: string) => {
  if (!text) return null;
  try {
    // 1. Remove markdown code blocks
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. Find the outer-most brackets to isolate JSON
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    
    // Determine if it's an object or an array and slice accordingly
    if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
       cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
       cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }
    
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", text);
    return null;
  }
};

export const generateMarketingContent = async (formData: MarketingFormData): Promise<GeneratedContent | null> => {
  const isPlan = formData.mode === 'plan';
  const isStory = formData.mode === 'story';
  const isCarousel = formData.format === 'carousel' || formData.format === 'Carrossel';
  
  // Normalized format checking
  const formatLower = formData.format.toLowerCase();
  const isReels = formatLower.includes('reels') || formatLower.includes('vídeo') || formatLower.includes('video');

  let responseSchema: any;

  if (isPlan) {
    responseSchema = {
        type: Type.OBJECT,
        properties: {
            suggestedFormat: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            tips: { type: Type.STRING },
            isPlan: { type: Type.BOOLEAN },
            weeks: {
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
            }
        },
        required: ['suggestedFormat', 'reasoning', 'tips', 'isPlan', 'weeks']
    };
  } else {
    // Single / Story / Carousel Schema
    const baseProperties: any = {
        suggestedFormat: { type: Type.STRING },
        reasoning: { type: Type.STRING },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
        tips: { type: Type.STRING },
        captionShort: { type: Type.STRING, description: "A short, punchy caption (max 2 sentences)." },
        captionLong: { type: Type.STRING, description: "A detailed, storytelling caption with value." },
    };

    responseSchema = {
        type: Type.OBJECT,
        properties: baseProperties,
        required: ['suggestedFormat', 'reasoning', 'hashtags', 'tips', 'captionShort', 'captionLong']
    };

    if (isStory) {
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
        // Single Post / Reels / Carousel
        responseSchema.properties.isReels = { type: Type.BOOLEAN };
        
        responseSchema.properties.reelsOptions = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: 'Viral, Standard, Selfie, or Box' },
                    title: { type: Type.STRING },
                    hook: { type: Type.STRING, description: 'Must be impactful (3s)' },
                    purpose: { type: Type.STRING },
                    script: { type: Type.ARRAY, items: { type: Type.STRING } },
                    audioSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: '1 Viral/Trend, 1 Cinematic/Emotional' },
                    microDetails: { type: Type.STRING, description: 'Describe expressions, scenery, movements' },
                    duration: { type: Type.STRING }
                },
                required: ['type', 'title', 'hook', 'script', 'audioSuggestions', 'microDetails']
            }
        };

        if (isCarousel) {
            responseSchema.properties.carouselCards = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        order: { type: Type.INTEGER },
                        textOverlay: { type: Type.STRING, description: "Short text to place on the image" },
                        visualPrompt: { type: Type.STRING, description: "Description for this specific card, part of a panoramic sequence" },
                    },
                    required: ['order', 'textOverlay', 'visualPrompt']
                }
            };
            // For carousel, we also want a main prompt for the panoramic generation
            responseSchema.properties.visualPrompt = { type: Type.STRING, description: "A panoramic 16:9 image prompt describing the flow of 6 cards" };
        } else {
            responseSchema.properties.visualPrompt = { type: Type.STRING, description: "Photorealistic image description for the post" };
        }
    }
  }

  let prompt = `
  Atue como um Diretor de Marketing Sênior (Estratégico, Persuasivo e Humanizado).
  Idioma: Português Brasileiro Nativo (proibido termos robóticos ou traduções literais).
  Evite clichês vazios como "Venha conferir" ou "O melhor para você".
  
  Dados:
  Modo: ${formData.mode}
  Objetivo: ${formData.customGoal || formData.goal}
  Público: ${formData.customAudience || formData.audience}
  Tópico: ${formData.topic}
  Formato Preferido: ${formData.format}
  Estilo Visual: ${formData.style}
  `;

  if (isPlan) {
    const frequency = formData.frequency || 3;
    const preferredFormats = formData.selectedFormats && formData.selectedFormats.length > 0 
        ? formData.selectedFormats.join(', ') 
        : "Reels, Post Estático, Carrossel";

    prompt += `
    Crie um planejamento de 4 semanas.
    Frequência: ${frequency} posts por semana.
    Distribua os conteúdos entre os seguintes formatos permitidos: ${preferredFormats}.
    Para cada semana, defina um tema macro.
    Use os dias da semana (ex: Segunda-feira, Quarta-feira, etc) de acordo com a frequência.
    Preencha 'isPlan' como true.
    IMPORTANTE: Retorne APENAS o JSON conforme o schema.
    `;
  } else if (isStory) {
    prompt += `
    Crie uma sequência estratégica de Stories (3 a 6 frames).
    Preencha 'isStory' como true e detalhe a 'storySequence'.
    SEMPRE retorne 'captionShort' E 'captionLong'.
    `;
  } else if (isCarousel) {
    prompt += `
    Crie um Carrossel Educativo de EXATAMENTE 6 Cards.
    Preencha 'carouselCards' com 6 itens.
    Estrutura Obrigatória:
    1. Capa (Gancho Visual + Título Forte)
    2. Consciência (Aprofunda a dor ou quebra mito)
    3. Solução (Pilates como a chave)
    4. Mecanismo (Como funciona na prática)
    5. Prova (Resultado ou identificação)
    6. CTA (Chamada para ação clara)
    
    Gere também um 'visualPrompt' único para uma imagem panorâmica 16:9 que represente visualmente a sequência desses 6 cards lado a lado.
    SEMPRE retorne 'captionShort' E 'captionLong'.
    `;
  } else {
    prompt += `
    Crie um post único completo.
    SEMPRE retorne 'captionShort' E 'captionLong'.
    
    Se o formato for Reels/Vídeo (ou 'auto' decidir por vídeo):
    - Marque 'isReels' como true.
    - Gere EXATAMENTE 4 opções de roteiro em 'reelsOptions', uma para cada tipo abaixo:
      1. type: 'Viral' (Max 35s). Foco em trends, cortes rápidos, visual. Estrutura: Situação Rápida (POV) -> Ação Imediata -> Resultado Visual.
      2. type: 'Standard' (Max 60s). Foco em autoridade/técnica. Estrutura: Antes (Dor) -> Durante (Técnica) -> Depois (Transformação).
      3. type: 'Selfie' (Max 45s). Foco em intimidade/conexão. Estrutura: Pergunta desconfortável ou verdade dura -> Mini-história -> Conclusão.
      4. type: 'Box' (Max 45s). Foco em responder UMA pergunta profunda. Estrutura: Clareza técnica + Demonstração prática + Autoridade.
    - OBRIGATÓRIO: 'hook' inicial de 3s deve ser impactante ("fodástico").
    - 'audioSuggestions': Forneça sempre 2 opções (1 Viral/Trend e 1 Emocional/Cinematográfica).
    
    Se o formato for Post Estático (ou 'auto' decidir por estático):
    - Forneça 'visualPrompt' detalhado.
    - NÃO marque 'isReels'.
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
    
    // Attempt to parse strictly first
    let result = null;
    try {
        result = JSON.parse(response.text || '{}');
    } catch {
        result = cleanAndParseJSON(response.text || '{}');
    }
    
    return result;
  } catch (e) {
    console.error("Marketing Gen Error:", e);
    return null;
  }
};

export const generateTopicSuggestions = async (goal: string, audience: string): Promise<CategorizedTopics | null> => {
  const prompt = `
  Como um Diretor de Marketing Sênior para Studios de Pilates, sugira 6 temas para posts no Instagram.
  Objetivo: ${goal}
  Público: ${audience}
  
  Retorne um JSON com 3 categorias, contendo 2 temas cada:
  1. "cliche": Temas que todos buscam (ex: dor nas costas), mas com uma abordagem bem feita.
  2. "innovative": Temas fora da caixa, que surpreendem.
  3. "visceral": Temas profundos/emocionais que tocam na ferida ou desejo ardente.
  
  Schema: { "cliche": ["Tema 1", "Tema 2"], "innovative": ["Tema 3", "Tema 4"], "visceral": ["Tema 5", "Tema 6"] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
          responseMimeType: 'application/json',
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  cliche: { type: Type.ARRAY, items: { type: Type.STRING } },
                  innovative: { type: Type.ARRAY, items: { type: Type.STRING } },
                  visceral: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['cliche', 'innovative', 'visceral']
          }
      }
    });
    return cleanAndParseJSON(response.text || '{}');
  } catch (e) {
    console.error("Error generating topics:", e);
    return null;
  }
};

export const generateStudioDescription = async (name: string, owner: string, specialties: string[]): Promise<string> => {
  const prompt = `Escreva uma biografia curta e profissional (max 300 caracteres) para o perfil de um Studio de Pilates chamado "${name}", proprietário "${owner}", especialidades: ${specialties.join(', ')}. Tom acolhedor e profissional.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text || '';
};

export const generateMissionOptions = async (name: string): Promise<string[]> => {
  const prompt = `Gere 3 opções de Missão para um studio de pilates chamado "${name}". Retorne apenas as frases em formato JSON array de strings.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateVisionOptions = async (name: string, year: string): Promise<string[]> => {
  const prompt = `Gere 3 opções de Visão de futuro para o ano ${year} para um studio de pilates chamado "${name}". Retorne apenas as frases em formato JSON array de strings.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateSwotSuggestions = async (category: string): Promise<string[]> => {
  const prompt = `Liste 5 sugestões comuns de ${category} para um pequeno studio de pilates. Retorne apenas as frases curtas em JSON array de strings.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateObjectivesSmart = async (swot: any): Promise<{ title: string; keyResults: string[] }[]> => {
  const prompt = `Com base nesta análise SWOT: ${JSON.stringify(swot)}, crie 3 objetivos estratégicos SMART. Retorne JSON: [{ "title": "Objetivo", "keyResults": ["KR1", "KR2"] }]`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateActionsSmart = async (objectives: any[]): Promise<{ quarter: string; actions: string[] }[]> => {
  const prompt = `Para estes objetivos: ${JSON.stringify(objectives)}, crie um plano de ação trimestral (4 trimestres). Retorne JSON: [{ "quarter": "1º Trimestre", "actions": ["ação 1", "ação 2"] }]`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateFullReport = async (planData: StrategicPlan): Promise<string> => {
  const prompt = `
  Atue como um consultor sênior de negócios.
  Gere um relatório de Planejamento Estratégico em HTML profissional para o studio "${planData.studioName}".
  
  Dados: ${JSON.stringify(planData)}
  
  REGRAS RÍGIDAS DE FORMATAÇÃO HTML (PARA PDF):
  1. Use tags HTML semânticas e claras.
  2. Use <h2> para cada Título de Seção.
  3. Use <h3> para subtítulos.
  4. Para a "Análise SWOT", CRIE UMA TABELA HTML.
  5. Para o "Plano de Ação", CRIE UMA TABELA HTML.
  6. Para "Objetivos", use uma lista numerada (<ol>).
  7. Não use tags <html>, <head> ou <body>.
  8. NÃO USE blocos de código markdown.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return cleanHtmlOutput(response.text || '');
};

const cleanHtmlOutput = (text: string) => {
  if (!text) return '';
  return text.replace(/^```html/i, '').replace(/```$/g, '').replace(/```/g, '').trim();
};

export const generateTailoredMissions = async (studioName: string, specialties: string[], focus: string, tone: string): Promise<string[]> => {
    const prompt = `Crie 3 opções de Missão para o studio "${studioName}" (Especialidades: ${specialties.join(', ')}). Foco: "${focus}". Tom: "${tone}". Retorne JSON array de strings.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateFinancialAnalysis = async (
    inputs: CalculatorInputs,
    model: FinancialModel,
    results: CompensationResult[],
    targetRevenue: number,
    potentialRevenue: number,
    maxCapacity: number,
    professionalRevenue: number
): Promise<string> => {
    const prompt = `
    Atue como consultor financeiro especialista em studios de pilates.
    Analise os dados abaixo e forneça um parecer executivo em HTML profissional.
    
    DADOS:
    - Receita Alvo Studio: R$ ${targetRevenue}
    - Receita Gerada pelo Profissional: R$ ${professionalRevenue}
    - Cenários: ${JSON.stringify(results.map(r => ({ nome: r.scenarioName, custo: r.costToStudio, margem: r.contributionMargin, viavel: r.isViable })))}
    
    FORMATO HTML OBRIGATÓRIO:
    1. <h2>Parecer Executivo</h2>
    2. <h2>Análise Comparativa</h2> (Tabela)
    3. <h2>Pontos de Atenção</h2>
    4. <h2>Recomendações Finais</h2>
    NÃO USE blocos de código markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return cleanHtmlOutput(response.text || '');
};

export const fetchTriageQuestion = async (query: string, history: ChatMessage[], studentName?: string): Promise<TriageStep> => {
    const prompt = `
    Você é um fisioterapeuta mentor expert em Pilates.
    Aluno: ${studentName || 'Aluno'}. Queixa inicial: "${query}".
    Histórico da conversa: ${JSON.stringify(history)}.
    
    Se já tiver informações suficientes, retorne JSON: { "status": "FINISH" }.
    Caso contrário, faça APENAS UMA pergunta curta.
    Retorne JSON: { "status": "CONTINUE", "question": "sua pergunta aqui" }.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const fetchPathologyData = async (query: string, equipment: string[], history?: ChatMessage[]): Promise<PathologyResponse | null> => {
    const context = history ? `Contexto da triagem: ${history.map(h => h.role + ': ' + h.text).join('\n')}` : '';
    const prompt = `
    Atue como fisioterapeuta expert em Pilates.
    Patologia/Queixa: "${query}".
    Equipamentos disponíveis: ${equipment.join(', ')}.
    ${context}
    
    Gere um guia técnico em JSON:
    {
      "pathologyName": "Nome Técnico",
      "summary": "Resumo curto.",
      "objectives": ["Obj 1"],
      "indicated": [{ "name": "Exercicio", "apparatus": "Aparelho", "reason": "Motivo", "details": "Dica" }],
      "contraindicated": [{ "name": "Exercicio", "apparatus": "Aparelho", "reason": "Motivo", "details": "Risco" }]
    }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const fetchTreatmentPlan = async (query: string, equipment: string[], history?: ChatMessage[], obs?: string): Promise<TreatmentPlanResponse | null> => {
    const context = history ? `Baseado na triagem: ${history.map(h => h.role + ': ' + h.text).join('\n')}` : '';
    const observations = obs ? `Observações: ${obs}` : '';
    
    const prompt = `
    Crie um Planejamento de Tratamento de 4 sessões progressivas de Pilates.
    Foco: ${query}. Equipamentos: ${equipment.join(', ')}.
    ${context} ${observations}
    
    Retorne JSON estrito:
    {
      "pathologyName": "${query}",
      "overview": "Resumo da estratégia.",
      "sessions": [
        { "sessionNumber": 1, "goal": "Objetivo", "focus": "Foco", "apparatusFocus": "Aparelhos" },
        // ... até 4
      ]
    }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const fetchLessonPlan = async (query: string, equipment: string[], history?: ChatMessage[], obs?: string, sessionFocus?: string): Promise<LessonPlanResponse | null> => {
    const context = history ? `Baseado na triagem: ${history.map(h => h.role + ': ' + h.text).join('\n')}` : '';
    const observations = obs ? `Observações: ${obs}` : '';
    const focusContext = sessionFocus ? `Foco desta sessão: ${sessionFocus}` : '';
    
    const prompt = `
    Crie um plano de aula de Pilates (50 min).
    Foco: ${query}. ${focusContext}
    Equipamentos: ${equipment.join(', ')}.
    ${context} ${observations}
    
    Retorne JSON:
    {
      "pathologyName": "${query}",
      "goal": "Objetivo principal",
      "duration": "50 min",
      "exercises": [
        { "name": "Nome", "reps": "Reps", "apparatus": "Aparelho", "instructions": "Instrução", "focus": "Foco" }
      ]
    }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const regenerateSingleExercise = async (query: string, oldExercise: LessonExercise, equipment: string[]): Promise<LessonExercise> => {
    const prompt = `
    Substitua este exercício de Pilates: "${oldExercise.name}" (${oldExercise.apparatus}).
    Motivo: ${query}.
    Equipamentos: ${equipment.join(', ')}.
    
    Retorne JSON (apenas 1 objeto):
    { "name": "Novo Nome", "reps": "Reps", "apparatus": "Aparelho", "instructions": "Instrução", "focus": "Foco" }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const generateHealthyRecipe = async (goal: string, restrictions: string): Promise<RecipeResponse | null> => {
    const prompt = `
    Crie uma receita saudável. Objetivo: ${goal}. Restrições: ${restrictions}.
    Retorne JSON:
    { "title": "Nome", "ingredients": ["ing1"], "instructions": ["passo1"], "benefits": "texto", "calories": "texto" }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const generateRecipeFromIngredients = async (ingredients: string[], extraInfo: string): Promise<RecipeResponse | null> => {
    const prompt = `
    Crie uma receita saudável usando: ${ingredients.join(', ')}. Info: ${extraInfo}.
    Retorne JSON: { "title": "Nome", "ingredients": [], "instructions": [], "benefits": "", "calories": "" }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const generateHomeWorkout = async (name: string, observations: string, equipment: string, duration: string): Promise<WorkoutResponse | null> => {
    const prompt = `
    Crie um treino de Pilates em casa para ${name}.
    Duração: ${duration}. Equipamentos: ${equipment}. Obs: ${observations}.
    Retorne JSON: { "title": "Título", "duration": "${duration}", "focus": "Foco", "exercises": [{ "name": "Nome", "reps": "Reps", "instructions": "Como fazer", "safetyNote": "Atenção" }] }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const generateActionPlanFromSuggestions = async (suggestions: Suggestion[], context: string): Promise<string> => {
    const prompt = `
    Atue como Gestor de Studio. Analise sugestões: ${JSON.stringify(suggestions)}.
    Contexto: ${context}.
    Crie um Plano de Ação em HTML estruturado (<h2>, <ul>, <table>).
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return cleanHtmlOutput(response.text || '');
};

export const generateSuggestionTrends = async (suggestions: (Suggestion & { studioName?: string })[]): Promise<string> => {
    const prompt = `
    Analise sugestões: ${JSON.stringify(suggestions)}.
    Gere um relatório analítico em HTML.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return cleanHtmlOutput(response.text || '');
};

export const generateNewsletter = async (senderName: string, audience: NewsletterAudience, topic: string, style: string): Promise<{ title: string; content: string } | null> => {
    const prompt = `
    Escreva uma newsletter. Remetente: ${senderName}. Público: ${audience}. Tópico: ${topic}. Estilo: ${style}.
    Retorne JSON: { "title": "Título", "content": "HTML content" }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const generatePilatesContentStream = async function* (request: ContentRequest, systemInstruction: string) {
    const prompt = `
    Crie um texto para ${request.format} de Pilates.
    Tema: ${request.theme}. Objetivo: ${request.objective}. Público: ${request.audience}. Tom: ${request.tone}.
    ${request.modificationPrompt ? `Refinamento: ${request.modificationPrompt}` : ''}
    `;
    
    const streamResult = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
    });

    for await (const chunk of streamResult) {
        yield chunk.text || '';
    }
};

export const generatePilatesImage = async (request: ContentRequest, studioInfo: StudioInfo | null, contextText: string): Promise<string | null> => {
    const basePrompt = contextText ? contextText : `Image of Pilates: ${request.theme}. Style: ${request.imageStyle}`;
    const enhancedPrompt = `Photorealistic, 8k, cinematic lighting: ${basePrompt}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: enhancedPrompt }] },
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

export const generatePilatesVideo = async (script: string, onProgress: (msg: string) => void): Promise<string | null> => {
    try {
        onProgress("Iniciando geração de vídeo...");
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `Pilates video: ${script.substring(0, 200)}`,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
        });
        
        while (!operation.done) {
            onProgress("Processando vídeo...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
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

export const generateContentPlan = async (inputs: any, persona: StudioPersona | null) => {
    const prompt = `
    Crie um Plano de Conteúdo de 4 Semanas para Instagram de Pilates.
    Dados: ${JSON.stringify(inputs)}. Persona: ${JSON.stringify(persona)}.
    Retorne JSON: [ { "week": "Semana 1", "theme": "Tema", "ideas": [ { "day": "Segunda", "format": "Reels", "theme": "Titulo", "objective": "Obj" } ] } ]
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '[]');
};

export const generatePlannerSuggestion = async (field: string, contextStr: string, type: 'strategy' | 'random'): Promise<string[]> => {
  const prompt = `Sugira 3 opções de "${field}" para um plano de conteúdo de Pilates. Contexto: ${contextStr}. Retorne JSON array de strings.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateEvaluationAnalysis = async (evaluations: ClassEvaluation[], filterContext: string): Promise<string> => {
  const prompt = `
    Analise avaliações: ${JSON.stringify(evaluations)}. Contexto: ${filterContext}.
    Gere relatório HTML.
  `;
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return cleanHtmlOutput(res.text || '');
};

export const generateEvolutionReport = async (evolutions: StudentEvolution[], context: string): Promise<string> => {
  const prompt = `
    Analise evolução: ${JSON.stringify(evolutions)}. Contexto: ${context}.
    Gere relatório HTML.
  `;
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return cleanHtmlOutput(res.text || '');
};

export const generateWhatsAppScript = async (request: WhatsAppScriptRequest): Promise<string> => {
  const prompt = `Crie script WhatsApp. Obj: ${request.objective}. Cliente: ${request.clientName}. Retorne texto.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text?.trim() || '';
};

export const generateActionIdeas = async (input: ActionInput): Promise<ActionIdea[]> => {
  const prompt = `Gere 3 ideias de ação de marketing. Input: ${JSON.stringify(input)}. Retorne JSON: [{id, title, summary, effort}]`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return cleanAndParseJSON(response.text || '[]') || [];
};

export const generateActionPlanDetail = async (idea: ActionIdea, input: ActionInput): Promise<string> => {
  const prompt = `Crie plano de ação detalhado HTML. Ideia: ${idea.title}. Input: ${JSON.stringify(input)}.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return cleanHtmlOutput(response.text || '');
};

export const handleGeminiError = (error: any): string => {
  console.error("Gemini API Error:", error);
  if (error.message?.includes('API key')) return "Erro: Chave de API inválida.";
  return "Erro de comunicação com a IA.";
};
