
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    generatePilatesContentStream, 
    generatePilatesImage, 
    generatePilatesVideo, 
    generateContentPlan 
} from '../services/geminiService';
import { 
    saveStudioPersona, 
    fetchStudioPersona, 
    savePost, 
    fetchSavedPosts, 
    deleteSavedPost,
    saveContentPlan,
    fetchContentPlans,
    deleteContentPlan
} from '../services/contentService';
import { 
    ContentRequest, 
    StudioPersona, 
    SavedPost, 
    StrategicContentPlan,
    AppRoute
} from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Calendar, Layout, Loader2, Sparkles, Copy, Trash2, Video, Image as ImageIcon, CheckCircle, Save, UserCircle, Eye, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/*
  SQL REQUIRED FOR SUPABASE:
  
  create table if not exists content_posts (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    data jsonb not null,
    created_at timestamptz default now()
  );

  create table if not exists content_plans (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references studio_profiles(user_id) on delete cascade,
    data jsonb not null,
    created_at timestamptz default now()
  );
  
  alter table content_posts enable row level security;
  alter table content_plans enable row level security;

  create policy "Users can manage their own posts" on content_posts
    for all using (auth.uid() = studio_id);

  create policy "Users can manage their own plans" on content_plans
    for all using (auth.uid() = studio_id);
*/

const INITIAL_REQUEST: ContentRequest = {
    format: 'Post Estático',
    objective: 'Educação',
    theme: '',
    audience: 'Alunos Iniciantes',
    tone: 'Inspirador',
    imageStyle: 'Fotorealista'
};

