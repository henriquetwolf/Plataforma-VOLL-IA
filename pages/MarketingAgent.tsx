import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateMarketingContent, generateTopicSuggestions } from '../services/geminiService';
import { MarketingFormData, GeneratedContent, CategorizedTopics, SavedPost, ReelOption, CarouselCard, ContentRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Megaphone, Sparkles, Video, Image as LucideImage, Copy, Loader2, Lightbulb, UserCircle, Calendar, ArrowRight, ArrowLeft, RefreshCw, X, Eye, CheckCircle, Smartphone, Grid, Layers, Type, Save, Trash2, History } from 'lucide-react';
import { fetchStudioPersona, savePost, fetchSavedPosts, deleteSavedPost } from '../services/contentService';
import { fetchProfile } from '../services/storage';

// --- SUB-COMPONENTS FOR STEPS ---

const StepGoal = ({ selectedGoals, setSelectedGoals, customGoal, setCustomGoal }: any) => {
    const goals = [
        'Atrair Novos Alunos', 'Fidelizar / Engajar', 'Educativo / Informativo', 
        'Inspiracional / Motivacional', 'Vendas / Promoção'
    ];

    const toggleGoal = (g: string) => {
        if (selectedGoals.includes(g)) setSelectedGoals(selectedGoals.filter((x: string) => x !== g));
        else setSelectedGoals([...selectedGoals, g]);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Qual o objetivo do post?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goals.map(g => (
                    <button 
                        key={g}
                        onClick={() => toggleGoal(g)}
                        className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${selectedGoals.includes(g) ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'}`}
                    >
                        <span className="font-medium">{g}</span>
                        {selectedGoals.includes(g) && <CheckCircle className="w-5 h-5 text-brand-600" />}
                    </button>
                ))}
            </div>
            <Input label="Outro objetivo específico" value={customGoal} onChange={e => setCustomGoal(e.target.value)} placeholder="Ex: Divulgar evento X..." />
        </div>
    );
};

const StepAudience = ({ selectedAudiences, setSelectedAudiences, customAudience, setCustomAudience }: any) => {
    const audiences = [
        'Iniciantes / Sedentários', 'Mulheres 40+ / Menopausa', 'Alunos com Patologias', 
        'Foco em Alívio de Dores', 'Gestantes / Pós-Parto', 'Idosos / Terceira Idade',
        'Avançados / Desafios', 'Público Geral do Studio'
    ];

    const toggleAudience = (a: string) => {
        if (selectedAudiences.includes(a)) setSelectedAudiences(selectedAudiences.filter((x: string) => x !== a));
        else setSelectedAudiences([...selectedAudiences, a]);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Quem queremos atingir?</h3>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                {audiences.map(a => (
                    <button 
                        key={a}
                        onClick={() => toggleAudience(a)}
                        className={`p-3 rounded-xl border text-center transition-all text-sm ${selectedAudiences.includes(a) ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-purple-300'}`}
                    >
                        {a}
                    </button>
                ))}
            </div>
            <Input label="Outro público específico" value={customAudience} onChange={e => setCustomAudience(e.target.value)} placeholder="Ex: Atletas de corrida..." />
        </div>
    );
};

