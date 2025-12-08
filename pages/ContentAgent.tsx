
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateMarketingContent, generateTopicSuggestions, generatePilatesImage, generatePilatesContentStream } from '../services/geminiService';
import { savePost, getTodayPostCount, recordGenerationUsage, fetchSavedPosts, deleteSavedPost, saveContentPlan, fetchContentPlans, deleteContentPlan } from '../services/contentService';
import { ContentRequest, SavedPost, StrategicContentPlan, MarketingFormData, GeneratedContent } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Image as ImageIcon, Save, Copy, Loader2, Lightbulb, ArrowRight, ArrowLeft, RefreshCw, Trash2, History, Download, CalendarDays, FileText, Zap, UserPlus, Heart, BookOpen, ShoppingBag, Users, Camera, MessageCircle, Layout, RotateCcw, Layers, Video, CheckCircle, Sparkles, Megaphone, Eye } from 'lucide-react';
import { fetchProfile } from '../services/storage';

const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- SUB-COMPONENTS ---

const StepMode = ({ selected, onSelect, t }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-8">
        {[
            { id: 'single', label: t('mode_single'), desc: 'Post Estático ou Reels focado.', icon: FileText, color: 'bg-teal-50 text-teal-600' },
            { id: 'story', label: t('mode_story'), desc: 'Sequência estratégica de 3 a 8 stories.', icon: Zap, color: 'bg-purple-50 text-purple-600' },
            { id: 'plan', label: t('mode_plan'), desc: 'Calendário completo com temas semanais.', icon: CalendarDays, color: 'bg-blue-50 text-blue-600' }
        ].map((item) => (
            <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md flex flex-col items-start h-full ${selected === item.id ? 'border-brand-500 bg-brand-50/30 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-brand-200'}`}
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${selected === item.id ? 'bg-brand-500 text-white' : item.color}`}>
                    <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{item.label}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </button>
        ))}
    </div>
);

const StepGoal = ({ selected, customGoal, mode, onSelect, onCustomChange, t }: any) => {
    const GOALS = [
        { id: 'attract', label: t('goal_attract'), icon: UserPlus },
        { id: 'retain', label: t('goal_retain'), icon: Heart },
        { id: 'educate', label: t('goal_educate'), icon: BookOpen },
        { id: 'inspire', label: t('goal_inspire'), icon: Zap },
        { id: 'sell', label: t('goal_sell'), icon: ShoppingBag },
    ];

    const STORY_GOALS = [
        { id: 'backstage', label: 'Bastidores', icon: Camera },
        { id: 'educate', label: t('goal_educate'), icon: BookOpen },
        { id: 'social_proof', label: 'Prova Social', icon: Users },
        { id: 'sell', label: t('goal_sell'), icon: ShoppingBag },
        { id: 'engagement', label: 'Engajamento', icon: MessageCircle },
    ];

    const list = mode === 'story' ? STORY_GOALS : GOALS;
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t('objective_label')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((item: any) => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.label)}
                        className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${selected === item.label ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-brand-200 bg-white dark:bg-slate-900'}`}
                    >
                        <div className={`p-2 rounded-lg ${selected === item.label ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <span className={`font-medium ${selected === item.label ? 'text-brand-900 dark:text-brand-100' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</span>
                    </button>
                ))}
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Outro</label>
                <input 
                    className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="..."
                    value={customGoal || ''}
                    onChange={e => onCustomChange(e.target.value)}
                />
            </div>
        </div>
    );
};

