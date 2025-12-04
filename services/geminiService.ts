
import { GoogleGenAI } from "@google/genai";
import { 
  StrategicPlan, CalculatorInputs, FinancialModel, CompensationResult, 
  PathologyResponse, LessonPlanResponse, LessonExercise, ChatMessage, 
  TriageStep, TriageStatus, RecipeResponse, WorkoutResponse, Suggestion, 
  NewsletterAudience, ContentRequest, StudioPersona, ClassEvaluation,
  StudioInfo, StudentEvolution, TreatmentPlanResponse
} from "../types";

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

// Helper to clean HTML output (remove markdown fences)
const cleanHtmlOutput = (text: string) => {
  if (!text) return '';
  // Remove ```html at start (case insensitive), ``` at end, and generic ``` fences
  return text
    .replace(/^```html/i, '')
    .replace(/```$/g, '')
    .replace(/```/g, '')
    .trim();
};

export const handleGeminiError = (error: any): string => {
  console.error("Gemini API Error:", error);
  if (error.message?.includes('API key')) {
    return "Erro de configuração: Chave de API inválida ou ausente.";
  }
  return "Ocorreu um erro ao comunicar com a IA. Tente novamente.";
};

// --- Studio Profile ---

export const generateStudioDescription = async (name: string, owner: string, specialties: string[]): Promise<string> => {
  const prompt = `Escreva uma biografia curta e profissional (max 300 caracteres) para o perfil de um Studio de Pilates chamado "${name}", proprietário "${owner}", especialidades: ${specialties.join(', ')}. Tom acolhedor e profissional.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text || '';
};

// --- Strategic Planning ---

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
  2. Use <h2> para cada Título de Seção (Visão, Missão, SWOT, Objetivos, Plano de Ação).
  3. Use <h3> para subtítulos dentro das seções.
  4. Para a "Análise SWOT", CRIE UMA TABELA HTML (<table>) com cabeçalho e bordas, dividindo claramente Forças, Fraquezas, Oportunidades e Ameaças.
  5. Para o "Plano de Ação", CRIE UMA TABELA HTML (<table>) com as colunas: "Período/Trimestre" e "Ações Principais" (use lista <ul> dentro da célula de ações).
  6. Para "Objetivos", use uma lista numerada (<ol>) onde cada item é o objetivo e dentro dele uma lista (<ul>) com os Resultados Chave.
  7. Separe bem os blocos para leitura agradável.
  8. Adicione uma seção final "Conclusão do Consultor" com uma análise breve e motivadora.
  9. Não use tags <html>, <head> ou <body>. Apenas o conteúdo div/table/h2 etc.
  10. NÃO USE blocos de código markdown (\`\`\`html). Retorne apenas o código HTML puro.
  
  O tom deve ser encorajador, profissional e estratégico.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return cleanHtmlOutput(response.text || '');
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

// --- Financial Agent ---

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
    - Receita Alvo Studio: R$ ${targetRevenue} (Potencial: R$ ${potentialRevenue})
    - Receita Gerada pelo Profissional: R$ ${professionalRevenue}
    - Cenários: ${JSON.stringify(results.map(r => ({ nome: r.scenarioName, custo: r.costToStudio, margem: r.contributionMargin, viavel: r.isViable })))}
    
    FORMATO HTML OBRIGATÓRIO:
    1. <h2>Parecer Executivo</h2>: Uma introdução direta.
    2. <h2>Análise Comparativa</h2>: Crie uma TABELA HTML (<table>) comparando os modelos (Colunas: Modelo, Custo Total, Margem Contrib., Veredito).
    3. <h2>Pontos de Atenção</h2>: Lista com ícones ou bullets (<ul>) destacando riscos e oportunidades.
    4. <h2>Recomendações Finais</h2>: Lista numerada (<ol>) com passos práticos.
    5. NÃO USE blocos de código markdown.
    Mantenha o tom profissional e direto. Use formatação de tabela para dados numéricos.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return cleanHtmlOutput(response.text || '');
};

// --- Rehab Agent / Guia Clínico ---

export const fetchTriageQuestion = async (query: string, history: ChatMessage[], studentName?: string): Promise<TriageStep> => {
    const prompt = `
    Você é um fisioterapeuta mentor expert em Pilates.
    Aluno: ${studentName || 'Aluno'}. Queixa inicial: "${query}".
    Histórico da conversa: ${JSON.stringify(history)}.
    
    Se já tiver informações suficientes (dor, limitações, histórico) para montar uma aula segura, retorne JSON: { "status": "FINISH" }.
    Caso contrário, faça APENAS UMA pergunta curta e direta para investigar melhor.
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
      "pathologyName": "Nome Técnico da Patologia",
      "summary": "Resumo curto sobre a condição e cuidados no Pilates.",
      "objectives": ["Objetivo 1", "Objetivo 2"],
      "indicated": [{ "name": "Nome Exercício", "apparatus": "Aparelho", "reason": "Por que é bom", "details": "Dica de execução" }],
      "contraindicated": [{ "name": "Nome Exercício", "apparatus": "Aparelho", "reason": "Por que evitar", "details": "Risco associado" }]
    }
    Liste apenas os principais contra-indicados. Para indicados, liste 3 exemplos.
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
    const observations = obs ? `Observações do aluno: ${obs}` : '';
    
    const prompt = `
    Crie um Planejamento de Tratamento de 4 sessões progressivas de Pilates.
    Foco Clínico: ${query}.
    Equipamentos disponíveis: ${equipment.join(', ')}.
    ${context}
    ${observations}
    
    Retorne JSON estrito:
    {
      "pathologyName": "${query}",
      "overview": "Resumo da estratégia de tratamento para as 4 sessões.",
      "sessions": [
        { "sessionNumber": 1, "goal": "Objetivo Fase 1", "focus": "Ex: Mobilidade e Alívio", "apparatusFocus": "Aparelhos sugeridos" },
        { "sessionNumber": 2, "goal": "Objetivo Fase 2", "focus": "Ex: Estabilidade", "apparatusFocus": "Aparelhos sugeridos" },
        { "sessionNumber": 3, "goal": "Objetivo Fase 3", "focus": "Ex: Fortalecimento", "apparatusFocus": "Aparelhos sugeridos" },
        { "sessionNumber": 4, "goal": "Objetivo Fase 4", "focus": "Ex: Integração/Funcional", "apparatusFocus": "Aparelhos sugeridos" }
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
    const observations = obs ? `Observações do aluno: ${obs}` : '';
    const focusContext = sessionFocus ? `Foco específico desta sessão: ${sessionFocus}` : '';
    
    const prompt = `
    Crie um plano de aula de Pilates (50 min) seguro e eficiente.
    Foco Geral: ${query}.
    ${focusContext}
    
    IMPORTANT RESTRAINTS:
    1. Equipamentos disponíveis no studio: ${equipment.join(', ')}.
    2. USE APENAS 1 ou 2 tipos de equipamentos principais nesta aula para evitar trocas excessivas (Ex: Apenas Mat + Reformer OU Cadillac + Chair).
    3. Gere no MÍNIMO 10 exercícios e no MÁXIMO 12.
    
    ${context}
    ${observations}
    
    Retorne JSON:
    {
      "pathologyName": "${query}",
      "goal": "Objetivo principal da aula",
      "duration": "50 min",
      "exercises": [
        { "name": "Nome", "reps": "Repetições/Tempo", "apparatus": "Aparelho usado", "instructions": "Instrução técnica resumida", "focus": "Mobilidade/Fortalecimento/etc" }
      ]
    }
    Ordene os exercícios logicamente (Aquecimento -> Principal -> Volta à calma).
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
    Motivo: Preciso de uma variação ou alternativa para o caso "${query}".
    
    IMPORTANTE: Mantenha o mesmo aparelho (${oldExercise.apparatus}) se possível, ou use um destes: ${equipment.join(', ')}.
    
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

// --- Student App ---

export const generateHealthyRecipe = async (goal: string, restrictions: string): Promise<RecipeResponse | null> => {
    const prompt = `
    Atue como Nutricionista Esportiva e Chef. Crie uma receita saudável e saborosa.
    Objetivo do aluno: ${goal}.
    Restrições/Preferências: ${restrictions}.
    
    Retorne APENAS um objeto JSON válido.
    Formato:
    {
      "title": "Nome Criativo",
      "ingredients": ["ingrediente 1", "ingrediente 2"],
      "instructions": ["passo 1", "passo 2"],
      "benefits": "texto curto",
      "calories": "texto curto"
    }
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
    Atue como Nutricionista Chef. Crie uma receita saudável usando PRINCIPALMENTE estes ingredientes: ${ingredients.join(', ')}.
    Info extra: ${extraInfo}.
    
    Retorne APENAS um objeto JSON válido.
    Formato:
    {
      "title": "Nome Criativo",
      "ingredients": ["ingrediente 1", "ingrediente 2"],
      "instructions": ["passo 1", "passo 2"],
      "benefits": "texto curto",
      "calories": "texto curto"
    }
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
    Duração: ${duration}. Equipamentos: ${equipment}.
    Observações clínicas: ${observations}.
    
    Retorne JSON:
    {
      "title": "Título do Treino",
      "duration": "${duration}",
      "focus": "Foco principal",
      "exercises": [
        { "name": "Nome", "reps": "Reps", "instructions": "Como fazer", "safetyNote": "Atenção especial se necessário" }
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

// --- Studio Suggestions ---

export const generateActionPlanFromSuggestions = async (suggestions: Suggestion[], context: string): Promise<string> => {
    const suggestionsText = suggestions.map(s => `- "${s.content}" (${s.studentName})`).join('\n');
    const prompt = `
    Atue como Gestor de Studio de Pilates.
    Analise estas sugestões dos alunos:
    ${suggestionsText}
    
    Contexto do Dono: ${context}
    
    Crie um Plano de Ação em HTML estruturado.
    
    FORMATO HTML OBRIGATÓRIO:
    - <h2> para Títulos de Seção.
    - <h3> para subtítulos.
    - Crie uma TABELA HTML (<table>) para listar as ações com colunas: "Sugestão Original", "Ação Proposta", "Prioridade", "Prazo Estimado".
    - Use lista numerada (<ol>) para passos de implementação.
    - Texto direto e focado em solução.
    - NÃO use blocos markdown (\`\`\`html).
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return cleanHtmlOutput(response.text || '');
};

export const generateSuggestionTrends = async (suggestions: (Suggestion & { studioName?: string })[]): Promise<string> => {
    const suggestionsText = suggestions.map(s => {
      const studioInfo = s.studioName ? `[Studio: ${s.studioName}]` : '';
      return `- "${s.content}" ${studioInfo}`;
    }).join('\n');

    const prompt = `
    Atue como um Consultor de Experiência do Cliente.
    Analise esta lista de sugestões:
    ${suggestionsText}
    
    Gere um relatório analítico em HTML.
    
    FORMATO HTML OBRIGATÓRIO:
    - <h2> para os títulos principais.
    - <h3> para categorias.
    - Use listas (<ul>) para insights detalhados.
    - Use <strong> para destacar pontos chave.
    - Tente agrupar os temas recorrentes em uma pequena tabela resumo (<table>).
    - Separe claramente "Pontos Positivos" de "Oportunidades de Melhoria".
    - NÃO use blocos markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return cleanHtmlOutput(response.text || '');
};

// --- Newsletter ---

export const generateNewsletter = async (senderName: string, audience: NewsletterAudience, topic: string, style: string): Promise<{ title: string; content: string } | null> => {
    const audienceText = audience === 'students' ? 'Alunos do Studio' : audience === 'instructors' ? 'Equipe de Instrutores' : 'Todos';
    
    const prompt = `
    Escreva uma newsletter/comunicado.
    Remetente: ${senderName}. Público: ${audienceText}. Tópico: ${topic}. Estilo: ${style}.
    
    Retorne JSON:
    {
      "title": "Título chamativo",
      "content": "Conteúdo em HTML formatado com <p>, <ul>, <li> e <strong>. Use <br> para quebras de linha. Não use Markdown."
    }
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

// --- Content Agent ---

export const generatePilatesContentStream = async function* (request: ContentRequest, systemInstruction: string) {
    const prompt = `
    Crie um texto para ${request.format} de Pilates.
    Tema: ${request.theme}. Objetivo: ${request.objective}. Público: ${request.audience}. Tom: ${request.tone}.
    ${request.modificationPrompt ? `Refinamento solicitado: ${request.modificationPrompt}` : ''}
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
    const prompt = `Image of Pilates: ${request.theme}. Style: ${request.imageStyle}. Context: ${contextText.substring(0, 100)}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
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

// Updated signature to support detailed planner inputs
export const generateContentPlan = async (
    inputs: {
        mainGoal: string;
        audience: string;
        message: string;
        differentiators: string;
        objections: string;
        tone: string;
        events: string;
        frequency: number;
        startDate: string;
    },
    persona: StudioPersona | null
) => {
    const prompt = `
    Crie um Plano de Conteúdo de 4 Semanas para Instagram de Pilates.
    
    ESTRATÉGIA:
    - Meta Principal: ${inputs.mainGoal}
    - Público Alvo: ${inputs.audience}
    - Mensagem Principal: ${inputs.message}
    - Diferenciais do Studio: ${inputs.differentiators}
    - Objeções a quebrar: ${inputs.objections}
    - Tom de Voz: ${inputs.tone}
    - Eventos Especiais no período: ${inputs.events}
    
    PERSONA DO STUDIO:
    ${JSON.stringify(persona || {})}
    
    CONFIGURAÇÃO:
    - Frequência: ${inputs.frequency} posts por semana.
    - Data Início: ${inputs.startDate}
    
    Retorne JSON:
    [ 
      { 
        "week": "Semana 1", 
        "theme": "Tema da Semana", 
        "ideas": [ 
          { 
            "day": "Segunda-feira", 
            "format": "Reels/Carrossel/Post", 
            "theme": "Título do Post", 
            "objective": "Objetivo específico deste post" 
          } 
        ] 
      } 
    ]
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '[]');
};

export const generatePlannerSuggestion = async (
  field: string,
  contextStr: string,
  type: 'strategy' | 'random'
): Promise<string[]> => {
  let prompt = '';
  if (type === 'strategy') {
    prompt = `Sugira 3 opções de "${field}" para um plano de conteúdo de Pilates, baseado nesta estratégia do estúdio: ${contextStr}. Retorne apenas as opções em JSON array de strings.`;
  } else {
    prompt = `Sugira 3 opções criativas de "${field}" para um plano de conteúdo de Instagram de um Studio de Pilates. Retorne apenas as opções em JSON array de strings.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '[]') || [];
  } catch (e) {
    console.error(e);
    return ["Erro ao gerar sugestões."];
  }
};

// --- Evaluation Analysis ---

export const generateEvaluationAnalysis = async (
  evaluations: ClassEvaluation[],
  filterContext: string
): Promise<string> => {
  const dataSummary = evaluations.map(e => ({
    instr: e.instructorName,
    date: e.classDate,
    rate: e.rating,
    msg: e.suggestions || e.discomfort
  }));

  const prompt = `
    Atue como um Gestor de Qualidade Sênior.
    Analise estas avaliações de aulas: ${filterContext}.
    DADOS: ${JSON.stringify(dataSummary)}

    Gere um relatório executivo em HTML.
    
    FORMATO HTML OBRIGATÓRIO:
    - <h2> para títulos das seções: "Resumo Executivo", "Pontos Fortes", "Pontos de Atenção", "Plano de Ação".
    - Use <ul> e <li> para listar itens.
    - Crie uma TABELA HTML (<table>) para comparar desempenho de instrutores (se houver dados suficientes) ou notas por período.
    - Use espaçamento adequado entre parágrafos.
    - NÃO use blocos markdown.
  `;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });
    return cleanHtmlOutput(res.text || '');
  } catch (e) {
    console.error("Evaluation Analysis Error:", e);
    return `<p>Erro ao gerar análise: ${handleGeminiError(e)}</p>`;
  }
};

// --- Evolution Report ---

export const generateEvolutionReport = async (
  evolutions: StudentEvolution[],
  context: string
): Promise<string> => {
  const summary = evolutions.map(e => ({
    date: e.date,
    student: e.studentName,
    mobility: e.mobility,
    pain: e.pain ? e.painLocation : "Não",
    obs: e.observations
  }));

  const prompt = `
    Atue como Coordenador Técnico de Pilates. Analise a evolução do aluno.
    Contexto: ${context}
    DADOS: ${JSON.stringify(summary)}

    Gere um relatório de progresso técnico em HTML.
    
    FORMATO HTML OBRIGATÓRIO:
    - <h2> para Seções (Visão Geral, Progresso Técnico, Pontos de Dor, Recomendações).
    - Use uma TABELA HTML (<table>) para mostrar a evolução temporal das métricas (Estabilidade, Mobilidade, Força) data a data.
    - Use <ul> para listas de recomendações.
    - Use <p> para narrativa fluida.
    - Linguagem técnica e encorajadora.
    - NÃO use blocos markdown.
  `;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });
    return cleanHtmlOutput(res.text || '');
  } catch (e) {
    console.error("Evolution Report Error:", e);
    return `<p>Erro ao gerar relatório: ${handleGeminiError(e)}</p>`;
  }
};