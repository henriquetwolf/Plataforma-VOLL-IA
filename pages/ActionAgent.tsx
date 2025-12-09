import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateActionIdeas, generateActionPlanDetail } from '../services/geminiService';
import { saveActionPlan, fetchActionPlans, deleteActionPlan } from '../services/actionService';
import { recordGenerationUsage } from '../services/contentService';
import { ActionInput, ActionIdea, SavedActionPlan } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Rocket, Target, Users, DollarSign, Lightbulb, ArrowRight, Save, Trash2, Calendar, FileText, ChevronRight, ArrowLeft } from 'lucide-react';

export const ActionAgent: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [step, setStep] = useState<'input' | 'ideas' | 'result'>('input');
  const [input, setInput] = useState<ActionInput>({
    theme: '',
    objective: '',
    studentCount: 50,
    hasBudget: false,
    budgetPerStudent: 0
  });
  
  const [ideas, setIdeas] = useState<ActionIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ActionIdea | null>(null);
  const [fullPlanHtml, setFullPlanHtml] = useState('');
  
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  
  const [savedPlans, setSavedPlans] = useState<SavedActionPlan[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user?.id) {
        const targetId = user.isInstructor ? user.studioId : user.id;
        if(targetId) loadHistory(targetId);
    }
  }, [user]);

  const loadHistory = async (studioId: string) => {
      const data = await fetchActionPlans(studioId);
      setSavedPlans(data);
  };

  const handleGenerateIdeas = async () => {
      if (!input.theme || !input.objective) {
          alert("Preencha o tema e o objetivo.");
          return;
      }
      setLoadingIdeas(true);
      const generated = await generateActionIdeas(input);
      setIdeas(generated);
      setStep('ideas');
      setLoadingIdeas(false);
      
      // LOG USAGE
      if (user?.id) {
          const targetId = user.isInstructor ? user.studioId : user.id;
          if(targetId) await recordGenerationUsage(targetId, 'action');
      }
  };

  const handleSelectIdea = async (idea: ActionIdea) => {
      setSelectedIdea(idea);
      setLoadingPlan(true);
      const html = await generateActionPlanDetail(idea, input);
      setFullPlanHtml(html);
      setStep('result');
      setLoadingPlan(false);
      
      // LOG USAGE (Detailed Plan)
      if (user?.id) {
          const targetId = user.isInstructor ? user.studioId : user.id;
          if(targetId) await recordGenerationUsage(targetId, 'action');
      }
  };

  const handleSave = async () => {
      if (!user || !selectedIdea) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (!targetId) return;

      await saveActionPlan(targetId, selectedIdea.title, input.theme, fullPlanHtml, input);
      alert("Plano salvo!");
      loadHistory(targetId);
  };

  const handleDelete = async (id: string) => {
      if(confirm("Excluir plano?")) {
          await deleteActionPlan(id);
          const targetId = user?.isInstructor ? user.studioId : user?.id;
          if(targetId) loadHistory(targetId);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full text-orange-600 dark:text-orange-400">
                    <Rocket className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Agente de Ação</h1>
                    <p className="text-slate-500 dark:text-slate-400">Crie campanhas, eventos e ações para seu studio.</p>
                </div>
            </div>
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? 'Voltar' : 'Ver Histórico'}
            </Button>
        </div>

        {showHistory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPlans.length === 0 && <p className="col-span-3 text-center text-slate-500">Nenhum plano salvo.</p>}
                {savedPlans.map(plan => (
                    <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{plan.title}</h3>
                            <button onClick={() => handleDelete(plan.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">{new Date(plan.createdAt).toLocaleDateString()} • {plan.theme}</p>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3 rounded text-xs overflow-y-auto max-h-40 mb-4 prose prose-sm dark:prose-invert">
                            <div dangerouslySetInnerHTML={{ __html: plan.content }} />
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setFullPlanHtml(plan.content); setStep('result'); setShowHistory(false); }}>Ver Completo</Button>
                    </div>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-6">
                    {step === 'input' && (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
                            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">1. Defina o Cenário</h3>
                            <div className="space-y-4">
                                <Input label="Tema / Ocasião" value={input.theme} onChange={e => setInput({...input, theme: e.target.value})} placeholder="Ex: Outubro Rosa, Dia das Mães, Verão..." />
                                <Input label="Objetivo Principal" value={input.objective} onChange={e => setInput({...input, objective: e.target.value})} placeholder="Ex: Fidelização, Vendas, Confraternização..." />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Nº Alunos" type="number" value={input.studentCount} onChange={e => setInput({...input, studentCount: parseInt(e.target.value)})} />
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tem Verba?</label>
                                        <select className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none" value={input.hasBudget ? 'yes' : 'no'} onChange={e => setInput({...input, hasBudget: e.target.value === 'yes'})}>
                                            <option value="no">Sem custo (Orgânico)</option>
                                            <option value="yes">Sim, tenho verba</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {input.hasBudget && (
                                    <Input label="Verba por Aluno (R$)" type="number" value={input.budgetPerStudent} onChange={e => setInput({...input, budgetPerStudent: parseFloat(e.target.value)})} />
                                )}

                                <Button onClick={handleGenerateIdeas} isLoading={loadingIdeas} className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200">
                                    <Lightbulb className="w-4 h-4 mr-2" /> Gerar Ideias
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'ideas' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Button variant="ghost" size="sm" onClick={() => setStep('input')}><ArrowLeft className="w-4 h-4"/></Button>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">2. Escolha uma Ideia</h3>
                            </div>
                            {ideas.map((idea, idx) => (
                                <div key={idx} onClick={() => handleSelectIdea(idea)} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-orange-400 cursor-pointer transition-all group">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-orange-600">{idea.title}</h4>
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${idea.effort === 'Baixo' ? 'bg-green-100 text-green-700' : idea.effort === 'Médio' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            Esforço {idea.effort}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-2">{idea.summary}</p>
                                    <div className="mt-4 flex justify-end">
                                        <span className="text-sm font-bold text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all">Ver Plano <ArrowRight className="w-4 h-4"/></span>
                                    </div>
                                </div>
                            ))}
                            {loadingPlan && <div className="text-center p-8"><span className="animate-pulse">Criando o plano detalhado...</span></div>}
                        </div>
                    )}
                </div>

                {/* Result Section */}
                <div className="space-y-6">
                    {step === 'result' ? (
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg h-full flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-center border-b pb-4 mb-4">
                                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Plano de Ação</h3>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setStep('ideas')}>Voltar</Button>
                                    <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-2"/> Salvar</Button>
                                </div>
                            </div>
                            <div className="prose prose-slate dark:prose-invert max-w-none flex-1 overflow-y-auto">
                                <div dangerouslySetInnerHTML={{ __html: fullPlanHtml }} />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-12">
                            <Rocket className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-center text-sm">O plano detalhado aparecerá aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
