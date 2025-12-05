
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
    generateMarketingContent, 
    generateTopicSuggestions,
    generatePilatesImage
} from '../services/geminiService';
import { 
    saveStudioPersona, 
    fetchStudioPersona, 
    savePost, 
    fetchSavedPosts, 
    deleteSavedPost
} from '../services/contentService';
import { fetchProfile } from '../services/storage';
import { 
    ContentRequest, 
    StudioPersona, 
    MarketingFormData,
    SavedContent,
    GeneratedContent
} from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, CalendarDays, FileText, Heart, ShoppingBag, BookOpen, Camera, MessageCircle, Star, Users, RotateCcw, Dumbbell, History, Zap, Layout, Sparkles, ArrowRight, CheckCircle, Save, Trash2, Eye, X, Video, Image as LucideImage, Copy, Lightbulb, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  'Fotorealista / Clean',
  'Minimalista',
  'Ilustração',
  'Cinematográfico',
  'Energético / Vibrante'
];

// --- HELPER FUNCTIONS ---
const getCalculatedDate = (startStr: string | undefined, weekIndex: number, dayName: string) => {
    if (!startStr) return dayName;
    const start = new Date(startStr);
    const dayLower = dayName.toLowerCase();
    
    // 0 = Domingo, 1 = Segunda, ...
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

    if (targetDay === -1) return dayName;
    
    // Start of the specific week
    const currentWeekStart = new Date(start);
    currentWeekStart.setDate(start.getDate() + (weekIndex * 7));
    
    // Find the date of the specific day in that week
    const date = new Date(currentWeekStart);
    
    const startDay = currentWeekStart.getDay();
    let daysToAdd = targetDay - startDay;
    if (daysToAdd < 0) daysToAdd += 7; // Ensure next occurrence if day passed in current week context
    
    date.setDate(currentWeekStart.getDate() + daysToAdd);
    
    return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${dayName}`;
};

// --- COMPONENTS ---

const StepMode = ({ formData, updateFormData }: any) => (
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

const StepGoal = ({ formData, updateFormData }: any) => {
    const list = formData.mode === 'story' ? STORY_GOALS : GOALS;
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Qual é o objetivo desse conteúdo?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((item: any) => (
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

const StepAudience = ({ formData, updateFormData }: any) => (
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

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-sm font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Outro Público Específico</label>
            <input 
                className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Ex: Adolescentes, Homens, Praticantes de Corrida..."
                value={formData.customAudience || ''}
                onChange={e => updateFormData('customAudience', e.target.value)}
            />
        </div>
    </div>
);

const StepPlanSettings = ({ formData, updateFormData }: any) => {
    const formats = ['Post Estático', 'Reels / Vídeo', 'Carrossel'];
    
    const toggleFormat = (format: string) => {
        const current = formData.selectedFormats || [];
        if (current.includes(format)) {
            updateFormData('selectedFormats', current.filter((f: string) => f !== format));
        } else {
            updateFormData('selectedFormats', [...current, format]);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-brand-600"/> Configuração do Plano
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quantos posts por semana?</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(num => (
                                <button
                                    key={num}
                                    onClick={() => updateFormData('frequency', num)}
                                    className={`flex-1 p-3 rounded-lg border text-sm font-bold transition-all ${
                                        formData.frequency === num 
                                        ? 'bg-brand-600 text-white border-brand-600' 
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300'
                                    }`}
                                >
                                    {num}x
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Início do Plano</label>
                        <input 
                            type="date"
                            className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.startDate || ''}
                            onChange={(e) => updateFormData('startDate', e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quais formatos você prefere?</label>
                    <p className="text-xs text-slate-500 mb-3">A IA irá distribuir os conteúdos entre os formatos selecionados.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {formats.map(fmt => {
                            const isSelected = (formData.selectedFormats || []).includes(fmt);
                            return (
                                <button
                                    key={fmt}
                                    onClick={() => toggleFormat(fmt)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${
                                        isSelected 
                                        ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/20' 
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {fmt}
                                    {isSelected && <CheckCircle className="w-4 h-4 text-purple-600" />}
                                </button>
                            );
                        })}
                    </div>
                    {(!formData.selectedFormats || formData.selectedFormats.length === 0) && (
                        <p className="text-xs text-red-500 mt-2">Selecione pelo menos um formato.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const StepFormatStyle = ({ formData, updateFormData }: any) => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5 text-brand-600"/> Formato do Conteúdo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FORMATS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => updateFormData('format', item.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${formData.format === item.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-500' : 'border-slate-200 dark:border-slate-800 hover:border-brand-200 bg-white dark:bg-slate-900'}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-800 dark:text-white">{item.label}</span>
                            {item.recommended && <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">TOP</span>}
                        </div>
                        <p className="text-sm text-slate-500">{item.description}</p>
                    </button>
                ))}
            </div>
        </div>

        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600"/> Estilo Visual
            </h2>
            <div className="flex flex-wrap gap-3">
                {STYLES.map((style) => (
                    <button
                        key={style}
                        onClick={() => updateFormData('style', style)}
                        className={`px-4 py-2 rounded-full border transition-all text-sm font-medium ${formData.style === style ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300'}`}
                    >
                        {style}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const StepTopic = ({ formData, updateFormData, suggestions, onGenerateIdeas, isGeneratingIdeas }: any) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Sobre qual tema você quer falar?</h2>
        
        <textarea 
            className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl h-32 resize-none focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 text-lg"
            placeholder={formData.mode === 'plan' ? "Ex: Foco em emagrecimento e bem-estar para o mês de Novembro..." : "Ex: Benefícios do Pilates para dor nas costas..."}
            value={formData.topic}
            onChange={e => updateFormData('topic', e.target.value)}
        />

        <div className="flex justify-end">
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={onGenerateIdeas} 
                isLoading={isGeneratingIdeas}
                disabled={(!formData.goal && !formData.customGoal) || (!formData.audience && !formData.customAudience)}
            >
                <Sparkles className="w-4 h-4 mr-2"/> Gerar Ideias com IA
            </Button>
        </div>

        {suggestions.length > 0 && (
            <div className="mt-6">
                <p className="text-xs font-bold text-brand-600 uppercase mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Sugestões para você</p>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s: string, i: number) => (
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

const PlanCalendarView = ({ weeks, startDate, onViewPost }: { weeks: any[], startDate?: string, onViewPost: (id: string) => void }) => {
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    
    return (
        <div className="overflow-x-auto pb-4">
            <div className="min-w-[800px]">
                <div className="grid grid-cols-8 gap-2 mb-2 text-center text-xs font-bold text-slate-500 uppercase">
                    <div className="col-span-1 p-2">Semana</div>
                    {days.map(d => <div key={d} className="col-span-1 p-2">{d}</div>)}
                </div>
                
                <div className="space-y-2">
                    {weeks.map((week, idx) => (
                        <div key={idx} className="grid grid-cols-8 gap-2">
                            <div className="col-span-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-2 flex flex-col justify-center items-center text-center">
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Semana {week.weekNumber}</span>
                                <span className="text-[10px] text-slate-500 mt-1 line-clamp-2">{week.theme}</span>
                            </div>
                            
                            {days.map(dayName => {
                                const post = week.posts?.find((p: any) => p.day.toLowerCase().includes(dayName.toLowerCase().split('-')[0]));
                                const calculatedDate = post ? getCalculatedDate(startDate, idx, dayName) : null;
                                
                                return (
                                    <div key={dayName} className={`col-span-1 rounded-lg p-2 border min-h-[80px] flex flex-col relative ${post ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' : 'bg-slate-50/50 dark:bg-slate-950/50 border-transparent'}`}>
                                        {post ? (
                                            <>
                                                {startDate && <span className="text-[9px] text-slate-400 absolute top-1 right-2">{calculatedDate?.split(' - ')[0]}</span>}
                                                <span className="text-[9px] font-bold uppercase text-brand-600 mb-1 mt-3">{post.format}</span>
                                                <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-tight line-clamp-3" title={post.idea}>{post.idea}</p>
                                                {post.generatedPostId && (
                                                    <div className="mt-auto pt-1 flex justify-center gap-1">
                                                        <span className="flex items-center justify-center text-green-600 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-1 rounded">
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Criado
                                                        </span>
                                                        <button onClick={() => onViewPost(post.generatedPostId)} className="text-slate-400 hover:text-brand-600 p-0.5">
                                                            <Eye className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-slate-300 text-xs text-center mt-4">-</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- PREVIEW MODAL ---
const GeneratedPostPreview = ({ 
    content, 
    onClose, 
    onSave, 
    isSaving, 
    readOnly = false 
}: { 
    content: GeneratedContent, 
    onClose: () => void, 
    onSave?: () => void, 
    isSaving?: boolean,
    readOnly?: boolean
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-600"/> {readOnly ? 'Visualizar Post' : 'Post Gerado'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4"/> Legenda
                        </h4>
                        <p className="text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-400">{content.captionLong}</p>
                        <p className="text-xs text-brand-600 mt-2 font-medium">{content.hashtags?.join(' ')}</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <LucideImage className="w-4 h-4"/> Imagem Sugerida
                        </h4>
                        {content.generatedImage ? (
                            <img src={content.generatedImage} alt="Post" className="w-full rounded-lg object-contain h-64 bg-slate-200 dark:bg-slate-900" />
                        ) : (
                            <div className="h-40 bg-slate-200 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                                Imagem não gerada
                            </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2 italic">Prompt: {content.visualPrompt}</p>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950">
                    <Button variant="ghost" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</Button>
                    {!readOnly && onSave && (
                        <Button onClick={onSave} isLoading={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
                            <Save className="w-4 h-4 mr-2"/> Salvar Post
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResultDisplay = ({ result, onReset, onSave, onRegenerate, canRegenerate, startDate, onGenerateSinglePost, onViewPost }: any) => {
    const [captionType, setCaptionType] = useState<'short' | 'long'>('long');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    if (!result) return null;
    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="bg-brand-50 dark:bg-brand-900/10 p-6 rounded-2xl border border-brand-100 dark:border-brand-800">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="bg-brand-200 text-brand-800 text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">
                            {result.suggestedFormat || (result.isPlan ? 'Planejamento' : 'Post')}
                        </span>
                        <h3 className="text-xl font-bold text-brand-900 dark:text-brand-100">Estratégia Escolhida</h3>
                        <p className="text-brand-700 dark:text-brand-300 text-sm mt-1">{result.reasoning}</p>
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

            {/* PLAN VIEW */}
            {result.isPlan && result.weeks && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {startDate ? `Início: ${new Date(startDate).toLocaleDateString()}` : 'Sem data definida'}
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Lista</button>
                            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'calendar' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Calendário</button>
                        </div>
                    </div>

                    {viewMode === 'list' ? (
                        <div className="space-y-4">
                            {result.weeks.map((week: any, i: number) => (
                                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <h4 className="font-bold text-brand-700 text-lg mb-4 flex items-center gap-2">
                                        <CalendarDays className="w-5 h-5"/> Semana {week.weekNumber}: {week.theme}
                                    </h4>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        {week.posts && week.posts.map((post: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-full">
                                                <div>
                                                    <div className="flex justify-between mb-2">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                            {getCalculatedDate(startDate, i, post.day)}
                                                        </span>
                                                        <span className="text-[10px] bg-white dark:bg-slate-900 border px-2 py-0.5 rounded text-slate-500 uppercase font-bold">{post.format}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{post.idea}</p>
                                                </div>
                                                
                                                {post.generatedPostId ? (
                                                    <div className="mt-auto pt-2 flex items-center justify-between text-green-600 text-xs font-bold gap-1 bg-green-50 dark:bg-green-900/20 py-1 px-2 rounded">
                                                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Criado</span>
                                                        <button onClick={() => onViewPost(post.generatedPostId)} className="text-slate-500 hover:text-brand-600 p-1 bg-white rounded border border-slate-200 hover:border-brand-200">
                                                            <Eye className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="w-full mt-auto text-xs"
                                                        onClick={() => onGenerateSinglePost(post, i, idx)}
                                                    >
                                                        <Sparkles className="w-3 h-3 mr-1"/> Gerar Post
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
                            <PlanCalendarView weeks={result.weeks} startDate={startDate} onViewPost={onViewPost} />
                        </div>
                    )}
                </div>
            )}

            {/* Other views omitted for brevity as they remain largely same, 
               but essentially the single post, carousel logic is here inside !result.isPlan block */}
            {!result.isPlan && !result.isStory && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5"/> Legenda</h4>
                            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex text-xs font-bold">
                                <button onClick={() => setCaptionType('short')} className={`px-3 py-1 rounded transition-colors ${captionType === 'short' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>Curta</button>
                                <button onClick={() => setCaptionType('long')} className={`px-3 py-1 rounded transition-colors ${captionType === 'long' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>Longa</button>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm whitespace-pre-wrap h-80 overflow-y-auto flex-1 border border-slate-100 dark:border-slate-800">
                            {captionType === 'long' ? result.captionLong : result.captionShort}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-brand-600 font-medium">{result.hashtags?.join(' ')}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigator.clipboard.writeText(`${captionType === 'long' ? result.captionLong : result.captionShort}\n\n${result.hashtags.join(' ')}`)}>
                            <Copy className="w-4 h-4 mr-2"/> Copiar
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            {result.isReels ? <Video className="w-5 h-5"/> : <LucideImage className="w-5 h-5"/>} 
                            {result.isReels ? 'Roteiro de Vídeo' : (result.carouselCards ? 'Carrossel (6 Cards)' : 'Imagem Sugerida')}
                        </h4>
                        
                        {/* REELS VIEW */}
                        {result.isReels && result.reelsOptions && (
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm h-80 overflow-y-auto space-y-4">
                                {result.reelsOptions.map((opt: any, i: number) => (
                                    <div key={i} className="pb-4 border-b last:border-0 border-slate-200 dark:border-slate-800">
                                        <p className="font-bold text-brand-700 mb-1">Opção {i+1}: {opt.title}</p>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                                            {opt.script.map((line: string, idx: number) => <li key={idx}>{line}</li>)}
                                        </ul>
                                        <div className="mt-2 flex items-center gap-2 text-xs bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                                            <span>🎵 Áudio: {opt.audioSuggestion}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* CAROUSEL VIEW */}
                        {result.carouselCards && (
                            <div className="h-[340px] flex overflow-x-auto gap-4 p-2 pb-4 scrollbar-thin">
                                {result.carouselCards.map((card: any, idx: number) => (
                                    <div key={idx} className="min-w-[200px] w-[200px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden group shadow-sm">
                                        <div className="h-40 bg-slate-200 dark:bg-slate-900 relative">
                                            {card.generatedImage ? (
                                                <img src={card.generatedImage} alt={`Card ${idx+1}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-400 text-xs">Gerando imagem...</div>
                                            )}
                                            <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded font-bold backdrop-blur-sm">{idx+1}/6</span>
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col bg-white dark:bg-slate-900">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Texto Overlay</p>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-tight flex-1">{card.textOverlay}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* STATIC POST VIEW */}
                        {!result.isReels && !result.carouselCards && (
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm h-80 overflow-y-auto flex flex-col justify-center">
                                {result.generatedImage ? (
                                    <img src={result.generatedImage} alt="Sugestão" className="w-full h-full object-contain rounded-lg shadow-sm" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                                        <LucideImage className="w-12 h-12 mb-2 opacity-50"/>
                                        <p>Imagem não gerada.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STORIES VIEW */}
            {result.isStory && result.storySequence && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500"/> Sequência Estratégica</h4>
                    <div className="flex gap-6 min-w-[800px] pb-4">
                        {result.storySequence.frames.map((frame: any, i: number) => (
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

const SavedPostsList = ({ savedPosts, onDelete, onOpen }: any) => (
    <div className="animate-in fade-in">
        {savedPosts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <p>Você ainda não salvou nenhum post.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {savedPosts.map((post: any) => (
                    <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${post.isPlan ? 'bg-blue-50 text-blue-700' : post.isStory ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                                {post.isPlan ? 'PLANEJAMENTO' : (post.isStory ? 'STORIES' : (post.isReels ? 'REELS' : 'POST'))}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{post.date}</span>
                                <button onClick={() => onDelete(post.id)} className="text-slate-400 hover:text-red-500 p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">{post.topic}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{post.reasoning}</p>
                        <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => onOpen(post)}>
                            <Eye className="w-4 h-4 mr-2"/> Abrir
                        </Button>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// --- MAIN COMPONENT ---

export const MarketingAgent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
  
  // Steps: 0=Mode, 1=Goal, 2=Audience, 3=Topic, 4=Format/Style (Single) OR PlanSettings (Plan), 5=Result
  const [step, setStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [canRegenerate, setCanRegenerate] = useState(true);
  const [savedPosts, setSavedPosts] = useState<SavedContent[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);

  // Single Post Generation from Plan state
  const [previewPost, setPreviewPost] = useState<GeneratedContent | null>(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [generatingInfo, setGeneratingInfo] = useState<{ weekIdx: number; postIdx: number } | null>(null);
  const [isViewingSavedPost, setIsViewingSavedPost] = useState(false);

  const [formData, setFormData] = useState<MarketingFormData>({
    mode: 'single', // Default
    goal: '',
    customGoal: '',
    audience: '',
    customAudience: '',
    topic: '',
    format: 'auto',
    style: 'Brand Persona',
    frequency: 3,
    selectedFormats: ['Post Estático', 'Reels / Vídeo', 'Carrossel'],
    startDate: new Date().toISOString().split('T')[0] // Default today
  });

  // Load saved posts on mount
  useEffect(() => {
    if (user?.id) {
        loadSaved();
    }
  }, [user]);

  const loadSaved = () => {
      if(user?.id) {
        fetchSavedPosts(user.id).then(posts => {
            const mapped = posts.map(p => {
                // Ensure robustness against old data structure
                const req = (p.request || {}) as any; 
                return {
                    id: p.id,
                    date: new Date(p.createdAt).toLocaleDateString(),
                    topic: req.theme || 'Sem tema',
                    reasoning: 'Salvo',
                    suggestedFormat: req.format,
                    hashtags: [],
                    tips: '',
                    ...((p as any).data || {})
                } as SavedContent;
            });
            setSavedPosts(mapped);
        });
      }
  };

  const handleNext = () => {
      if (formData.mode === 'plan' && step === 3) {
          // If in plan mode, step 4 is Plan Settings, not Format/Style
          setStep(4);
      } else {
          setStep((prev) => prev + 1);
      }
  };
  
  const handleBack = () => setStep((prev) => Math.max(0, prev - 1));

  const isReadyToGenerate = () => {
    // For Plan: Generate after Step 4 (PlanSettings)
    if (formData.mode === 'plan' && step === 4) return true;
    // For Stories: Generate after Step 3 (Topic) - simple flow
    if (formData.mode === 'story' && step === 3) return true;
    // For Single Post: Generate after Step 4 (Format/Style)
    if (formData.mode === 'single' && step === 4) return true;
    return false;
  };

  const handleGenerateAction = async () => {
    setIsLoading(true);
    setLoadingMsg(formData.mode === 'plan' ? "Criando calendário estratégico..." : "A IA está criando sua estratégia...");
    setError(null);
    setCanRegenerate(true);
    
    try {
      // 1. Generate Text Structure
      const requestData = { ...formData };
      if (formData.mode === 'plan') requestData.format = 'auto'; // Plan mode doesn't select single format

      const content = await generateMarketingContent(requestData);
      
      if (!content) throw new Error("Falha na geração. Tente novamente.");

      // 2. Image Generation Logic (Only for Single/Story/Carousel)
      if (content.carouselCards && content.carouselCards.length > 0) {
          setLoadingMsg("Gerando 6 imagens de alta qualidade para o Carrossel (isso pode levar 1 min)...");
          
          const cardPromises = content.carouselCards.map(async (card: any, idx: number) => {
              await new Promise(r => setTimeout(r, idx * 800));
              const imgRequest: ContentRequest = {
                  format: 'Carrossel',
                  objective: formData.goal,
                  customObjective: formData.customGoal,
                  theme: card.visualPrompt, 
                  audience: formData.audience,
                  customAudience: formData.customAudience,
                  tone: 'Visual',
                  imageStyle: formData.style
              };
              const enhancedPrompt = `Photorealistic, 8k, cinematic lighting, professional photography: ${card.visualPrompt}`;
              const img = await generatePilatesImage(imgRequest, null, enhancedPrompt);
              return { ...card, generatedImage: img };
          });

          const cardsWithImages = await Promise.all(cardPromises);
          content.carouselCards = cardsWithImages;
      } 
      else if (formData.mode === 'single' && !content.isReels && !content.isPlan) {
          setLoadingMsg("Criando a imagem do post...");
          const visualPrompt = content.visualPrompt || `Pilates post about ${formData.topic}. Style: ${formData.style}`;
          
          const imgRequest: ContentRequest = {
              format: 'Post Estático',
              objective: formData.goal,
              customObjective: formData.customGoal,
              theme: visualPrompt,
              audience: formData.audience,
              customAudience: formData.customAudience,
              tone: 'Visual',
              imageStyle: formData.style
          };
          
          const enhancedPrompt = `Photorealistic, 8k, cinematic lighting, professional photography: ${visualPrompt}`;
          const img = await generatePilatesImage(imgRequest, null, enhancedPrompt);
          content.generatedImage = img || undefined;
      }

      setResult(content);
      setStep(5); // Go to Result View
    } catch (err: any) {
      setError("Ocorreu um erro ao gerar o conteúdo. Por favor, tente novamente.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  };

  // --- SINGLE POST FROM PLAN LOGIC ---
  const handleGenerateSinglePost = async (postItem: any, weekIdx: number, postIdx: number) => {
      setIsLoading(true);
      setLoadingMsg(`Criando post para: ${postItem.idea}...`);
      
      try {
          const singleRequestData: MarketingFormData = {
              ...formData,
              mode: 'single',
              format: postItem.format.includes('Carrossel') ? 'Carrossel' : (postItem.format.includes('Reels') ? 'Reels' : 'Post Estático'),
              topic: postItem.idea
          };

          const content = await generateMarketingContent(singleRequestData);
          
          if (!content) throw new Error("Falha na geração do post.");

          // Generate Image if needed
          if (!content.isReels && !content.carouselCards) {
              setLoadingMsg("Gerando imagem...");
              const visualPrompt = content.visualPrompt || `Pilates post about ${postItem.idea}. Style: ${formData.style}`;
              const imgRequest: ContentRequest = {
                  format: singleRequestData.format,
                  objective: formData.goal,
                  theme: visualPrompt,
                  audience: formData.audience,
                  tone: 'Visual',
                  imageStyle: formData.style
              };
              const img = await generatePilatesImage(imgRequest, null, `Photorealistic, 8k: ${visualPrompt}`);
              content.generatedImage = img || undefined;
          }

          setPreviewPost(content);
          setGeneratingInfo({ weekIdx, postIdx });
          setIsViewingSavedPost(false); // Mode = Generation

      } catch (e: any) {
          alert("Erro ao gerar post: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveSinglePost = async () => {
      if (!previewPost || !user?.id || !generatingInfo || !result) return;
      setIsSavingPost(true);

      try {
          // 1. Save the individual post
          const newPostId = crypto.randomUUID();
          const newPost: any = {
              id: newPostId,
              request: {
                  format: previewPost.suggestedFormat,
                  objective: formData.goal,
                  theme: formData.topic,
                  audience: formData.audience
              },
              content: JSON.stringify(previewPost),
              imageUrl: previewPost.generatedImage || null,
              createdAt: new Date().toISOString(),
              data: previewPost
          };
          await savePost(user.id, newPost);

          // 2. Update the Plan Result in state with the new ID
          const updatedWeeks = [...result.weeks!];
          if (updatedWeeks[generatingInfo.weekIdx]?.posts[generatingInfo.postIdx]) {
              updatedWeeks[generatingInfo.weekIdx].posts[generatingInfo.postIdx].generatedPostId = newPostId;
          }
          
          setResult({ ...result, weeks: updatedWeeks });
          
          // 3. Close modal
          setPreviewPost(null);
          setGeneratingInfo(null);
          
          // Refresh list to have the new post available in history
          loadSaved();
          
      } catch (e) {
          alert("Erro ao salvar post.");
      } finally {
          setIsSavingPost(false);
      }
  };

  // --- VIEW SAVED POST FROM PLAN ---
  const handleViewPost = (postId: string) => {
      const savedPost = savedPosts.find(p => p.id === postId);
      if (savedPost) {
          // Map SavedContent back to GeneratedContent for preview
          const content: GeneratedContent = {
              ...savedPost,
              // Ensure critical fields match if they differ slightly
              captionLong: savedPost.captionLong,
              captionShort: savedPost.captionShort,
              generatedImage: savedPost.generatedImage,
              carouselCards: savedPost.carouselCards,
              isReels: savedPost.isReels,
              reelsOptions: savedPost.reelsOptions,
              visualPrompt: savedPost.visualPrompt
          };
          setPreviewPost(content);
          setIsViewingSavedPost(true); // Read-only mode
      }
  };

  const handleRegenerateAction = async () => {
    if (!canRegenerate) return;
    handleGenerateAction(); 
  };

  const handleSavePost = async () => {
    if (!result || !user?.id) return;
    
    // Check if it's a plan with generated posts inside
    // If so, we save the structure.
    
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
      content: JSON.stringify(result),
      imageUrl: result.generatedImage || null,
      createdAt: new Date().toISOString(),
      data: result 
    };
    
    const res = await savePost(user.id, newPost);
    if (res.success) {
        alert("Salvo com sucesso!");
        loadSaved();
        setActiveTab('saved'); // Switch to saved tab
    } else {
        alert("Erro ao salvar.");
    }
  };

  const handleDeleteSaved = async (id: string) => {
    if (confirm("Tem certeza?")) {
        await deleteSavedPost(id);
        loadSaved();
    }
  };

  const handleOpenSaved = (post: SavedContent) => {
      setResult(post);
      setCanRegenerate(false); 
      setActiveTab('create');
      setStep(5); 
  };

  const handleGenerateIdeas = async () => {
    if ((!formData.goal && !formData.customGoal) || (!formData.audience && !formData.customAudience)) {
        alert("Preencha o Objetivo e o Público antes de gerar ideias.");
        return;
    }
    
    setIsGeneratingIdeas(true);
    try {
        const ideas = await generateTopicSuggestions(
            formData.customGoal || formData.goal, 
            formData.customAudience || formData.audience
        );
        setTopicSuggestions(ideas);
    } catch (e) {
        console.error(e);
        alert("Erro ao gerar ideias.");
    } finally {
        setIsGeneratingIdeas(false);
    }
  };

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
      customAudience: '',
      topic: '',
      format: 'auto',
      style: 'Brand Persona',
      frequency: 3,
      selectedFormats: ['Post Estático', 'Reels / Vídeo', 'Carrossel'],
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  // Progress Bar Calculation
  const totalSteps = (formData.mode === 'plan' || formData.mode === 'story') ? (formData.mode === 'plan' ? 4 : 3) : 4; 
  const progress = Math.min((step / totalSteps) * 100, 100);

  // Validation logic
  const isNextDisabled = () => {
    if (step === 0 && !formData.mode) return true;
    if (step === 1 && !formData.goal && !formData.customGoal) return true;
    if (step === 2 && !formData.audience && !formData.customAudience) return true;
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
          Marketing Digital IA
        </h1>
        <p className="text-slate-500 mt-2 max-w-lg">
          Crie posts, carrosséis e planejamentos estratégicos.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-8">
          <button 
              onClick={() => setActiveTab('create')} 
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
          >
              Gerador
          </button>
          <button 
              onClick={() => setActiveTab('saved')} 
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'saved' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
          >
              <History className="w-4 h-4"/> Histórico
          </button>
      </div>

      {activeTab === 'create' && (
        <main className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative min-h-[500px] flex flex-col">
            
            {/* Progress Bar (Only for Wizard) */}
            {step < 5 && (
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
                    {loadingMsg || 'Processando com Inteligência Artificial...'}
                    </h3>
                    <p className="text-slate-500 mt-2">Estamos criando sua estratégia personalizada.</p>
                </div>
                </div>
            ) : (
                <>
                {step === 0 && <StepMode formData={formData} updateFormData={updateFormData} />}
                {step === 1 && <StepGoal formData={formData} updateFormData={updateFormData} />}
                {step === 2 && <StepAudience formData={formData} updateFormData={updateFormData} />}
                {step === 3 && (
                    <StepTopic 
                        formData={formData} 
                        updateFormData={updateFormData} 
                        suggestions={topicSuggestions}
                        onGenerateIdeas={handleGenerateIdeas}
                        isGeneratingIdeas={isGeneratingIdeas}
                    />
                )}
                {step === 4 && formData.mode === 'single' && <StepFormatStyle formData={formData} updateFormData={updateFormData} />}
                {step === 4 && formData.mode === 'plan' && <StepPlanSettings formData={formData} updateFormData={updateFormData} />}
                {step === 5 && (
                    <ResultDisplay 
                        result={result} 
                        onReset={handleReset} 
                        onSave={handleSavePost} 
                        onRegenerate={handleRegenerateAction}
                        canRegenerate={canRegenerate}
                        startDate={formData.startDate}
                        onGenerateSinglePost={handleGenerateSinglePost}
                        onViewPost={handleViewPost}
                    />
                )}
                </>
            )}
            </div>

            {/* Footer Navigation */}
            {!isLoading && step < 5 && (
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
      )}

      {activeTab === 'saved' && (
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 md:p-10">
              <SavedPostsList savedPosts={savedPosts} onDelete={handleDeleteSaved} onOpen={handleOpenSaved} />
          </div>
      )}

      {/* SINGLE POST PREVIEW MODAL */}
      {previewPost && (
          <GeneratedPostPreview 
              content={previewPost} 
              onClose={() => { setPreviewPost(null); setGeneratingInfo(null); }} 
              onSave={handleSaveSinglePost}
              isSaving={isSavingPost}
              readOnly={isViewingSavedPost}
          />
      )}
    </div>
  );
};
