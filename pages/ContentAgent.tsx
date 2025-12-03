
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
import { Wand2, Calendar, Layout, Loader2, Sparkles, Copy, Trash2, Video, Image as ImageIcon, CheckCircle, Save, UserCircle, Eye, ArrowRight, X, Settings2, RefreshCw, MessageSquarePlus, Lock } from 'lucide-react';
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

export const ContentAgent: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'persona' | 'generator' | 'planner'>('generator');
    
    // Data States
    const [persona, setPersona] = useState<StudioPersona | null>(null);
    const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
    const [plans, setPlans] = useState<StrategicContentPlan[]>([]);
    const [studioLogoUrl, setStudioLogoUrl] = useState<string | null>(null);
    
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
        
        // Load Persona
        const p = await fetchStudioPersona(user.id);
        setPersona(p);
        if (!p) setActiveTab('persona'); 

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

    // --- PERSONA LOGIC ---
    const handleSavePersona = async () => {
        if (!user?.id || !persona) return;
        const res = await saveStudioPersona(user.id, persona);
        if (res.success) {
            alert(t('save_all'));
            setActiveTab('generator');
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
        
        // Veo API Key Check for Video
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

        // Variaveis locais para salvar
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
            // Text
            const stream = generatePilatesContentStream(activeRequest, systemInstruction);
            for await (const chunk of stream) {
                finalContent += chunk;
                setGeneratedText(prev => prev + chunk);
            }

            // Image
            if (['Post Estático', 'Carrossel', 'Story'].includes(activeRequest.format)) {
                setLoadingMessage(t('loading') + ' Image...');
                let img = await generatePilatesImage(activeRequest, null, finalContent);
                
                // Apply Logo if enabled and available
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

            // Video
            if (['Reels', 'Video Curto', 'TikTok'].includes(activeRequest.format)) {
                setLoadingMessage(t('loading') + ' Video...');
                const vid = await generatePilatesVideo(finalContent, (msg) => setLoadingMessage(msg));
                finalVideo = vid;
                setGeneratedVideo(vid);
            }

            // --- AUTO SAVE & LOG LOGIC ---
            if (user?.id) {
                const newPost: SavedPost = {
                    id: crypto.randomUUID(),
                    request: activeRequest,
                    content: finalContent,
                    imageUrl: finalImage,
                    videoUrl: finalVideo,
                    createdAt: new Date().toISOString()
                };
                
                // 1. Save Content (Visible in History)
                const saveResult = await savePost(user.id, newPost);
                
                // 2. Log Usage (Permanent Count)
                await recordGenerationUsage(user.id);
                
                if (saveResult.success) {
                    setSavedPosts(prev => [newPost, ...prev]);
                    
                    // Increment local counter
                    const newCount = todayCount + 1;
                    setTodayCount(newCount);
                    if (newCount >= dailyLimit) setIsLimitReached(true);

                    // Update Plan if applicable
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
        // Merge modification prompt into a temporary override request
        const override = { ...request, modificationPrompt: modificationInput };
        handleGenerate(override);
        setModificationInput('');
    };

    const handleOpenSavedPost = (post: SavedPost) => {
        // Load data into generator safely
        setRequest({ ...INITIAL_REQUEST, ...post.request });
        setGeneratedText(post.content);
        setGeneratedImage(post.imageUrl || null);
        setGeneratedVideo(post.videoUrl || null);
        
        setActiveTab('generator');
        setGeneratingFromPlan(null); // Clear context if viewing old post
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateLogoConfig = (key: keyof LogoConfig, value: any) => {
        setRequest(prev => ({
            ...prev,
            logoConfig: {
                ...prev.logoConfig!,
                [key]: value
            }
        }));
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

    // Helper to calculate specific date for a post idea
    const getCalculatedDate = (startStr: string | undefined, weekIndex: number, dayName: string) => {
        if (!startStr) return "Data não definida";
        
        const start = new Date(startStr);
        // Normalize day name
        const dayLower = dayName.toLowerCase();
        
        const dayMap: {[key:string]: number} = {
            'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6,
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
        };

        // Find match
        let targetDay = -1;
        for (const key in dayMap) {
            if (dayLower.includes(key)) {
                targetDay = dayMap[key];
                break;
            }
        }

        if (targetDay === -1) {
            // Fallback: Just return generic week range
            return `Semana ${weekIndex + 1}`;
        }
        
        const currentWeekStart = new Date(start);
        currentWeekStart.setDate(start.getDate() + (weekIndex * 7));
        
        const date = new Date(currentWeekStart);
        while (date.getDay() !== targetDay) {
            date.setDate(date.getDate() + 1);
        }
        
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Wand2 className="h-8 w-8 text-brand-600" /> {t('content_title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">{t('content_subtitle')}</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('persona')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'persona' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>
                        <UserCircle className="w-4 h-4"/> {t('tab_persona')}
                    </button>
                    <button onClick={() => setActiveTab('generator')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'generator' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>
                        <Sparkles className="w-4 h-4"/> {t('tab_generator')}
                    </button>
                    <button onClick={() => setActiveTab('planner')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'planner' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>
                        <Calendar className="w-4 h-4"/> {t('tab_planner')}
                    </button>
                </div>
            </header>

            {/* --- PERSONA TAB --- */}
            {activeTab === 'persona' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto">
                    <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{t('persona_title')}</h2>
                    <p className="mb-6 text-slate-500 text-sm">{t('persona_desc')}</p>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('philosophy_label')}</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24"
                                placeholder="Ex: Pilates clássico com foco em reabilitação e bem-estar integral..."
                                value={persona?.philosophy || ''}
                                onChange={e => setPersona(prev => ({ ...prev!, philosophy: e.target.value } as StudioPersona))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('differentiators_label')}</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24"
                                placeholder="Ex: Atendimento individualizado, equipamentos de ponta, ambiente zen..."
                                value={persona?.differentiators || ''}
                                onChange={e => setPersona(prev => ({ ...prev!, differentiators: e.target.value } as StudioPersona))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('avoid_terms_label')}</label>
                            <input 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                placeholder="Ex: 'Barriga chapada', 'Projeto verão', gírias excessivas..."
                                value={persona?.languageToAvoid || ''}
                                onChange={e => setPersona(prev => ({ ...prev!, languageToAvoid: e.target.value } as StudioPersona))}
                            />
                        </div>
                        <Button onClick={handleSavePersona} className="w-full">{t('save_persona_btn')}</Button>
                    </div>
                </div>
            )}

            {/* --- GENERATOR TAB --- */}
            {activeTab === 'generator' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Controls */}
                    <div className="space-y-6">
                        {/* Usage Limit Display */}
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

                            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">{t('what_create')}</h3>
                            
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

                        {/* Recent History */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold text-sm text-slate-500 uppercase mb-4">{t('recent_posts')}</h3>
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
            )}

            {/* --- PLANNER TAB --- */}
            {activeTab === 'planner' && (
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">{t('new_plan')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label={t('objective_label')} value={planGoals.mainObjective} onChange={e => setPlanGoals({...planGoals, mainObjective: e.target.value})} placeholder="Ex: captar alunos" />
                            <Input label={t('audience_label')} value={planGoals.targetAudience} onChange={e => setPlanGoals({...planGoals, targetAudience: e.target.value})} placeholder="Ex: mulheres" />
                            <Input label={t('theme_label')} value={planGoals.keyThemes} onChange={e => setPlanGoals({...planGoals, keyThemes: e.target.value})} placeholder="Ex: saude" />
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('duration_label')}</label>
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('frequency_label')}</label>
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('start_date_label')}</label>
                                <input 
                                    type="date"
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-[42px]"
                                    value={planStartDate}
                                    onChange={e => setPlanStartDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleGeneratePlan} isLoading={isGenerating} className="mt-4 w-full md:w-auto">
                            <Calendar className="w-4 h-4 mr-2"/> {t('generate_calendar_btn')}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{t('saved_plans')}</h3>
                        {plans.length === 0 ? <p className="text-slate-500">Nenhum plano salvo.</p> : (
                            <div className="grid gap-6">
                                {plans.map(plan => (
                                    <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <div>
                                                <h4 className="font-bold text-brand-700 text-lg">Plano Estratégico ({plan.weeks?.length || 0} semanas)</h4>
                                                <p className="text-sm text-slate-500">Início: {new Date(plan.startDate || plan.createdAt).toLocaleDateString()}</p>
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
                                                                <div key={i} className="text-sm border border-slate-200 dark:border-slate-800 p-3 rounded bg-white dark:bg-slate-900 shadow-sm relative group flex flex-col justify-between">
                                                                    <div>
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded text-xs flex flex-col">
                                                                                <span>{idea.day}</span>
                                                                                <span className="text-[10px] text-brand-400 mt-0.5">
                                                                                    {getCalculatedDate(plan.startDate, idx, idea.day)}
                                                                                </span>
                                                                            </span>
                                                                            <span className="text-xs text-slate-400 font-mono border border-slate-200 dark:border-slate-700 px-1 rounded">
                                                                                {idea.format}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-slate-700 dark:text-slate-300 font-medium mb-1 leading-snug">{idea.theme}</p>
                                                                        <p className="text-xs text-slate-500 mb-3">{idea.objective}</p>
                                                                    </div>
                                                                    
                                                                    {idea.generatedPostId ? (
                                                                        <button 
                                                                            onClick={() => {
                                                                                const post = savedPosts.find(p => p.id === idea.generatedPostId);
                                                                                if (post) {
                                                                                    handleOpenSavedPost(post);
                                                                                } else {
                                                                                    alert("Post não encontrado. Pode ter sido excluído.");
                                                                                }
                                                                            }}
                                                                            className="w-full mt-auto text-center text-xs text-white bg-green-600 hover:bg-green-700 font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                                                                        >
                                                                            <Eye className="w-3 h-3"/> Visualizar Post
                                                                        </button>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={() => {
                                                                                // Set Planner Context
                                                                                setGeneratingFromPlan({ planId: plan.id, weekIdx: idx, ideaIdx: i });
                                                                                // Pass Idea to Generator
                                                                                setRequest({ ...INITIAL_REQUEST, theme: idea.theme, format: idea.format, objective: idea.objective });
                                                                                setActiveTab('generator');
                                                                                window.scrollTo({top: 0, behavior: 'smooth'});
                                                                            }}
                                                                            className="w-full mt-auto text-center text-xs text-blue-600 font-bold hover:bg-blue-50 py-1.5 rounded transition-colors flex items-center justify-center gap-1 border border-blue-100"
                                                                        >
                                                                            Gerar este Post <ArrowRight className="w-3 h-3"/>
                                                                        </button>
                                                                    )}
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