export const ContentAgent: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'persona' | 'generator' | 'planner'>('generator');
    
    // Data States
    const [persona, setPersona] = useState<StudioPersona | null>(null);
    const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
    const [plans, setPlans] = useState<StrategicContentPlan[]>([]);
    
    // Generator States
    const [request, setRequest] = useState<ContentRequest>(INITIAL_REQUEST);
    const [generatedText, setGeneratedText] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // Planner States
    const [planDuration, setPlanDuration] = useState<number>(4);
    const [planFrequency, setPlanFrequency] = useState<number>(3);
    const [planStartDate, setPlanStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [planGoals, setPlanGoals] = useState({
        mainObjective: '',
        targetAudience: '',
        keyThemes: ''
    });

    useEffect(() => {
        if (user?.id) {
            loadInitialData();
        }
    }, [user]);

    const loadInitialData = async () => {
        if (!user?.id) return;
        const p = await fetchStudioPersona(user.id);
        setPersona(p);
        if (!p) setActiveTab('persona'); // Redirect to onboarding if no persona

        const posts = await fetchSavedPosts(user.id);
        setSavedPosts(posts);

        const fetchedPlans = await fetchContentPlans(user.id);
        setPlans(fetchedPlans);
    };

    // --- PERSONA LOGIC ---
    const handleSavePersona = async () => {
        if (!user?.id || !persona) return;
        const res = await saveStudioPersona(user.id, persona);
        if (res.success) {
            alert('Persona salva com sucesso!');
            setActiveTab('generator');
        } else {
            alert('Erro ao salvar persona.');
        }
    };

    // --- GENERATOR LOGIC ---
    const handleGenerate = async () => {
        if (!request.theme) {
            alert('Por favor, defina um tema.');
            return;
        }
        
        // Veo API Key Check for Video
        if (['Reels', 'Video Curto', 'TikTok'].includes(request.format)) {
            try {
                if (!(window as any).aistudio || !await (window as any).aistudio.hasSelectedApiKey()) {
                    await (window as any).aistudio.openSelectKey();
                }
            } catch (e) {
                 console.error('API Key selection error:', e);
                 alert("É necessário selecionar uma chave de API para gerar vídeos. Visite ai.google.dev/gemini-api/docs/billing para mais informações.");
                 return;
            }
        }

        setIsGenerating(true);
        setGeneratedText('');
        setGeneratedImage(null);
        setGeneratedVideo(null);
        setLoadingMessage('Escrevendo texto...');

        const systemInstruction = persona ? `
            Você é o assistente de conteúdo do Studio.
            Filosofia: ${persona.philosophy}
            Diferenciais: ${persona.differentiators}
            Evitar termos: ${persona.languageToAvoid}
        ` : 'Você é um especialista em Pilates.';

        try {
            // Text
            const stream = generatePilatesContentStream(request, systemInstruction);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                setGeneratedText(prev => prev + chunk);
            }

            // Image
            if (['Post Estático', 'Carrossel', 'Story'].includes(request.format)) {
                setLoadingMessage('Criando imagem...');
                const img = await generatePilatesImage(request, null, fullText);
                setGeneratedImage(img);
            }

            // Video
            if (['Reels', 'Video Curto', 'TikTok'].includes(request.format)) {
                setLoadingMessage('Renderizando vídeo (isso pode demorar)...');
                const vid = await generatePilatesVideo(fullText, (msg) => setLoadingMessage(msg));
                setGeneratedVideo(vid);
            }

        } catch (e: any) {
            console.error(e);
            alert("Erro na geração: " + e.message);
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleSavePostLocal = async () => {
        if (!user?.id || !generatedText) return;
        const newPost: SavedPost = {
            id: crypto.randomUUID(),
            request,
            content: generatedText,
            imageUrl: generatedImage,
            videoUrl: generatedVideo,
            createdAt: new Date().toISOString()
        };
        await savePost(user.id, newPost);
        setSavedPosts([newPost, ...savedPosts]);
        alert('Post salvo!');
    };

    const handleOpenSavedPost = (post: SavedPost) => {
        // Load data into generator safely
        setRequest({ ...INITIAL_REQUEST, ...post.request });
        setGeneratedText(post.content);
        setGeneratedImage(post.imageUrl || null);
        setGeneratedVideo(post.videoUrl || null);
        
        setActiveTab('generator');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- PLANNER LOGIC ---
    const handleGeneratePlan = async () => {
        if (!user?.id || !persona) return;
        
        if (!planGoals.mainObjective) {
            alert("Defina o objetivo principal.");
            return;
        }

        setIsGenerating(true);
        try {
            const rawPlan = await generateContentPlan({
                ...planGoals,
                targetAudience: [planGoals.targetAudience],
                toneOfVoice: ['Inspirador']
            }, persona, planDuration, planFrequency, planStartDate);

            if (!rawPlan || !Array.isArray(rawPlan) || rawPlan.length === 0) {
                throw new Error("Falha ao gerar plano (JSON inválido)");
            }

            const newPlan: StrategicContentPlan = {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                startDate: planStartDate,
                frequency: planFrequency,
                goals: { ...planGoals, targetAudience: [planGoals.targetAudience], keyThemes: [planGoals.keyThemes] },
                weeks: rawPlan
            };

            await saveContentPlan(user.id, newPlan);
            setPlans([newPlan, ...plans]);
        } catch (e) {
            console.error("Plan Error:", e);
            alert("Erro ao gerar plano. Tente simplificar o objetivo ou reduza a duração.");
        } finally {
            setIsGenerating(false);
        }
    };

    const getPostDate = (startStr: string | undefined, weekIndex: number, dayIndex: number) => {
        if (!startStr) return "";
        const start = new Date(startStr);
        // Calcula a data aproximada baseada na semana e na ordem do post
        // Assumindo que os posts são distribuidos na semana
        // Simplificação: Semana começa na data de inicio + (weekIndex * 7)
        // O dia exato depende da logica, mas vamos estimar:
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (weekIndex * 7));
        
        // Distribuição simples: Se 3x na semana (seg, qua, sex) -> dia 0, 2, 4 da semana
        // Mas a IA pode retornar "Segunda", "Quarta".
        // Vamos exibir apenas a data de inicio da semana para referência visual no card
        return weekStart.toLocaleDateString();
    };

    const calculateDateForIdea = (startStr: string | undefined, weekIdx: number, dayName: string) => {
        if (!startStr) return "";
        const start = new Date(startStr);
        // Ajusta para o inicio da semana correta
        start.setDate(start.getDate() + (weekIdx * 7));
        
        // Tenta mapear o nome do dia para adicionar dias
        const map: {[key:string]: number} = {
            'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6,
            'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 0
        };
        
        const dayLower = dayName.toLowerCase();
        let addDays = 0;
        
        for (const key in map) {
            if (dayLower.includes(key)) {
                // Se a data de inicio não for Domingo, precisamos ajustar o offset
                // Mas simplificando: Vamos assumir que a data calculada é Start + WeekOffset + DayOffset (0..6)
                // Onde DayOffset é baseado no dia da semana.
                // Mas se o Start Date for Quarta, e o post for Segunda, tecnicamente é na proxima segunda?
                // Vamos simplificar: Data do Post = StartDate + (WeekIdx * 7) + Index do Array (0, 2, 4...)
                break; 
            }
        }
        // Fallback: Apenas mostra a semana
        return start.toLocaleDateString();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Wand2 className="h-8 w-8 text-brand-600" /> Assistente de Conteúdo
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Crie posts, imagens e vídeos alinhados à sua marca.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('persona')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'persona' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>
                        <UserCircle className="w-4 h-4"/> Minha Marca
                    </button>
                    <button onClick={() => setActiveTab('generator')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'generator' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>
                        <Sparkles className="w-4 h-4"/> Criar
                    </button>
                    <button onClick={() => setActiveTab('planner')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'planner' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>
                        <Calendar className="w-4 h-4"/> Planejador
                    </button>
                </div>
            </header>

            {/* --- PERSONA TAB --- */}
            {activeTab === 'persona' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto">
                    <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Definição da Persona do Studio</h2>
                    <p className="mb-6 text-slate-500 text-sm">A IA usará estas informações para escrever como você.</p>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Filosofia do Studio</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24"
                                placeholder="Ex: Pilates clássico com foco em reabilitação e bem-estar integral..."
                                value={persona?.philosophy || ''}
                                onChange={e => setPersona(prev => ({ ...prev!, philosophy: e.target.value } as StudioPersona))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Diferenciais</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24"
                                placeholder="Ex: Atendimento individualizado, equipamentos de ponta, ambiente zen..."
                                value={persona?.differentiators || ''}
                                onChange={e => setPersona(prev => ({ ...prev!, differentiators: e.target.value } as StudioPersona))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Linguagem a Evitar</label>
                            <input 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                placeholder="Ex: 'Barriga chapada', 'Projeto verão', gírias excessivas..."
                                value={persona?.languageToAvoid || ''}
                                onChange={e => setPersona(prev => ({ ...prev!, languageToAvoid: e.target.value } as StudioPersona))}
                            />
                        </div>
                        <Button onClick={handleSavePersona} className="w-full">Salvar Persona</Button>
                    </div>
                </div>
            )}

            {/* --- GENERATOR TAB --- */}
            {activeTab === 'generator' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Controls */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">O que vamos criar hoje?</h3>
                            
                            <div className="space-y-4">
                                <Input 
                                    label="Tema do Conteúdo" 
                                    placeholder="Ex: Benefícios do Pilates para dor nas costas..."
                                    value={request.theme}
                                    onChange={e => setRequest({...request, theme: e.target.value})}
                                />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formato</label>
                                        <select 
                                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                            value={request.format}
                                            onChange={e => setRequest({...request, format: e.target.value})}
                                        >
                                            <option>Post Estático</option>
                                            <option>Carrossel</option>
                                            <option>Reels</option>
                                            <option>Story</option>
                                            <option>Legenda Simples</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Objetivo</label>
                                        <select 
                                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                            value={request.objective}
                                            onChange={e => setRequest({...request, objective: e.target.value})}
                                        >
                                            <option>Educação</option>
                                            <option>Inspiração</option>
                                            <option>Venda/Matrícula</option>
                                            <option>Engajamento</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Público</label>
                                        <select 
                                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                            value={request.audience}
                                            onChange={e => setRequest({...request, audience: e.target.value})}
                                        >
                                            <option>Alunos Iniciantes</option>
                                            <option>Intermediários</option>
                                            <option>Idosos</option>
                                            <option>Gestantes</option>
                                            <option>Atletas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estilo Visual</label>
                                        <select 
                                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                            value={request.imageStyle}
                                            onChange={e => setRequest({...request, imageStyle: e.target.value})}
                                        >
                                            <option>Fotorealista</option>
                                            <option>Minimalista</option>
                                            <option>Ilustração</option>
                                            <option>Cinematográfico</option>
                                        </select>
                                    </div>
                                </div>

                                <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full mt-4">
                                    {isGenerating ? loadingMessage : <><Sparkles className="w-4 h-4 mr-2"/> Gerar Conteúdo</>}
                                </Button>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold text-sm text-slate-500 uppercase mb-4">Posts Salvos Recentemente</h3>
                            <div className="space-y-3">
                                {savedPosts.slice(0, 5).map(post => (
                                    <div key={post.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-white truncate w-40">{post.request.theme || 'Sem tema'}</p>
                                            <p className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenSavedPost(post)} className="h-8 w-8 p-0" title="Visualizar / Editar">
                                                <Eye className="w-4 h-4 text-brand-600"/>
                                            </Button>
                                            <button onClick={() => deleteSavedPost(post.id).then(() => setSavedPosts(savedPosts.filter(p => p.id !== post.id)))} className="p-2 text-slate-400 hover:text-red-500 rounded-lg" title="Excluir">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {savedPosts.length === 0 && <p className="text-slate-400 text-sm">Nenhum post salvo.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Right: Output */}
                    <div className="space-y-6">
                        {generatedText ? (
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg text-brand-600">Resultado Gerado</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => navigator.clipboard.writeText(generatedText)} className="p-2 text-slate-400 hover:text-brand-600 rounded-lg bg-slate-50 dark:bg-slate-800" title="Copiar Texto">
                                            <Copy className="w-4 h-4"/>
                                        </button>
                                        <button onClick={handleSavePostLocal} className="p-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg" title="Salvar">
                                            <Save className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>

                                {/* Image/Video Display */}
                                {(generatedImage || generatedVideo) && (
                                    <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                                        {generatedVideo ? (
                                            <video src={generatedVideo} controls className="w-full max-h-96 object-contain" />
                                        ) : (
                                            <img src={generatedImage!} alt="Gerado" className="w-full max-h-96 object-cover" />
                                        )}
                                        <div className="p-2 flex justify-center gap-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                            <a href={generatedVideo || generatedImage!} download="conteudo_pilates" target="_blank" rel="noreferrer" className="text-xs text-brand-600 font-bold hover:underline">
                                                Baixar Mídia
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none whitespace-pre-wrap bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {generatedText}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
                                {isGenerating ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4"/>
                                        <p className="text-slate-600 dark:text-slate-300 font-medium">{loadingMessage}</p>
                                    </div>
                                ) : (
                                    <>
                                        <Layout className="w-12 h-12 mb-2 opacity-50"/>
                                        <p>O conteúdo gerado aparecerá aqui.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- PLANNER TAB --- */}
            {activeTab === 'planner' && (
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Gerar Novo Plano Estratégico</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label="Objetivo Principal" value={planGoals.mainObjective} onChange={e => setPlanGoals({...planGoals, mainObjective: e.target.value})} placeholder="Ex: captar alunos" />
                            <Input label="Público Alvo" value={planGoals.targetAudience} onChange={e => setPlanGoals({...planGoals, targetAudience: e.target.value})} placeholder="Ex: mulheres" />
                            <Input label="Temas Chave" value={planGoals.keyThemes} onChange={e => setPlanGoals({...planGoals, keyThemes: e.target.value})} placeholder="Ex: saude" />
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duração do Plano</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-[42px]"
                                    value={planDuration}
                                    onChange={e => setPlanDuration(Number(e.target.value))}
                                >
                                    <option value={4}>4 Semanas (Mensal)</option>
                                    <option value={12}>12 Semanas (Trimestral)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Posts por Semana</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-[42px]"
                                    value={planFrequency}
                                    onChange={e => setPlanFrequency(Number(e.target.value))}
                                >
                                    <option value={1}>1x (Semanal)</option>
                                    <option value={2}>2x (Ter/Qui)</option>
                                    <option value={3}>3x (Seg/Qua/Sex)</option>
                                    <option value={4}>4x</option>
                                    <option value={6}>6x (Seg-Sáb)</option>
                                    <option value={7}>7x (Diário)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Início</label>
                                <input 
                                    type="date"
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-[42px]"
                                    value={planStartDate}
                                    onChange={e => setPlanStartDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleGeneratePlan} isLoading={isGenerating} className="mt-4 w-full md:w-auto">
                            <Calendar className="w-4 h-4 mr-2"/> Gerar Calendário ({planDuration} Semanas)
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Planos Salvos</h3>
                        {plans.length === 0 ? <p className="text-slate-500">Nenhum plano salvo.</p> : (
                            <div className="grid gap-6">
                                {plans.map(plan => (
                                    <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <div>
                                                <h4 className="font-bold text-brand-700 text-lg">Plano Estratégico ({plan.weeks?.length || 0} semanas)</h4>
                                                <p className="text-sm text-slate-500">Criado em {new Date(plan.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <button onClick={() => deleteContentPlan(plan.id).then(() => setPlans(plans.filter(p => p.id !== plan.id)))} className="text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>
                                        </div>
                                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                            {/* Safety check: ensure weeks exists and is an array */}
                                            {plan.weeks && Array.isArray(plan.weeks) ? (
                                                plan.weeks.map((week, idx) => (
                                                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg">
                                                        <h5 className="font-bold text-slate-800 dark:text-white mb-2 text-lg">
                                                            {week.week}: {week.theme}
                                                        </h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                            {week.ideas && week.ideas.map((idea, i) => (
                                                                <div key={i} className="text-sm border border-slate-200 dark:border-slate-800 p-3 rounded bg-white dark:bg-slate-900 shadow-sm relative group">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className="font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded text-xs">
                                                                            {idea.day}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400 font-mono border border-slate-200 dark:border-slate-700 px-1 rounded">
                                                                            {idea.format}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-1 leading-snug">{idea.theme}</p>
                                                                    <p className="text-xs text-slate-500">{idea.objective}</p>
                                                                    
                                                                    <button 
                                                                        onClick={() => {
                                                                            // Passa os dados do plano para o gerador
                                                                            setRequest({ ...INITIAL_REQUEST, theme: idea.theme, format: idea.format, objective: idea.objective });
                                                                            setActiveTab('generator');
                                                                            window.scrollTo({top: 0, behavior: 'smooth'});
                                                                        }}
                                                                        className="w-full mt-3 text-center text-xs text-blue-600 font-bold hover:bg-blue-50 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                                                                    >
                                                                        Gerar este Post <ArrowRight className="w-3 h-3"/>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-red-500 text-sm p-4 bg-red-50 rounded">
                                                    Erro: Dados do plano corrompidos ou inválidos. Tente gerar novamente.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
