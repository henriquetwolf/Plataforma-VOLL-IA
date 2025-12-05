
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateMarketingContent, generateTopicSuggestions } from '../services/geminiService';
import { MarketingFormData, GeneratedContent, ReelOption, CategorizedTopics, SavedPost } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Megaphone, Sparkles, Video, Image as LucideImage, Copy, Loader2, Lightbulb, UserCircle, Calendar, ArrowRight, ArrowLeft, RefreshCw, X, Eye, CheckCircle, Smartphone, Grid, Layers, Type } from 'lucide-react';
import { fetchStudioPersona, savePost, fetchSavedPosts, getTodayPostCount, recordGenerationUsage } from '../services/contentService';
import { fetchProfile } from '../services/storage';

const GeneratedPostPreview: React.FC<{ post: SavedPost; onClose: () => void; readOnly?: boolean; }> = ({ post, onClose, readOnly }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                <h3 className="font-bold text-slate-800 dark:text-white">Post Gerado</h3>
                <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                    {post.imageUrl ? (
                        <img src={post.imageUrl} alt="Generated" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center p-4">
                            <LucideImage className="w-12 h-12 mx-auto text-slate-300 mb-2"/>
                            <p className="text-xs text-slate-400 italic">Imagem não gerada ou indisponível</p>
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">Legenda</label>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                        {post.content}
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>Fechar</Button>
            </div>
        </div>
    </div>
);

const StepFormatStyle = ({ format, setFormat, style, setStyle, carouselType, setCarouselType }: any) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Formato & Estilo</h3>
        
        <div>
            <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Qual o formato do conteúdo?</label>
            <div className="grid grid-cols-2 gap-4">
                {['Reels / Vídeo', 'Post Estático', 'Carrossel'].map(fmt => (
                    <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            format === fmt 
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700'
                        }`}
                    >
                        <div className="font-bold mb-1">{fmt}</div>
                    </button>
                ))}
            </div>
        </div>

        {format === 'Carrossel' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in">
                <label className="block text-sm font-bold mb-3 text-slate-700 dark:text-slate-300">Tipo de Carrossel</label>
                <div className="grid grid-cols-1 gap-3">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${carouselType === 'image-only' ? 'bg-white dark:bg-slate-800 border-brand-500 shadow-sm' : 'border-transparent hover:bg-white dark:hover:bg-slate-800'}`}>
                        <input type="radio" name="carouselType" checked={carouselType === 'image-only'} onChange={() => setCarouselType('image-only')} className="text-brand-600 focus:ring-brand-500"/>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-white block text-sm">Visual (Sem Texto)</span>
                            <span className="text-xs text-slate-500">Apenas imagens impactantes que contam uma história.</span>
                        </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${carouselType === 'text-only' ? 'bg-white dark:bg-slate-800 border-brand-500 shadow-sm' : 'border-transparent hover:bg-white dark:hover:bg-slate-800'}`}>
                        <input type="radio" name="carouselType" checked={carouselType === 'text-only'} onChange={() => setCarouselType('text-only')} className="text-brand-600 focus:ring-brand-500"/>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-white block text-sm">Informativo (Texto)</span>
                            <span className="text-xs text-slate-500">Foco em conteúdo escrito, listas e dicas.</span>
                        </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${carouselType === 'text-image' ? 'bg-white dark:bg-slate-800 border-brand-500 shadow-sm' : 'border-transparent hover:bg-white dark:hover:bg-slate-800'}`}>
                        <input type="radio" name="carouselType" checked={carouselType === 'text-image'} onChange={() => setCarouselType('text-image')} className="text-brand-600 focus:ring-brand-500"/>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-white block text-sm">Híbrido (Texto + Imagem)</span>
                            <span className="text-xs text-slate-500">Equilíbrio perfeito entre visual e informação.</span>
                        </div>
                    </label>
                </div>
            </div>
        )}

        <div>
            <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Estilo Visual</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['Minimalista', 'Moderno', 'Elegante', 'Energético', 'Corporativo', 'Humanizado'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`py-2 px-3 rounded-lg text-sm border transition-all ${
                            style === s 
                            ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

// ... (PlanCalendarView, StepPlanSettings, StepTopic, StepGoal, StepAudience components remain similar, importing from below if needed or kept here)

export const MarketingAgent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // State for flow
  const [step, setStep] = useState(1); // 1: Goal, 2: Audience, 3: Topic, 4: Format, 5: Result
  const [mode, setMode] = useState<'single' | 'plan'>('single');
  
  // Form Data
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [customAudience, setCustomAudience] = useState('');
  
  const [topic, setTopic] = useState('');
  const [suggestions, setSuggestions] = useState<CategorizedTopics | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const [format, setFormat] = useState('Post Estático');
  const [carouselType, setCarouselType] = useState<'image-only' | 'text-only' | 'text-image'>('text-image');
  const [style, setStyle] = useState('Moderno');
  
  // Planner Specific
  const [frequency, setFrequency] = useState(3);
  const [planFormats, setPlanFormats] = useState<string[]>(['Reels', 'Post Estático', 'Carrossel']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Results
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [savedHistory, setSavedHistory] = useState<SavedPost[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Viewer State
  const [previewPost, setPreviewPost] = useState<SavedPost | null>(null);

  // ... (Load history logic) ...

  const handleGenerate = async () => {
    setLoading(true);
    try {
        const formData: MarketingFormData = {
            mode,
            goal: selectedGoals.join(', '),
            goals: selectedGoals,
            customGoal,
            audience: selectedAudiences.join(', '),
            audiences: selectedAudiences,
            customAudience,
            topic,
            format,
            style,
            frequency,
            selectedFormats: planFormats,
            startDate,
            carouselType // Pass carousel type
        };

        const data = await generateMarketingContent(formData);
        if (data) {
            setResult(data);
            setStep(5);
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao gerar conteúdo.");
    } finally {
        setLoading(false);
    }
  };

  // ... (Rest of the component logic including render steps) ...

  // Only showing the StepFormatStyle usage change in the render
  
  return (
    <div className="max-w-4xl mx-auto pb-20 pt-6 px-4">
       {/* ... Header ... */}
       
       {/* ... Steps 1, 2, 3 ... */}

       {/* Step 4: Format & Style */}
       {step === 4 && (
         <div className="space-y-8">
            {mode === 'single' ? (
                <StepFormatStyle 
                    format={format} 
                    setFormat={setFormat} 
                    style={style} 
                    setStyle={setStyle} 
                    carouselType={carouselType}
                    setCarouselType={setCarouselType}
                />
            ) : (
                /* Planner Settings Component */
                <div>Planner Settings (Existing)</div>
            )}
            
            <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(3)}>Voltar</Button>
                <Button onClick={handleGenerate} isLoading={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-8">
                    <Sparkles className="w-4 h-4 mr-2" /> Gerar {mode === 'plan' ? 'Planejamento' : 'Conteúdo'}
                </Button>
            </div>
         </div>
       )}

       {/* ... Result Step ... */}
    </div>
  );
};
