import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateNewsletter } from '../services/geminiService';
import { saveNewsletter } from '../services/newsletterService';
import { recordGenerationUsage } from '../services/contentService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Newsletter, NewsletterAudience } from '../types';
import { Newspaper, Send, Copy, CheckCircle, Wand2, RefreshCw } from 'lucide-react';

export const NewsletterAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // States
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState<NewsletterAudience>('both');
  const [style, setStyle] = useState('Profissional e Acolhedor');
  const [generatedContent, setGeneratedContent] = useState<{title: string, content: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorHtml, setErrorHtml] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!user || !topic) return;
    setIsGenerating(true);
    setErrorHtml(null);
    setGeneratedContent(null);

    try {
      const result = await generateNewsletter(user.name, audience, topic, style);
      
      if (result) {
        setGeneratedContent(result);
        
        // LOG USAGE
        const targetId = user.isInstructor ? user.studioId : user.id;
        if (targetId) await recordGenerationUsage(targetId, 'newsletter');
        
      } else {
        setErrorHtml('<div class="bg-yellow-50 p-4 rounded text-yellow-800 border border-yellow-200">Não foi possível gerar a newsletter. A IA não retornou conteúdo.</div>');
      }
    } catch (err: any) {
        setErrorHtml(`<div class="bg-red-50 p-4 rounded text-red-800 border border-red-200">Erro: ${err.message}</div>`);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSave = async () => {
      if (!user || !generatedContent) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (!targetId) return;

      setIsSaving(true);
      const result = await saveNewsletter(targetId, generatedContent.title, generatedContent.content, audience);
      if (result.success) {
          alert('Newsletter salva no mural!');
      } else {
          alert('Erro ao salvar: ' + result.error);
      }
      setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex items-center gap-4">
            <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full text-orange-600 dark:text-orange-400">
                <Newspaper className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('newsletter_title')}</h1>
                <p className="text-slate-500 dark:text-slate-400">{t('newsletter_subtitle')}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Column */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{t('create_new')}</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('target_audience')}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={audience === 'students'} onChange={() => setAudience('students')} className="text-orange-600 focus:ring-orange-500" />
                                    <span className="text-sm">{t('audience_students')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={audience === 'instructors'} onChange={() => setAudience('instructors')} className="text-orange-600 focus:ring-orange-500" />
                                    <span className="text-sm">{t('audience_instructors')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={audience === 'both'} onChange={() => setAudience('both')} className="text-orange-600 focus:ring-orange-500" />
                                    <span className="text-sm">{t('audience_both')}</span>
                                </label>
                            </div>
                        </div>

                        <Input 
                            label={t('topic_label')}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="Ex: Aviso sobre feriado, Nova modalidade de aula..."
                        />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('style_label')}</label>
                            <select 
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                value={style}
                                onChange={e => setStyle(e.target.value)}
                            >
                                <option>Profissional e Acolhedor</option>
                                <option>Animado e Energético</option>
                                <option>Sério e Informativo</option>
                                <option>Curto e Direto</option>
                            </select>
                        </div>

                        <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-4">
                            <Wand2 className="w-4 h-4 mr-2" /> {t('generate_newsletter')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Preview Column */}
            <div className="space-y-6">
                {errorHtml && <div dangerouslySetInnerHTML={{ __html: errorHtml }} />}
                
                {generatedContent ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{t('preview')}</h3>
                            <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {t('generated_success')}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{generatedContent.title}</h2>
                            <div 
                                className="prose prose-slate dark:prose-invert max-w-none text-sm"
                                dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setGeneratedContent(null)} className="flex-1">
                                {t('discard')}
                            </Button>
                            <Button onClick={handleSave} isLoading={isSaving} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                                <Send className="w-4 h-4 mr-2" /> Publicar no Mural
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-12">
                        <Newspaper className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-center text-sm">Preencha os dados ao lado e gere sua newsletter com IA.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