const StepAudience = ({ selected, customAudience, onSelect, onCustomChange, t }: any) => {
    const AUDIENCES = [
        { id: 'beginners', label: 'Iniciantes' },
        { id: 'women40', label: 'Mulheres 40+' },
        { id: 'pathologies', label: 'Patologias' },
        { id: 'pain_relief', label: 'Alívio da Dor' },
        { id: 'pregnant', label: 'Gestantes' },
        { id: 'seniors', label: 'Idosos' },
        { id: 'advanced', label: 'Avançados' },
        { id: 'all', label: 'Geral' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t('audience_label')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {AUDIENCES.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.label)}
                        className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center min-h-[120px] ${selected === item.label ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-brand-200 bg-white dark:bg-slate-900'}`}
                    >
                        <Users className={`w-8 h-8 mb-3 ${selected === item.label ? 'text-brand-600' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Outro</label>
                <input 
                    className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="..."
                    value={customAudience || ''}
                    onChange={e => onCustomChange(e.target.value)}
                />
            </div>
        </div>
    );
};

const StepTopic = ({ value, onChange, onGenerateIdeas, isGeneratingIdeas, suggestions, t }: any) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t('theme_label')}</h2>
        
        <textarea 
            className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl h-32 resize-none focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 text-lg"
            placeholder={t('topic_placeholder')}
            value={value}
            onChange={e => onChange(e.target.value)}
        />

        <div className="flex justify-end">
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={onGenerateIdeas} 
                isLoading={isGeneratingIdeas}
            >
                <Sparkles className="w-4 h-4 mr-2"/> {t('generate_suggestions')}
            </Button>
        </div>

        {suggestions.length > 0 && (
            <div className="mt-6">
                <p className="text-xs font-bold text-brand-600 uppercase mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Sugestões</p>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s: string, i: number) => (
                        <button 
                            key={i}
                            onClick={() => onChange(s)}
                            className="bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 px-4 py-2 rounded-full text-sm border border-brand-100 dark:border-brand-800 transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
);

const ResultDisplay = ({ content, onReset, onSave, onRegenerate, canRegenerate, t }: any) => {
    const [showLongCaption, setShowLongCaption] = useState(false);

    if (!content) return null;
    
    const isCarousel = content.suggestedFormat?.toLowerCase().includes('carrossel');
    const isReels = content.isReels;

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="bg-brand-50 dark:bg-brand-900/10 p-6 rounded-2xl border border-brand-100 dark:border-brand-800">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="bg-brand-200 text-brand-800 text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">
                            {content.suggestedFormat}
                        </span>
                        <h3 className="text-xl font-bold text-brand-900 dark:text-brand-100">{t('chosen_strategy')}</h3>
                        <p className="text-brand-700 dark:text-brand-300 text-sm mt-1">{content.reasoning}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={onReset}><RotateCcw className="w-4 h-4 mr-2"/> {t('clear')}</Button>
                        <Button size="sm" onClick={onSave}><Save className="w-4 h-4 mr-2"/> {t('save')}</Button>
                    </div>
                </div>
                
                {canRegenerate && (
                    <Button size="sm" onClick={onRegenerate} className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                        <RefreshCw className="w-4 h-4 mr-2"/> Gerar Novamente
                    </Button>
                )}
            </div>

            {!content.isPlan && !content.isStory && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5"/> {t('caption')}</h4>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button 
                                    onClick={() => setShowLongCaption(false)}
                                    className={`px-3 py-1 text-xs font-medium rounded ${!showLongCaption ? 'bg-white dark:bg-slate-700 shadow text-brand-600' : 'text-slate-500'}`}
                                >
                                    Curta
                                </button>
                                <button 
                                    onClick={() => setShowLongCaption(true)}
                                    className={`px-3 py-1 text-xs font-medium rounded ${showLongCaption ? 'bg-white dark:bg-slate-700 shadow text-brand-600' : 'text-slate-500'}`}
                                >
                                    Longa
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm whitespace-pre-wrap flex-1 overflow-y-auto max-h-[400px]">
                            {showLongCaption ? content.captionLong : content.captionShort}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-brand-600 font-medium">{content.hashtags?.join(' ')}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigator.clipboard.writeText(`${showLongCaption ? content.captionLong : content.captionShort}\n\n${content.hashtags.join(' ')}`)}>
                            <Copy className="w-4 h-4 mr-2"/> {t('copy')}
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            {isReels ? <Video className="w-5 h-5"/> : <ImageIcon className="w-5 h-5"/>} 
                            {t('visual_description')}
                        </h4>
                        
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm overflow-y-auto max-h-[400px] flex flex-col items-center justify-center">
                            {content.generatedImage ? (
                                <div className="w-full">
                                    <img 
                                        src={content.generatedImage} 
                                        alt="Gerado pela IA" 
                                        className={`w-full object-contain rounded-lg shadow-sm ${isCarousel ? 'aspect-[6/1]' : isReels ? 'aspect-[9/16]' : 'aspect-square'}`} 
                                    />
                                    {isCarousel && <p className="text-center text-xs text-slate-400 mt-2">Panorâmica 6:1</p>}
                                </div>
                            ) : (
                                <div className="text-center text-slate-400">
                                    {isReels && content.reelsOptions ? (
                                        <div className="text-left space-y-4">
                                            {content.reelsOptions.map((opt: any, i: number) => (
                                                <div key={i} className="pb-4 border-b last:border-0 border-slate-200 dark:border-slate-800">
                                                    <p className="font-bold text-brand-700 mb-1">Opção {i+1}: {opt.title}</p>
                                                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                                                        {opt.script.map((line: string, idx: number) => <li key={idx}>{line}</li>)}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-left">
                                            <p className="mb-2 font-bold text-slate-600">Descrição:</p>
                                            <ul className="list-disc pl-4 space-y-2 text-slate-600 dark:text-slate-400">
                                                {content.visualContent?.map((vc: string, i: number) => <li key={i}>{vc}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {content.isStory && content.storySequence && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500"/> Sequência</h4>
                    <div className="flex gap-6 min-w-[800px] pb-4">
                        {content.storySequence.frames.map((frame: any, i: number) => (
                            <div key={i} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 min-w-[220px] flex flex-col relative group hover:border-brand-300 transition-all">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded">Frame {frame.order}</div>
                                <div className="mt-2 mb-2 text-center">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{frame.type}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-800 dark:text-white mb-3 flex-grow">{frame.action}</p>
                                {frame.spokenText && <p className="text-xs text-slate-500 italic mb-3 bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">" {frame.spokenText} "</p>}
                                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-xs font-bold text-brand-600 uppercase flex items-center justify-center gap-1">
                                        <ArrowRight className="w-3 h-3"/> {frame.directAction}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {content.isPlan && content.weeks && (
                <div className="space-y-4">
                    {content.weeks.map((week: any, i: number) => (
                        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h4 className="font-bold text-brand-700 text-lg mb-4 flex items-center gap-2">
                                <CalendarDays className="w-5 h-5"/> {week.week || `Semana ${i+1}`}: {week.theme}
                            </h4>
                            <div className="grid md:grid-cols-3 gap-4">
                                {week.posts?.map((post: any, idx: number) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{post.day}</span>
                                            <span className="text-[10px] bg-white dark:bg-slate-900 border px-2 py-0.5 rounded text-slate-500 uppercase font-bold">{post.format}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{post.idea || post.theme}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const ContentAgent: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<MarketingFormData>({
    mode: 'single',
    goal: 'Atrair',
    audience: 'Geral',
    topic: '',
    format: 'auto',
    style: 'Padrão'
  });
  
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [activePlan, setActivePlan] = useState<GeneratedContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'posts' | 'plans'>('posts');
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [savedPlans, setSavedPlans] = useState<StrategicContentPlan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [currentPlanItemIndices, setCurrentPlanItemIndices] = useState<{weekIndex: number, postIndex: number} | null>(null);

  useEffect(() => {
    if (user?.id) {
        const targetId = user.isInstructor ? user.studioId : user.id;
        if(targetId) {
            loadHistory(targetId);
        }
    }
  }, [user, showHistory]);

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

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleModeSelect = (mode: any) => {
      setFormData(prev => ({ ...prev, mode }));
      handleNext();
  };

  const handleGoalSelect = (goal: string) => {
      setFormData(prev => ({ ...prev, goal, customGoal: '' }));
      handleNext();
  };

  const handleAudienceSelect = (audience: string) => {
      setFormData(prev => ({ ...prev, audience, customAudience: '' }));
      handleNext();
  };

  const handleGenerateIdeas = async () => {
      if (!formData.goal || !formData.audience) return;
      setIsGeneratingIdeas(true);
      const ideas = await generateTopicSuggestions(formData.customGoal || formData.goal, formData.customAudience || formData.audience, language);
      setTopicSuggestions(ideas);
      setIsGeneratingIdeas(false);
  };

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    try {
        const finalData = { ...formData };
        const content = await generateMarketingContent(finalData, language);
        
        if (content && content.visualPrompt && !content.isPlan) {
             const image = await generatePilatesImage({
                 format: formData.format === 'auto' ? content.suggestedFormat : formData.format,
                 theme: formData.topic,
                 imageStyle: formData.style
             } as any, null, content.visualPrompt);
             content.generatedImage = image || undefined;
        }

        setResult(content);
        if (content.isPlan) {
            setActivePlan(content);
        }
        setStep(5);
        
        const studioId = user?.isInstructor ? user.studioId : user?.id;
        if(studioId) {
            await recordGenerationUsage(studioId);
        }

    } catch (e) {
        alert("Erro ao gerar conteúdo.");
    }
    setIsGenerating(false);
  };

  const handleGenerateFromPlan = (post: any, weekIndex: number, postIndex: number) => {
    setResult(null);
    setCurrentPlanItemIndices({ weekIndex, postIndex });

    let fmt = 'auto';
    const pFormat = (post.format || '').toLowerCase();
    if (pFormat.includes('reels') || pFormat.includes('vídeo')) fmt = 'reels';
    else if (pFormat.includes('carrossel')) fmt = 'carousel';
    else if (pFormat.includes('estático') || pFormat.includes('post')) fmt = 'post';

    setFormData(prev => ({
        ...prev,
        mode: 'single',
        format: fmt,
        topic: post.idea || post.theme || '',
        goal: 'Engajamento',
        audience: 'Público Geral',
        customGoal: post.objective || '',
        customAudience: ''
    }));

    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewPost = (postId: string) => {
      const post = savedPosts.find(p => p.id === postId);
      if (post) {
          const mockResult: GeneratedContent = {
              suggestedFormat: post.request.format,
              reasoning: 'Recuperado do histórico.',
              hashtags: [],
              tips: '',
              captionLong: post.content,
              generatedImage: post.imageUrl || undefined,
              isPlan: false,
              isStory: false,
              isReels: post.request.format.toLowerCase().includes('reels')
          };
          setResult(mockResult);
          setStep(5);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleSaveWithLink = async () => {
      if (!user?.id || !result) return;
      const studioId = user.isInstructor ? user.studioId : user.id;
      if (!studioId) return;

      setIsSaving(true);
      let res;
      
      if (result.isPlan) {
          const plan: StrategicContentPlan = {
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              goals: { mainObjective: formData.goal, targetAudience: [formData.audience], keyThemes: [formData.topic] },
              weeks: result.weeks?.map((w: any) => ({
                  week: `Semana ${w.weekNumber}`,
                  theme: w.theme,
                  ideas: w.posts
              })) || []
          };
          res = await saveContentPlan(studioId, plan);
      } else {
          const postId = crypto.randomUUID();
          const post: SavedPost = {
              id: postId,
              request: {
                  format: result.suggestedFormat,
                  objective: formData.goal,
                  theme: formData.topic,
                  audience: formData.audience,
                  tone: formData.style,
                  imageStyle: formData.style
              },
              content: result.captionLong || result.captionShort || '',
              imageUrl: result.generatedImage || null,
              createdAt: new Date().toISOString()
          };
          res = await savePost(studioId, post);

          if (res.success && currentPlanItemIndices && activePlan) {
              const newPlan = JSON.parse(JSON.stringify(activePlan)); 
              if (newPlan.weeks && newPlan.weeks[currentPlanItemIndices.weekIndex]) {
                  newPlan.weeks[currentPlanItemIndices.weekIndex].posts[currentPlanItemIndices.postIndex].generatedPostId = postId;
                  setActivePlan(newPlan);
              }
          }
      }

      if (res.success) {
          alert(t('save') + " ok!");
          loadHistory(studioId);
      }
      setIsSaving(false);
  };

  const handleBackToPlan = () => {
      if (activePlan) {
          setResult(activePlan);
          setStep(5);
          setFormData(prev => ({ ...prev, mode: 'plan' }));
          setCurrentPlanItemIndices(null);
      }
  };

  const handleDelete = async (id: string, type: 'post' | 'plan') => {
      if (confirm(t('delete') + "?")) {
          if (type === 'post') {
              await deleteSavedPost(id);
              setSavedPosts(prev => prev.filter(p => p.id !== id));
          } else {
              await deleteContentPlan(id);
              setSavedPlans(prev => prev.filter(p => p.id !== id));
          }
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Megaphone className="h-8 w-8 text-brand-600" /> {t('marketing_title')}
                </h1>
                <p className="text-slate-500">{t('content_subtitle')}</p>
            </div>
            {!showHistory && step > 1 && (
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleBack}><ArrowLeft className="w-4 h-4 mr-2"/> {t('back')}</Button>
                </div>
            )}
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                <History className="w-4 h-4 mr-2"/> {showHistory ? t('back') : t('history')}
            </Button>
        </div>

        {showHistory ? (
            <div className="space-y-6">
                <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <button onClick={() => setHistoryTab('posts')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${historyTab === 'posts' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>Posts</button>
                    <button onClick={() => setHistoryTab('plans')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${historyTab === 'plans' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>Planos</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loadingHistory ? <p>{t('loading')}</p> : 
                        historyTab === 'posts' ? savedPosts.map(p => (
                            <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded border shadow-sm">
                                <img src={p.imageUrl || ''} className="w-full h-32 object-cover mb-2 rounded" />
                                <p className="text-sm font-bold dark:text-white">{p.request.theme}</p>
                                <div className="flex justify-between mt-2">
                                    <Button size="xs" variant="ghost" onClick={() => handleViewPost(p.id)}>{t('view_details')}</Button>
                                    <button onClick={() => handleDelete(p.id, 'post')}><Trash2 className="w-4 h-4 text-red-500"/></button>
                                </div>
                            </div>
                        )) : savedPlans.map(p => (
                            <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded border shadow-sm">
                                <p className="font-bold dark:text-white">{p.goals.keyThemes[0]}</p>
                                <div className="flex justify-between mt-2">
                                    <Button size="xs" variant="ghost" onClick={() => {
                                        const viewPlan: GeneratedContent = {
                                            isPlan: true,
                                            suggestedFormat: 'Plano Estratégico',
                                            reasoning: 'Plano recuperado',
                                            hashtags: [],
                                            tips: '',
                                            weeks: p.weeks?.map((w: any) => ({
                                                weekNumber: w.week.replace('Semana ', ''),
                                                theme: w.theme,
                                                posts: w.ideas?.map((idea: any) => ({
                                                    day: idea.day,
                                                    format: idea.format,
                                                    theme: idea.theme,
                                                    idea: idea.theme,
                                                    generatedPostId: idea.generatedPostId
                                                }))
                                            }))
                                        };
                                        setResult(viewPlan);
                                        setActivePlan(viewPlan);
                                        setStep(5);
                                        setShowHistory(false);
                                    }}>{t('view_details')}</Button>
                                    <button onClick={() => handleDelete(p.id, 'plan')}><Trash2 className="w-4 h-4 text-red-500"/></button>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl min-h-[500px]">
                <div className="mb-8">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        <span className={step >= 1 ? 'text-brand-600' : ''}>1</span>
                        <span className={step >= 2 ? 'text-brand-600' : ''}>2</span>
                        <span className={step >= 3 ? 'text-brand-600' : ''}>3</span>
                        <span className={step >= 4 ? 'text-brand-600' : ''}>4</span>
                        <span className={step >= 5 ? 'text-brand-600' : ''}>5</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
                    </div>
                </div>

                {step === 1 && <StepMode selected={formData.mode} onSelect={handleModeSelect} t={t} />}
                
                {step === 2 && (
                    <StepGoal 
                        selected={formData.goal} 
                        customGoal={formData.customGoal} 
                        mode={formData.mode} 
                        onSelect={handleGoalSelect} 
                        onCustomChange={(val: string) => setFormData(prev => ({...prev, customGoal: val, goal: 'Outro (Descrever...)'}))} 
                        t={t}
                    />
                )}

                {step === 3 && (
                    <StepAudience 
                        selected={formData.audience} 
                        customAudience={formData.customAudience} 
                        onSelect={handleAudienceSelect} 
                        onCustomChange={(val: string) => setFormData(prev => ({...prev, customAudience: val, audience: 'Outro (Descrever...)'}))} 
                        t={t}
                    />
                )}

                {step === 4 && (
                    <div className="space-y-6">
                        <StepTopic 
                            value={formData.topic} 
                            onChange={(val: string) => setFormData(prev => ({...prev, topic: val}))} 
                            onGenerateIdeas={handleGenerateIdeas} 
                            isGeneratingIdeas={isGeneratingIdeas} 
                            suggestions={topicSuggestions} 
                            t={t}
                        />
                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
                            {currentPlanItemIndices && (
                                <Button variant="ghost" onClick={handleBackToPlan}>{t('cancel')}</Button>
                            )}
                            <Button onClick={handleGenerateContent} isLoading={isGenerating} className="px-8 h-12 text-lg shadow-lg shadow-brand-200">
                                <Wand2 className="w-5 h-5 mr-2" /> {formData.mode === 'plan' ? t('btn_generate_plan') : t('btn_generate_content')}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <>
                        {currentPlanItemIndices && (
                            <div className="mb-4">
                                <Button variant="outline" size="sm" onClick={handleBackToPlan}>
                                    <ArrowLeft className="w-4 h-4 mr-2"/> {t('back')}
                                </Button>
                            </div>
                        )}
                        <ResultDisplay 
                            content={result} 
                            onReset={() => { setStep(1); setResult(null); setActivePlan(null); }}
                            onSave={handleSaveWithLink}
                            onRegenerate={handleGenerateContent}
                            canRegenerate={!result?.isPlan}
                            t={t}
                        />
                        {result?.isPlan && result.weeks && (
                            <div className="mt-6 space-y-4">
                                {result.weeks.map((week: any, i: number) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                        <h4 className="font-bold text-brand-700 text-lg mb-4 flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5"/> {week.week}: {week.theme}
                                        </h4>
                                        <div className="space-y-3">
                                            {week.posts?.map((post: any, idx: number) => (
                                                <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                    <div>
                                                        <div className="flex gap-2 items-center mb-1">
                                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{post.day}</span>
                                                            <span className="text-[10px] bg-white dark:bg-slate-900 border px-2 py-0.5 rounded text-slate-500 uppercase font-bold">{post.format}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">{post.idea || post.theme}</p>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        {post.generatedPostId ? (
                                                            <>
                                                                <Button size="xs" variant="secondary" onClick={() => handleViewPost(post.generatedPostId)} className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                                                                    <Eye className="w-3 h-3 mr-1"/> {t('view_details')}
                                                                </Button>
                                                                <button onClick={() => handleGenerateFromPlan(post, i, idx)} className="text-slate-400 hover:text-brand-600 p-2 rounded hover:bg-slate-100" title="Gerar Novamente">
                                                                    <RefreshCw className="w-4 h-4"/>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <Button size="xs" variant="outline" onClick={() => handleGenerateFromPlan(post, i, idx)}>
                                                                <Wand2 className="w-3 h-3 mr-1"/> {t('generate_btn')}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        )}
    </div>
  );
};
