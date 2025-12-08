import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generatePilatesContentStream, generatePilatesImage, generateMarketingContent } from '../services/geminiService';
import { savePost, getTodayPostCount, recordGenerationUsage, fetchSavedPosts, deleteSavedPost, saveContentPlan, fetchContentPlans, deleteContentPlan } from '../services/contentService';
import { ContentRequest, SavedPost, StrategicContentPlan } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Image as ImageIcon, Save, Copy, Loader2, Lightbulb, ArrowRight, ArrowLeft, RefreshCw, Trash2, History, Download, CalendarDays, FileText, Zap, UserPlus, Heart, BookOpen, ShoppingBag, Users, Camera, MessageCircle, Layout, RotateCcw, Layers, Video, CheckCircle } from 'lucide-react';
import { fetchProfile } from '../services/storage';

const OBJECTIVE_OPTIONS = [
  "Atrair novos alunos (Iniciantes)",
  "Divulgar promoção/oferta",
  "Educar sobre dores/patologias",
  "Engajamento (Perguntas/Enquetes)",
  "Bastidores do Studio",
  "Depoimento/Prova Social",
  "Outro (Descrever...)"
];

const THEME_OPTIONS = [
  "Dor na Coluna / Postura",
  "Pilates para Gestantes",
  "Pilates para Idosos",
  "Definição e Tônus Muscular",
  "Flexibilidade e Alongamento",
  "Alívio de Estresse",
  "Respiração e Controle",
  "Outro (Descrever...)"
];

const AUDIENCE_OPTIONS = [
  "Sedentários buscando saúde",
  "Praticantes de atividade física",
  "Gestantes e Pós-parto",
  "Idosos / Terceira Idade",
  "Pessoas com dor crônica",
  "Público Geral",
  "Outro (Descrever...)"
];

const TONE_OPTIONS = [
  "Profissional e Técnico",
  "Motivacional e Energético",
  "Acolhedor e Empático",
  "Descontraído e Divertido",
  "Educativo e Claro",
  "Outro (Descrever...)"
];

