
import { GoogleGenAI } from "@google/genai";
import { StrategicPlan, CalculatorInputs, FinancialModel, CompensationResult, PathologyResponse, LessonPlanResponse, LessonExercise, ChatMessage, TriageStep, TriageStatus, RecipeResponse, WorkoutResponse, Suggestion, NewsletterAudience, ContentRequest, StudioPersona } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn("[Gemini Service] API Key não encontrada. Configure a variável de ambiente 'API_KEY' no Vercel.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const cleanAndParseJSON = (text: string) => {
  try {
    if (!text) return null;
    // Remove markdown code blocks if present
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Locate the first '{' or '[' and last '}' or ']' to handle potential preamble text
    const firstCurly = cleanText.indexOf('{');
    const firstSquare = cleanText.indexOf('[');
    
    let firstIndex = -1;
    if (firstCurly !== -1 && firstSquare !== -1) firstIndex = Math.min(firstCurly, firstSquare);
    else if (firstCurly !== -1) firstIndex = firstCurly;
    else if (firstSquare !== -1) firstIndex = firstSquare;

    const lastCurly = cleanText.lastIndexOf('}');
    const lastSquare = cleanText.lastIndexOf(']');
    const lastIndex = Math.max(lastCurly, lastSquare);

    if (firstIndex !== -1 && lastIndex !== -1) {
      cleanText = cleanText.substring(firstIndex, lastIndex + 1);
    }
    
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Erro ao fazer parse do JSON da IA:", e);
    return null;
  }
};

export const handleGeminiError = (error: any): string => {
  const errStr = error.toString();
  const errMsg = error.message || '';
  
  console.error("Gemini API Error:", error);

  if (errStr.includes("403") || errMsg.includes("leaked") || errMsg.includes("PERMISSION_DENIED")) {
    return `
      <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg mb-6 text-left shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="font-bold text-lg">Erro de Segurança (Chave Bloqueada)</p>
        </div>
        <p class="mb-3">A chave de API configurada foi <strong>bloqueada pelo Google</strong> por ter sido exposta.</p>
        <div class="bg-white p-4 rounded border border-red-200">
          <p class="text-sm font-bold text-slate-700 mb-2">Como resolver:</p>
          <ol class="list-decimal ml-5 text-sm text-slate-600 space-y-2">
            <li>Gere uma nova chave no Google AI Studio.</li>
            <li>No Vercel, atualize a variável <code>API_KEY</code>.</li>
            <li>Faça um Redeploy.</li>
          </ol>
        </div>
      </div>
    `;
  }
  
  if (!apiKey) {
    return `<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4">⚠️ Chave de API não configurada no Vercel.</div>`;
  }

  return `<div class="bg-orange-50 border-l-4 border-orange-500 p-4">Erro na IA: ${errMsg.substring(0, 100)}... Tente novamente.</div>`;
};

// --- CONTENT AGENT (NEW) ---

export const generatePilatesContentStream = async function* (request: ContentRequest, systemInstruction: string) {
    if (!apiKey) throw new Error("API Key required");

    const prompt = `
        Crie um conteúdo para redes sociais de um Studio de Pilates.
        
        Tema: ${request.theme}
        Formato: ${request.format}
        Objetivo: ${request.customObjective || request.objective}
        Público-Alvo: ${request.customAudience || request.audience}
        Tom de Voz: ${request.tone}
        
        Dados do Studio:
        Nome: ${request.studioInfo?.name || ''}
        Telefone: ${request.studioInfo?.phone || ''}
        Endereço: ${request.studioInfo?.address || ''}
        Whatsapp: ${request.studioInfo?.whatsapp || ''}

        ${request.modificationPrompt ? `IMPORTANTE - MODIFICAÇÃO SOLICITADA: ${request.modificationPrompt}` : ''}

        Estrutura da Resposta:
        1. Headline (Título Chamativo)
        2. Legenda Completa (Corpo do texto com emojis)
        3. Hashtags Estratégicas
        4. Sugestão Visual (Descreva o que deve aparecer na imagem/vídeo)
    `;

    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.8
        }
    });

    for await (const chunk of response) {
        yield chunk.text || '';
    }
};

