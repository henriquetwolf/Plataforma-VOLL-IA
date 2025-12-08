import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generatePilatesContentStream, generatePilatesImage } from '../services/geminiService';
import { savePost, getTodayPostCount, recordGenerationUsage } from '../services/contentService';
import { ContentRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Image as ImageIcon, Save, Copy, Loader2, RotateCcw } from 'lucide-react';

export const ContentAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [request, setRequest] = useState<ContentRequest>({
    format: 'Post Estático',
    objective: '',
    theme: '',
    audience: '',
    tone: 'Profissional',
    imageStyle: 'Fotorealista',
    logoConfig: { enabled: true, type: 'normal', position: 'bottom-right', size: 'medium' }
  });

  const [generatedText, setGeneratedText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  
  // Hardcoded limit for now, or fetch from profile plan
  const DAILY_LIMIT = 5; 
  const isLimitReached = dailyCount >= DAILY_LIMIT;

  useEffect(() => {
    if (user?.id) {
        // Assume user is owner for simplicity or use studioId logic
        const studioId = user.isInstructor ? user.studioId : user.id;
        if(studioId) getTodayPostCount(studioId).then(setDailyCount);
    }
  }, [user]);

  const handleGenerate = async () => {
    if (!request.objective || !request.theme) {
        alert("Preencha o objetivo e o tema.");
        return;
    }
    if (isLimitReached) {
        alert("Limite diário atingido.");
        return;
    }

    setIsGenerating(true);
    setGeneratedText('');
    setGeneratedImage(null);

    try {
        // 1. Text Generation Stream
        const stream = generatePilatesContentStream(request, ''); // systemInstruction empty for now
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk;
            setGeneratedText(prev => prev + chunk);
        }

        // 2. Image Generation
        // Simplified image generation call
        const image = await generatePilatesImage(request, null, fullText);
        setGeneratedImage(image);

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
      } else {
          alert("Erro ao salvar: " + res.error);
      }
      setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Wand2 className="h-8 w-8 text-brand-600" /> {t('content_agent')}
                </h1>
                <p className="text-slate-500">{t('content_subtitle')}</p>
            </div>
            <div className="text-right">
                <span className={`text-sm font-bold ${isLimitReached ? 'text-red-500' : 'text-slate-500'}`}>
                    {t('creations_today')}: {dailyCount}/{DAILY_LIMIT}
                </span>
            </div>
        </div>

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

                        <Input 
                            label={t('objective_label')} 
                            value={request.objective} 
                            onChange={e => setRequest({...request, objective: e.target.value})} 
                            placeholder="Ex: Atrair alunos iniciantes"
                            disabled={isLimitReached}
                        />
                        
                        <Input 
                            label={t('theme_label')} 
                            value={request.theme} 
                            onChange={e => setRequest({...request, theme: e.target.value})} 
                            placeholder="Ex: Benefícios do Pilates para coluna"
                            disabled={isLimitReached}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label={t('audience_label')} 
                                value={request.audience} 
                                onChange={e => setRequest({...request, audience: e.target.value})} 
                                placeholder="Ex: Mulheres 40+"
                                disabled={isLimitReached}
                            />
                            <Input 
                                label="Tom de Voz" 
                                value={request.tone} 
                                onChange={e => setRequest({...request, tone: e.target.value})} 
                                placeholder="Ex: Motivacional"
                                disabled={isLimitReached}
                            />
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
                                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <img src={generatedImage} alt="Gerado" className="w-full h-auto object-cover" />
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
    </div>
  );
};
