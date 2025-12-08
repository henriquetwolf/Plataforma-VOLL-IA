
// ... existing imports ...
import { GoogleGenAI, Type } from "@google/genai";
import { 
  MarketingFormData, GeneratedContent, CategorizedTopics, ContentRequest, 
  StudioPersona, WhatsAppScriptRequest, ActionInput, ActionIdea, 
  StrategicPlan, TriageStatus, PathologyResponse, LessonPlanResponse, 
  TreatmentPlanResponse, RecipeResponse, WorkoutResponse, ChatMessage,
  LessonExercise
} from "../types";

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
    <strong>Error:</strong> ${err.message || "Unknown error."}
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
  const languageName = getLanguageName(lang);
  const prompt = `
  Act as a marketing expert for Pilates Studios.
  Suggest 5 creative and specific topics for Instagram posts.
  Goal: ${goal}
  Audience: ${audience}
  
  IMPORTANT: Response strictly in ${languageName}.
  Return ONLY a JSON array of strings with the topic titles.
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
  Act as a Digital Marketing Expert for Pilates Studios.
  Generate content for Instagram based on this data.
  
  OUTPUT LANGUAGE: ${languageName} (The final content must be in this language).
  Note: 'visualPrompt' field must always be in English.
  
  Mode: ${formData.mode}
  Goal: ${formData.customGoal || formData.goal}
  Audience: ${formData.customAudience || formData.audience}
  Topic: ${formData.topic}
  Format: ${formData.format}
  Style: ${formData.style}
  `;

  if (isPlan) {
    prompt += `
    Create a 4-week editorial plan.
    Start Date: ${formData.startDate || 'Today'}
    Define a macro theme for each week.
    Frequency: ${formData.format}
    
    IMPORTANT: In 'day' field, provide Day of Week AND Date (DD/MM).
    Distribute formats (Reels, Carousel, Static) strategically.
    Set 'isPlan' to true.
    `;
  } else if (isStory) {
    prompt += `
    Create a strategic Story sequence (3 to 6 frames).
    Focus on retention and interaction.
    Set 'isStory' to true.
    `;
  } else {
    prompt += `
    Create a complete single post.
    Generate 'captionShort' and 'captionLong'.
    If format is Reels/Video, provide scripts in 'reelsOptions' and set 'isReels' true.
    If Static/Carousel, focus on 'visualContent'.
    If Carousel, describe image as a connected panoramic sequence.
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
  Act as a Pilates Marketing Expert.
  Create content for Instagram.
  
  OUTPUT LANGUAGE: ${languageName}
  
  Format: ${request.format}
  Goal: ${request.objective}
  Theme: ${request.theme}
  Audience: ${request.audience}
  Tone: ${request.tone}
  
  ${request.modificationPrompt ? `Refinement: ${request.modificationPrompt}` : ''}

  Instructions:
  1. Use emojis.
  2. If Video/Reels, include script and audio suggestion.
  3. If Static, include caption and image description.
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
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Act as a senior financial consultant for fitness studios.
            Generate a detailed financial analysis in HTML format (use <h2>, <p>, <ul>, <li>, <strong>).
            
            OUTPUT LANGUAGE: ${languageName}
            
            Studio Data: ${JSON.stringify({inputs, model, results, targetRev, potentialRev})}
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
            contents: `Create a persuasive and human WhatsApp script.
            Language: ${languageName}.
            Client Name: ${request.clientName}. 
            Goal: ${request.objective}.
            Tone: ${request.tone}.
            Context: ${request.context || 'None'}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateActionIdeas = async (input: ActionInput, lang: string = 'pt'): Promise<ActionIdea[]> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Suggest 3 campaign/event ideas for a Pilates studio.
            Language: ${languageName}.
            Theme: ${input.theme}. 
            Goal: ${input.objective}.`, 
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
            contents: `Create a detailed action plan in HTML format.
            Language: ${languageName}.
            Idea: ${idea.title}. 
            Context: ${JSON.stringify(input)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const fetchTriageQuestion = async (initialQuery: string, history: ChatMessage[], studentName?: string, lang: string = 'pt'): Promise<{status: TriageStatus, question?: string}> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Act as a Senior Pilates Clinical Mentor.
            Language: ${languageName}.
            Student: ${studentName}. Complaint: ${initialQuery}. 
            Conversation History: ${JSON.stringify(history)}. 
            
            Goal: Ask questions to understand pain and limitation to build a class.
            Ask ONE question at a time.
            If sufficient info (pain, limitation, goal), return status FINISH. Else CONTINUE.`, 
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
            contents: `Generate a clinical Pilates guide for: ${query}.
            Language: ${languageName}.
            Available Equipment: ${equipment.join(', ')}. 
            Anamnesis History: ${JSON.stringify(history)}`,
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
            contents: `Create a safe and complete Pilates lesson plan.
            Language: ${languageName}.
            Case: ${query}. 
            Equipment: ${equipment.join(', ')}. 
            Obs: ${observations}. 
            Session Focus: ${focus || 'General'}.`, 
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
            contents: `Generate a clinical evolution report in HTML.
            Language: ${languageName}.
            Context: ${context}. 
            Data: ${JSON.stringify(evolutions)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateEvaluationAnalysis = async (evaluations: any[], context: string, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Analyze these class ratings and generate a quality report in HTML.
            Language: ${languageName}.
            Context: ${context}. 
            Data: ${JSON.stringify(evaluations)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateSuggestionTrends = async (suggestions: any[], lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Analyze student suggestions and identify trends. Generate HTML report.
            Language: ${languageName}.
            Data: ${JSON.stringify(suggestions)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

export const generateActionPlanFromSuggestions = async (suggestions: any[], observations: string, lang: string = 'pt'): Promise<string> => {
    const languageName = getLanguageName(lang);
    try { 
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: `Create an action plan to address these suggestions. HTML format.
            Language: ${languageName}.
            Owner Obs: ${observations}. 
            Selected Suggestions: ${JSON.stringify(suggestions)}` 
        }); 
        return response.text || ''; 
    } catch (e) { return ''; }
};

// ... strategic functions (mission, vision) can also be updated similarly ...
export const generateMissionOptions = async (studioName: string, lang: string = 'pt'): Promise<string[]> => {
  const languageName = getLanguageName(lang);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create 5 Mission Statement options for a Pilates studio named "${studioName}".
      Language: ${languageName}.
      Return JSON string array.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(cleanJSON(response.text || '[]'));
  } catch (e) { return []; }
};

// Export all other functions with lang parameter support where text generation is involved
export const generateVisionOptions = async (studioName: string, year: string, lang: string = 'pt'): Promise<string[]> => {
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create 5 Vision options for "${studioName}" for year ${year}. Language: ${languageName}. Return JSON array.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateSwotSuggestions = async (category: string, lang: string = 'pt'): Promise<string[]> => {
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest 5 SWOT items for "${category}" for a Pilates Studio. Language: ${languageName}. Return JSON array.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const generateObjectivesSmart = async (swot: any, lang: string = 'pt'): Promise<any[]> => {
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on this SWOT: ${JSON.stringify(swot)}, create 3 SMART objectives with OKRs. Language: ${languageName}. Return JSON.`,
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
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a quarterly action plan based on these objectives: ${JSON.stringify(objectives)}. Language: ${languageName}. Return JSON.`,
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
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a full strategic report in HTML. Language: ${languageName}. Data: ${JSON.stringify(planData)}.`
        });
        return response.text || '';
    } catch (e) { return ''; }
};

export const generateTailoredMissions = async (studioName: string, specialties: string[], focus: string, tone: string, lang: string = 'pt'): Promise<string[]> => {
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create 3 Mission options. Studio: ${studioName}. Specialties: ${specialties.join(', ')}. Focus: ${focus}. Tone: ${tone}. Language: ${languageName}. Return JSON array.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(cleanJSON(response.text || '[]'));
    } catch (e) { return []; }
};

export const fetchTreatmentPlan = async (query: string, equipment: string[], history?: any[], observations?: string, lang: string = 'pt'): Promise<TreatmentPlanResponse | null> => {
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a 4-session Pilates treatment plan. Case: ${query}. Equipment: ${equipment.join(', ')}. Obs: ${observations || ''}. Language: ${languageName}. Return JSON.`,
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
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest an alternative Pilates exercise to replace: "${currentExercise.name}". Case: ${query}. Equipment: ${equipment.join(', ')}. Language: ${languageName}. Return JSON.`,
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
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a healthy recipe. Goal: ${goal}. Restrictions: ${restrictions}. Language: ${languageName}. Return JSON.`,
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
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a healthy recipe using: ${ingredients.join(', ')}. Extra info: ${extraInfo}. Language: ${languageName}. Return JSON.`,
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
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a home Pilates workout for ${studentName}. Obs: ${observations}. Equipment: ${equipment}. Duration: ${duration}. Language: ${languageName}. Return JSON.`,
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
    const languageName = getLanguageName(lang);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a newsletter for a Pilates studio. Sender: ${senderName}. Audience: ${audience}. Topic: ${topic}. Style: ${style}. Language: ${languageName}. Return JSON with title and content (simple HTML).`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } } }
            }
        });
        return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (e) { return null; }
};
