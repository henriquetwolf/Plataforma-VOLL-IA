
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { generateNewsletter, handleGeminiError } from '../services/geminiService';
import { saveNewsletter, fetchNewslettersByStudio, deleteNewsletter } from '../services/newsletterService';
import { NewsletterAudience, Newsletter, AppRoute } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Newspaper, Send, Save, Trash2, RotateCcw, Users, User, Layout, Wand2, ArrowRight, AlertTriangle, ArrowLeft, Home, MessageCircle, Mail } from 'lucide-react';

export const NewsletterAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Create State
  const [audience, setAudience] = useState<NewsletterAudience>('students');
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Profissional e Acolhedor');
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{ title: string; content: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorHtml, setErrorHtml] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<Newsletter[]>([]);

  // Correct ID logic: Instructors use studioId, Owners use id
  const targetId = user?.isInstructor ? user.studioId : user?.id;

  useEffect(() => {
    if (targetId && activeTab === 'history') {
      loadHistory();
    }
  }, [targetId, activeTab]);

  const loadHistory = async () => {
    if (targetId) {
      const data = await fetchNewslettersByStudio(targetId);
      setHistory(data);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert("Por favor, informe o tópico da newsletter.");
      return;
    }
    if (!user?.name) return;
    
    setIsGenerating(true);
    setErrorHtml(null);
    setGeneratedContent(null);

    try {
      const result = await generateNewsletter(user.name, audience, topic, style);
      
      if (result) {
        setGeneratedContent(result);
      } else {
        setErrorHtml('<div class="bg-yellow-50 p-4 rounded text-yellow-800 border border-yellow-200">Não foi possível gerar a newsletter. A IA não retornou conteúdo.</div>');
      }
    } catch (err: any) {
      setErrorHtml(handleGeminiError(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !targetId) return;
    
    setIsSaving(true);
    const result = await saveNewsletter(targetId, generatedContent.title, generatedContent.content, audience);
    
    if (result.success) {
      alert(t('save') + " com sucesso!");
      setGeneratedContent(null);
      setTopic('');
      setActiveTab('history');
    } else {
      alert("Erro ao salvar: " + result.error);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja apagar esta newsletter?")) {
      await deleteNewsletter(id);
      loadHistory();
    }
  };

  // Helper to convert HTML to Text
  const convertHtmlToText = (html: string) => {
    const tempDiv = document.createElement('div');
    // Basic replacements for better text formatting
    let processedHtml = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<li>/gi, '• ');

    tempDiv.innerHTML = processedHtml;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  const handleWhatsAppShare = () => {
    if (!generatedContent) return;
    const bodyText = convertHtmlToText(generatedContent.content);
    const whatsappMessage = `*${generatedContent.title}*\n\n${bodyText.trim()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  const handleEmailShare = () => {
    if (!generatedContent) return;
    const bodyText = convertHtmlToText(generatedContent.content);
    const subject = generatedContent.title;
    const body = bodyText.trim();
    
    // Open Gmail Compose
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const audienceOptions = [
    { value: 'students', label: t('audience_students'), icon: User },
    { value: 'instructors', label: t('audience_instructors'), icon: Layout },
    { value: 'both', label: t('audience_both'), icon: Users },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {user?.isInstructor && (
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => navigate(AppRoute.INSTRUCTOR_DASHBOARD)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 shadow-sm"
            >
                <Home className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Newspaper className="h-8 w-8 text-brand-600" /> {t('newsletter_title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">{t('newsletter_subtitle')}</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
          >
            {t('create_new')}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
          >
            {t('history')}
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Column */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-brand-500" /> {t('settings')}
              </h2>
              
              {errorHtml && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2" dangerouslySetInnerHTML={{ __html: errorHtml }} />
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('target_audience')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {audienceOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAudience(opt.value as NewsletterAudience)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                          audience === opt.value 
                            ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        <opt.icon className="h-5 w-5 mb-1" />
                        <span className="text-xs font-bold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('topic_label')}</label>
                   <textarea 
                     className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none h-32 resize-none"
                     placeholder="Ex: Dicas para manter a postura no home office e promoção de planos trimestrais..."
                     value={topic}
                     onChange={e => setTopic(e.target.value)}
                   />
                </div>

                <div>
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('style_label')}</label>
                   <select 
                     className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                     value={style}
                     onChange={e => setStyle(e.target.value)}
                   >
                     <option>Profissional e Acolhedor</option>
                     <option>Motivacional e Energético</option>
                     <option>Informativo e Técnico</option>
                     <option>Descontraído e Divertido</option>
                     <option>Comercial e Persuasivo</option>
                   </select>
                </div>

                <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full">
                  <Wand2 className="h-4 w-4 mr-2" /> {t('generate_newsletter')}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px] flex flex-col">
               <h2 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <span>{t('preview')}</span>
                   <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                     <button className="px-2 py-1 bg-white dark:bg-slate-700 shadow-sm rounded-md font-medium text-slate-800 dark:text-white">{t('edit')}</button>
                     <button className="px-2 py-1 text-slate-500 dark:text-slate-400">Visualizar</button>
                   </div>
                 </div>
                 {generatedContent && (
                   <span className="text-xs font-normal bg-green-100 text-green-800 px-2 py-1 rounded-full">{t('generated_success')}</span>
                 )}
               </h2>

               {generatedContent ? (
                 <div className="flex-1 flex flex-col animate-in fade-in">
                   <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6 flex-1 mb-4 overflow-y-auto max-h-[600px]">
                      <div className="mb-4">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Título</label>
                        <input 
                          value={generatedContent.title}
                          onChange={(e) => setGeneratedContent({...generatedContent, title: e.target.value})}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Conteúdo (HTML)</label>
                      <textarea
                        value={generatedContent.content}
                        onChange={(e) => setGeneratedContent({...generatedContent, content: e.target.value})}
                        className="w-full h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-700 dark:text-slate-300 resize-none mb-4"
                      />
                      
                      <div className="mt-4 border-t pt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Visualização Final:</p>
                        <div 
                          className="prose prose-slate dark:prose-invert max-w-none text-sm bg-white dark:bg-slate-900 p-4 rounded border border-slate-100 dark:border-slate-800"
                          dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                        />
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                     <Button variant="outline" onClick={() => setGeneratedContent(null)}>
                       <RotateCcw className="h-4 w-4 mr-2" /> {t('discard')}
                     </Button>

                     <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave} isLoading={isSaving}>
                       <Save className="h-4 w-4 mr-2" /> {t('save')}
                     </Button>
                     
                     <Button 
                       className="bg-[#25D366] hover:bg-[#128C7E] text-white border-transparent" 
                       onClick={handleWhatsAppShare}
                     >
                       <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                     </Button>

                     <Button 
                       className="bg-red-600 hover:bg-red-700 text-white border-transparent" 
                       onClick={handleEmailShare}
                     >
                       <Mail className="h-4 w-4 mr-2" /> Email
                     </Button>
                   </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/50">
                    <Newspaper className="h-12 w-12 mb-2 opacity-20" />
                    <p>Preencha os dados e clique em gerar.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid gap-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Nenhuma newsletter encontrada.</div>
          ) : (
            history.map(news => (
              <div key={news.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{news.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span>{new Date(news.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold uppercase">
                        {news.targetAudience === 'students' && <><User className="h-3 w-3"/> {t('audience_students')}</>}
                        {news.targetAudience === 'instructors' && <><Layout className="h-3 w-3"/> {t('audience_instructors')}</>}
                        {news.targetAudience === 'both' && <><Users className="h-3 w-3"/> {t('audience_both')}</>}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(news.id)} className="p-2 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg text-sm text-slate-600 dark:text-slate-400 max-h-40 overflow-hidden relative">
                   <div dangerouslySetInnerHTML={{ __html: news.content }} />
                   <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent"></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
