
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateActionIdeas, generateActionPlanDetail } from '../services/geminiService';
import { saveActionPlan, fetchActionPlans, deleteActionPlan } from '../services/actionService';
import { ActionInput, ActionIdea, SavedActionPlan } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Rocket, Target, Users, DollarSign, Lightbulb, CheckCircle, ArrowRight, Save, Download, Trash2, History, RotateCcw, FileText, ChevronRight, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const INITIAL_INPUT: ActionInput = {
  theme: '',
  objective: '',
  studentCount: 0,
  hasBudget: false,
  budgetPerStudent: 0
};

export const ActionAgent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Wizard State
  const [step, setStep] = useState<'input' | 'ideas' | 'result'>('input');
  const [input, setInput] = useState<ActionInput>(INITIAL_INPUT);
  
  // Data State
  const [ideas, setIdeas] = useState<ActionIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ActionIdea | null>(null);
  const [fullPlanHtml, setFullPlanHtml] = useState<string | null>(null);
  
  // Loading States
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [saving, setSaving] = useState(false);

  // History State
  const [savedPlans, setSavedPlans] = useState<SavedActionPlan[]>([]);

  useEffect(() => {
    if (activeTab === 'history' && user?.id) {
        loadHistory();
    }
  }, [activeTab, user]);

  const loadHistory = async () => {
      if (user?.id) {
          const data = await fetchActionPlans(user.id);
          setSavedPlans(data);
      }
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
  };

  const handleSelectIdea = async (idea: ActionIdea) => {
      setSelectedIdea(idea);
      setLoadingPlan(true);
      const html = await generateActionPlanDetail(idea, input);
      setFullPlanHtml(html);
      setStep('result');
      setLoadingPlan(false);
  };

  const handleSave = async () => {
      if (!user?.id || !fullPlanHtml || !selectedIdea) return;
      setSaving(true);
      const title = `${selectedIdea.title} (${input.theme})`;
      const res = await saveActionPlan(user.id, title, input.theme, fullPlanHtml, input);
      if (res.success) {
          alert("Plano salvo com sucesso!");
          setActiveTab('history');
      } else {
          alert("Erro ao salvar.");
      }
      setSaving(false);
  };

  const downloadPDF = async () => {
      const element = document.getElementById('action-plan-content');
      if (!element) return;
      
      try {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = 210;
          const pdfHeight = 297;
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;

          while (heightLeft >= 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pdfHeight;
          }
          pdf.save('Plano_de_Acao.pdf');
      } catch (e) {
          alert("Erro ao gerar PDF.");
      }
  };

  const handleDeletePlan = async (id: string) => {
      if (confirm("Tem certeza?")) {
          await deleteActionPlan(id);
          loadHistory();
      }
  };

  const resetWizard = () => {
      setStep('input');
      setInput(INITIAL_INPUT);
      setIdeas([]);
      setSelectedIdea(null);
      setFullPlanHtml(null);
  };

  // View Saved Plan
  const handleViewSaved = (plan: SavedActionPlan) => {
      setFullPlanHtml(plan.content);
      setSelectedIdea({ id: 'saved', title: plan.title, summary: '', effort: 'Médio' });
      setStep('result');
      setActiveTab('create');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Rocket className="h-8 w-8 text-orange-600" /> Agente de Ação
                </h1>
                <p className="text-slate-500">Crie campanhas e eventos memoráveis para o seu studio.</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-white dark:bg-slate-700 shadow text-orange-600 dark:text-orange-400' : 'text-slate-500'}`}
                >
                    <Lightbulb className="w-4 h-4"/> Criar
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
                >
                    <History className="w-4 h-4"/> Histórico
                </button>
            </div>
        </div>

        {activeTab === 'create' && (
            <>
                {step === 'input' && (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in zoom-in-95">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vamos planejar sua próxima ação!</h2>
                            <p className="text-slate-500 text-sm">Responda a 5 perguntas rápidas para a IA te ajudar.</p>
                        </div>

                        <div className="space-y-6">
                            <Input 
                                label="1. Qual o tema ou evento?" 
                                placeholder="Ex: Dia das Mães, Carnaval, Campanha de Indicação..." 
                                value={input.theme} 
                                onChange={e => setInput({...input, theme: e.target.value})}
                            />
                            
                            <Input 
                                label="2. Qual o objetivo principal?" 
                                placeholder="Ex: Atrair novos alunos, Fidelizar, Recuperar inativos..." 
                                value={input.objective} 
                                onChange={e => setInput({...input, objective: e.target.value})}
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">3. Quantos alunos o studio tem hoje?</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="number" 
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={input.studentCount || ''}
                                        onChange={e => setInput({...input, studentCount: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">4. Deseja investir dinheiro nesta ação?</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition-all ${!input.hasBudget ? 'bg-slate-200 border-slate-300 font-bold' : 'bg-white hover:bg-slate-50'}`}>
                                        <input type="radio" className="hidden" checked={!input.hasBudget} onChange={() => setInput({...input, hasBudget: false, budgetPerStudent: 0})} />
                                        Não (Orgânico)
                                    </label>
                                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition-all ${input.hasBudget ? 'bg-orange-100 border-orange-300 text-orange-700 font-bold' : 'bg-white hover:bg-slate-50'}`}>
                                        <input type="radio" className="hidden" checked={input.hasBudget} onChange={() => setInput({...input, hasBudget: true})} />
                                        Sim (Investimento)
                                    </label>
                                </div>

                                {input.hasBudget && (
                                    <div className="mt-4 animate-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">5. Qual o investimento médio por aluno (R$)?</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input 
                                                type="number" 
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
                                                value={input.budgetPerStudent || ''}
                                                onChange={e => setInput({...input, budgetPerStudent: parseFloat(e.target.value)})}
                                                placeholder="Ex: 10.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button onClick={handleGenerateIdeas} isLoading={loadingIdeas} className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700 text-white shadow-lg">
                                Gerar Ideias de Ação
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'ideas' && (
                    <div className="space-y-6 animate-in slide-in-from-right-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Escolha uma Ideia</h2>
                            <Button variant="ghost" onClick={() => setStep('input')}>Voltar</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {ideas.map((idea) => (
                                <div key={idea.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-orange-400 hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer" onClick={() => handleSelectIdea(idea)}>
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Lightbulb className="w-6 h-6"/></div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${idea.effort === 'Baixo' ? 'bg-green-100 text-green-700' : idea.effort === 'Médio' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                Esforço: {idea.effort}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{idea.title}</h3>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{idea.summary}</p>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                                        <span className="text-orange-600 font-bold text-sm group-hover:underline flex items-center justify-center gap-1">
                                            {loadingPlan && selectedIdea?.id === idea.id ? 'Gerando...' : <>Selecionar <ArrowRight className="w-4 h-4"/></>}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'result' && fullPlanHtml && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle className="w-6 h-6"/></div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">Plano Gerado!</h2>
                                    <p className="text-sm text-slate-500">Revise, salve ou baixe seu plano de ação.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={resetWizard}><RotateCcw className="w-4 h-4 mr-2"/> Novo</Button>
                                <Button variant="secondary" onClick={downloadPDF}><Download className="w-4 h-4 mr-2"/> PDF</Button>
                                <Button onClick={handleSave} isLoading={saving} className="bg-green-600 hover:bg-green-700 text-white"><Save className="w-4 h-4 mr-2"/> Salvar</Button>
                            </div>
                        </div>

                        <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-8 rounded-xl overflow-hidden">
                            <div 
                                id="action-plan-content" 
                                className="bg-white shadow-2xl p-12 max-w-[210mm] min-h-[297mm] box-border"
                            >
                                <div className="border-b-4 border-orange-500 pb-6 mb-8 flex justify-between items-start">
                                    <div>
                                        <div className="text-orange-600 font-bold uppercase tracking-wider text-sm mb-1 flex items-center gap-2">
                                            <Rocket className="w-4 h-4"/> Plano de Ação
                                        </div>
                                        <h1 className="text-3xl font-extrabold text-slate-900">{selectedIdea?.title}</h1>
                                        <p className="text-slate-500 mt-1">{input.theme}</p>
                                    </div>
                                    <div className="text-right text-xs text-slate-400">
                                        <p>Gerado em: {new Date().toLocaleDateString()}</p>
                                        <p>Plataforma VOLL IA</p>
                                    </div>
                                </div>

                                <div 
                                    className="prose prose-slate max-w-none 
                                    prose-h2:text-2xl prose-h2:font-bold prose-h2:text-orange-700 prose-h2:border-b-2 prose-h2:border-orange-100 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
                                    prose-ul:list-disc prose-li:marker:text-orange-500 prose-p:text-justify prose-p:leading-relaxed
                                    prose-table:w-full prose-table:text-sm prose-table:border-collapse prose-table:my-4
                                    prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left prose-th:font-bold
                                    prose-td:p-2 prose-td:border prose-td:border-slate-200"
                                    dangerouslySetInnerHTML={{ __html: fullPlanHtml }} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}

        {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPlans.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <Target className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                        <p>Nenhum plano de ação salvo.</p>
                    </div>
                ) : (
                    savedPlans.map(plan => (
                        <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4"/></button>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 line-clamp-1">{plan.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">{new Date(plan.createdAt).toLocaleDateString()} • {plan.theme}</p>
                            <Button variant="outline" className="w-full group-hover:border-orange-300 group-hover:text-orange-600" onClick={() => handleViewSaved(plan)}>
                                Ver Plano <ChevronRight className="w-4 h-4 ml-1"/>
                            </Button>
                        </div>
                    ))
                )}
            </div>
        )}
    </div>
  );
};