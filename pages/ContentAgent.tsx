
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
    generatePilatesContentStream, 
    generatePilatesImage, 
    generatePilatesVideo, 
    generateContentPlan,
    generatePlannerSuggestion
} from '../services/geminiService';
import { 
    saveStudioPersona, 
    fetchStudioPersona, 
    savePost, 
    fetchSavedPosts, 
    deleteSavedPost,
    saveContentPlan,
    fetchContentPlans,
    deleteContentPlan,
    getTodayPostCount,
    recordGenerationUsage
} from '../services/contentService';
import { fetchProfile } from '../services/storage';
import { compositeImageWithLogo } from '../services/imageService';
import { 
    ContentRequest, 
    StudioPersona, 
    SavedPost, 
    StrategicContentPlan,
    LogoConfig,
    AppRoute
} from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Calendar, Layout, Loader2, Sparkles, Copy, Trash2, Video, Image as ImageIcon, CheckCircle, Save, UserCircle, Eye, ArrowRight, X, Settings2, RefreshCw, MessageSquarePlus, Lock, ArrowLeft, Lightbulb, Zap, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const INITIAL_REQUEST: ContentRequest = {
    format: 'Post Estático',
    objective: 'Educação',
    theme: '',
    audience: 'Alunos Iniciantes',
    tone: 'Inspirador',
    imageStyle: 'Fotorealista',
    logoConfig: {
        enabled: false,
        type: 'normal',
        position: 'bottom-right',
        size: 'small'
    }
};

const SuggestionInput = ({ 
    label, 
    value, 
    onChange, 
    onSuggestion, 
    loading,
    hasStrategy 
}: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    onSuggestion: (type: 'strategy' | 'random') => void,
    loading: boolean,
    hasStrategy: boolean
}) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <div className="space-y-2">
            <textarea 
                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-20 resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Digite ou use a IA..."
            />
            <div className="flex gap-2">
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => onSuggestion('strategy')}
                    disabled={loading || !hasStrategy}
                    title={!hasStrategy ? "Crie um Planejamento Estratégico primeiro" : "Usar base estratégica"}
                >
                    <Lightbulb className="w-3 h-3 mr-1 text-yellow-500" /> Sugerir (Estratégia)
                </Button>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => onSuggestion('random')}
                    disabled={loading}
                >
                    <Zap className="w-3 h-3 mr-1 text-blue-500" /> Sugerir (Aleatório)
                </Button>
            </div>
        </div>
    </div>
);

