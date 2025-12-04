
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateWhatsAppScript } from '../services/geminiService';
import { saveWhatsAppScript, fetchWhatsAppScripts, deleteWhatsAppScript } from '../services/whatsappService';
import { WhatsAppScriptRequest, SavedWhatsAppScript } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MessageCircle, Send, Copy, Save, Trash2, Smartphone, Zap, RefreshCw, Wand2, History, ArrowRight } from 'lucide-react';

const PRESET_TEMPLATES = [
  { label: 'Recuperar Carrinho/Venda', objective: 'Recuperar cliente que parou de responder', context: 'Cliente pediu preço mas sumiu.' },
  { label: 'Confirmação Aula', objective: 'Confirmar agendamento experimental', context: 'Aula agendada para amanhã.' },
  { label: 'Aniversário', objective: 'Parabenizar e oferecer presente', context: 'Oferecer desconto ou aula extra.' },
  { label: 'Reativação (Sumido)', objective: 'Reativar ex-aluno', context: 'Não vem há 3 meses.' },
  { label: 'Indicação', objective: 'Pedir indicação de amigo', context: 'Aluno gosta muito das aulas.' },
];

export const WhatsAppAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');
  
  // Generator State
  const [clientName, setClientName] = useState('');
  const [product, setProduct] = useState('Pilates');
  const [objective, setObjective] = useState('');
  const [tone, setTone] = useState('Amigável e Profissional');
  const [extraContext, setExtraContext] = useState('');
  
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // History State
  const [scripts, setScripts] = useState<SavedWhatsAppScript[]>([]);

  useEffect(() => {
    if (activeTab === 'history' && user?.id) {
        loadHistory();
    }
  }, [activeTab, user]);

  const loadHistory = async () => {
      if (user?.id) {
          const data = await fetchWhatsAppScripts(user.id);
          setScripts(data);
      }
  };

  const applyTemplate = (tpl: any) => {
      setObjective(tpl.objective);
      setExtraContext(tpl.context);
  };

  const handleGenerate = async () => {
      if (!objective) {
          alert("Defina o objetivo da mensagem.");
          return;
      }
      setIsGenerating(true);
      const request: WhatsAppScriptRequest = {
          objective,
          clientName,
          productService: product,
          tone,
          context: extraContext
      };
      
      const text = await generateWhatsAppScript(request);
      setGeneratedScript(text);
      setIsGenerating(false);
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(generatedScript);
      alert("Texto copiado!");
  };

  const handleSave = async () => {
      if (!user?.id || !generatedScript) return;
      setIsSaving(true);
      const title = `${objective} - ${clientName || 'Geral'}`;
      const result = await saveWhatsAppScript(user.id, title, generatedScript, objective);
      
      if (result.success) {
          alert("Script salvo!");
          loadHistory(); // Refresh list if needed later
      } else {
          alert("Erro ao salvar.");
      }
      setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
      if (confirm("Apagar este script?")) {
          await deleteWhatsAppScript(id);
          loadHistory();
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="h-8 w-8 text-green-600" /> Assistente WhatsApp
                </h1>
                <p className="text-slate-500">Crie scripts de vendas e atendimento impossíveis de ignorar.</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'generator' ? 'bg-white dark:bg-slate-700 shadow text-green-600 dark:text-green-400' : 'text-slate-500'}`}
                >
                    <Wand2 className="w-4 h-4"/> Gerador
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
                >
                    <History className="w-4 h-4"/> Salvos
                </button>
            </div>
        </div>

        {activeTab === 'generator' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Left Column: Controls */}
                <div className="space-y-6">
                    {/* Templates */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-500"/> Ideias Prontas (Toque para usar)</h3>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_TEMPLATES.map((tpl, i) => (
                                <button 
                                    key={i}
                                    onClick={() => applyTemplate(tpl)}
                                    className="text-xs bg-slate-50 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg transition-colors"
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Nome do Cliente (Opcional)" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: Maria" />
                            <Input label="Produto / Serviço" value={product} onChange={e => setProduct(e.target.value)} />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Objetivo da Mensagem *</label>
                            <input className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-green-500 outline-none" value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex: Cobrar mensalidade atrasada com educação..." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tom de Voz</label>
                            <select className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 outline-none" value={tone} onChange={e => setTone(e.target.value)}>
                                <option>Amigável e Profissional</option>
                                <option>Empático e Acolhedor</option>
                                <option>Direto e Comercial</option>
                                <option>Urgente (Escassez)</option>
                                <option>Descontraído</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contexto Extra (Opcional)</label>
                            <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-20 resize-none focus:ring-2 focus:ring-green-500 outline-none" value={extraContext} onChange={e => setExtraContext(e.target.value)} placeholder="Ex: Ela disse que estava sem tempo semana passada..." />
                        </div>

                        <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg shadow-lg shadow-green-200">
                            <Wand2 className="w-5 h-5 mr-2" /> Gerar Script
                        </Button>
                    </div>
                </div>

                {/* Right Column: Preview */}
                <div className="sticky top-6">
                    <div className="bg-slate-800 rounded-[3rem] p-4 shadow-2xl border-4 border-slate-700 max-w-sm mx-auto relative overflow-hidden">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-700 rounded-b-xl z-20"></div>
                        
                        {/* Screen */}
                        <div className="bg-[#E5DDD5] h-[600px] rounded-[2rem] overflow-hidden flex flex-col relative">
                            {/* WhatsApp Header */}
                            <div className="bg-[#008069] p-4 pt-8 flex items-center gap-3 text-white shadow-sm z-10">
                                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-500 overflow-hidden">
                                    <Smartphone className="w-5 h-5"/>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">{clientName || 'Cliente'}</p>
                                    <p className="text-[10px] opacity-80">visto por último hoje às 10:30</p>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 p-4 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-90">
                                {generatedScript ? (
                                    <div className="flex justify-end mb-4 animate-in slide-in-from-bottom-4">
                                        <div className="bg-[#DCF8C6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-sm text-slate-800 whitespace-pre-wrap relative">
                                            {generatedScript}
                                            <span className="text-[10px] text-slate-400 block text-right mt-1 flex justify-end gap-1 items-center">
                                                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                <span className="text-blue-400">✓✓</span>
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center mt-20 opacity-50">
                                        <p className="text-xs bg-[#E1F3FB] text-slate-600 px-3 py-1 rounded shadow-sm">
                                            Aguardando mensagem...
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions Overlay */}
                            {generatedScript && (
                                <div className="absolute bottom-4 left-4 right-4 flex gap-2 justify-center">
                                    <Button size="sm" onClick={handleCopy} className="bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-lg">
                                        <Copy className="w-4 h-4 mr-2" /> Copiar
                                    </Button>
                                    <Button size="sm" onClick={handleSave} isLoading={isSaving} className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
                                        <Save className="w-4 h-4 mr-2" /> Salvar
                                    </Button>
                                    <Button size="sm" onClick={() => handleGenerate()} variant="secondary" className="bg-slate-800 text-white hover:bg-slate-900 shadow-lg">
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scripts.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                        <p>Nenhum script salvo ainda.</p>
                    </div>
                ) : (
                    scripts.map(script => (
                        <div key={script.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full uppercase truncate max-w-[70%]">
                                    {script.category}
                                </span>
                                <button onClick={() => handleDelete(script.id)} className="text-slate-400 hover:text-red-500 p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{script.title}</h3>
                            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-400 h-32 overflow-y-auto mb-3 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                                {script.content}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => {
                                        navigator.clipboard.writeText(script.content);
                                        alert("Copiado!");
                                    }}
                                >
                                    <Copy className="w-3 h-3 mr-2" /> Copiar
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                        const url = `https://wa.me/?text=${encodeURIComponent(script.content)}`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    <Send className="w-3 h-3 mr-2" /> Enviar
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
    </div>
  );
};
