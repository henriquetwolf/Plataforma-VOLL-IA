import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Image as ImageIcon, Video, Save, Download, Trash2, Copy, History, Settings, CheckCircle2, Loader2, PlayCircle, RefreshCw } from 'lucide-react';
import { ContentRequest, SavedPost, StudioPersona, LogoConfig } from '../types';
import { generatePilatesContentStream, generatePilatesImage, generatePilatesVideo } from '../services/geminiService';
import { savePost, fetchSavedPosts, deleteSavedPost, saveStudioPersona, fetchStudioPersona } from '../services/contentService';
import { compositeImageWithLogo } from '../services/imageService';
import { fetchProfile } from '../services/storage';

export const ContentAgent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'generator' | 'history' | 'persona'>('generator');
  
  // Generator State
  const [request, setRequest] = useState<ContentRequest>({
    format: 'Instagram Post',
    objective: 'Education',
    theme: '',
    audience: 'Students',
    tone: 'Professional',
    imageStyle: 'Photorealistic',
    logoConfig: { enabled: true, type: 'watermark', position: 'bottom-right', size: 'medium' }
  });
  
  const [includeImage, setIncludeImage] = useState(false);
  const [includeVideo, setIncludeVideo] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  const [generatedText, setGeneratedText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<SavedPost[]>([]);
  
  // Persona State
  const [persona, setPersona] = useState<StudioPersona>({
    philosophy: '',
    differentiators: '',
    instructorProfile: '',
    languageToAvoid: ''
  });
  const [studioLogo, setStudioLogo] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) { // Assuming Owner for now, usually user.id
        // Load Persona
        const p = await fetchStudioPersona(user.id);
        if (p) setPersona(p);
        
        // Load Profile for Logo
        const profile = await fetchProfile(user.id);
        if (profile?.logoUrl) setStudioLogo(profile.logoUrl);
        
        // Load History
        const saved = await fetchSavedPosts(user.id);
        setHistory(saved);
      }
    };
    loadData();
  }, [user]);

  const handleGenerate = async () => {
    if (!request.theme) return alert("Por favor, defina um tema.");
    
    setIsGenerating(true);
    setGeneratedText('');
    setGeneratedImage(null);
    setGeneratedVideo(null);
    
    try {
      // 1. Text Generation
      setLoadingStep('Escrevendo legenda e roteiro...');
      
      const systemInstruction = `
        Você é um especialista em Marketing de Conteúdo para Studios de Pilates.
        Persona do Studio:
        - Filosofia: ${persona.philosophy}
        - Diferenciais: ${persona.differentiators}
        - Perfil Instrutores: ${persona.instructorProfile}
        - Evitar: ${persona.languageToAvoid}
      `;
      
      const stream = generatePilatesContentStream(request, systemInstruction);
      let fullText = '';
      
      for await (const chunk of stream) {
        fullText += chunk;
        setGeneratedText(prev => prev + chunk);
      }
      
      // 2. Image Generation
      if (includeImage) {
        setLoadingStep('Criando imagem exclusiva...');
        const baseImage = await generatePilatesImage(request, null, fullText);
        
        if (baseImage) {
          if (studioLogo && request.logoConfig?.enabled) {
             setLoadingStep('Aplicando sua marca...');
             const brandedImage = await compositeImageWithLogo(baseImage, studioLogo, request.logoConfig);
             setGeneratedImage(brandedImage);
          } else {
             setGeneratedImage(baseImage);
          }
        }
      }
      
      // 3. Video Generation
      if (includeVideo) {
        setLoadingStep('Gerando vídeo (pode demorar um pouco)...');
        const videoUrl = await generatePilatesVideo(fullText, (msg) => setLoadingStep(msg));
        setGeneratedVideo(videoUrl);
      }
      
    } catch (e) {
      console.error(e);
      alert("Erro durante a geração.");
    } finally {
      setIsGenerating(false);
      setLoadingStep('');
    }
  };

  const handleSavePost = async () => {
    if (!user?.id || !generatedText) return;
    
    const newPost: SavedPost = {
      id: crypto.randomUUID(),
      request,
      content: generatedText,
      imageUrl: generatedImage,
      videoUrl: generatedVideo,
      createdAt: new Date().toISOString()
    };
    
    const res = await savePost(user.id, newPost);
    if (res.success) {
      alert("Conteúdo salvo!");
      setHistory([newPost, ...history]);
    } else {
      alert("Erro ao salvar: " + res.error);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (confirm("Deletar este post?")) {
      await deleteSavedPost(id);
      setHistory(h => h.filter(p => p.id !== id));
    }
  };

  const handleSavePersona = async () => {
    if (!user?.id) return;
    await saveStudioPersona(user.id, persona);
    alert("Persona atualizada!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wand2 className="h-8 w-8 text-brand-600" /> Assistente de Conteúdo
          </h1>
          <p className="text-slate-500">Crie posts, legendas e mídias para suas redes sociais.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'generator' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
          >
            Gerador
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
          >
            Histórico
          </button>
          <button 
            onClick={() => setActiveTab('persona')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'persona' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
          >
            Persona
          </button>
        </div>
      </div>

      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">O que vamos criar hoje?</h2>
              
              <div className="space-y-4">
                <Input 
                  label="Tema / Assunto" 
                  value={request.theme} 
                  onChange={e => setRequest({...request, theme: e.target.value})}
                  placeholder="Ex: Benefícios do Pilates para coluna..."
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Formato</label>
                    <select 
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={request.format}
                      onChange={e => setRequest({...request, format: e.target.value})}
                    >
                      <option>Instagram Post</option>
                      <option>Instagram Stories</option>
                      <option>Instagram Reels (Roteiro)</option>
                      <option>Blog Post</option>
                      <option>Email Marketing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Objetivo</label>
                    <select 
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={request.objective}
                      onChange={e => setRequest({...request, objective: e.target.value})}
                    >
                      <option>Educar / Informar</option>
                      <option>Vender / Promoção</option>
                      <option>Engajar / Entreter</option>
                      <option>Inspirar / Motivar</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Público</label>
                    <select 
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={request.audience}
                      onChange={e => setRequest({...request, audience: e.target.value})}
                    >
                      <option>Iniciantes</option>
                      <option>Praticantes Avançados</option>
                      <option>Idosos</option>
                      <option>Gestantes</option>
                      <option>Atletas</option>
                      <option>Público Geral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Tom de Voz</label>
                    <select 
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={request.tone}
                      onChange={e => setRequest({...request, tone: e.target.value})}
                    >
                      <option>Profissional</option>
                      <option>Amigável</option>
                      <option>Energético</option>
                      <option>Empático</option>
                      <option>Humorado</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-bold mb-3 dark:text-slate-300">Mídia Visual (IA)</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-all ${includeImage ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                      <input type="checkbox" className="hidden" checked={includeImage} onChange={e => { setIncludeImage(e.target.checked); if(e.target.checked) setIncludeVideo(false); }} />
                      <ImageIcon className={includeImage ? 'text-brand-600' : 'text-slate-400'} />
                      <span className="text-xs font-medium">Gerar Imagem</span>
                    </label>
                    
                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-all ${includeVideo ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                      <input type="checkbox" className="hidden" checked={includeVideo} onChange={e => { setIncludeVideo(e.target.checked); if(e.target.checked) setIncludeImage(false); }} />
                      <Video className={includeVideo ? 'text-brand-600' : 'text-slate-400'} />
                      <span className="text-xs font-medium">Gerar Vídeo</span>
                    </label>
                  </div>
                </div>

                <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full h-12 text-lg">
                  <Wand2 className="w-5 h-5 mr-2" /> 
                  {isGenerating ? loadingStep : 'Gerar Conteúdo'}
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {generatedText || isGenerating ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg dark:text-white">Resultado</h3>
                  {!isGenerating && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedText)}>
                        <Copy className="w-4 h-4 mr-2" /> Copiar
                      </Button>
                      <Button size="sm" onClick={handleSavePost}>
                        <Save className="w-4 h-4 mr-2" /> Salvar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Media Display */}
                {(generatedImage || generatedVideo) && (
                    <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex justify-center items-center relative group">
                        {generatedVideo ? (
                            <video src={generatedVideo} controls className="w-full max-h-96 object-contain" />
                        ) : (
                            <img src={generatedImage!} alt="Gerado" className="w-full max-h-96 object-contain" />
                        )}
                        
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <a 
                             href={generatedVideo || generatedImage!} 
                             download={`conteudo_pilates.${generatedVideo ? 'mp4' : 'png'}`} 
                             target="_blank" 
                             rel="noreferrer" 
                             className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-100"
                           >
                               <Download className="w-4 h-4"/> Baixar
                           </a>
                        </div>
                    </div>
                )}

                {/* Text Display */}
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none whitespace-pre-wrap bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800 flex-1 overflow-y-auto">
                    {generatedText || <span className="text-slate-400 italic">O conteúdo aparecerá aqui...</span>}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50 min-h-[400px]">
                <Wand2 className="h-16 w-16 mb-4 opacity-20" />
                <p>Configure e clique em Gerar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.length === 0 ? (
            <p className="col-span-full text-center py-12 text-slate-500">Nenhum post salvo.</p>
          ) : (
            history.map(post => (
              <div key={post.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all">
                {post.imageUrl && (
                  <div className="h-48 overflow-hidden bg-slate-100">
                    <img src={post.imageUrl} alt="Saved" className="w-full h-full object-cover" />
                  </div>
                )}
                {post.videoUrl && (
                  <div className="h-48 overflow-hidden bg-slate-900 flex items-center justify-center relative">
                    <PlayCircle className="w-12 h-12 text-white/80" />
                    <video src={post.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded">{post.request.format}</span>
                    <button onClick={() => handleDeletePost(post.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{post.request.theme}</h3>
                  <p className="text-xs text-slate-500 mb-3">{new Date(post.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4">{post.content}</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    setGeneratedText(post.content);
                    setGeneratedImage(post.imageUrl || null);
                    setGeneratedVideo(post.videoUrl || null);
                    setRequest(post.request);
                    setActiveTab('generator');
                  }}>
                    Reutilizar / Editar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'persona' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6 text-brand-600" /> Personalidade do Studio
            </h2>
            <p className="text-slate-500 mb-6">
              Defina como a IA deve "falar" em nome do seu estúdio. Essas informações serão usadas para personalizar todo o conteúdo gerado.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Filosofia do Studio</label>
                <textarea 
                  className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700 h-24"
                  placeholder="Ex: Acreditamos no Pilates clássico com foco em reabilitação e bem-estar integral..."
                  value={persona.philosophy}
                  onChange={e => setPersona({...persona, philosophy: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Diferenciais</label>
                <textarea 
                  className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700 h-24"
                  placeholder="Ex: Atendimento individualizado, equipamentos de ponta, ambiente climatizado..."
                  value={persona.differentiators}
                  onChange={e => setPersona({...persona, differentiators: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Perfil dos Instrutores</label>
                <input 
                  className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700"
                  placeholder="Ex: Fisioterapeutas especializados, +10 anos de experiência..."
                  value={persona.instructorProfile}
                  onChange={e => setPersona({...persona, instructorProfile: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">O que EVITAR falar (Palavras proibidas)</label>
                <input 
                  className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700"
                  placeholder="Ex: Promoção relâmpago, dor sem solução, termos muito técnicos..."
                  value={persona.languageToAvoid}
                  onChange={e => setPersona({...persona, languageToAvoid: e.target.value})}
                />
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleSavePersona} className="w-full h-12">
                  <Save className="w-4 h-4 mr-2" /> Salvar Persona
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
