
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
  const prompt = `Atue como consultor de negócios. Gere um relatório HTML detalhado (sem tags <html> ou <body>, use <h2>, <h3>, <p>, <ul>) do Planejamento Estratégico para o studio "${planData.studioName}". 
  Dados: ${JSON.stringify(planData)}. 
  Inclua análise da SWOT cruzada e dicas de execução.`;
  
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
    Analise os dados abaixo e forneça um parecer curto e direto (HTML formatado) sobre a viabilidade da contratação e saúde financeira.
    
    DADOS:
    - Receita Alvo Studio: R$ ${targetRevenue} (Potencial: R$ ${potentialRevenue})
    - Receita Gerada pelo Profissional: R$ ${professionalRevenue}
    - Cenários Calculados: ${JSON.stringify(results.map(r => ({ nome: r.scenarioName, custo: r.costToStudio, margem: r.contributionMargin, viavel: r.isViable })))}
    - Modelo Financeiro Desejado (Teto Folha): ${model.payroll}%
    
    Responda:
    1. Qual o melhor regime de contratação para o estúdio neste cenário?
    2. O custo do profissional está saudável em relação à receita que ele gera?
    3. Sugestão prática para melhorar a margem.
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
    Atue como Gestor de Studio. Analise estas sugestões dos alunos:
    ${suggestionsText}
    
    Contexto do Dono: ${context}
    
    Crie um Plano de Ação em HTML (sem tags html/body) estruturado com:
    1. Resumo das Demandas
    2. Ações Imediatas (Baixo custo/rápido)
    3. Ações de Médio Prazo
    4. Resposta Sugerida aos Alunos (Texto comunicando as melhorias)
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || '';
};

// New function for detailed analysis
export const generateSuggestionTrends = async (suggestions: (Suggestion & { studioName?: string })[]): Promise<string> => {
    // Adiciona o nome do studio ao texto se disponível
    const suggestionsText = suggestions.map(s => {
      const studioInfo = s.studioName ? `[Studio: ${s.studioName}]` : '';
      return `- "${s.content}" ${studioInfo} (${new Date(s.createdAt).toLocaleDateString()})`;
    }).join('\n');

    const prompt = `
    Atue como um Consultor de Experiência do Cliente para Redes de Pilates.
    Analise esta lista de sugestões enviadas pelos alunos (possivelmente de múltiplos studios):
    
    ${suggestionsText}
    
    Gere um relatório analítico executivo em HTML (sem tags html/body) contendo:
    1. **Visão Geral**: Resumo dos principais tópicos abordados globalmente.
    2. **Análise por Categoria**: Agrupe por Infraestrutura, Aulas, Atendimento, etc.
    3. **Tendências e Padrões**: Identifique problemas recorrentes (ex: ar condicionado, horários). Se houver dados de múltiplos studios, destaque se um problema é geral ou específico de um local.
    4. **Top Prioridades**: O que deve ser resolvido com urgência.
    5. **Oportunidades de Inovação**: Ideias criativas dadas pelos alunos.
    
    Seja objetivo, profissional e foque na melhoria da retenção de alunos.
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
      "content": "Conteúdo em HTML formatado (parágrafos, negritos, listas)"
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
    Atue como um Gestor de Qualidade Sênior de um Studio de Pilates.
    Analise estas ${evaluations.length} avaliações de aulas (${filterContext}).
    
    DADOS:
    ${JSON.stringify(dataSummary)}

    Gere um relatório executivo em HTML (sem markdown, use tags <h2>, <h3>, <p>, <ul>, <li>, <strong>) com:
    1. **Resumo Geral**: Média de nota, sentimento predominante e ritmo.
    2. **Pontos Fortes**: O que os alunos mais elogiam?
    3. **Pontos de Atenção**: Reclamações recorrentes ou padrões de desconforto/ritmo inadequado.
    4. **Análise por Instrutor** (se houver dados suficientes): Destaque performances individuais positivas ou áreas de melhoria.
    5. **Plano de Ação Sugerido**: 3 a 5 ações práticas para o dono do estúdio melhorar a retenção.

    Seja direto, profissional e construtivo.
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
    Atue como Coordenador Técnico de Pilates. Analise este histórico de evoluções de alunos (${context}).
    
    DADOS:
    ${JSON.stringify(summary)}

    Gere um relatório de progresso técnico em HTML (sem tags html/body) contendo:
    1. **Visão Geral**: Resumo do período e consistência.
    2. **Análise de Progresso**: Tendências observadas em Força, Mobilidade e Estabilidade. O aluno está evoluindo? Estagnado?
    3. **Pontos de Dor/Limitação**: Padrões recorrentes de queixas (se houver).
    4. **Observações dos Instrutores**: Destaques qualitativos importantes.
    5. **Recomendações**: Sugestões para as próximas aulas (foco técnico).

    Use uma linguagem profissional e encorajadora.
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
