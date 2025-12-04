
import { GoogleGenAI } from "@google/genai";
import { 
  StrategicPlan, CalculatorInputs, FinancialModel, CompensationResult, 
  PathologyResponse, LessonPlanResponse, LessonExercise, ChatMessage, 
  TriageStep, TriageStatus, RecipeResponse, WorkoutResponse, Suggestion, 
  NewsletterAudience, ContentRequest, StudioPersona, ClassEvaluation,
  StudioInfo, StudentEvolution
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
  Gere um relatório de Planejamento Estratégico em HTML limpo e bem estruturado para o studio "${planData.studioName}".
  
  Dados: ${JSON.stringify(planData)}
  
  REGRAS DE FORMATAÇÃO HTML:
  1. Use tags <h2> para títulos de seção principais (Visão, Missão, SWOT, Objetivos).
  2. Use tags <h3> para subtítulos.
  3. Use <p> para parágrafos com espaçamento adequado.
  4. Use <ol> ou <ul> para listas.
  5. Não use tags <html>, <head> ou <body>. Apenas o conteúdo.
  6. Para a seção SWOT, agrupe em listas claras.
  7. Para o Plano de Ação, use uma estrutura clara por trimestre.
  
  Inclua uma análise cruzada da SWOT e dicas finais de execução.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text || '';
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
    Analise os dados abaixo e forneça um parecer executivo em HTML.
    
    DADOS:
    - Receita Alvo Studio: R$ ${targetRevenue} (Potencial: R$ ${potentialRevenue})
    - Receita Gerada pelo Profissional: R$ ${professionalRevenue}
    - Cenários Calculados: ${JSON.stringify(results.map(r => ({ nome: r.scenarioName, custo: r.costToStudio, margem: r.contributionMargin, viavel: r.isViable })))}
    - Modelo Financeiro Desejado (Teto Folha): ${model.payroll}%
    
    FORMATO HTML:
    - Use <h2> para o Veredito Principal.
    - Use <h3> para separar "Análise de Viabilidade", "Comparativo de Contratos" e "Recomendações".
    - Use <ul> para listar pontos chave.
    - Seja direto e profissional.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || '';
};

// --- Rehab Agent ---