export const ContentAgent: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    
    // View State
    const [view, setView] = useState<'home' | 'generator' | 'planner' | 'persona'>('home');
    
    // Data States
    const [persona, setPersona] = useState<StudioPersona | null>(null);
    const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
    const [plans, setPlans] = useState<StrategicContentPlan[]>([]);
    const [studioLogoUrl, setStudioLogoUrl] = useState<string | null>(null);
    const [strategicContext, setStrategicContext] = useState('');
    
    // Limits State
    const [dailyLimit, setDailyLimit] = useState<number>(5);
    const [todayCount, setTodayCount] = useState<number>(0);
    const [isLimitReached, setIsLimitReached] = useState(false);

    // Generator States
    const [request, setRequest] = useState<ContentRequest>(INITIAL_REQUEST);
    const [generatedText, setGeneratedText] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [modificationInput, setModificationInput] = useState('');
    
    // Planner Integration State
    const [generatingFromPlan, setGeneratingFromPlan] = useState<{planId: string, weekIdx: number, ideaIdx: number} | null>(null);
    
    // Planner Wizard States
    const [planForm, setPlanForm] = useState({
        name: '',
        mainGoal: '',
        audience: '',
        message: '',
        differentiators: '',
        objections: '',
        tone: '',
        events: '',
        frequency: 3,
        startDate: new Date().toISOString().split('T')[0]
    });
    const [suggestionLoading, setSuggestionLoading] = useState(false);

    useEffect(() => {
        if (user?.id) {
            loadInitialData();
            loadStrategicContext();
        }
    }, [user]);

    const loadStrategicContext = () => {
        const saved = localStorage.getItem('pilates_strategic_plans');
        if (saved) {
            try {
                const plans = JSON.parse(saved);
                if (plans.length > 0) {
                    setStrategicContext(JSON.stringify(plans[0].planData));
                }
            } catch (e) {
                console.error("Error loading strategy context", e);
            }
        }
    };

    const loadInitialData = async () => {
        if (!user?.id) return;
        
        // Load Persona
        const p = await fetchStudioPersona(user.id);
        setPersona(p);

        // Load Profile (Logo & Limits)
        const profile = await fetchProfile(user.id);
        if (profile) {
            if (profile.logoUrl) setStudioLogoUrl(profile.logoUrl);
            if (profile.planMaxDailyPosts) setDailyLimit(profile.planMaxDailyPosts);
        }

        // Load Posts & Plans
        const posts = await fetchSavedPosts(user.id);
        setSavedPosts(posts);

        // Check Limit Usage
        const count = await getTodayPostCount(user.id);
        setTodayCount(count);
        setIsLimitReached(count >= (profile?.planMaxDailyPosts || 5));

        const fetchedPlans = await fetchContentPlans(user.id);
        setPlans(fetchedPlans);
    };

    // --- HELPER: Fill suggestion ---
    const handlePlannerSuggestion = async (field: keyof typeof planForm, label: string, type: 'strategy' | 'random') => {
        setSuggestionLoading(true);
        const suggestions = await generatePlannerSuggestion(label, strategicContext, type);
        setSuggestionLoading(false);
        
        if (suggestions.length > 0) {
            // Simple logic: pick first one or join them. Let's join for now so user sees options
            // Better: Show a small modal or dropdown? For simplicity, fill the first one and append others as comments or let user edit.
            // Let's just fill the first one for now as per "Suggest" behavior often replaces.
            setPlanForm(prev => ({ ...prev, [field]: suggestions[0] }));
        }
    };

    // --- PERSONA LOGIC ---
    const handleSavePersona = async () => {
        if (!user?.id || !persona) return;
        const res = await saveStudioPersona(user.id, persona);
        if (res.success) {
            alert(t('save_all'));
            setView('home');
        } else {
            alert('Erro ao salvar persona.');
        }
    };

    // --- GENERATOR LOGIC ---
    const handleGenerate = async (overrideRequest?: ContentRequest) => {
        if (isLimitReached) {
            alert(t('limit_desc'));
            return;
        }

        const activeRequest = { ...request, ...(overrideRequest || {}) };

        if (!activeRequest.theme) {
            alert('Por favor, defina um tema.');
            return;
        }
        
        if (['Reels', 'Video Curto', 'TikTok'].includes(activeRequest.format)) {
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
        setLoadingMessage(t('loading'));

        let finalContent = '';
        let finalImage: string | null = null;
        let finalVideo: string | null = null;

        const systemInstruction = persona ? `
            Você é o assistente de conteúdo do Studio.
            Filosofia: ${persona.philosophy}
            Diferenciais: ${persona.differentiators}
            Evitar termos: ${persona.languageToAvoid}
        ` : 'Você é um especialista em Pilates.';

        try {
            const stream = generatePilatesContentStream(activeRequest, systemInstruction);
            for await (const chunk of stream) {
                finalContent += chunk;
                setGeneratedText(prev => prev + chunk);
            }

            if (['Post Estático', 'Carrossel', 'Story'].includes(activeRequest.format)) {
                setLoadingMessage(t('loading') + ' Image...');
                let img = await generatePilatesImage(activeRequest, null, finalContent);
                if (img && activeRequest.logoConfig?.enabled && studioLogoUrl) {
                    setLoadingMessage('Aplicando logo...');
                    try {
                        img = await compositeImageWithLogo(img, studioLogoUrl, activeRequest.logoConfig);
                    } catch (logoErr) {
                        console.error("Failed to apply logo", logoErr);
                    }
                }
                finalImage = img;
                setGeneratedImage(img);
            }

            if (['Reels', 'Video Curto', 'TikTok'].includes(activeRequest.format)) {
                setLoadingMessage(t('loading') + ' Video...');
                const vid = await generatePilatesVideo(finalContent, (msg) => setLoadingMessage(msg));
                finalVideo = vid;
                setGeneratedVideo(vid);
            }

            if (user?.id) {
                const newPost: SavedPost = {
                    id: crypto.randomUUID(),
                    request: activeRequest,
                    content: finalContent,
                    imageUrl: finalImage,
                    videoUrl: finalVideo,
                    createdAt: new Date().toISOString()
                };
                
                const saveResult = await savePost(user.id, newPost);
                await recordGenerationUsage(user.id);
                
                if (saveResult.success) {
                    setSavedPosts(prev => [newPost, ...prev]);
                    const newCount = todayCount + 1;
                    setTodayCount(newCount);
                    if (newCount >= dailyLimit) setIsLimitReached(true);

                    if (generatingFromPlan) {
                        const planToUpdate = plans.find(p => p.id === generatingFromPlan.planId);
                        if (planToUpdate && planToUpdate.weeks) {
                            const updatedWeeks = [...planToUpdate.weeks];
                            if (updatedWeeks[generatingFromPlan.weekIdx]?.ideas[generatingFromPlan.ideaIdx]) {
                                updatedWeeks[generatingFromPlan.weekIdx].ideas[generatingFromPlan.ideaIdx].generatedPostId = newPost.id;
                                const updatedPlan = { ...planToUpdate, weeks: updatedWeeks };
                                await saveContentPlan(user.id, updatedPlan);
                                setPlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p));
                            }
                        }
                        setGeneratingFromPlan(null);
                    }
                }
            }

        } catch (e: any) {
            console.error(e);
            alert("Erro na geração: " + e.message);
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleRefine = () => {
        if (!modificationInput.trim()) return;
        const override = { ...request, modificationPrompt: modificationInput };
        handleGenerate(override);
        setModificationInput('');
    };

    const handleOpenSavedPost = (post: SavedPost) => {
        setRequest({ ...INITIAL_REQUEST, ...post.request });
        setGeneratedText(post.content);
        setGeneratedImage(post.imageUrl || null);
        setGeneratedVideo(post.videoUrl || null);
        setView('generator');
        setGeneratingFromPlan(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateLogoConfig = (key: keyof LogoConfig, value: any) => {
        setRequest(prev => ({
            ...prev,
            logoConfig: { ...prev.logoConfig!, [key]: value }
        }));
    };

    // --- PLANNER LOGIC ---
    const handleGeneratePlan = async () => {
        if (!user?.id) return;
        if (!planForm.name) { alert("Dê um nome ao plano."); return; }
        if (!planForm.mainGoal) { alert("Defina a meta principal."); return; }

        setIsGenerating(true);
        try {
            const rawPlan = await generateContentPlan(planForm, persona);

            if (!rawPlan || !Array.isArray(rawPlan) || rawPlan.length === 0) {
                throw new Error("Falha ao gerar plano (JSON inválido)");
            }

            const newPlan: StrategicContentPlan = {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                startDate: planForm.startDate,
                frequency: planForm.frequency,
                goals: { 
                    mainObjective: planForm.mainGoal, 
                    targetAudience: [planForm.audience], 
                    keyThemes: [`Msg: ${planForm.message}`, `Diff: ${planForm.differentiators}`] 
                },
                inputs: planForm, // Store full inputs
                weeks: rawPlan
            };

            await saveContentPlan(user.id, newPlan);
            setPlans([newPlan, ...plans]);
            alert("Plano gerado com sucesso!");
            setView('home'); // Go back to home to see the plan in list
        } catch (e) {
            console.error("Plan Error:", e);
            alert("Erro ao gerar plano. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const getCalculatedDate = (startStr: string | undefined, weekIndex: number, dayName: string) => {
        if (!startStr) return "Data não definida";
        const start = new Date(startStr);
        const dayLower = dayName.toLowerCase();
        
        const dayMap: {[key:string]: number} = {
            'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6,
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
        };

        let targetDay = -1;
        for (const key in dayMap) {
            if (dayLower.includes(key)) {
                targetDay = dayMap[key];
                break;
            }
        }

        if (targetDay === -1) return `Semana ${weekIndex + 1}`;
        
        const currentWeekStart = new Date(start);
        currentWeekStart.setDate(start.getDate() + (weekIndex * 7));
        
        const date = new Date(currentWeekStart);
        while (date.getDay() !== targetDay) {
            date.setDate(date.getDate() + 1);
        }
        
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' });
    };

    // --- RENDER VIEWS ---

    if (view === 'persona') {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => setView('home')}><ArrowLeft className="w-5 h-5"/></Button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('persona_title')}</h2>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="mb-6 text-slate-500 text-sm">{t('persona_desc')}</p>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('philosophy_label')}</label>
                            <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24" placeholder="Ex: Pilates clássico com foco em reabilitação..." value={persona?.philosophy || ''} onChange={e => setPersona(prev => ({ ...prev!, philosophy: e.target.value } as StudioPersona))}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('differentiators_label')}</label>
                            <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24" placeholder="Ex: Atendimento individualizado..." value={persona?.differentiators || ''} onChange={e => setPersona(prev => ({ ...prev!, differentiators: e.target.value } as StudioPersona))}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('avoid_terms_label')}</label>
                            <input className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950" placeholder="Ex: 'Projeto verão', gírias..." value={persona?.languageToAvoid || ''} onChange={e => setPersona(prev => ({ ...prev!, languageToAvoid: e.target.value } as StudioPersona))}/>
                        </div>
                        <Button onClick={handleSavePersona} className="w-full">{t('save_persona_btn')}</Button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'home') {
        return (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Wand2 className="h-8 w-8 text-brand-600" /> Instagram
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">Gerencie sua presença digital.</p>
                    </div>
                    <Button variant="outline" onClick={() => setView('persona')}>
                        <UserCircle className="w-4 h-4 mr-2"/> Minha Marca
                    </Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                        onClick={() => setView('generator')}
                        className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-400 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left flex flex-col justify-between min-h-[200px]"
                    >
                        <div className="relative z-10">
                            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                <Sparkles className="text-white w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Criar um Post Específico</h2>
                            <p className="text-blue-100 text-sm">Gere legendas, imagens e vídeos para um post único.</p>
                        </div>
                        <ArrowRight className="text-white w-6 h-6 self-end group-hover:translate-x-2 transition-transform" />
                        <Sparkles className="absolute -right-8 -bottom-8 w-32 h-32 text-white opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    </button>

                    <button 
                        onClick={() => setView('planner')}
                        className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-500 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left flex flex-col justify-between min-h-[200px]"
                    >
                        <div className="relative z-10">
                            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                <Calendar className="text-white w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Criar Plano de 4 Semanas</h2>
                            <p className="text-purple-100 text-sm">Organize seu calendário com estratégia completa.</p>
                        </div>
                        <ArrowRight className="text-white w-6 h-6 self-end group-hover:translate-x-2 transition-transform" />
                        <Calendar className="absolute -right-8 -bottom-8 w-32 h-32 text-white opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    </button>
                </div>

                <div className="space-y-6">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white border-b pb-2 dark:border-slate-800">Últimas Criações</h3>
                    
                    {plans.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-500 uppercase">Planos Ativos</h4>
                            <div className="grid gap-4">
                                {plans.slice(0, 3).map(plan => (
                                    <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <div>
                                                <h4 className="font-bold text-brand-700 text-lg">{plan.inputs?.name || 'Plano Estratégico'}</h4>
                                                <p className="text-sm text-slate-500">Início: {new Date(plan.startDate || plan.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <button onClick={() => deleteContentPlan(plan.id).then(() => setPlans(plans.filter(p => p.id !== plan.id)))} className="text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>
                                        </div>
                                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                            {plan.weeks && plan.weeks.map((week, idx) => (
                                                <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-sm">
                                                    <h5 className="font-bold text-slate-800 dark:text-white mb-2">{week.week}: {week.theme}</h5>
                                                    <div className="space-y-2">
                                                        {week.ideas && week.ideas.map((idea, i) => (
                                                            <div key={i} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 last:border-0">
                                                                <span className="font-medium">{idea.day}: {idea.theme}</span>
                                                                {idea.generatedPostId ? (
                                                                    <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Criado</span>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => {
                                                                            setGeneratingFromPlan({ planId: plan.id, weekIdx: idx, ideaIdx: i });
                                                                            setRequest({ ...INITIAL_REQUEST, theme: idea.theme, format: idea.format, objective: idea.objective });
                                                                            setView('generator');
                                                                        }}
                                                                        className="text-blue-600 hover:underline"
                                                                    >
                                                                        Gerar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-500 uppercase mt-4">Posts Recentes</h4>
                        {savedPosts.slice(0, 5).map(post => (
                            <div key={post.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate w-64">{post.request.theme || 'Sem tema'}</p>
                                    <p className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleDateString()} • {post.request.format}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenSavedPost(post)} className="h-8 w-8 p-0">
                                        <Eye className="w-4 h-4 text-brand-600"/>
                                    </Button>
                                    <button onClick={() => deleteSavedPost(post.id).then(() => setSavedPosts(savedPosts.filter(p => p.id !== post.id)))} className="p-2 text-slate-400 hover:text-red-500 rounded-lg">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'planner') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => setView('home')}><ArrowLeft className="w-5 h-5"/></Button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar Plano de 4 Semanas</h2>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <Input label="i. Nome do Plano" placeholder="Ex: Planejamento Outubro/Novembro" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} />
                        </div>
                        
                        <div className="md:col-span-2">
                            <SuggestionInput 
                                label="ii. Qual a sua Meta Principal para este período?" 
                                value={planForm.mainGoal} 
                                onChange={v => setPlanForm({...planForm, mainGoal: v})}
                                onSuggestion={(t) => handlePlannerSuggestion('mainGoal', 'Meta Principal', t)}
                                loading={suggestionLoading}
                                hasStrategy={!!strategicContext}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SuggestionInput 
                                label="iii. Com quem você deseja se conectar (Público Alvo)?" 
                                value={planForm.audience} 
                                onChange={v => setPlanForm({...planForm, audience: v})}
                                onSuggestion={(t) => handlePlannerSuggestion('audience', 'Público Alvo', t)}
                                loading={suggestionLoading}
                                hasStrategy={!!strategicContext}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SuggestionInput 
                                label="iv. Qual a mensagem principal que você quer transmitir?" 
                                value={planForm.message} 
                                onChange={v => setPlanForm({...planForm, message: v})}
                                onSuggestion={(t) => handlePlannerSuggestion('message', 'Mensagem Principal', t)}
                                loading={suggestionLoading}
                                hasStrategy={!!strategicContext}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SuggestionInput 
                                label="v. O que torna o seu Studio único? (Diferenciais)" 
                                value={planForm.differentiators} 
                                onChange={v => setPlanForm({...planForm, differentiators: v})}
                                onSuggestion={(t) => handlePlannerSuggestion('differentiators', 'Diferenciais', t)}
                                loading={suggestionLoading}
                                hasStrategy={!!strategicContext}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SuggestionInput 
                                label="vi. Quais são as principais objeções dos clientes?" 
                                value={planForm.objections} 
                                onChange={v => setPlanForm({...planForm, objections: v})}
                                onSuggestion={(t) => handlePlannerSuggestion('objections', 'Objeções', t)}
                                loading={suggestionLoading}
                                hasStrategy={!!strategicContext}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SuggestionInput 
                                label="vii. Como você quer que a comunicação do Studio soe? (Tom)" 
                                value={planForm.tone} 
                                onChange={v => setPlanForm({...planForm, tone: v})}
                                onSuggestion={(t) => handlePlannerSuggestion('tone', 'Tom de Voz', t)}
                                loading={suggestionLoading}
                                hasStrategy={!!strategicContext}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">viii. Haverá alguma ocasião especial ou evento?</label>
                            <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-20 resize-none outline-none" value={planForm.events} onChange={e => setPlanForm({...planForm, events: e.target.value})} placeholder="Ex: Aniversário do Studio, Black Friday..."/>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ix. Frequência de posts</label>
                            <select className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950" value={planForm.frequency} onChange={e => setPlanForm({...planForm, frequency: Number(e.target.value)})}>
                                <option value={3}>3x por semana</option>
                                <option value={4}>4x por semana</option>
                                <option value={5}>5x por semana</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Início</label>
                            <input type="date" className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950" value={planForm.startDate} onChange={e => setPlanForm({...planForm, startDate: e.target.value})} />
                        </div>
                    </div>

                    <Button onClick={handleGeneratePlan} isLoading={isGenerating} className="w-full py-4 text-lg bg-brand-600 hover:bg-brand-700 text-white shadow-lg">
                        <Rocket className="w-5 h-5 mr-2" /> Gerar Plano Estratégico
                    </Button>
                </div>
            </div>
        );
    }

    // Default: Generator View
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setView('home')}><ArrowLeft className="w-5 h-5"/></Button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Criar Post Específico</h1>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Controls */}
                <div className="space-y-6">
                    <div className={`p-4 rounded-xl border flex justify-between items-center ${isLimitReached ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5"/>
                            <span className="font-bold text-sm">{t('creations_today')}:</span>
                        </div>
                        <span className="font-bold text-sm">{todayCount} / {dailyLimit}</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                        {isLimitReached && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 rounded-xl">
                                <Lock className="w-12 h-12 text-slate-400 mb-2"/>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{t('limit_reached')}</h3>
                                <p className="text-slate-600 dark:text-slate-300 mt-1">{t('limit_desc')}</p>
                            </div>
                        )}

                        {generatingFromPlan && (
                            <div className="mb-4 p-3 bg-brand-50 border border-brand-100 rounded-lg text-sm text-brand-800 flex items-center justify-between">
                                <span>Criando a partir do Plano Estratégico</span>
                                <button onClick={() => setGeneratingFromPlan(null)} className="text-brand-600 hover:text-brand-900"><X className="w-4 h-4"/></button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Input 
                                label={t('theme_label')} 
                                placeholder="Ex: Benefícios do Pilates para dor nas costas..."
                                value={request.theme}
                                onChange={e => setRequest({...request, theme: e.target.value})}
                                disabled={isLimitReached}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('format_label')}</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                        value={request.format}
                                        onChange={e => setRequest({...request, format: e.target.value})}
                                        disabled={isLimitReached}
                                    >
                                        <option>Post Estático</option>
                                        <option>Carrossel</option>
                                        <option>Reels</option>
                                        <option>Story</option>
                                        <option>Legenda Simples</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('objective_label')}</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                        value={request.objective}
                                        onChange={e => setRequest({...request, objective: e.target.value})}
                                        disabled={isLimitReached}
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
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('audience_label')}</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                        value={request.audience}
                                        onChange={e => setRequest({...request, audience: e.target.value})}
                                        disabled={isLimitReached}
                                    >
                                        <option>Alunos Iniciantes</option>
                                        <option>Intermediários</option>
                                        <option>Idosos</option>
                                        <option>Gestantes</option>
                                        <option>Atletas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('visual_style_label')}</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                        value={request.imageStyle}
                                        onChange={e => setRequest({...request, imageStyle: e.target.value})}
                                        disabled={isLimitReached}
                                    >
                                        <option>Fotorealista</option>
                                        <option>Minimalista</option>
                                        <option>Ilustração</option>
                                        <option>Cinematográfico</option>
                                    </select>
                                </div>
                            </div>

                            {/* LOGO SETTINGS */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Settings2 className="w-4 h-4" /> {t('logo_config_label')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">{request.logoConfig?.enabled ? t('active') : t('inactive')}</span>
                                        <input 
                                            type="checkbox" 
                                            checked={request.logoConfig?.enabled} 
                                            onChange={e => updateLogoConfig('enabled', e.target.checked)}
                                            disabled={!studioLogoUrl || isLimitReached}
                                            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                        />
                                    </div>
                                </div>
                                
                                {!studioLogoUrl && (
                                    <p className="text-xs text-red-500 mb-2">
                                        ⚠️ Adicione uma logo no "Perfil do Studio" para usar este recurso.
                                    </p>
                                )}

                                {request.logoConfig?.enabled && (
                                    <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-xs">
                                        <div>
                                            <label className="block mb-1 font-medium">Tipo</label>
                                            <select 
                                                value={request.logoConfig.type} 
                                                onChange={e => updateLogoConfig('type', e.target.value)}
                                                className="w-full p-1 border rounded bg-white dark:bg-slate-800"
                                                disabled={isLimitReached}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="watermark">Marca D'água</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-medium">Tamanho</label>
                                            <select 
                                                value={request.logoConfig.size} 
                                                onChange={e => updateLogoConfig('size', e.target.value)}
                                                className="w-full p-1 border rounded bg-white dark:bg-slate-800"
                                                disabled={isLimitReached}
                                            >
                                                <option value="small">Pequeno</option>
                                                <option value="medium">Médio</option>
                                                <option value="large">Grande</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-medium">Posição</label>
                                            <select 
                                                value={request.logoConfig.position} 
                                                onChange={e => updateLogoConfig('position', e.target.value)}
                                                className="w-full p-1 border rounded bg-white dark:bg-slate-800"
                                                disabled={isLimitReached}
                                            >
                                                <option value="top-left">Sup. Esq.</option>
                                                <option value="top-right">Sup. Dir.</option>
                                                <option value="bottom-left">Inf. Esq.</option>
                                                <option value="bottom-right">Inf. Dir.</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button onClick={() => handleGenerate()} isLoading={isGenerating} disabled={isLimitReached} className="w-full mt-4">
                                {isGenerating ? loadingMessage : <><Sparkles className="w-4 h-4 mr-2"/> {t('generate_btn')}</>}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right: Output */}
                <div className="space-y-6">
                    {generatedText ? (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-brand-600">{t('result_title')}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => navigator.clipboard.writeText(generatedText)} className="p-2 text-slate-400 hover:text-brand-600 rounded-lg bg-slate-50 dark:bg-slate-800" title="Copiar Texto">
                                        <Copy className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>

                            {/* Image/Video Display */}
                            {(generatedImage || generatedVideo) && (
                                <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                                    {generatedVideo ? (
                                        <video src={generatedVideo} controls className="w-full max-h-96 object-contain" />
                                    ) : (
                                        <img src={generatedImage!} alt="Gerado" className="w-full max-h-96 object-contain" />
                                    )}
                                    <div className="p-2 flex justify-center gap-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                        <a href={generatedVideo || generatedImage!} download="conteudo_pilates" target="_blank" rel="noreferrer" className="text-xs text-brand-600 font-bold hover:underline">
                                            {t('download_media')}
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none whitespace-pre-wrap bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800 mb-6">
                                {generatedText}
                            </div>

                            {/* Refinement Section */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <MessageSquarePlus className="w-4 h-4"/> {t('observations_label')}
                                </h4>
                                <div className="flex gap-2">
                                    <textarea
                                        value={modificationInput}
                                        onChange={(e) => setModificationInput(e.target.value)}
                                        placeholder="Ex: Caso queira solicitar alguma mudança no texto ou imagem..."
                                        className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none h-16"
                                    />
                                    <Button onClick={handleRefine} isLoading={isGenerating} disabled={isLimitReached} className="h-16 px-4">
                                        <RefreshCw className="w-4 h-4"/>
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Dica: Descreva o que você quer mudar e clique no botão para regenerar. Isso consumirá mais um crédito.
                                </p>
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
        </div>
    );
};
