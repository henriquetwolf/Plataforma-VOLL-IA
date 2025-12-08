
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generatePilatesContentStream, generatePilatesImage } from '../services/geminiService';
import { savePost, getTodayPostCount, recordGenerationUsage, fetchSavedPosts, deleteSavedPost } from '../services/contentService';
import { ContentRequest, SavedPost } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Image as ImageIcon, Save, Copy, Loader2, RotateCcw, History, Trash2, ChevronRight, Video, FileText, Layers, Download } from 'lucide-react';
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

  const [generatedText, setGeneratedText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5); // Default fallback
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
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
      const posts = await fetchSavedPosts(studioId);
      setSavedPosts(posts);
      setLoadingHistory(false);
  };

  const handleGenerate = async () => {
    const finalObjective = request.objective === 'Outro (Descrever...)' ? customInputs.objective : request.objective;
    const finalTheme = request.theme === 'Outro (Descrever...)' ? customInputs.theme : request.theme;
    const finalAudience = request.audience === 'Outro (Descrever...)' ? customInputs.audience : request.audience;
    const finalTone = request.tone === 'Outro (Descrever...)' ? customInputs.tone : request.tone;

    if (!finalObjective || !finalTheme) {
        alert("Preencha o objetivo e o tema.");
        return;
    }
    if (isLimitReached) {
        alert("Limite diário atingido. Faça um upgrade no seu plano para criar mais.");
        return;
    }

    setIsGenerating(true);
    setGeneratedText('');
    setGeneratedImage(null);

    try {
        const isReels = request.format === 'Reels';
        
        // Prepare request with final values
        const apiRequest = {
            ...request,
            objective: finalObjective,
            theme: finalTheme,
            audience: finalAudience,
            tone: finalTone,
            modificationPrompt: isReels 
                ? "IMPORTANTE: O formato é Reels. Gere 3 opções completas de roteiro (Opção 1, Opção 2, Opção 3) com sugestão de áudio e tempo. NÃO descreva imagem estática." 
                : request.modificationPrompt
        };

        // 1. Text Generation Stream
        const stream = generatePilatesContentStream(apiRequest, ''); 
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk;
            setGeneratedText(prev => prev + chunk);
        }

        // 2. Image Generation (Skip for Reels)
        if (!isReels) {
            const image = await generatePilatesImage(apiRequest, null, fullText);
            setGeneratedImage(image);
        }

        // 3. Record Usage
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

  const handleSave = async () => {
      if (!user?.id || !generatedText) return;
      setIsSaving(true);
      
      const studioId = user.isInstructor ? user.studioId : user.id;
      if (!studioId) return;

      const post = {
          id: crypto.randomUUID(),
          request,
          content: generatedText,
          imageUrl: generatedImage || null,
          createdAt: new Date().toISOString()
      };

      const res = await savePost(studioId, post);
      if (res.success) {
          alert("Post salvo!");
          loadHistory(studioId); // Refresh history
      } else {
          alert("Erro ao salvar: " + res.error);
      }
      setIsSaving(false);
  };

  const handleDelete = async (postId: string) => {
      if (confirm("Tem certeza que deseja excluir este post salvo?")) {
          const success = await deleteSavedPost(postId);
          if (success.success) {
              setSavedPosts(prev => prev.filter(p => p.id !== postId));
          }
      }
  };

  const getFormatIcon = (format: string) => {
      if (format.includes('Reels')) return <Video className="w-4 h-4 text-purple-600"/>;
      if (format.includes('Carrossel')) return <Layers className="w-4 h-4 text-blue-600"/>;
      return <FileText className="w-4 h-4 text-green-600"/>;
  };

  const isReels = request.format === 'Reels';
  const isCarousel = request.format === 'Carrossel';

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

        {showHistory ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Histórico de Posts</h2>
                    <Button variant="ghost" onClick={() => setShowHistory(false)}>Voltar</Button>
                </div>
                
                {loadingHistory ? (
                    <div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>
                ) : savedPosts.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                        Nenhum post salvo ainda.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedPosts.map(post => (
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
                                            setGeneratedText(post.content);
                                            setGeneratedImage(post.imageUrl || null);
                                            setRequest(post.request);
                                            setShowHistory(false);
                                        }}>
                                            <Copy className="w-3 h-3 mr-2"/> Usar
                                        </Button>
                                        <button onClick={() => handleDelete(post.id)} className="p-2 text-slate-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold mb-4 text-slate-800 dark:text-white">{t('what_create')}</h3>
                        
                        <div className="space-y-4">
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
                                <Wand2 className="w-4 h-4 mr-2" /> {t('generate_btn')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px] flex flex-col">
                        <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center justify-between">
                            <span>{t('result_title')}</span>
                            {generatedText && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => {navigator.clipboard.writeText(generatedText); alert("Copiado!")}}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                                        <Save className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </h3>

                        {isGenerating ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2 text-brand-600" />
                                <p>Criando conteúdo...</p>
                            </div>
                        ) : generatedText ? (
                            <div className="flex-1 space-y-4">
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
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                                <p>O conteúdo gerado aparecerá aqui.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