const StepTopic = ({ topic, setTopic, onGetIdeas, loadingIdeas, suggestions }: any) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sobre o que será falado?</h3>
            
            <div className="flex gap-2">
                <Input 
                    className="flex-1 mb-0" 
                    value={topic} 
                    onChange={e => setTopic(e.target.value)} 
                    placeholder="Ex: Benefícios do Pilates para coluna..."
                    autoFocus
                />
                <Button onClick={onGetIdeas} isLoading={loadingIdeas} variant="secondary" className="h-[46px]">
                    <Lightbulb className="w-4 h-4 mr-2" /> Sugerir Temas
                </Button>
            </div>

            {suggestions && (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Clichês (O que todos buscam)</h4>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.cliche?.map((Idea: string, i: number) => (
                                <button key={i} onClick={() => setTopic(Idea)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:border-brand-400 hover:text-brand-600 transition-colors text-left">
                                    {Idea}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Inovadores (Fora da caixa)</h4>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.innovative?.map((Idea: string, i: number) => (
                                <button key={i} onClick={() => setTopic(Idea)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:border-purple-400 hover:text-purple-600 transition-colors text-left">
                                    {Idea}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Viscerais (Profundos/Emocionais)</h4>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.visceral?.map((Idea: string, i: number) => (
                                <button key={i} onClick={() => setTopic(Idea)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:border-red-400 hover:text-red-600 transition-colors text-left">
                                    {Idea}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StepFormatStyle = ({ format, setFormat, style, setStyle, carouselType, setCarouselType }: any) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Formato do Conteúdo</h3>
        
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { id: 'IA Decide (Recomendado)', icon: Sparkles, label: 'IA Decide (Recomendado)' },
                    { id: 'Reels / Vídeo Curto', icon: Video, label: 'Reels / Vídeo Curto' },
                    { id: 'Carrossel (6 Cards)', icon: Layers, label: 'Carrossel (6 Cards)' },
                    { id: 'Post Estático', icon: LucideImage, label: 'Post Estático' }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setFormat(item.id)}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all h-28 ${
                            format === item.id 
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700'
                        }`}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="font-bold text-sm">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {format === 'Carrossel (6 Cards)' && (
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
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 bg-white dark:bg-slate-900'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const ResultView = ({ result, onSave, onRegenerate }: { result: GeneratedContent, onSave: () => void, onRegenerate: () => void }) => {
    const [activeReelTab, setActiveReelTab] = useState(0);

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <span className="text-xs font-bold text-brand-600 uppercase tracking-wide bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded mb-2 inline-block">
                            {result.suggestedFormat}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conteúdo Gerado</h2>
                        <p className="text-sm text-slate-500 mt-1">{result.reasoning}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onRegenerate} size="sm"><RefreshCw className="w-4 h-4 mr-2"/> Regenerar</Button>
                        <Button onClick={onSave} size="sm"><Save className="w-4 h-4 mr-2"/> Salvar</Button>
                    </div>
                </div>

                {/* --- CAROUSEL VIEW --- */}
                {result.carouselCards && (
                    <div className="mb-8">
                        <div className="mb-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                                <LucideImage className="w-4 h-4"/> Visual Panorâmico (Prompt)
                            </h4>
                            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 italic">
                                "{result.visualPrompt}"
                            </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                            <Layers className="w-4 h-4"/> Estrutura (6 Cards)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {result.carouselCards.map((card, idx) => (
                                <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950/50 flex flex-col h-full">
                                    <div className="font-bold text-xs text-brand-600 mb-2 uppercase tracking-wide">CARD {card.order}</div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-white mb-1">{card.textOverlay || '(Visual)'}</div>
                                    <div className="text-xs text-slate-500 mb-2 flex-1">{card.content || card.visualPrompt}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- REELS VIEW (4 OPTIONS) --- */}
                {result.reelsOptions && result.reelsOptions.length > 0 && (
                    <div className="mb-8">
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            {result.reelsOptions.map((reel, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setActiveReelTab(idx)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                        activeReelTab === idx 
                                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    Opção {idx + 1}: {reel.type}
                                </button>
                            ))}
                        </div>

                        <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950/50 animate-in fade-in">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Video className="w-5 h-5 text-brand-600"/> {result.reelsOptions[activeReelTab].title}
                                </h4>
                                <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                    {result.reelsOptions[activeReelTab].duration}
                                </span>
                            </div>
                            
                            <div className="space-y-4 text-sm">
                                <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800">
                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Gancho (3s)</span>
                                    <p className="font-medium text-slate-800 dark:text-white">"{result.reelsOptions[activeReelTab].hook}"</p>
                                </div>

                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Roteiro</span>
                                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                                        {result.reelsOptions[activeReelTab].script.map((line, i) => <li key={i}>{line}</li>)}
                                    </ul>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Áudio</span>
                                        <p className="text-slate-600 dark:text-slate-400">{result.reelsOptions[activeReelTab].audioSuggestions.join(', ')}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Microdetalhes</span>
                                        <p className="text-slate-600 dark:text-slate-400 italic">{result.reelsOptions[activeReelTab].microDetails}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STATIC POST VIEW --- */}
                {result.visualPrompt && !result.carouselCards && !result.reelsOptions && (
                    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <LucideImage className="w-4 h-4"/> Sugestão Visual
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{result.visualPrompt}"</p>
                    </div>
                )}

                {/* CAPTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Legenda Curta</label>
                            <button onClick={() => navigator.clipboard.writeText(result.captionShort || '')} className="text-brand-600 hover:text-brand-700"><Copy className="w-4 h-4"/></button>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap h-40 overflow-y-auto border border-slate-200 dark:border-slate-700">
                            {result.captionShort}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Legenda Longa</label>
                            <button onClick={() => navigator.clipboard.writeText(result.captionLong || '')} className="text-brand-600 hover:text-brand-700"><Copy className="w-4 h-4"/></button>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap h-40 overflow-y-auto border border-slate-200 dark:border-slate-700">
                            {result.captionLong}
                        </div>
                    </div>
                </div>

                {/* HASHTAGS */}
                {result.hashtags && (
                    <div className="mt-6">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Hashtags</label>
                        <div className="flex flex-wrap gap-2">
                            {result.hashtags.map((tag, i) => (
                                <span key={i} className="text-xs bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 px-2 py-1 rounded">#{tag}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const GeneratedPostPreview = ({ post, onClose, readOnly }: { post: SavedPost, onClose: () => void, readOnly?: boolean }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <div>
                        <span className="text-xs font-bold uppercase text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded mb-1 inline-block">
                            {post.request.format}
                        </span>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{post.request.theme}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6 space-y-6">
                    {(post.imageUrl || post.videoUrl) && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex justify-center">
                            {post.videoUrl ? (
                                <video src={post.videoUrl} controls className="max-h-96 w-full object-contain" />
                            ) : (
                                <img src={post.imageUrl!} alt="Visual" className="max-h-96 w-full object-contain" />
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Conteúdo</label>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {post.content}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                        <div>
                            <span className="font-bold block mb-1">Objetivo</span>
                            {post.request.objective}
                        </div>
                        <div>
                            <span className="font-bold block mb-1">Público</span>
                            {post.request.audience}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                    <Button onClick={() => {
                        navigator.clipboard.writeText(post.content);
                        alert("Conteúdo copiado!");
                    }}>
                        <Copy className="w-4 h-4 mr-2"/> Copiar Texto
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const MarketingAgent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Navigation State
  const [step, setStep] = useState(1); // 1: Goal, 2: Audience, 3: Topic, 4: Format, 5: Result
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form Data State
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [customAudience, setCustomAudience] = useState('');
  
  const [topic, setTopic] = useState('');
  const [suggestions, setSuggestions] = useState<CategorizedTopics | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const [format, setFormat] = useState('IA Decide (Recomendado)');
  const [carouselType, setCarouselType] = useState<'image-only' | 'text-only' | 'text-image'>('text-image');
  const [style, setStyle] = useState('Moderno');
  
  // Results State
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [savedHistory, setSavedHistory] = useState<SavedPost[]>([]);
  const [previewPost, setPreviewPost] = useState<SavedPost | null>(null); // For history viewing

  useEffect(() => {
      if (user?.id && activeTab === 'history') {
          loadHistory();
      }
  }, [user, activeTab]);

  const loadHistory = async () => {
      if (user?.id) {
          const posts = await fetchSavedPosts(user.id);
          setSavedHistory(posts);
      }
  };

  const handleGetIdeas = async () => {
      if (!selectedGoals.length && !customGoal) {
          alert("Selecione um objetivo primeiro (Passo 1).");
          setStep(1);
          return;
      }
      setLoadingSuggestions(true);
      const ideas = await generateTopicSuggestions(
          [...selectedGoals, customGoal].filter(Boolean).join(', '), 
          [...selectedAudiences, customAudience].filter(Boolean).join(', ')
      );
      setSuggestions(ideas);
      setLoadingSuggestions(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
        const formData: MarketingFormData = {
            mode: 'single',
            goal: [...selectedGoals, customGoal].filter(Boolean).join(', '),
            goals: selectedGoals,
            customGoal,
            audience: [...selectedAudiences, customAudience].filter(Boolean).join(', '),
            audiences: selectedAudiences,
            customAudience,
            topic,
            format,
            style,
            carouselType // Important for logic
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

  const handleSaveResult = async () => {
      if (!user?.id || !result) return;
      
      const newPost: SavedPost = {
          id: crypto.randomUUID(),
          request: {
              format,
              objective: selectedGoals.join(', '),
              theme: topic,
              audience: selectedAudiences.join(', '),
              tone: style,
              imageStyle: style,
              logoConfig: { enabled: false, type: 'normal', position: 'bottom-right', size: 'small' }
          },
          content: result.captionLong || result.captionShort || '',
          imageUrl: result.generatedImage || null, // Se a IA gerar imagem real no futuro
          videoUrl: null,
          createdAt: new Date().toISOString()
      };

      const res = await savePost(user.id, newPost);
      if (res.success) {
          alert("Post salvo!");
          setActiveTab('history');
          // Reset flow
          setStep(1);
          setResult(null);
          setTopic('');
      } else {
          alert("Erro ao salvar.");
      }
  };

  const handleDeleteHistory = async (id: string) => {
      if (confirm("Apagar este post?")) {
          await deleteSavedPost(id);
          loadHistory();
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="h-8 w-8 text-brand-600" /> Marketing
                </h1>
                <p className="text-slate-500">Crie conteúdo estratégico (Post Único).</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
                >
                    <Sparkles className="w-4 h-4"/> Criar
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
                >
                    <History className="w-4 h-4"/> Histórico
                </button>
            </div>
       </div>

       {activeTab === 'create' && (
           <div className="mt-8">
               {/* Progress Bar */}
               <div className="mb-8">
                   <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                       <span className={step >= 1 ? 'text-brand-600' : ''}>1. Objetivo</span>
                       <span className={step >= 2 ? 'text-brand-600' : ''}>2. Público</span>
                       <span className={step >= 3 ? 'text-brand-600' : ''}>3. Tema</span>
                       <span className={step >= 4 ? 'text-brand-600' : ''}>4. Formato</span>
                       <span className={step >= 5 ? 'text-brand-600' : ''}>5. Resultado</span>
                   </div>
                   <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-brand-500 transition-all duration-500 ease-out" style={{ width: `${(step / 5) * 100}%` }}></div>
                   </div>
               </div>

               {/* Step Content */}
               <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col justify-between">
                   <div className="flex-1">
                        {step === 1 && (
                            <StepGoal 
                                selectedGoals={selectedGoals} 
                                setSelectedGoals={setSelectedGoals} 
                                customGoal={customGoal} 
                                setCustomGoal={setCustomGoal} 
                            />
                        )}
                        {step === 2 && (
                            <StepAudience 
                                selectedAudiences={selectedAudiences} 
                                setSelectedAudiences={setSelectedAudiences} 
                                customAudience={customAudience} 
                                setCustomAudience={setCustomAudience} 
                            />
                        )}
                        {step === 3 && (
                            <StepTopic 
                                topic={topic} 
                                setTopic={setTopic} 
                                onGetIdeas={handleGetIdeas} 
                                loadingIdeas={loadingSuggestions} 
                                suggestions={suggestions} 
                            />
                        )}
                        {step === 4 && (
                            <StepFormatStyle 
                                format={format} 
                                setFormat={setFormat} 
                                style={style} 
                                setStyle={setStyle} 
                                carouselType={carouselType}
                                setCarouselType={setCarouselType}
                            />
                        )}
                        {step === 5 && result && (
                            <ResultView 
                                result={result} 
                                onSave={handleSaveResult} 
                                onRegenerate={handleGenerate} 
                            />
                        )}
                   </div>

                   {/* Navigation Buttons */}
                   {step < 5 && (
                       <div className="flex justify-between pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
                           <Button 
                                variant="ghost" 
                                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                                disabled={step === 1}
                           >
                               <ArrowLeft className="w-4 h-4 mr-2"/> Voltar
                           </Button>
                           
                           {step === 4 ? (
                               <Button onClick={handleGenerate} isLoading={loading} className="px-8 bg-brand-600 hover:bg-brand-700 text-white">
                                   <Sparkles className="w-4 h-4 mr-2"/> Gerar Conteúdo
                               </Button>
                           ) : (
                               <Button onClick={() => setStep(prev => prev + 1)} disabled={
                                   (step === 1 && selectedGoals.length === 0 && !customGoal) ||
                                   (step === 2 && selectedAudiences.length === 0 && !customAudience) ||
                                   (step === 3 && !topic)
                               }>
                                   Próximo <ArrowRight className="w-4 h-4 ml-2"/>
                               </Button>
                           )}
                       </div>
                   )}
               </div>
           </div>
       )}

       {activeTab === 'history' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
               {savedHistory.length === 0 ? (
                   <div className="col-span-3 text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                       <p>Nenhum post salvo ainda.</p>
                   </div>
               ) : (
                   savedHistory.map(post => (
                       <div key={post.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                           <div className="flex justify-between items-start mb-3">
                               <span className="text-xs font-bold uppercase text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded">
                                   {post.request.format}
                               </span>
                               <div className="flex gap-1">
                                   <button onClick={() => setPreviewPost(post)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded">
                                       <Eye className="w-4 h-4"/>
                                   </button>
                                   <button onClick={() => handleDeleteHistory(post.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                                       <Trash2 className="w-4 h-4"/>
                                   </button>
                               </div>
                           </div>
                           <h4 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-2">{post.request.theme}</h4>
                           <p className="text-xs text-slate-500 mb-3">{new Date(post.createdAt).toLocaleDateString()}</p>
                           <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg">
                               {post.content}
                           </div>
                       </div>
                   ))
               )}
           </div>
       )}

       {previewPost && (
           <GeneratedPostPreview post={previewPost} onClose={() => setPreviewPost(null)} readOnly />
       )}
    </div>
  );
};