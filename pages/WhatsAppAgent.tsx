import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateWhatsAppScript } from '../services/geminiService';
import { saveWhatsAppScript, fetchWhatsAppScripts, deleteWhatsAppScript } from '../services/whatsappService';
import { recordGenerationUsage } from '../services/contentService';
import { SavedWhatsAppScript, WhatsAppScriptRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MessageCircle, Wand2, Copy, Save, Trash2, History, RotateCcw } from 'lucide-react';

const CATEGORIES = ['Vendas', 'Cobrança', 'Reativação', 'Agendamento', 'Boas-vindas', 'Fidelização'];

export const WhatsAppAgent: React.FC = () => {
  const { user } = useAuth();
  
  const [request, setRequest] = useState<WhatsAppScriptRequest>({
    objective: '',
    clientName: '',
    productService: 'Aulas de Pilates',
    tone: 'Profissional e Empático',
    context: ''
  });
  
  const [category, setCategory] = useState('Vendas');
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedScripts, setSavedScripts] = useState<SavedWhatsAppScript[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user?.id) {
        const targetId = user.isInstructor ? user.studioId : user.id;
        if(targetId) loadHistory(targetId);
    }
  }, [user]);

  const loadHistory = async (studioId: string) => {
      const data = await fetchWhatsAppScripts(studioId);
      setSavedScripts(data);
  };

  const handleGenerate = async () => {
      if (!request.objective) {
          alert("Defina o objetivo da mensagem.");
          return;
      }
      setIsGenerating(true);
      const text = await generateWhatsAppScript(request);
      setGeneratedScript(text);
      setIsGenerating(false);
      
      // LOG USAGE
      if (user?.id) {
          const targetId = user.isInstructor ? user.studioId : user.id;
          if (targetId) await recordGenerationUsage(targetId, 'whatsapp');
      }
  };

  const handleSave = async () => {
      if (!user || !generatedScript) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (!targetId) return;

      const title = `${category} - ${new Date().toLocaleDateString()} - ${request.clientName || 'Geral'}`;
      await saveWhatsAppScript(targetId, title, generatedScript, category);
      alert("Script salvo!");
      loadHistory(targetId);
  };

  const handleDelete = async (id: string) => {
      if (confirm("Excluir script?")) {
          await deleteWhatsAppScript(id);
          const targetId = user?.isInstructor ? user.studioId : user?.id;
          if(targetId) loadHistory(targetId);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full text-green-600 dark:text-green-400">
                <MessageCircle className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Assistente de WhatsApp</h1>
                <p className="text-slate-500 dark:text-slate-400">Crie mensagens persuasivas para seus alunos.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Configurar Mensagem</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categoria</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => setCategory(cat)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === cat ? 'bg-green-600 text-white border-green-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-green-400'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Input label="Objetivo da Mensagem" value={request.objective} onChange={e => setRequest({...request, objective: e.target.value})} placeholder="Ex: Cobrar mensalidade atrasada com educação..." />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Nome do Cliente (Opcional)" value={request.clientName} onChange={e => setRequest({...request, clientName: e.target.value})} placeholder="Ex: Maria" />
                            <Input label="Serviço/Produto" value={request.productService} onChange={e => setRequest({...request, productService: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tom de Voz</label>
                            <select className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none" value={request.tone} onChange={e => setRequest({...request, tone: e.target.value})}>
                                <option>Profissional e Empático</option>
                                <option>Descontraído e Amigável</option>
                                <option>Urgente e Direto</option>
                                <option>Formal</option>
                            </select>
                        </div>

                        <Input label="Contexto Extra (Opcional)" value={request.context} onChange={e => setRequest({...request, context: e.target.value})} placeholder="Ex: Ela faltou 3 vezes seguidas..." />

                        <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full bg-green-600 hover:bg-green-700 text-white mt-4">
                            <Wand2 className="w-4 h-4 mr-2" /> Gerar Script
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Resultado</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setGeneratedScript('')} className="p-2 text-slate-400 hover:text-slate-600" title="Limpar"><RotateCcw className="w-4 h-4"/></button>
                            <button onClick={() => setShowHistory(!showHistory)} className="p-2 text-slate-400 hover:text-brand-600" title="Histórico"><History className="w-4 h-4"/></button>
                        </div>
                    </div>

                    {showHistory ? (
                        <div className="flex-1 overflow-y-auto space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Scripts Salvos</h4>
                            {savedScripts.length === 0 && <p className="text-sm text-slate-500 italic">Nenhum script salvo.</p>}
                            {savedScripts.map(s => (
                                <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-sm group relative">
                                    <div className="font-bold text-slate-800 dark:text-white mb-1 pr-6">{s.title}</div>
                                    <div className="text-slate-600 dark:text-slate-400 line-clamp-2">{s.content}</div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setGeneratedScript(s.content)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Copy className="w-3 h-3"/></button>
                                        <button onClick={() => handleDelete(s.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-y-auto">
                                {generatedScript || <span className="text-slate-400 italic">O script gerado aparecerá aqui...</span>}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(generatedScript)} disabled={!generatedScript}>
                                    <Copy className="w-4 h-4 mr-2"/> Copiar
                                </Button>
                                <Button className="flex-1" onClick={handleSave} disabled={!generatedScript}>
                                    <Save className="w-4 h-4 mr-2"/> Salvar
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