export const generatePilatesImage = async (request: ContentRequest, dominantColors: string[] | null, textContext: string) => {
    if (!apiKey) throw new Error("API Key required");

    let prompt = `Uma foto profissional e inspiradora para um post de Pilates. Estilo: ${request.imageStyle}. Tema: ${request.theme}. Contexto: ${textContext.substring(0, 200)}.`;
    
    if (dominantColors && dominantColors.length > 0) {
        prompt += ` Use cores harmoniosas com esta paleta: ${dominantColors.join(', ')}.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Using Nano/Flash Image as per guidelines for general tasks, switch to Pro if 4k needed.
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "1:1", // Default square for posts
                }
            }
        });

        // Loop to find the image part
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Erro ao gerar imagem:", e);
        return null;
    }
};

export const generatePilatesVideo = async (script: string, onProgress: (msg: string) => void) => {
    if (!apiKey) throw new Error("API Key required");

    onProgress("Iniciando geração de vídeo (Veo)... Isso pode levar alguns minutos.");

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `Video cinematográfico, alta qualidade, pilates, bem-estar. Baseado neste contexto: ${script.substring(0, 300)}`,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16' // Reels/Story format
            }
        });

        while (!operation.done) {
            onProgress("Processando vídeo... Aguarde.");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Link de vídeo não gerado.");

        // NOTE: The download link requires the API key appended.
        return `${downloadLink}&key=${apiKey}`; 

    } catch (e) {
        console.error("Erro ao gerar vídeo:", e);
        throw e;
    }
};

export const generateContentPlan = async (
    goals: any, 
    persona: StudioPersona, 
    weeks: number,
    frequency: number,
    startDate: string
) => {
    if (!apiKey) return [];
    
    // Prompt otimizado para evitar problemas de JSON em longos períodos (12/16 semanas)
    const prompt = `
        Atue como estrategista de marketing para Studios de Pilates.
        Crie um plano de conteúdo para **${weeks} semanas**.
        
        Configuração:
        - Frequência: ${frequency} posts por semana.
        - Data de Início do Plano: ${startDate} (Use isso para sugerir os dias da semana corretamente).
        
        Objetivos: ${goals.mainObjective}
        Público: ${goals.targetAudience.join(', ')}
        Persona: ${persona.philosophy}
        
        REQUISITOS OBRIGATÓRIOS:
        1. Gere EXATAMENTE ${weeks} semanas.
        2. Para cada semana, sugira EXATAMENTE ${frequency} ideias de posts distribuídos durante a semana (Ex: Segunda, Quarta, Sexta se for 3x).
        3. No campo 'day', coloque o dia da semana (ex: "Segunda-feira").
        4. SEJA CONCISO. Mantenha 'theme' e 'objective' curtos para o JSON não cortar.
        5. Responda APENAS com o JSON. Sem texto extra.
        
        Estrutura JSON:
        [
            {
                "week": "Semana 1",
                "theme": "Foco da semana",
                "ideas": [
                    {"day": "Segunda-feira", "theme": "Tema Curto", "format": "Reels", "objective": "Educação"},
                    {"day": "Quarta-feira", "theme": "Tema Curto", "format": "Post", "objective": "Conexão"}
                ]
            }
        ]
    `;

    try {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                temperature: 0.7
            }
        });
        
        const result = cleanAndParseJSON(res.text || '[]');
        if (!Array.isArray(result)) {
            console.error("Resultado do plano não é um array válido:", result);
            return [];
        }
        return result;
    } catch (e) {
        console.error("Plan Gen Error:", e);
        return [];
    }
};

// ... (Rest of existing functions: generateNewsletter, generateStudioDescription, etc.)

export const generateNewsletter = async (
  studioName: string,
  targetAudience: NewsletterAudience,
  topic: string,
  style: string
): Promise<{ title: string; content: string } | null> => {
  if (!apiKey) throw new Error("API Key not configured");

  const audienceMap = {
    'students': 'Alunos de Pilates (Foco em retenção, dicas de saúde, novidades)',
    'instructors': 'Instrutores de Pilates (Foco técnico, avisos internos, gestão)',
    'both': 'Toda a comunidade do Studio (Alunos e Equipe)'
  };

  const prompt = `
    Atue como um especialista em Marketing e Comunicação para Studios de Pilates.
    Escreva uma Newsletter para o estúdio "${studioName}".
    
    Público-alvo: ${audienceMap[targetAudience]}
    Tópico/Assunto Principal: ${topic}
    Estilo/Tom de Voz: ${style}

    Instruções:
    1. Crie um título chamativo.
    2. Escreva um conteúdo envolvente, bem estruturado e formatado em HTML simples.
    3. Use tags como <p>, <ul>, <li>, <strong>, <h3> para dar estrutura.
    4. NÃO use tags estruturais como <html>, <head> ou <body>.
    5. O texto deve ser pronto para envio.

    Retorne APENAS um JSON válido com o seguinte formato:
    {
      "title": "O título da newsletter",
      "content": "O conteúdo em HTML"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("A IA retornou vazio.");
    
    return cleanAndParseJSON(text);
  } catch (error) {
    console.error("Erro ao gerar newsletter:", error);
    throw error;
  }
};

export const generateStudioDescription = async (name: string, owner: string, specialties: string[]) => {
  if (!apiKey) return "Erro: Chave de API não configurada.";
  const prompt = `Escreva uma biografia curta e profissional para o perfil de um Studio de Pilates chamado "${name}", de propriedade de "${owner}". Especialidades: ${specialties.join(', ')}. Tom acolhedor e profissional. Máximo 300 caracteres.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return "Erro ao gerar descrição."; }
};

export const generateMissionOptions = async (studioName: string) => {
  if (!apiKey) return [];
  const prompt = `Crie 3 opções de Missão para um studio de pilates chamado ${studioName}. Retorne apenas as frases, uma por linha.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text?.split('\n').filter(s => s.trim().length > 0) || [];
  } catch (e) { return []; }
};

