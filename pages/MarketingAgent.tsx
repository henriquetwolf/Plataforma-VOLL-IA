
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MarketingFormData, GeneratedContent, SavedContent } from '../types';
import { generateMarketingContent, generateTopicSuggestions } from '../services/geminiService';
import { savePost, fetchSavedPosts, deleteSavedPost } from '../services/contentService';
import { Button } from '../components/ui/Button';
import { 
  Sparkles, ArrowRight, Dumbbell, Trash2, CalendarDays, FileText, 
  Target, Users, Lightbulb, Zap, ShoppingBag, Heart, BookOpen, Camera, MessageCircle, Star, Image as ImageIcon, Video, Eye,
  Layout, RotateCcw, Save, RefreshCw, Copy
} from 'lucide-react';

const GOALS = [
  { id: 'attract', label: 'Atrair Novos Alunos', icon: Users },
  { id: 'retain', label: 'Fidelizar / Engajar', icon: Heart },
  { id: 'educate', label: 'Educativo / Informativo', icon: BookOpen },
  { id: 'inspire', label: 'Inspiracional / Motivacional', icon: Zap },
  { id: 'sell', label: 'Vendas / Promoção', icon: ShoppingBag },
];

const STORY_GOALS = [
  { id: 'backstage', label: 'Bastidores / Conexão', icon: Camera },
  { id: 'educate', label: 'Autoridade / Educativo', icon: BookOpen },
  { id: 'social_proof', label: 'Prova Social / Alunos', icon: Users },
  { id: 'sell', label: 'Venda / Conversão', icon: ShoppingBag },
  { id: 'engagement', label: 'Engajamento / Interação', icon: MessageCircle },
];

const AUDIENCES = [
  { id: 'beginners', label: 'Iniciantes / Sedentários' },
  { id: 'women40', label: 'Mulheres 40+ / Menopausa' },
  { id: 'pathologies', label: 'Alunos com Patologias (Hérnia, etc)' },
  { id: 'pain_relief', label: 'Foco em Alívio de Dores' },
  { id: 'pregnant', label: 'Gestantes / Pós-Parto' },
  { id: 'seniors', label: 'Idosos / Terceira Idade' },
  { id: 'advanced', label: 'Avançados / Desafios' },
  { id: 'all', label: 'Público Geral do Studio' },
];

const FORMATS = [
  { id: 'auto', label: 'IA Decide (Recomendado)', description: 'A melhor escolha estratégica', recommended: true },
  { id: 'reels', label: 'Reels / Vídeo Curto', description: 'Vídeo dinâmico (Max 60s)' },
  { id: 'carousel', label: 'Carrossel (6 Cards)', description: 'Conteúdo profundo em 6 cards (Imagem Panorâmica)' },
  { id: 'post', label: 'Post Estático', description: 'Imagem única com legenda forte' },
];

const STYLES = [
  'IA Decide (Recomendado)',
  'Persona da Marca (Padrão)',
  'Fotorealista / Clean',
  'Minimalista',
  'Ilustração',
  'Cinematográfico',
  'Energético / Vibrante'
];

