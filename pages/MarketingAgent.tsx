
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MarketingFormData, GeneratedContent, SavedContent } from '../types';
import { generateMarketingContent, generateTopicSuggestions } from '../services/geminiService';
import { Button } from '../components/ui/Button';
import { 
  Sparkles, ArrowRight, Dumbbell, Trash2, CalendarDays, FileText, 
  Target, Users, Lightbulb, Zap, Layout, Wand2, ArrowLeft, CheckCircle, Video, Image as ImageIcon,
  RotateCcw, Copy, Save, Share2
} from 'lucide-react';

const GOALS = [
  { id: 'awareness', label: 'Atrair Seguidores' },
  { id: 'authority', label: 'Gerar Autoridade' },
  { id: 'sales', label: 'Vender Aulas' },
  { id: 'community', label: 'Engajamento' },
  { id: 'retention', label: 'Fidelização' }
];

const STORY_GOALS = [
  { id: 'interaction', label: 'Gerar Interação' },
  { id: 'backstage', label: 'Bastidores' },
  { id: 'offer', label: 'Oferta / Convite' },
  { id: 'social_proof', label: 'Prova Social' }
];

const AUDIENCES = [
  { id: 'beginners', label: 'Iniciantes' },
  { id: 'advanced', label: 'Praticantes' },
  { id: 'pain', label: 'Com Dores' },
  { id: 'pregnant', label: 'Gestantes' },
  { id: 'seniors', label: 'Idosos' }
];

const FORMATS = [
  { id: 'static', label: 'Post Estático', description: 'Imagem + Legenda' },
  { id: 'carousel', label: 'Carrossel', description: 'Sequência educativa' },
  { id: 'reels', label: 'Reels', description: 'Vídeo curto' },
  { id: 'caption', label: 'Apenas Legenda', description: 'Texto para foto' }
];

const STYLES = [
  'Brand Persona',
  'Minimalista',
  'Inspirador',
  'Educativo',
  'Descontraído'
];

const INITIAL_FORM: MarketingFormData = {
  mode: 'single',
  goal: '',
  customGoal: '',
  audience: '',
  topic: '',
  format: 'auto',
  style: 'Brand Persona'
};