export const generateVisionOptions = async (studioName: string, year: string) => {
  if (!apiKey) return [];
  const prompt = `Crie 3 opções de Visão de futuro para o ano ${year} para o studio ${studioName}. Retorne apenas as frases.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text?.split('\n').filter(s => s.trim().length > 0) || [];
  } catch (e) { return []; }
};

export const generateSwotSuggestions = async (category: string) => {
  if (!apiKey) return [];
  const prompt = `Liste 5 exemplos comuns de ${category} para um studio de pilates pequeno/médio. Retorne apenas os itens, um por linha.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text?.split('\n').filter(s => s.trim().length > 0).map(s => s.replace(/^- /, '')) || [];
  } catch (e) { return []; }
};

export const generateObjectivesSmart = async (swot: any) => {
  if (!apiKey) return [];
  const prompt = `Com base nesta análise SWOT de um studio de pilates: ${JSON.stringify(swot)}, crie 3 Objetivos SMART estratégicos.
  Retorne JSON: [{ "title": "Objetivo", "keyResults": ["KR1", "KR2"] }]`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(res.text || '[]');
  } catch (e) { return []; }
};

export const generateActionsSmart = async (objectives: any) => {
  if (!apiKey) return [];
  const prompt = `Para estes objetivos: ${JSON.stringify(objectives)}, crie um plano de ação trimestral resumido.
  Retorne JSON: [{ "quarter": "1º Trimestre", "actions": ["Ação 1", "Ação 2"] }, ...] para 4 trimestres.`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(res.text || '[]');
  } catch (e) { return []; }
};