export const MarketingAgent: React.FC = () => {
  const { user } = useAuth();
  
  // Steps: 0=Mode, 1=Goal, 2=Audience, 3=Topic, 4=Format/Style (Single Only), 5=Result, 6=SavedPosts
  const [step, setStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [canRegenerate, setCanRegenerate] = useState(true);
  const [savedPosts, setSavedPosts] = useState<SavedContent[]>([]);

  const [formData, setFormData] = useState<MarketingFormData>({
    mode: 'single', // Default
    goal: '',
    customGoal: '',
    audience: '',
    topic: '',
    format: 'auto',
    style: 'Brand Persona'
  });

  // Load saved posts on mount
  useEffect(() => {
    if (user?.id) {
        // Use generic saved posts service for now, but adapted to frontend SavedContent structure
        fetchSavedPosts(user.id).then(posts => {
            const mapped = posts.map(p => {
                // Try to recover saved content structure from JSON blob
                // This assumes we stored the full object there
                // If using the generic content service, we might need adjustments
                // For this specific agent, let's treat the 'content' field as holding the data if it was saved by this agent
                // Or map generic fields. For simplicity, we assume generic storage.
                return {
                    id: p.id,
                    date: new Date(p.createdAt).toLocaleDateString(),
                    topic: p.request.theme || 'Sem tema',
                    reasoning: 'Salvo',
                    suggestedFormat: p.request.format,
                    hashtags: [],
                    tips: '',
                    ...((p as any).data || {}) // Spread extra data if available
                } as SavedContent;
            });
            setSavedPosts(mapped);
        });
    }
  }, [user]);

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => {
    if (step === 6) {
      setStep(0);
    } else {
      setStep((prev) => Math.max(0, prev - 1));
    }
  };

  const isReadyToGenerate = () => {
    // For Plan AND Stories, we generate after Step 3 (Topic)
    if ((formData.mode === 'plan' || formData.mode === 'story') && step === 3) return true;
    // For Single Post, we generate after Step 4 (Format/Style)
    if (formData.mode === 'single' && step === 4) return true;
    return false;
  };

  const handleGenerateAction = async () => {
    setIsLoading(true);
    setError(null);
    setCanRegenerate(true);
    try {
      const content = await generateMarketingContent(formData);
      setResult(content);
      setStep(5);
    } catch (err) {
      setError("Ocorreu um erro ao gerar o conteúdo. Por favor, tente novamente.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateAction = async () => {
    if (!canRegenerate) return;
    setIsLoading(true);
    setError(null);
    try {
      const content = await generateMarketingContent(formData);
      setResult(content);
      setCanRegenerate(false);
    } catch (err) {
      setError("Erro ao gerar nova sugestão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePost = async () => {
    if (!result || !user?.id) return;
    
    // Convert to generic SavedPost structure for storage
    const newPost: any = {
      id: crypto.randomUUID(),
      request: {
          format: formData.format,
          objective: formData.goal,
          theme: formData.topic,
          audience: formData.audience,
          tone: formData.style,
          imageStyle: formData.style
      },
      content: JSON.stringify(result), // Store full result JSON
      imageUrl: result.generatedImage || null,
      createdAt: new Date().toISOString(),
      // Custom fields to help retrieval
      data: result 
    };
    
    const res = await savePost(user.id, newPost);
    if (res.success) {
        alert("Salvo com sucesso!");
        // Update local list
        setSavedPosts(prev => [{
            ...result,
            id: newPost.id,
            date: new Date().toLocaleDateString(),
            topic: formData.topic
        }, ...prev]);
    } else {
        alert("Erro ao salvar.");
    }
  };

  const handleDeleteSaved = async (id: string) => {
    if (confirm("Tem certeza?")) {
        await deleteSavedPost(id);
        setSavedPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  // Fetch Topic Suggestions when entering step 3
  useEffect(() => {
    if (step === 3 && formData.goal && formData.audience && topicSuggestions.length === 0) {
      const fetchSuggestions = async () => {
        const suggs = await generateTopicSuggestions(formData.customGoal || formData.goal, formData.audience);
        setTopicSuggestions(suggs);
      };
      fetchSuggestions();
    }
  }, [step, formData.goal, formData.audience]);

  const updateFormData = (key: keyof MarketingFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setStep(0);
    setResult(null);
    setTopicSuggestions([]);
    setFormData({
      mode: 'single',
      goal: '',
      customGoal: '',
      audience: '',
      topic: '',
      format: 'auto',
      style: 'Brand Persona'
    });
  };

  // --- SUB-COMPONENTS ---

  const StepMode = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-8">
        {[
            { id: 'single', label: 'Post Único', desc: 'Reels ou Post Estático focado em um objetivo imediato.', icon: FileText, color: 'bg-teal-50 text-teal-600' },
            { id: 'story', label: 'Sequência de Stories', desc: 'Roteiro estratégico de 3 a 8 stories para conexão e venda.', icon: Zap, color: 'bg-purple-50 text-purple-600' },
            { id: 'plan', label: 'Plano 4 Semanas', desc: 'Calendário completo com temas semanais e organização.', icon: CalendarDays, color: 'bg-blue-50 text-blue-600' }
        ].map((item) => (
            <button
                key={item.id}
                onClick={() => updateFormData('mode', item.id)}
                className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md flex flex-col items-start h-full ${formData.mode === item.id ? 'border-brand-500 bg-brand-50/30 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-brand-200'}`}
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${formData.mode === item.id ? 'bg-brand-500 text-white' : item.color}`}>
                    <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{item.label}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </button>
        ))}
    </div>
  );

  const StepGoal = () => {
    const list = formData.mode === 'story' ? STORY_GOALS : GOALS;
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Qual é o objetivo desse conteúdo?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => updateFormData('goal', item.label)}
                        className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${formData.goal === item.label ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-brand-200 bg-white dark:bg-slate-900'}`}
                    >
                        <div className={`p-2 rounded-lg ${formData.goal === item.label ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <span className={`font-medium ${formData.goal === item.label ? 'text-brand-900 dark:text-brand-100' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</span>
                    </button>
                ))}
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Outro Objetivo Específico</label>
                <input 
                    className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Escreva aqui seu objetivo..."
                    value={formData.customGoal || ''}
                    onChange={e => updateFormData('customGoal', e.target.value)}
                />
            </div>
        </div>
    );
  };

  const StepAudience = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Para quem é esse conteúdo?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {AUDIENCES.map((item) => (
                <button
                    key={item.id}
                    onClick={() => updateFormData('audience', item.label)}
                    className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center min-h-[120px] ${formData.audience === item.label ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-brand-200 bg-white dark:bg-slate-900'}`}
                >
                    <Users className={`w-8 h-8 mb-3 ${formData.audience === item.label ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                </button>
            ))}
        </div>
    </div>
  );

  const StepTopic = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Sobre qual tema você quer falar?</h2>
        
        <textarea 
            className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl h-32 resize-none focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 text-lg"
            placeholder="Ex: Benefícios do Pilates para dor nas costas, Promoção de verão..."
            value={formData.topic}
            onChange={e => updateFormData('topic', e.target.value)}
        />

        {topicSuggestions.length > 0 && (
            <div className="mt-6">
                <p className="text-xs font-bold text-brand-600 uppercase mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4"/> Sugestões para você</p>
                <div className="flex flex-wrap gap-2">
                    {topicSuggestions.map((s, i) => (
                        <button 
                            key={i}
                            onClick={() => updateFormData('topic', s)}
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

  const StepFormatStyle = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Layout className="w-5 h-5 text-brand-600"/> Formato do Conteúdo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FORMATS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => updateFormData('format', item.id)}
                        className={`p-4 rounded-xl border-2 text-left relative overflow-hidden ${formData.format === item.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                    >
                        {item.recommended && <span className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">RECOMENDADO</span>}
                        <h3 className="font-bold text-slate-900 dark:text-white">{item.label}</h3>
                        <p className="text-sm text-slate-500">{item.description}</p>
                        {formData.format === item.id && <div className="absolute top-1/2 right-4 -translate-y-1/2 w-3 h-3 bg-brand-500 rounded-full"></div>}
                    </button>
                ))}
            </div>
        </div>

        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-600"/> Estilo Visual</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {STYLES.map((style) => (
                    <button
                        key={style}
                        onClick={() => updateFormData('style', style)}
                        className={`p-3 rounded-lg border text-sm transition-all ${formData.style === style ? 'border-brand-500 bg-brand-100 text-brand-800 font-bold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600'}`}
                    >
                        {style}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );

  const ResultDisplay = () => {
    if (!result) return null;
    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="bg-brand-50 dark:bg-brand-900/10 p-6 rounded-2xl border border-brand-100 dark:border-brand-800">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="bg-brand-200 text-brand-800 text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">
                            {result.suggestedFormat}
                        </span>
                        <h3 className="text-xl font-bold text-brand-900 dark:text-brand-100">Estratégia Escolhida</h3>
                        <p className="text-brand-700 dark:text-brand-300 text-sm mt-1">{result.reasoning}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-2"/> Início</Button>
                        <Button size="sm" onClick={handleSavePost}><Save className="w-4 h-4 mr-2"/> Salvar</Button>
                    </div>
                </div>
                
                {canRegenerate && (
                    <Button size="sm" onClick={handleRegenerateAction} className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                        <RefreshCw className="w-4 h-4 mr-2"/> Ver outra sugestão
                    </Button>
                )}
            </div>

            {/* SINGLE POST / REELS */}
            {!result.isPlan && !result.isStory && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5"/> Legenda</h4>
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm whitespace-pre-wrap h-80 overflow-y-auto">
                            {result.captionLong || result.captionShort}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-brand-600 font-medium">{result.hashtags?.join(' ')}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigator.clipboard.writeText(`${result.captionLong}\n\n${result.hashtags.join(' ')}`)}>
                            <Copy className="w-4 h-4 mr-2"/> Copiar
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            {result.isReels ? <Video className="w-5 h-5"/> : <ImageIcon className="w-5 h-5"/>} 
                            {result.isReels ? 'Roteiro de Vídeo' : 'Imagem Sugerida'}
                        </h4>
                        
                        {result.isReels && result.reelsOptions ? (
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm h-80 overflow-y-auto space-y-4">
                                {result.reelsOptions.map((opt, i) => (
                                    <div key={i} className="pb-4 border-b last:border-0 border-slate-200 dark:border-slate-800">
                                        <p className="font-bold text-brand-700 mb-1">Opção {i+1}: {opt.title}</p>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                                            {opt.script.map((line, idx) => <li key={idx}>{line}</li>)}
                                        </ul>
                                        <div className="mt-2 flex items-center gap-2 text-xs bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                                            <span>🎵 Áudio: {opt.audioSuggestion}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm h-80 overflow-y-auto flex flex-col justify-center">
                                {result.generatedImage ? (
                                    <img src={result.generatedImage} alt="Sugestão" className="w-full h-full object-contain rounded-lg" />
                                ) : (
                                    <ul className="list-disc pl-4 space-y-2 text-slate-600 dark:text-slate-400">
                                        {result.visualContent?.map((vc, i) => <li key={i}>{vc}</li>)}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STORIES */}
            {result.isStory && result.storySequence && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500"/> Sequência Estratégica</h4>
                    <div className="flex gap-6 min-w-[800px] pb-4">
                        {result.storySequence.frames.map((frame, i) => (
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

            {/* PLAN */}
            {result.isPlan && result.weeks && (
                <div className="space-y-4">
                    {result.weeks.map((week, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h4 className="font-bold text-brand-700 text-lg mb-4 flex items-center gap-2">
                                <CalendarDays className="w-5 h-5"/> Semana {week.weekNumber}: {week.theme}
                            </h4>
                            <div className="grid md:grid-cols-3 gap-4">
                                {week.posts.map((post, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{post.day}</span>
                                            <span className="text-[10px] bg-white dark:bg-slate-900 border px-2 py-0.5 rounded text-slate-500 uppercase font-bold">{post.format}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{post.idea}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Dica de Engajamento</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400">{result.tips}</p>
                </div>
            </div>
        </div>
    );
  };

  const SavedPostsList = () => (
    <div className="animate-in fade-in">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Meus Posts Salvos</h2>
        {savedPosts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <p>Você ainda não salvou nenhum post.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {savedPosts.map((post) => (
                    <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${post.isPlan ? 'bg-blue-50 text-blue-700' : post.isStory ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                                {post.isPlan ? 'PLANEJAMENTO' : (post.isStory ? 'STORIES' : (post.isReels ? 'REELS' : 'POST'))}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{post.date}</span>
                                <button onClick={() => handleDeleteSaved(post.id)} className="text-slate-400 hover:text-red-500 p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">{post.topic}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{post.reasoning}</p>
                        <button 
                            onClick={() => {
                                setResult(post);
                                setStep(5);
                                setCanRegenerate(false);
                            }}
                            className="mt-3 text-sm text-brand-600 font-medium hover:underline flex items-center gap-1"
                        >
                            Ver detalhes <ArrowRight className="w-3 h-3"/>
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  // Progress Bar Calculation
  const totalSteps = (formData.mode === 'plan' || formData.mode === 'story') ? 3 : 4; 
  const progress = Math.min((step / totalSteps) * 100, 100);

  // Validation logic
  const isNextDisabled = () => {
    if (step === 0 && !formData.mode) return true;
    if (step === 1 && !formData.goal && !formData.customGoal) return true;
    if (step === 2 && !formData.audience) return true;
    if (step === 3 && !formData.topic) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="w-full flex flex-col items-center mb-10 text-center">
        <div 
          onClick={handleReset}
          className="flex items-center gap-3 bg-brand-600 text-white p-3 rounded-2xl shadow-lg mb-4 cursor-pointer hover:bg-brand-700 transition-colors"
        >
          <Dumbbell className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white tracking-tight">
          Pilates Marketing AI
        </h1>
        <p className="text-slate-500 mt-2 max-w-lg">
          Crie posts, stories e planejamentos para seu estúdio em segundos.
        </p>
        {step === 0 && (
            <button onClick={() => setStep(6)} className="mt-4 text-sm text-brand-600 font-bold hover:underline flex items-center gap-1">
                <FileText className="w-4 h-4"/> Ver Salvos
            </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative min-h-[500px] flex flex-col">
        
        {/* Progress Bar (Only visible during wizard steps) */}
        {step < 5 && step !== 6 && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2">
            <div 
              className="bg-brand-500 h-2 transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex-1 p-6 md:p-10 flex flex-col">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-2">
               <span>⚠️</span> {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500 py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-brand-500 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white">
                  {formData.mode === 'plan' ? 'Montando seu cronograma...' : 
                   formData.mode === 'story' ? 'Criando sequência de Stories...' : 'Criando seu post...'}
                </h3>
                <p className="text-slate-500 mt-2">A inteligência artificial está analisando seu objetivo.</p>
              </div>
            </div>
          ) : (
            <>
              {step === 0 && <StepMode />}
              {step === 1 && <StepGoal />}
              {step === 2 && <StepAudience />}
              {step === 3 && <StepTopic />}
              {step === 4 && <StepFormatStyle />}
              {step === 5 && <ResultDisplay />}
              {step === 6 && <SavedPostsList />}
            </>
          )}
        </div>

        {/* Footer Navigation (Only for wizard steps) */}
        {!isLoading && step < 5 && step !== 6 && (
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            {step > 0 ? (
              <button 
                onClick={handleBack}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                Voltar
              </button>
            ) : (
              <div></div> 
            )}
            
            <button
            onClick={isReadyToGenerate() ? handleGenerateAction : handleNext}
            disabled={isNextDisabled()}
            className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-md transition-all
                ${isNextDisabled()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none dark:bg-slate-800 dark:text-slate-600'
                : 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-lg active:scale-95'
                }
            `}
            >
            {isReadyToGenerate() ? (
                <>
                Gerar <Sparkles className="w-5 h-5" />
                </>
            ) : (
                <>
                Próximo <ArrowRight className="w-5 h-5" />
                </>
            )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