export const MarketingAgent: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [canRegenerate, setCanRegenerate] = useState(true);
  const [savedPosts, setSavedPosts] = useState<SavedContent[]>([]);
  const [formData, setFormData] = useState<MarketingFormData>(INITIAL_FORM);

  useEffect(() => {
    // Load from LocalStorage (Simulated Persistence)
    const saved = localStorage.getItem('pilates_marketing_agent_posts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSavedPosts(parsed);
      } catch (e) {
        console.error("Failed to parse saved posts", e);
      }
    }
  }, []);

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => {
    if (step === 6) setStep(0);
    else setStep((prev) => Math.max(0, prev - 1));
  };

  const isReadyToGenerate = () => {
    if ((formData.mode === 'plan' || formData.mode === 'story') && step === 3) return true;
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePost = () => {
    if (!result) return;
    const newSavedPost: SavedContent = {
      ...result,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pt-BR'),
      topic: formData.topic || 'Sem tema'
    };
    const updated = [newSavedPost, ...savedPosts];
    setSavedPosts(updated);
    localStorage.setItem('pilates_marketing_agent_posts', JSON.stringify(updated));
    alert("Conteúdo salvo com sucesso!");
  };

  const handleDeleteSaved = (id: string) => {
    if(!confirm("Tem certeza?")) return;
    const updated = savedPosts.filter(p => p.id !== id);
    setSavedPosts(updated);
    localStorage.setItem('pilates_marketing_agent_posts', JSON.stringify(updated));
  };

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
    setFormData(INITIAL_FORM);
  };

  // --- SUB-COMPONENTS (INLINED FOR ROBUSTNESS) ---

  const StepMode = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-8">
      {[
        { id: 'single', label: 'Post Único', desc: 'Legendas, Imagens ou Reels', icon: FileText },
        { id: 'plan', label: 'Planejamento Mensal', desc: 'Calendário de 4 semanas', icon: CalendarDays },
        { id: 'story', label: 'Sequência de Stories', desc: 'Narrativa para engajamento', icon: Zap }
      ].map((mode) => (
        <button
          key={mode.id}
          onClick={() => updateFormData('mode', mode.id)}
          className={`p-6 rounded-2xl border-2 text-left transition-all ${formData.mode === mode.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${formData.mode === mode.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <mode.icon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">{mode.label}</h3>
          <p className="text-sm text-slate-500 mt-2">{mode.desc}</p>
        </button>
      ))}
    </div>
  );

  const StepGoal = () => {
    const goalsList = formData.mode === 'story' ? STORY_GOALS : GOALS;
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        <h2 className="text-xl font-bold text-center mb-6">Qual o objetivo principal?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {goalsList.map((g) => (
            <button
              key={g.id}
              onClick={() => updateFormData('goal', g.label)}
              className={`p-4 rounded-xl border text-center transition-all ${formData.goal === g.label ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <Target className="w-6 h-6 mx-auto mb-2 opacity-70" />
              <span className="text-sm font-medium">{g.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-slate-500 mb-2 block">Ou descreva um objetivo específico:</label>
          <input 
            className="w-full p-3 border rounded-lg" 
            placeholder="Ex: Divulgar novo horário das 18h..." 
            value={formData.customGoal || ''}
            onChange={e => updateFormData('customGoal', e.target.value)}
          />
        </div>
      </div>
    );
  };

  const StepAudience = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
      <h2 className="text-xl font-bold text-center mb-6">Quem você quer atingir?</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {AUDIENCES.map((a) => (
          <button
            key={a.id}
            onClick={() => updateFormData('audience', a.label)}
            className={`p-4 rounded-xl border text-center transition-all ${formData.audience === a.label ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <Users className="w-6 h-6 mx-auto mb-2 opacity-70" />
            <span className="text-sm font-medium">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const StepTopic = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
      <h2 className="text-xl font-bold text-center mb-6">Sobre o que vamos falar?</h2>
      
      {topicSuggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-3 font-medium flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500"/> Sugestões da IA:</p>
          <div className="flex flex-wrap gap-2">
            {topicSuggestions.map((s, i) => (
              <button 
                key={i}
                onClick={() => updateFormData('topic', s)}
                className="bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2 rounded-lg text-sm border border-brand-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Defina o tema:</label>
        <textarea 
          className="w-full p-4 border border-slate-300 rounded-xl h-32 resize-none focus:ring-2 focus:ring-brand-500 outline-none"
          placeholder="Ex: Benefícios do Pilates para quem trabalha sentado o dia todo..."
          value={formData.topic}
          onChange={e => updateFormData('topic', e.target.value)}
        />
      </div>
    </div>
  );

  const StepFormat = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
      <h2 className="text-xl font-bold text-center mb-6">Formato e Estilo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-medium mb-3">Formato do Post</label>
          <div className="space-y-2">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => updateFormData('format', f.label)}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${formData.format === f.label ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}
              >
                <div>
                  <span className="font-bold text-sm block">{f.label}</span>
                  <span className="text-xs text-slate-500">{f.description}</span>
                </div>
                {formData.format === f.label && <CheckCircle className="w-4 h-4 text-brand-600"/>}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block font-medium mb-3">Estilo Visual/Texto</label>
          <div className="space-y-2">
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => updateFormData('style', s)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${formData.style === s ? 'border-brand-500 bg-brand-50 font-medium' : 'border-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ResultView = () => {
    if (!result) return null;

    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center bg-brand-50 p-4 rounded-xl border border-brand-100">
          <div>
            <h3 className="font-bold text-brand-800 text-lg">Conteúdo Gerado!</h3>
            <p className="text-sm text-brand-600">{result.reasoning}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-2"/> Novo</Button>
            <Button size="sm" onClick={handleSavePost}><Save className="w-4 h-4 mr-2"/> Salvar</Button>
          </div>
        </div>

        {/* --- SINGLE POST --- */}
        {(!result.isPlan && !result.isStory) && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Layout className="w-4 h-4"/> Legenda</h4>
                <div className="bg-slate-50 p-4 rounded-lg text-sm whitespace-pre-wrap border h-64 overflow-y-auto">
                  {result.captionLong || result.captionShort}
                  <br/><br/>
                  <span className="text-blue-600">{result.hashtags?.join(' ')}</span>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(`${result.captionLong}\n\n${result.hashtags.join(' ')}`)} 
                  className="mt-2 text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3"/> Copiar Legenda
                </button>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                  {result.isReels ? <Video className="w-4 h-4"/> : <ImageIcon className="w-4 h-4"/>} 
                  {result.isReels ? 'Roteiro de Vídeo' : 'Sugestão Visual'}
                </h4>
                
                {result.isReels && result.reelsOptions ? (
                  <div className="bg-slate-50 p-4 rounded-lg text-sm border space-y-4 h-64 overflow-y-auto">
                    {result.reelsOptions.map((opt, i) => (
                      <div key={i} className="mb-4 pb-4 border-b last:border-0 border-slate-200">
                        <p className="font-bold text-brand-700 mb-1">Opção {i+1}: {opt.title}</p>
                        <p className="text-xs text-slate-500 mb-2">Objetivo: {opt.purpose}</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {opt.script.map((line, idx) => <li key={idx}>{line}</li>)}
                        </ul>
                        <p className="mt-2 text-xs font-medium text-slate-600">🎵 Áudio: {opt.audioSuggestion}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-lg text-sm border h-64 overflow-y-auto">
                    <ul className="list-disc pl-4 space-y-2">
                      {result.visualContent?.map((vc, i) => (
                        <li key={i}>{vc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- STORIES --- */}
        {result.isStory && result.storySequence && (
          <div className="bg-white border rounded-xl p-6 shadow-sm overflow-x-auto">
            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500"/> Sequência de Stories</h4>
            <div className="flex gap-4 min-w-[800px]">
              {result.storySequence.frames.map((frame, i) => (
                <div key={i} className="flex-1 bg-slate-50 border rounded-lg p-4 min-w-[200px]">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold bg-slate-200 px-2 py-1 rounded">Frame {frame.order}</span>
                    <span className="text-xs text-slate-500 uppercase">{frame.type}</span>
                  </div>
                  <p className="text-sm font-medium mb-2">{frame.action}</p>
                  {frame.spokenText && <p className="text-xs text-slate-600 italic mb-2">" {frame.spokenText} "</p>}
                  <div className="mt-auto pt-2 border-t border-slate-200">
                    <p className="text-xs text-brand-600 font-bold">{frame.directAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- PLAN --- */}
        {result.isPlan && result.weeks && (
          <div className="space-y-4">
            {result.weeks.map((week, i) => (
              <div key={i} className="bg-white border rounded-xl p-4 shadow-sm">
                <h4 className="font-bold text-brand-700 mb-2">Semana {week.weekNumber}: {week.theme}</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {week.posts.map((post, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold text-slate-700">{post.day}</span>
                        <span className="text-xs bg-white border px-1 rounded">{post.format}</span>
                      </div>
                      <p className="text-slate-600">{post.idea}</p>
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

  const SavedPostsView = () => (
    <div className="animate-in fade-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Meus Conteúdos Salvos</h2>
        {savedPosts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-xl border-2 border-dashed">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                <p>Nenhum post salvo.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {savedPosts.map(post => (
                    <div key={post.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${post.isPlan ? 'bg-purple-100 text-purple-700' : post.isStory ? 'bg-yellow-100 text-yellow-700' : 'bg-brand-100 text-brand-700'}`}>
                                {post.isPlan ? 'PLANO' : post.isStory ? 'STORIES' : 'POST'}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{post.date}</span>
                                <button onClick={() => handleDeleteSaved(post.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-1">{post.topic}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{post.reasoning}</p>
                        <Button variant="outline" size="sm" onClick={() => { setResult(post); setStep(5); setCanRegenerate(false); }}>
                            Ver Detalhes
                        </Button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Dumbbell className="h-8 w-8 text-brand-600" /> Marketing Digital
                </h1>
                <p className="text-slate-500">Crie estratégias de conteúdo focadas em crescimento.</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={handleReset}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${step !== 6 ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}
                >
                    Criar
                </button>
                <button 
                    onClick={() => setStep(6)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${step === 6 ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}
                >
                    Salvos
                </button>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] flex flex-col relative">
            {step < 5 && step !== 6 && !isLoading && (
                <div className="w-full bg-slate-100 h-1.5">
                    <div className="bg-brand-500 h-1.5 transition-all duration-500" style={{ width: `${Math.min((step / 4) * 100, 100)}%` }} />
                </div>
            )}

            <div className="flex-1 p-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin"></div>
                            <Sparkles className="w-6 h-6 text-brand-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Criando seu conteúdo...</h3>
                        <p className="text-slate-500">A inteligência artificial está analisando seu perfil e objetivo.</p>
                    </div>
                ) : (
                    <>
                        {step === 0 && <StepMode />}
                        {step === 1 && <StepGoal />}
                        {step === 2 && <StepAudience />}
                        {step === 3 && <StepTopic />}
                        {step === 4 && <StepFormat />}
                        {step === 5 && <ResultView />}
                        {step === 6 && <SavedPostsView />}
                    </>
                )}
            </div>

            {step < 5 && step !== 6 && !isLoading && (
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    {step > 0 ? (
                        <Button variant="ghost" onClick={handleBack}>Voltar</Button>
                    ) : <div></div>}
                    
                    <Button 
                        onClick={isReadyToGenerate() ? handleGenerateAction : handleNext}
                        disabled={
                            (step === 1 && !formData.goal && !formData.customGoal) ||
                            (step === 2 && !formData.audience) ||
                            (step === 3 && !formData.topic)
                        }
                    >
                        {isReadyToGenerate() ? <><Sparkles className="w-4 h-4 mr-2"/> Gerar</> : <><ArrowRight className="w-4 h-4 mr-2"/> Próximo</>}
                    </Button>
                </div>
            )}
        </div>
    </div>
  );
};