export const fetchTriageQuestion = async (query: string, history: ChatMessage[], studentName?: string): Promise<TriageStep> => {
    const prompt = `
    Você é um fisioterapeuta mentor expert em Pilates.
    Aluno: ${studentName || 'Aluno'}. Queixa inicial: "${query}".
    Histórico da conversa: ${JSON.stringify(history)}.
    
    Se já tiver informações suficientes (dor, limitações, histórico) para montar uma aula segura, retorne JSON: { "status": "FINISH" }.
    Caso contrário, faça APENAS UMA pergunta curta e direta para investigar melhor (ex: "A dor irradia?", "Dói ao flexionar?").
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
    Liste 3 indicados e 3 contraindicados.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(response.text || '{}');
};

export const fetchLessonPlan = async (query: string, equipment: string[], history?: ChatMessage[], obs?: string): Promise<LessonPlanResponse | null> => {
    const context = history ? `Baseado na triagem: ${history.map(h => h.role + ': ' + h.text).join('\n')}` : '';
    const observations = obs ? `Observações do aluno: ${obs}` : '';
    
    const prompt = `
    Crie um plano de aula de Pilates (50 min) seguro e eficiente.
    Foco: ${query}.
    Equipamentos: ${equipment.join(', ')}.
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
    Gere 6 a 8 exercícios progressivos (Aquecimento -> Principal -> Volta à calma).
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
    Equipamentos disponíveis: ${equipment.join(', ')}.
    
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
    
    IMPORTANTE: Retorne APENAS um objeto JSON válido, sem texto adicional.
    Formato:
    {
      "title": "Nome Criativo da Receita",
      "ingredients": ["1 xícara de aveia", "1 banana amassada"],
      "instructions": ["Passo 1: Misture tudo...", "Passo 2: Asse por 15 min..."],
      "benefits": "Esta receita é rica em fibras e potássio, ótima para energia...",
      "calories": "Aprox. 250 kcal"
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
    Você pode adicionar itens básicos de despensa (sal, azeite, temperos, água).
    Info extra do aluno: ${extraInfo}.
    
    IMPORTANTE: Retorne APENAS um objeto JSON válido, sem texto adicional.
    Formato:
    {
      "title": "Nome Criativo",
      "ingredients": ["Lista completa dos ingredientes usados e quantidades"],
      "instructions": ["Passo a passo numerado e claro"],
      "benefits": "Explicação curta dos benefícios nutricionais",
      "calories": "Estimativa calórica por porção"
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
    Duração: ${duration}.
    Equipamentos: ${equipment}.
    Observações clínicas (CUIDADO REDOBRADO): ${observations}.
    
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
    
    FORMATO HTML:
    - <h2> para Títulos de Seção (Resumo, Ações Imediatas, Médio Prazo, Resposta aos Alunos).
    - <ul> e <li> para listar as ações.
    - Use negrito para destacar responsaveis e prazos.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || '';
};

export const generateSuggestionTrends = async (suggestions: (Suggestion & { studioName?: string })[]): Promise<string> => {
    const suggestionsText = suggestions.map(s => {
      const studioInfo = s.studioName ? `[Studio: ${s.studioName}]` : '';
      return `- "${s.content}" ${studioInfo} (${new Date(s.createdAt).toLocaleDateString()})`;
    }).join('\n');

    const prompt = `
    Atue como um Consultor de Experiência do Cliente.
    Analise esta lista de sugestões:
    ${suggestionsText}
    
    Gere um relatório analítico em HTML.
    
    FORMATO HTML:
    - <h2> para os títulos principais (Visão Geral, Categorias, Prioridades).
    - <ul> para listas de insights.
    - Se houver padrões negativos, sugira soluções práticas.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || '';
};

// --- Newsletter ---

export const generateNewsletter = async (senderName: string, audience: NewsletterAudience, topic: string, style: string): Promise<{ title: string; content: string } | null> => {
    const audienceText = audience === 'students' ? 'Alunos do Studio' : audience === 'instructors' ? 'Equipe de Instrutores' : 'Todos (Alunos e Equipe)';
    
    const prompt = `
    Escreva uma newsletter/comunicado.
    Remetente: ${senderName}.
    Público: ${audienceText}.
    Tópico: ${topic}.
    Estilo: ${style}.
    
    Retorne JSON:
    {
      "title": "Título chamativo",
      "content": "Conteúdo em HTML formatado com <p>, <ul>, <li> e <strong> onde apropriado. Não use Markdown."
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
    Tema: ${request.theme}
    Objetivo: ${request.objective}
    Público: ${request.audience}
    Tom: ${request.tone}
    
    Se for post/carrossel, inclua legenda e hashtags.
    Se for vídeo, inclua roteiro e descrição visual.
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
            model: 'gemini-2.5-flash-image', // Model for image generation
            contents: {
                parts: [{ text: prompt }]
            },
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
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16' // Vertical for social media
            }
        });
        
        while (!operation.done) {
            onProgress("Processando vídeo...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            // Fetch the video bytes using the API key
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

export const generateContentPlan = async (goals: any, persona: StudioPersona, durationWeeks: number, frequency: number, startDate: string) => {
    const prompt = `
    Crie um Plano de Conteúdo Estratégico para Instagram de Pilates.
    Duração: ${durationWeeks} semanas. Frequência: ${frequency} posts/semana.
    Data Início: ${startDate}.
    Objetivos: ${JSON.stringify(goals)}.
    Persona: ${JSON.stringify(persona)}.
    
    Retorne JSON:
    [
      {
        "week": "Semana 1",
        "theme": "Tema da Semana",
        "ideas": [
          { "day": "Segunda-feira", "format": "Reels", "theme": "Título do Post", "objective": "Educação" }
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

// --- Evaluation Analysis ---

export const generateEvaluationAnalysis = async (
  evaluations: ClassEvaluation[],
  filterContext: string
): Promise<string> => {
  const dataSummary = evaluations.map(e => ({
    instr: e.instructorName,
    date: e.classDate,
    rate: e.rating,
    feel: e.feeling,
    pace: e.pace,
    msg: e.suggestions || e.discomfort
  }));

  const prompt = `
    Atue como um Gestor de Qualidade Sênior.
    Analise estas avaliações de aulas: ${filterContext}.
    DADOS: ${JSON.stringify(dataSummary)}

    Gere um relatório executivo em HTML.
    
    FORMATO HTML OBRIGATÓRIO:
    - Use <h2> para títulos das seções: "Resumo Executivo", "Pontos Fortes", "Pontos de Atenção", "Análise de Instrutores", "Plano de Ação".
    - Use <ul> e <li> para listar itens.
    - Use <p> para descrições.
    - Não use Markdown (###), use tags HTML.
  `;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });
    return res.text || "<p>Não foi possível gerar a análise.</p>";
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
    instructor: e.instructorName,
    stability: e.stability,
    strength: e.strength,
    mobility: e.mobility,
    pain: e.pain ? e.painLocation : "Não",
    obs: e.observations
  }));

  const prompt = `
    Atue como Coordenador Técnico de Pilates. Analise a evolução do aluno.
    Contexto: ${context}
    DADOS: ${JSON.stringify(summary)}

    Gere um relatório de progresso técnico em HTML.
    
    FORMATO HTML:
    - <h2> para Seções (Visão Geral, Progresso Técnico, Pontos de Dor, Recomendações).
    - <ul> para listas.
    - <p> para texto corrido.
    - Use linguagem técnica e encorajadora.
  `;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });
    return res.text || "<p>Não foi possível gerar o relatório.</p>";
  } catch (e) {
    console.error("Evolution Report Error:", e);
    return `<p>Erro ao gerar relatório: ${handleGeminiError(e)}</p>`;
  }
};