export const generateFullReport = async (plan: StrategicPlan) => {
  if (!apiKey) return "<p>Erro na API</p>";
  const prompt = `Atue como um consultor de negócios sênior especializado em Studios de Pilates.
  Analise este planejamento estratégico: ${JSON.stringify(plan)}.
  Escreva um relatório profissional, motivador e prático em HTML.
  Estrutura:
  1. Análise Executiva (Feedback sobre a coerência da visão/missão)
  2. Diagnóstico SWOT (Pontos críticos)
  3. Avaliação dos Objetivos (São realistas?)
  4. Recomendações Extras para o Plano de Ação.
  Use tags HTML como <h2>, <p>, <ul>, <li>. Não use markdown.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return `<p>Erro: ${e}</p>`; }
};

export const generateFinancialAnalysis = async (inputs: any, model: any, results: any, targetRev: any, potentialRev: any, maxCap: any, profRev: any) => {
  if (!apiKey) return "";
  const prompt = `Analise financeiramente esta contratação para um Studio de Pilates.
  Dados: ${JSON.stringify({ inputs, model, results, metrics: { targetRev, potentialRev, maxCap, profRev } })}.
  Gere um parecer curto e direto (HTML) sobre a viabilidade, riscos e qual modelo de contratação (CLT, PJ, RPA) parece mais vantajoso para o estúdio neste cenário.`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return "Erro na análise."; }
};

export const fetchTriageQuestion = async (complaint: string, history: ChatMessage[], studentName?: string): Promise<TriageStep> => {
  if (!apiKey) return { status: TriageStatus.FINISH };
  
  const prompt = `
    Atue como um Mentor Clínico Sênior de Pilates (Fisioterapeuta Expert) conversando com um Instrutor sobre um caso clínico.
    Aluno: ${studentName || "Aluno"}.
    Patologia/Queixa Inicial: "${complaint}".
    
    Histórico da conversa até agora: ${JSON.stringify(history)}.
    
    OBJETIVO: Realizar uma triagem clínica (anamnese) fazendo de 3 a 5 perguntas estratégicas, uma por vez, baseadas nas respostas anteriores, para entender o quadro clínico, dor, limitações e objetivos do dia.
    
    ESTILO: Converse como um mentor experiente orientando um colega. Seja técnico mas acessível. Ex: "Certo, instrutor. Dado esse histórico de dor lombar, como está a mobilidade de quadril dele hoje?".
    
    LÓGICA DE FINALIZAÇÃO:
    - Se o histórico já tiver pelo menos 3 a 5 trocas de mensagens E você tiver informações suficientes para montar a aula, retorne JSON com status "FINISH".
    - Caso contrário, retorne JSON com status "CONTINUE" e a próxima pergunta no campo "question".
    
    Retorne JSON: { "status": "CONTINUE" | "FINISH", "question": "..." }
  `;

  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(res.text || '{}');
  } catch (e) { return { status: TriageStatus.FINISH }; }
};

export const fetchPathologyData = async (query: string, equipments: string[], history?: ChatMessage[]) => {
  if (!apiKey) return null;
  const prompt = `Atue como fisioterapeuta expert em Pilates. Patologia/Queixa: "${query}".
  Equipamentos disponíveis: ${equipments.join(', ')}.
  Histórico Triagem: ${JSON.stringify(history || [])}.
  Retorne JSON: {
    "pathologyName": "Nome Técnico",
    "summary": "Resumo clínico curto",
    "indicated": [{"name": "Nome Exercício", "apparatus": "Aparelho", "reason": "Por que é bom", "details": "Dica de execução"}],
    "contraindicated": [{"name": "Nome Exercício", "apparatus": "Aparelho", "reason": "Por que evitar", "details": "Risco"}]
  }`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const parsed = cleanAndParseJSON(res.text || '');
    if (!parsed) throw new Error("Falha ao analisar resposta da IA");
    return parsed;
  } catch (e) { 
    console.error("fetchPathologyData error:", e);
    throw e;
  }
};

export const fetchLessonPlan = async (pathology: string, equipments: string[], history?: ChatMessage[], studentObs?: string) => {
  if (!apiKey) return null;
  const prompt = `
    Crie um Plano de Aula de Pilates Rehab Prático e Objetivo.
    Patologia/Foco: "${pathology}".
    Equipamentos Disponíveis: ${equipments.join(', ')}.
    Detalhes da Triagem (Mentor/Instrutor): ${JSON.stringify(history || [])}.
    ${studentObs ? `OBSERVAÇÕES DO ALUNO (Cadastro): "${studentObs}". LEVE ISSO EM CONSIDERAÇÃO RIGOROSAMENTE.` : ''}
    
    REQUISITOS DE OTIMIZAÇÃO (GERAR RÁPIDO):
    1. Crie uma aula com **6 a 10 exercícios no máximo**.
    2. **Use no máximo 2 tipos de equipamentos** diferentes da lista fornecida para facilitar a logística da aula (ex: Só Mat e Reformer, ou só Chair e Cadillac).
    3. Seja CONCISO nas instruções. Vá direto ao ponto (ex: "Inspira parado, expira movendo").
    4. Estrutura: Aquecimento -> Principal -> Desaquecimento.
    
    Retorne APENAS JSON válido (sem markdown): {
      "pathologyName": "${pathology}",
      "goal": "Objetivo principal da aula",
      "duration": "45 min",
      "exercises": [
        { "name": "Nome", "reps": "10 reps", "apparatus": "Equipamento", "instructions": "Instrução curta e direta", "focus": "Foco muscular" }
      ]
    }
  `;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        temperature: 0.7 // Levemente menos criativo para ser mais rápido e assertivo
      }
    });
    const parsed = cleanAndParseJSON(res.text || '');
    if (!parsed) throw new Error("A IA retornou uma resposta vazia ou inválida.");
    return parsed;
  } catch (e) { 
    console.error("fetchLessonPlan error:", e);
    throw e; 
  }
};

export const regenerateSingleExercise = async (pathology: string, currentExercise: any, equipments: string[]) => {
  if (!apiKey) return currentExercise;
  const prompt = `Troque este exercício (${currentExercise.name}) por outro equivalente para ${pathology} usando ${equipments.join(', ')}. Retorne JSON do novo exercício formatado igual ao anterior.`;
  try {
    const res = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return cleanAndParseJSON(res.text || JSON.stringify(currentExercise));
  } catch (e) { return currentExercise; }
};

export const generateHealthyRecipe = async (goal: string, restrictions: string) => {
  if (!apiKey) return null;
  const prompt = `Crie uma receita saudável. Objetivo: ${goal}. Restrições: ${restrictions}.
  Retorne JSON: { "title": "", "ingredients": [], "instructions": [], "benefits": "", "calories": "ex: 300kcal" }`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    return cleanAndParseJSON(res.text || 'null');
  } catch (e) { return null; }
};

export const generateRecipeFromIngredients = async (ingredients: string[], extra: string) => {
  if (!apiKey) return null;
  const prompt = `Crie uma receita saudável usando PRINCIPALMENTE: ${ingredients.join(', ')}. Obs: ${extra}.
  Retorne JSON: { "title": "", "ingredients": [], "instructions": [], "benefits": "", "calories": "" }`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    return cleanAndParseJSON(res.text || 'null');
  } catch (e) { return null; }
};

export const generateHomeWorkout = async (name: string, obs: string, equipment: string, duration: string) => {
  if (!apiKey) return null;
  const prompt = `Crie um treino de Pilates em casa para ${name}. Obs clínicas: ${obs}. Equipamentos: ${equipment}. Duração: ${duration}.
  Retorne JSON: { "title": "", "duration": "", "focus": "", "exercises": [{ "name": "", "reps": "", "instructions": "", "safetyNote": "" }] }`;
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    return cleanAndParseJSON(res.text || 'null');
  } catch (e) { return null; }
};

export const generateTailoredMissions = async (name: string, specialties: string[], focus: string, tone: string) => {
    if (!apiKey) return [];
    const prompt = `Crie 3 opções de Missão para o studio "${name}" (Especialidades: ${specialties.join(', ')}). Foco: ${focus}. Tom: ${tone}. Retorne apenas as frases em JSON array string.`;
    try {
        const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        return cleanAndParseJSON(res.text || '[]');
    } catch (e) { return []; }
};

export const generateActionPlanFromSuggestions = async (suggestions: Suggestion[], observations: string) => {
  if (!apiKey) return "<p>Erro na API</p>";
  
  const suggestionsText = suggestions.map(s => `- "${s.content}" (Aluno: ${s.studentName})`).join('\n');
  
  const prompt = `Atue como consultor de gestão de Studios.
  Analise estas sugestões dos alunos:
  ${suggestionsText}
  
  Observações do Dono: ${observations}
  
  Crie um Plano de Ação Estratégico em HTML (sem markdown) para endereçar esses pontos.
  Inclua: Resumo das Demandas, Ações Imediatas, Ações de Médio Prazo e Mensagem sugerida para enviar aos alunos como resposta.`;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text || '';
  } catch (e) { return `<p>Erro: ${e}</p>`; }
};