const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const ContentAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Mode State
  const [agentMode, setAgentMode] = useState<'post' | 'plan'>('post');

  // Post Inputs
  const [request, setRequest] = useState<ContentRequest>({
    format: 'Post Estático',
    objective: OBJECTIVE_OPTIONS[0],
    theme: THEME_OPTIONS[0],
    audience: AUDIENCE_OPTIONS[0],
    tone: TONE_OPTIONS[0],
    imageStyle: 'Fotorealista',
    logoConfig: { enabled: true, type: 'normal', position: 'bottom-right', size: 'medium' }
  });

  // Custom inputs state
  const [customInputs, setCustomInputs] = useState({
    objective: '',
    theme: '',
    audience: '',
    tone: ''
  });

  // Generated Post State
  const [generatedText, setGeneratedText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Generated Plan State
  const [generatedPlan, setGeneratedPlan] = useState<StrategicContentPlan | null>(null);
  const [planFrequency, setPlanFrequency] = useState('3');
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Loading & Tracking
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5); // Default fallback
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'posts' | 'plans'>('posts');
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [savedPlans, setSavedPlans] = useState<StrategicContentPlan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const isLimitReached = dailyCount >= dailyLimit;

  useEffect(() => {
    if (user?.id) {
        const studioId = user.isInstructor ? user.studioId : user.id;
        if(studioId) {
            getTodayPostCount(studioId).then(setDailyCount);
            loadHistory(studioId);
            
            // Fetch profile for limit
            fetchProfile(studioId).then(profile => {
                if (profile?.planMaxDailyPosts) {
                    setDailyLimit(profile.planMaxDailyPosts);
                }
            });
        }
    }
  }, [user]);

  const loadHistory = async (studioId: string) => {
      setLoadingHistory(true);
      const [posts, plans] = await Promise.all([
          fetchSavedPosts(studioId),
          fetchContentPlans(studioId)
      ]);
      setSavedPosts(posts);
      setSavedPlans(plans);
      setLoadingHistory(false);
  };

  const getFinalInputs = () => {
      return {
        objective: request.objective === 'Outro (Descrever...)' ? customInputs.objective : request.objective,
        theme: request.theme === 'Outro (Descrever...)' ? customInputs.theme : request.theme,
        audience: request.audience === 'Outro (Descrever...)' ? customInputs.audience : request.audience,
        tone: request.tone === 'Outro (Descrever...)' ? customInputs.tone : request.tone
      };
  };

  const handleGenerate = async () => {
    const { objective, theme, audience, tone } = getFinalInputs();

    if (!objective || !theme) {
        alert("Preencha o objetivo e o tema.");
        return;
    }
    if (isLimitReached) {
        alert("Limite diário atingido. Faça um upgrade no seu plano para criar mais.");
        return;
    }

    setIsGenerating(true);
    
    // Reset previous results
    if (agentMode === 'post') {
        setGeneratedText('');
        setGeneratedImage(null);
    } else {
        setGeneratedPlan(null);
    }

    try {
        if (agentMode === 'post') {
            const isReels = request.format === 'Reels';
            const apiRequest = {
                ...request,
                objective, theme, audience, tone,
                modificationPrompt: isReels 
                    ? "IMPORTANTE: O formato é Reels. Gere 3 opções completas de roteiro (Opção 1, Opção 2, Opção 3) com sugestão de áudio e tempo. NÃO descreva imagem estática." 
                    : request.modificationPrompt
            };

            const stream = generatePilatesContentStream(apiRequest, ''); 
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                setGeneratedText(prev => prev + chunk);
            }

            if (!isReels) {
                const image = await generatePilatesImage(apiRequest, null, fullText);
                setGeneratedImage(image);
            }
        } else {
            // Plan Mode
            const planData = {
                mode: 'plan' as const,
                goal: objective,
                audience: audience,
                topic: theme,
                format: `${planFrequency} posts por semana`,
                style: tone,
                startDate: planStartDate // Pass start date for date calculation
            };
            
            const result = await generateMarketingContent(planData);
            if (result && result.isPlan) {
                // Adapt result to StrategicContentPlan type structure if needed
                const plan: StrategicContentPlan = {
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                    startDate: planStartDate,
                    goals: {
                        mainObjective: objective,
                        targetAudience: [audience],
                        keyThemes: [theme]
                    },
                    weeks: result.weeks?.map((w: any) => ({
                        week: `Semana ${w.weekNumber}`,
                        theme: w.theme,
                        ideas: w.posts.map((p: any) => ({
                            day: p.day,
                            theme: p.idea,
                            format: p.format,
                            objective: 'Engajamento'
                        }))
                    })) || []
                };
                setGeneratedPlan(plan);
            }
        }

        // Record Usage
        const studioId = user?.isInstructor ? user.studioId : user?.id;
        if(studioId) {
            await recordGenerationUsage(studioId);
            setDailyCount(prev => prev + 1);
        }

    } catch (e) {
        console.error(e);
        alert("Erro ao gerar conteúdo.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateFromPlan = (post: any) => {
    setAgentMode('post');
    
    // Logic to normalize format from plan string to dropdown value
    let fmt = 'Post Estático';
    const pFormat = (post.format || '').toLowerCase();
    if (pFormat.includes('reels') || pFormat.includes('vídeo') || pFormat.includes('video')) fmt = 'Reels';
    else if (pFormat.includes('carrossel')) fmt = 'Carrossel';

    // Update state to reflect plan item's specific data
    setRequest(prev => ({
        ...prev,
        format: fmt,
        theme: 'Outro (Descrever...)', // Switch to custom input to show specific text
        objective: 'Outro (Descrever...)',
        audience: 'Outro (Descrever...)' 
    }));

    setCustomInputs(prev => ({
        ...prev,
        theme: post.idea || post.theme || '', // Map specific idea text
        objective: post.objective || 'Engajamento',
        audience: request.audience === 'Outro (Descrever...)' ? prev.audience : request.audience
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
      if (!user?.id) return;
      setIsSaving(true);
      
      const studioId = user.isInstructor ? user.studioId : user.id;
      if (!studioId) return;

      let res;
      if (agentMode === 'post') {
          if (!generatedText) return;
          const post = {
              id: crypto.randomUUID(),
              request,
              content: generatedText,
              imageUrl: generatedImage || null,
              createdAt: new Date().toISOString()
          };
          res = await savePost(studioId, post);
      } else {
          if (!generatedPlan) return;
          res = await saveContentPlan(studioId, generatedPlan);
      }

      if (res.success) {
          alert("Salvo com sucesso!");
          loadHistory(studioId);
      } else {
          alert("Erro ao salvar: " + res.error);
      }
      setIsSaving(false);
  };

  const handleDelete = async (id: string, type: 'post' | 'plan') => {
      if (confirm("Tem certeza que deseja excluir?")) {
          if (type === 'post') {
              const success = await deleteSavedPost(id);
              if (success.success) setSavedPosts(prev => prev.filter(p => p.id !== id));
          } else {
              const success = await deleteContentPlan(id);
              if (success.success) setSavedPlans(prev => prev.filter(p => p.id !== id));
          }
      }
  };

  const getFormatIcon = (format: string) => {
      if (format.includes('Reels')) return <Video className="w-4 h-4 text-purple-600"/>;
      if (format.includes('Carrossel')) return <Layers className="w-4 h-4 text-blue-600"/>;
      return <FileText className="w-4 h-4 text-green-600"/>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Wand2 className="h-8 w-8 text-brand-600" /> {t('content_agent')}
                </h1>
                <p className="text-slate-500">{t('content_subtitle')}</p>
            </div>
            <div className="flex gap-2 items-center">
                <span className={`text-sm font-bold mr-4 ${isLimitReached ? 'text-red-500' : 'text-slate-500'}`}>
                    {t('creations_today')}: {dailyCount}/{dailyLimit}
                </span>
                <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                    <History className="w-4 h-4 mr-2"/> {showHistory ? 'Voltar' : 'Histórico'}
                </Button>
            </div>
        </div>

        {/* MODE SELECTOR */}
        {!showHistory && (
            <div className="flex justify-center">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setAgentMode('post')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${agentMode === 'post' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
                    >
                        <FileText className="w-4 h-4"/> Post Único
                    </button>
                    <button 
                        onClick={() => setAgentMode('plan')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${agentMode === 'plan' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
                    >
                        <CalendarDays className="w-4 h-4"/> Plano de 4 Semanas
                    </button>
                </div>
            </div>
        )}

        {showHistory ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <button onClick={() => setHistoryTab('posts')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${historyTab === 'posts' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>Posts Salvos</button>
                    <button onClick={() => setHistoryTab('plans')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${historyTab === 'plans' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>Planos Salvos</button>
                </div>
                
                {loadingHistory ? (
                    <div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>
                ) : (
                    <>
                        {historyTab === 'posts' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedPosts.length === 0 ? <p className="text-slate-500 col-span-3 text-center">Nenhum post salvo.</p> : savedPosts.map(post => (
                                    <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                                        {post.imageUrl && (
                                            <div className="h-40 overflow-hidden bg-slate-100 relative group">
                                                <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => downloadImage(post.imageUrl!, `post-${post.id}.png`)}
                                                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100"
                                                    title="Baixar Imagem"
                                                >
                                                    <Download className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        )}
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded flex items-center gap-1">
                                                    {getFormatIcon(post.request.format)}
                                                    {post.request.format}
                                                </span>
                                                <span className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1 line-clamp-1">{post.request.theme}</h3>
                                            <p className="text-xs text-slate-500 line-clamp-3 mb-4">{post.content}</p>
                                            
                                            <div className="mt-auto flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <Button size="sm" variant="ghost" className="flex-1" onClick={() => {
                                                    setAgentMode('post');
                                                    setGeneratedText(post.content);
                                                    setGeneratedImage(post.imageUrl || null);
                                                    setRequest(post.request);
                                                    setShowHistory(false);
                                                }}>
                                                    <Copy className="w-3 h-3 mr-2"/> Usar
                                                </Button>
                                                <button onClick={() => handleDelete(post.id, 'post')} className="p-2 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {historyTab === 'plans' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {savedPlans.length === 0 ? <p className="text-slate-500 col-span-2 text-center">Nenhum plano salvo.</p> : savedPlans.map(plan => (
                                    <div key={plan.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><CalendarDays className="w-6 h-6"/></div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => {
                                                    setAgentMode('plan');
                                                    setGeneratedPlan(plan);
                                                    setShowHistory(false);
                                                }}>Abrir</Button>
                                                <button onClick={() => handleDelete(plan.id, 'plan')} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1">{plan.goals.keyThemes[0]}</h3>
                                        <p className="text-sm text-slate-500">{new Date(plan.createdAt).toLocaleDateString()} • {plan.goals.mainObjective}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold mb-4 text-slate-800 dark:text-white">
                            {agentMode === 'post' ? t('what_create') : 'Configurar Planejamento'}
                        </h3>
                        
                        <div className="space-y-4">
                            {agentMode === 'post' && (
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
                                    </select>
                                </div>
                            )}

                            {agentMode === 'plan' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequência Semanal</label>
                                        <select 
                                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                            value={planFrequency}
                                            onChange={e => setPlanFrequency(e.target.value)}
                                            disabled={isLimitReached}
                                        >
                                            <option value="3">3 posts por semana</option>
                                            <option value="5">5 posts por semana</option>
                                            <option value="7">Todos os dias (7 posts)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Início</label>
                                        <Input
                                            type="date"
                                            value={planStartDate}
                                            onChange={e => setPlanStartDate(e.target.value)}
                                            disabled={isLimitReached}
                                        />
                                    </div>
                                </>
                            )}

                            {/* OBJECTIVE SELECT */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('objective_label')}</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                    value={request.objective}
                                    onChange={e => setRequest({...request, objective: e.target.value})}
                                    disabled={isLimitReached}
                                >
                                    {OBJECTIVE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                {request.objective === 'Outro (Descrever...)' && (
                                    <Input 
                                        className="mt-2" 
                                        placeholder="Digite seu objetivo..." 
                                        value={customInputs.objective} 
                                        onChange={e => setCustomInputs({...customInputs, objective: e.target.value})} 
                                    />
                                )}
                            </div>
                            
                            {/* THEME SELECT */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('theme_label')}</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                    value={request.theme}
                                    onChange={e => setRequest({...request, theme: e.target.value})}
                                    disabled={isLimitReached}
                                >
                                    {THEME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                {request.theme === 'Outro (Descrever...)' && (
                                    <Input 
                                        className="mt-2" 
                                        placeholder="Digite o tema..." 
                                        value={customInputs.theme} 
                                        onChange={e => setCustomInputs({...customInputs, theme: e.target.value})} 
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* AUDIENCE SELECT */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('audience_label')}</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                        value={request.audience}
                                        onChange={e => setRequest({...request, audience: e.target.value})}
                                        disabled={isLimitReached}
                                    >
                                        {AUDIENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    {request.audience === 'Outro (Descrever...)' && (
                                        <Input 
                                            className="mt-2" 
                                            placeholder="Qual público?" 
                                            value={customInputs.audience} 
                                            onChange={e => setCustomInputs({...customInputs, audience: e.target.value})} 
                                        />
                                    )}
                                </div>

                                {/* TONE SELECT */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tom de Voz</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
                                        value={request.tone}
                                        onChange={e => setRequest({...request, tone: e.target.value})}
                                        disabled={isLimitReached}
                                    >
                                        {TONE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    {request.tone === 'Outro (Descrever...)' && (
                                        <Input 
                                            className="mt-2" 
                                            placeholder="Qual tom?" 
                                            value={customInputs.tone} 
                                            onChange={e => setCustomInputs({...customInputs, tone: e.target.value})} 
                                        />
                                    )}
                                </div>
                            </div>

                            <Button 
                                onClick={handleGenerate} 
                                isLoading={isGenerating} 
                                disabled={isLimitReached} 
                                className="w-full"
                            >
                                <Wand2 className="w-4 h-4 mr-2" /> {agentMode === 'post' ? t('generate_btn') : 'Gerar Planejamento'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px] flex flex-col">
                        <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center justify-between">
                            <span>{t('result_title')}</span>
                            {(generatedText || generatedPlan) && (
                                <div className="flex gap-2">
                                    {generatedText && (
                                        <Button size="sm" variant="ghost" onClick={() => {navigator.clipboard.writeText(generatedText); alert("Copiado!")}}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                                        <Save className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </h3>

                        {isGenerating ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2 text-brand-600" />
                                <p>{agentMode === 'post' ? 'Criando conteúdo...' : 'Montando cronograma...'}</p>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-4">
                                {/* POST RESULT */}
                                {agentMode === 'post' && generatedText && (
                                    <>
                                        {generatedImage && (
                                            <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                                <img src={generatedImage} alt="Gerado" className="w-full h-auto object-cover" />
                                                <button 
                                                    onClick={() => downloadImage(generatedImage!, `post-${new Date().getTime()}.png`)}
                                                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100"
                                                    title="Baixar Imagem"
                                                >
                                                    <Download className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        )}
                                        {request.format === 'Reels' && (
                                            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 p-3 rounded-lg text-xs font-bold text-center border border-purple-100 dark:border-purple-800 mb-2">
                                                🎥 Formato Reels: Roteiros gerados abaixo
                                            </div>
                                        )}
                                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg text-sm whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                                            {generatedText}
                                        </div>
                                    </>
                                )}

                                {/* PLAN RESULT */}
                                {agentMode === 'plan' && generatedPlan && (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                                            <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4"/> Planejamento Gerado
                                            </h4>
                                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                                Foco: {generatedPlan.goals.mainObjective}
                                            </p>
                                        </div>
                                        {generatedPlan.weeks?.map((week: any, i: number) => (
                                            <div key={i} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <h5 className="font-bold text-slate-800 dark:text-white mb-3 text-sm uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-1">
                                                    {week.week}: {week.theme}
                                                </h5>
                                                <div className="space-y-3">
                                                    {week.ideas.map((post: any, idx: number) => (
                                                        <div key={idx} className="flex gap-3 text-sm items-center justify-between">
                                                            <div className="flex gap-3">
                                                                <div className="w-24 shrink-0 font-bold text-slate-500">{post.day}</div>
                                                                <div>
                                                                    <span className="text-xs font-bold bg-white dark:bg-slate-900 border px-1.5 py-0.5 rounded text-slate-500 uppercase mr-2">{post.format}</span>
                                                                    <span className="text-slate-700 dark:text-slate-300">{post.theme}</span>
                                                                </div>
                                                            </div>
                                                            <Button size="xs" variant="outline" onClick={() => handleGenerateFromPlan(post)}>
                                                                <Wand2 className="w-3 h-3 mr-1"/> Gerar
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!generatedText && !generatedPlan && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                        <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                                        <p>O conteúdo gerado aparecerá aqui.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};