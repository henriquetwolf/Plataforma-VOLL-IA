
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateMarketingContent, generateTopicSuggestions, generatePilatesImage, generatePilatesContentStream } from '../services/geminiService';
import { MarketingFormData, GeneratedContent, SavedPost, StrategicContentPlan } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Megaphone, Sparkles, Video, Image as LucideImage, Copy, Loader2, Lightbulb, ArrowRight, ArrowLeft, RefreshCw, Save, Trash2, History, Download, CalendarDays, FileText, Zap, UserPlus, Heart, BookOpen, ShoppingBag, Users, Camera, MessageCircle, Layout, RotateCcw, Layers, CheckCircle, Wand2, Eye, Calendar, Lock, Target } from 'lucide-react';
import { savePost, fetchSavedPosts, deleteSavedPost, recordGenerationUsage, getTodayPostCount, saveContentPlan, fetchContentPlans, deleteContentPlan } from '../services/contentService';
import { fetchProfile } from '../services/storage';

// --- CONSTANTS ---
const GOALS = [
  { id: 'attract', label: 'Atrair Novos Alunos', icon: UserPlus },
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

const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- SUB-COMPONENTS ---

const StepMode = ({ selected, onSelect }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-8">
        {[
            { id: 'single', label: 'Post Único', desc: 'Reels ou Post Estático focado em um objetivo imediato.', icon: FileText, color: 'bg-teal-50 text-teal-600' },
            { id: 'story', label: 'Sequência de Stories', desc: 'Roteiro estratégico de 3 a 8 stories para conexão e venda.', icon: Zap, color: 'bg-purple-50 text-purple-600' },
            { id: 'plan', label: 'Plano 4 Semanas', desc: 'Calendário completo com temas semanais e organização.', icon: CalendarDays, color: 'bg-blue-50 text-blue-600' }
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

const StepGoal = ({ selected, customGoal, mode, onSelect, onCustomChange }: any) => {
    const list = mode === 'story' ? STORY_GOALS : GOALS;
    
    const selectedArray = selected ? selected.split(',').map((s: string) => s.trim()) : [];

    const handleToggle = (label: string) => {
        let newSelection;
        if (selectedArray.includes(label)) {
            newSelection = selectedArray.filter((s: string) => s !== label);
        } else {
            newSelection = [...selectedArray, label];
        }
        onSelect(newSelection.join(', '));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Qual é o objetivo desse conteúdo? (Selecione um ou mais)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((item: any) => {
                    const isSelected = selectedArray.includes(item.label);
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleToggle(item.label)}
                            className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-brand-200 bg-white dark:bg-slate-900'}`}
                        >
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <span className={`font-medium ${isSelected ? 'text-brand-900 dark:text-brand-100' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</span>
                            {isSelected && <CheckCircle className="w-5 h-5 text-brand-500 ml-auto" />}
                        </button>
                    );
                })}
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Outro Objetivo Específico</label>
                <input 
                    className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Escreva aqui seu objetivo..."
                    value={customGoal || ''}
                    onChange={e => onCustomChange(e.target.value)}
                />
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button onClick={() => { 
                    const nextBtn = document.getElementById('step-2-next');
                    if (nextBtn) nextBtn.click();
                }}>
                    Continuar <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
            </div>
        </div>
    );
};

const StepAudience = ({ selected, customAudience, onSelect, onCustomChange }: any) => {
    const selectedArray = selected ? selected.split(',').map((s: string) => s.trim()) : [];

    const handleToggle = (label: string) => {
        let newSelection;
        if (selectedArray.includes(label)) {
            newSelection = selectedArray.filter((s: string) => s !== label);
        } else {
            newSelection = [...selectedArray, label];
        }
        onSelect(newSelection.join(', '));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Para quem é esse conteúdo? (Selecione um ou mais)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {AUDIENCES.map((item) => {
                    const isSelected = selectedArray.includes(item.label);
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleToggle(item.label)}
                            className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center min-h-[120px] relative ${isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-brand-200 bg-white dark:bg-slate-900'}`}
                        >
                            {isSelected && <div className="absolute top-2 right-2"><CheckCircle className="w-4 h-4 text-brand-500" /></div>}
                            <Users className={`w-8 h-8 mb-3 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Outro Público Específico</label>
                <input 
                    className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Ex: Adolescentes, Homens, Praticantes de Corrida..."
                    value={customAudience || ''}
                    onChange={e => onCustomChange(e.target.value)}
                />
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button onClick={() => { 
                    const nextBtn = document.getElementById('step-3-next');
                    if (nextBtn) nextBtn.click();
                }}>
                    Continuar <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
            </div>
        </div>
    );
};

const StepTopic = ({ value, onChange, onGenerateIdeas, isGeneratingIdeas, suggestions, mode, formData, onFormChange }: any) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        {mode === 'single' && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">1. Escolha o Formato</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { id: 'post', label: 'Post Estático', icon: LucideImage },
                        { id: 'carousel', label: 'Carrossel (6 Cards)', icon: Layers },
                        { id: 'reels', label: 'Reels (Vídeo)', icon: Video }
                    ].map((fmt) => (
                        <button
                            key={fmt.id}
                            onClick={() => onFormChange({...formData, format: fmt.id})}
                            className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                                formData.format === fmt.id 
                                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:border-brand-200'
                            }`}
                        >
                            <fmt.icon className="w-5 h-5"/>
                            <span className="text-sm font-bold">{fmt.label}</span>
                        </button>
                    ))}
                </div>
                {formData.format === 'carousel' && <p className="text-xs text-slate-500 mt-2">Gera uma imagem panorâmica dividida visualmente em 6 partes.</p>}
                {formData.format === 'reels' && <p className="text-xs text-slate-500 mt-2">Gera 4 opções de roteiro. Não gera imagem.</p>}
            </div>
        )}

        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                {mode === 'single' ? '2. Sobre qual tema você quer falar?' : 'Sobre qual tema você quer falar?'}
            </h2>
            
            <textarea 
                className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl h-32 resize-none focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 text-lg"
                placeholder="Ex: Benefícios do Pilates para dor nas costas, Promoção de verão..."
                value={value}
                onChange={e => onChange(e.target.value)}
            />

            <div className="flex justify-end mt-2">
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={onGenerateIdeas} 
                    isLoading={isGeneratingIdeas}
                >
                    <Sparkles className="w-4 h-4 mr-2"/> Gerar Sugestões com IA
                </Button>
            </div>
        </div>

        {suggestions.length > 0 && (
            <div>
                <p className="text-xs font-bold text-brand-600 uppercase mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Sugestões para você</p>
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

        {/* Start Date & Frequency Input for Plan Mode */}
        {mode === 'plan' && (
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 mt-6 space-y-4">
                <div>
                    <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Data de Início do Calendário
                    </label>
                    <Input
                        type="date"
                        value={formData.startDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => onFormChange({...formData, startDate: e.target.value})}
                        className="bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Frequência de Postagens (por semana)
                    </label>
                    <select
                        value={formData.postsPerWeek || 5}
                        onChange={(e) => onFormChange({...formData, postsPerWeek: parseInt(e.target.value)})}
                        className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={3}>3 posts por semana</option>
                        <option value={4}>4 posts por semana</option>
                        <option value={5}>5 posts por semana</option>
                        <option value={6}>6 posts por semana</option>
                        <option value={7}>7 posts por semana (Diário)</option>
                    </select>
                </div>

                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    A IA calculará os dias exatos com base na data de início e frequência.
                </p>
            </div>
        )}
    </div>
);

const ResultDisplay = ({ content, onReset, onSave, onRegenerate, canRegenerate, onGenerateFromPlan, onViewSavedPost }: any) => {
    const [showLongCaption, setShowLongCaption] = useState(false);

    if (!content) return null;
    
    // Determine layout for image
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
                        <h3 className="text-xl font-bold text-brand-900 dark:text-brand-100">Estratégia Escolhida</h3>
                        <p className="text-brand-700 dark:text-brand-300 text-sm mt-1">{content.reasoning}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={onReset}><RotateCcw className="w-4 h-4 mr-2"/> Início</Button>
                        <Button size="sm" onClick={onSave}><Save className="w-4 h-4 mr-2"/> Salvar</Button>
                    </div>
                </div>
                
                {canRegenerate && (
                    <Button size="sm" onClick={onRegenerate} className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                        <RefreshCw className="w-4 h-4 mr-2"/> Ver outra sugestão
                    </Button>
                )}
            </div>

            {/* SINGLE POST / REELS / CAROUSEL VIEW */}
            {!content.isPlan && !content.isStory && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* LEGENDA */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5"/> Legenda</h4>
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
                            <Copy className="w-4 h-4 mr-2"/> Copiar
                        </Button>
                    </div>

                    {/* IMAGEM / VISUAL */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            {isReels ? <Video className="w-5 h-5"/> : <LucideImage className="w-5 h-5"/>} 
                            {isReels ? 'Roteiros de Vídeo (4 Opções)' : (isCarousel ? 'Panorâmica Carrossel (6 Cards)' : 'Imagem Sugerida')}
                        </h4>
                        
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm overflow-y-auto max-h-[400px] flex flex-col items-center justify-center">
                            {content.generatedImage ? (
                                <div className="w-full">
                                    <img 
                                        src={content.generatedImage} 
                                        alt="Gerado pela IA" 
                                        className={`w-full object-contain rounded-lg shadow-sm ${isCarousel ? 'aspect-[6/1]' : isReels ? 'aspect-[9/16]' : 'aspect-square'}`} 
                                    />
                                    {isCarousel && <p className="text-center text-xs text-slate-400 mt-2">Panorâmica simulando 6 cards integrados (Estilo 6:1).</p>}
                                    <div className="mt-3 flex justify-center">
                                        <Button variant="secondary" size="xs" onClick={() => downloadImage(content.generatedImage!, 'post-instagram.png')}>
                                            <Download className="w-3 h-3 mr-1" /> Baixar Imagem
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // Fallback info if image isn't ready
                                <div className="text-center text-slate-400 w-full">
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
                                            <p className="mb-2 font-bold text-slate-600">Descrição Visual:</p>
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

            {/* STORIES SEQUENCE */}
            {content.isStory && content.storySequence && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500"/> Sequência Estratégica</h4>
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

            {/* PLAN */}
            {content.isPlan && content.weeks && (
                <div className="space-y-4">
                    {content.weeks.map((week: any, i: number) => (
                        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h4 className="font-bold text-brand-700 text-lg mb-4 flex items-center gap-2">
                                <CalendarDays className="w-5 h-5"/> {week.week || `Semana ${i+1}`}: {week.theme}
                            </h4>
                            <div className="grid md:grid-cols-3 gap-4">
                                {week.posts?.map((post: any, idx: number) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{post.day}</span>
                                                <span className="text-[10px] bg-white dark:bg-slate-900 border px-2 py-0.5 rounded text-slate-500 uppercase font-bold">{post.format}</span>
                                            </div>
                                            {post.objective && (
                                                <div className="flex items-center gap-1 mb-2 text-xs text-brand-600 bg-brand-50 w-fit px-2 py-0.5 rounded">
                                                    <Target className="w-3 h-3" /> {post.objective}
                                                </div>
                                            )}
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{post.idea || post.theme}</p>
                                        </div>
                                        
                                        {/* Generate Button for each Plan Item */}
                                        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                            {post.generatedPostId ? (
                                                <Button size="xs" variant="secondary" onClick={() => onViewSavedPost(post.generatedPostId)} className="w-full bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                                                    <Eye className="w-3 h-3 mr-1"/> Ver Conteúdo
                                                </Button>
                                            ) : (
                                                <Button size="xs" variant="outline" className="w-full text-xs" onClick={() => onGenerateFromPlan(post, i, idx)}>
                                                    <Wand2 className="w-3 h-3 mr-1"/> Gerar
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

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Dica de Engajamento</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400">{content.tips}</p>
                </div>
            </div>
        </div>
    );
};

export const ContentAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // States
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<MarketingFormData>({
    mode: 'single',
    goal: GOALS[0].label,
    audience: AUDIENCES[0].label,
    topic: '',
    format: 'auto',
    style: 'Persona da Marca (Padrão)',
    startDate: new Date().toISOString().split('T')[0],
    postsPerWeek: 5
  });
  
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [activePlan, setActivePlan] = useState<GeneratedContent | null>(null); // To persist plan state during interactions
  const [isSaving, setIsSaving] = useState(false);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'posts' | 'plans'>('posts');
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [savedPlans, setSavedPlans] = useState<StrategicContentPlan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Plan Tracking
  const [currentPlanItemIndices, setCurrentPlanItemIndices] = useState<{weekIndex: number, postIndex: number} | null>(null);

  // Daily Limit
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const isLimitReached = dailyCount >= dailyLimit;

  useEffect(() => {
    if (user?.id) {
        const targetId = user.isInstructor ? user.studioId : user.id;
        if(targetId) {
            getTodayPostCount(targetId).then(setDailyCount);
            loadHistory(targetId);
            fetchProfile(targetId).then(profile => {
                if (profile?.planMaxDailyPosts) setDailyLimit(profile.planMaxDailyPosts);
            });
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
      // Do not auto-advance to allow multiple selections
  };

  const handleAudienceSelect = (audience: string) => {
      setFormData(prev => ({ ...prev, audience, customAudience: '' }));
      // Do not auto-advance to allow multiple selections
  };

  const handleGenerateIdeas = async () => {
      if (!formData.goal || !formData.audience) return;
      setIsGeneratingIdeas(true);
      const ideas = await generateTopicSuggestions(formData.customGoal || formData.goal, formData.customAudience || formData.audience);
      setTopicSuggestions(ideas);
      setIsGeneratingIdeas(false);
  };

  const handleGenerateContent = async () => {
    if (isLimitReached) {
        alert("Limite diário de criações atingido. Atualize seu plano.");
        return;
    }

    setIsGenerating(true);
    try {
        const finalData = { ...formData };
        if (finalData.goal === 'Outro (Descrever...)') finalData.goal = finalData.customGoal || '';
        if (finalData.audience === 'Outro (Descrever...)') finalData.audience = finalData.customAudience || '';
        
        const content = await generateMarketingContent(finalData);
        
        // Logic change: Only generate image if NOT Reels and NOT Plan
        // Also check if content itself decided it's reels (though we force format now)
        const shouldGenerateImage = !content.isPlan && 
                                    !content.isReels && 
                                    formData.format !== 'reels';

        if (content && content.visualPrompt && shouldGenerateImage) {
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
            setDailyCount(prev => prev + 1);
        }

    } catch (e) {
        alert("Erro ao gerar conteúdo.");
    }
    setIsGenerating(false);
  };

  const handleGenerateFromPlan = (post: any, weekIndex: number, postIndex: number) => {
    if (isLimitReached) {
        alert("Limite diário de criações atingido.");
        return;
    }

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
        // Keep previous goal/audience from plan loading if available, otherwise use specific daily objective
        // Logic: Use daily objective as Custom Goal, retain overall Audience from Plan
        customGoal: post.objective || '',
        customAudience: '' // Keep general audience
    }));

    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewPost = (postId: string) => {
      // Find post in savedPosts
      const post = savedPosts.find(p => p.id === postId);
      if (post) {
          const mockResult: GeneratedContent = {
              suggestedFormat: post.request.format,
              reasoning: 'Post recuperado do histórico.',
              hashtags: [],
              tips: 'Post já salvo.',
              captionLong: post.content,
              generatedImage: post.imageUrl || undefined,
              isPlan: false,
              isStory: false,
              isReels: post.request.format.toLowerCase().includes('reels')
          };
          setResult(mockResult);
          setStep(5);
          setShowHistory(false); // Close history view
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          alert("Post não encontrado no histórico. Pode ter sido excluído.");
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
                  ideas: w.posts?.map((p: any) => ({
                      day: p.day,
                      theme: p.idea, // Map 'idea' (from generation) to 'theme' (for storage) to match Interface
                      format: p.format,
                      objective: p.objective,
                      generatedPostId: p.generatedPostId
                  }))
              })) || []
          };
          res = await saveContentPlan(studioId, plan);
      } else {
          // Post Generation
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
              // Update the Active Plan State locally with the new ID
              const newPlan = JSON.parse(JSON.stringify(activePlan)); // Deep copy
              if (newPlan.weeks && newPlan.weeks[currentPlanItemIndices.weekIndex]) {
                  newPlan.weeks[currentPlanItemIndices.weekIndex].posts[currentPlanItemIndices.postIndex].generatedPostId = postId;
                  setActivePlan(newPlan);
                  // Optional: We could trigger a save of the whole plan here too to persist the link immediately
              }
          }
      }

      if (res.success) {
          alert("Salvo com sucesso!");
          loadHistory(studioId);
      } else {
          alert("Erro ao salvar.");
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
      if (confirm("Excluir?")) {
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
                    <Megaphone className="h-8 w-8 text-brand-600" /> Marketing Digital
                </h1>
                <p className="text-slate-500">Crie conteúdo estratégico de alta conversão em segundos.</p>
            </div>
            
            <div className="flex items-center gap-4">
                {/* DAILY COUNTER BADGE */}
                <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-bold shadow-sm transition-colors ${
                    isLimitReached 
                    ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                }`}>
                    {isLimitReached ? <Lock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    <span>{dailyCount} / {dailyLimit} posts hoje</span>
                </div>

                {!showHistory && step > 1 && (
                    <Button variant="ghost" onClick={handleBack}><ArrowLeft className="w-4 h-4 mr-2"/> Voltar</Button>
                )}
                <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                    <History className="w-4 h-4 mr-2"/> {showHistory ? 'Voltar' : 'Histórico'}
                </Button>
            </div>
        </div>

        {showHistory ? (
            <div className="space-y-6">
                <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <button onClick={() => setHistoryTab('posts')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${historyTab === 'posts' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>Posts Salvos</button>
                    <button onClick={() => setHistoryTab('plans')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${historyTab === 'plans' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>Planos Salvos</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loadingHistory ? <p>Carregando...</p> : 
                        historyTab === 'posts' ? savedPosts.map(p => (
                            <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded border shadow-sm">
                                <img src={p.imageUrl || ''} className="w-full h-32 object-cover mb-2 rounded" />
                                <p className="text-sm font-bold dark:text-white">{p.request.theme}</p>
                                <div className="flex justify-between mt-2">
                                    <Button size="xs" variant="ghost" onClick={() => handleViewPost(p.id)}>Ver</Button>
                                    <button onClick={() => handleDelete(p.id, 'post')}><Trash2 className="w-4 h-4 text-red-500"/></button>
                                </div>
                            </div>
                        )) : savedPlans.map(p => (
                            <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded border shadow-sm">
                                <p className="font-bold dark:text-white">{p.goals.keyThemes[0]}</p>
                                <p className="text-xs text-slate-500 mb-2">{new Date(p.createdAt).toLocaleDateString()}</p>
                                <div className="flex justify-between mt-2">
                                    <Button size="xs" variant="ghost" onClick={() => {
                                        const viewPlan: GeneratedContent = {
                                            isPlan: true,
                                            suggestedFormat: 'Plano Estratégico',
                                            reasoning: 'Plano recuperado do histórico',
                                            hashtags: [],
                                            tips: '',
                                            weeks: p.weeks?.map((w: any) => ({
                                                weekNumber: w.week.replace(/Semana\s*/i, ''),
                                                theme: w.theme,
                                                posts: w.ideas?.map((idea: any) => ({
                                                    day: idea.day,
                                                    format: idea.format,
                                                    theme: idea.theme,
                                                    idea: idea.theme, // Map 'theme' from DB back to 'idea' for UI
                                                    objective: idea.objective,
                                                    generatedPostId: idea.generatedPostId
                                                }))
                                            }))
                                        };
                                        // Update form data context
                                        setFormData(prev => ({
                                            ...prev,
                                            goal: p.goals.mainObjective,
                                            audience: p.goals.targetAudience.join(', ')
                                        }));
                                        
                                        setResult(viewPlan);
                                        setActivePlan(viewPlan); 
                                        setStep(5);
                                        setShowHistory(false);
                                    }}>Abrir</Button>
                                    <button onClick={() => handleDelete(p.id, 'plan')}><Trash2 className="w-4 h-4 text-red-500"/></button>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl min-h-[500px]">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        <span className={step >= 1 ? 'text-brand-600' : ''}>Modo</span>
                        <span className={step >= 2 ? 'text-brand-600' : ''}>Objetivo</span>
                        <span className={step >= 3 ? 'text-brand-600' : ''}>Público</span>
                        <span className={step >= 4 ? 'text-brand-600' : ''}>Tema</span>
                        <span className={step >= 5 ? 'text-brand-600' : ''}>Resultado</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
                    </div>
                </div>

                {step === 1 && <StepMode selected={formData.mode} onSelect={handleModeSelect} />}
                
                {step === 2 && (
                    <>
                        <StepGoal 
                            selected={formData.goal} 
                            customGoal={formData.customGoal} 
                            mode={formData.mode} 
                            onSelect={handleGoalSelect} 
                            onCustomChange={(val: string) => setFormData(prev => ({...prev, customGoal: val, goal: 'Outro (Descrever...)'}))} 
                        />
                        {/* Hidden button for programmatic click */}
                        <button id="step-2-next" className="hidden" onClick={handleNext}></button>
                    </>
                )}

                {step === 3 && (
                    <>
                        <StepAudience 
                            selected={formData.audience} 
                            customAudience={formData.customAudience} 
                            onSelect={handleAudienceSelect} 
                            onCustomChange={(val: string) => setFormData(prev => ({...prev, customAudience: val, audience: 'Outro (Descrever...)'}))} 
                        />
                        {/* Hidden button for programmatic click */}
                        <button id="step-3-next" className="hidden" onClick={handleNext}></button>
                    </>
                )}

                {step === 4 && (
                    <div className="space-y-6">
                        <StepTopic 
                            value={formData.topic} 
                            onChange={(val: string) => setFormData(prev => ({...prev, topic: val}))} 
                            onGenerateIdeas={handleGenerateIdeas} 
                            isGeneratingIdeas={isGeneratingIdeas} 
                            suggestions={topicSuggestions} 
                            mode={formData.mode}
                            formData={formData}
                            onFormChange={setFormData}
                        />
                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
                            {currentPlanItemIndices && (
                                <Button variant="ghost" onClick={handleBackToPlan}>Cancelar e Voltar ao Plano</Button>
                            )}
                            <Button 
                                onClick={handleGenerateContent} 
                                isLoading={isGenerating} 
                                disabled={isLimitReached}
                                className={`px-8 h-12 text-lg shadow-lg shadow-brand-200 ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Wand2 className="w-5 h-5 mr-2" /> 
                                {isLimitReached ? 'Limite Diário Atingido' : `Gerar ${formData.mode === 'plan' ? 'Planejamento' : 'Conteúdo'}`}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <>
                        {currentPlanItemIndices && (
                            <div className="mb-4">
                                <Button variant="outline" size="sm" onClick={handleBackToPlan}>
                                    <ArrowLeft className="w-4 h-4 mr-2"/> Voltar para o Plano
                                </Button>
                            </div>
                        )}
                        <ResultDisplay 
                            content={result} 
                            onReset={() => { setStep(1); setResult(null); setActivePlan(null); }}
                            onSave={handleSaveWithLink}
                            onRegenerate={handleGenerateContent}
                            canRegenerate={!result?.isPlan}
                            onGenerateFromPlan={handleGenerateFromPlan}
                            onViewSavedPost={handleViewPost}
                        />
                    </>
                )}
            </div>
        )}
    </div>
  );
};
