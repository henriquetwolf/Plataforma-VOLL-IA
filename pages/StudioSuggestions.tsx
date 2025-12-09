import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchSuggestionsByStudio, saveSuggestionActionPlan, fetchSuggestionActionPlans, deleteSuggestionActionPlan } from '../services/suggestionService';
import { generateActionPlanFromSuggestions, generateSuggestionTrends } from '../services/geminiService';
import { recordGenerationUsage } from '../services/contentService';
import { Suggestion, SuggestionActionPlan } from '../types';
import { Button } from '../components/ui/Button';
import { MessageSquare, RefreshCw, Wand2, CheckCircle, Search, Trash2, ChevronDown, ChevronUp, FileText, Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const StudioSuggestions: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Suggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'plans'>('inbox');
  
  // Action Plan State
  const [ownerObservations, setOwnerObservations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SuggestionActionPlan[]>([]);

  // Trend Analysis State
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    if (targetId) {
        const [suggs, plans] = await Promise.all([
            fetchSuggestionsByStudio(targetId),
            fetchSuggestionActionPlans(targetId)
        ]);
        setSuggestions(suggs);
        setSavedPlans(plans);
    }
    setLoading(false);
  };

  const handleSelection = (item: Suggestion) => {
    if (selectedItems.find(i => i.id === item.id)) {
        setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
        setSelectedItems(prev => [...prev, item]);
    }
  };

  const handleGeneratePlan = async () => {
    if (selectedItems.length === 0) {
        alert("Selecione pelo menos uma sugestão.");
        return;
    }
    setIsGenerating(true);
    try {
      const planHtml = await generateActionPlanFromSuggestions(selectedItems, ownerObservations);
      setCurrentPlan(planHtml);
      
      // LOG USAGE
      if (user?.id) await recordGenerationUsage(user.id, 'suggestion');
      
    } catch (e) {
      alert("Erro ao gerar plano.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = async () => {
      if (!user || !currentPlan) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (!targetId) return;

      const title = `Plano de Ação - ${new Date().toLocaleDateString()}`;
      await saveSuggestionActionPlan(targetId, title, selectedItems, ownerObservations, currentPlan);
      alert("Plano salvo!");
      setCurrentPlan(null);
      setSelectedItems([]);
      setOwnerObservations('');
      loadData();
      setActiveTab('plans');
  };

  const handleGenerateAnalysis = async () => {
    if (suggestions.length === 0) {
        alert("Nenhuma sugestão para analisar.");
        return;
    }
    setIsAnalyzing(true);
    
    // Filter last 30 days or all
    // For now, take all
    const filteredSuggestions = suggestions;

    try {
      const reportHtml = await generateSuggestionTrends(filteredSuggestions);
      setAnalysisReport(reportHtml);
      setShowAnalysisModal(true);
      
      // LOG USAGE
      if (user?.id) await recordGenerationUsage(user.id, 'suggestion');
      
    } catch (e) {
      alert("Erro ao analisar.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadAnalysisPDF = async () => {
      const element = document.getElementById('analysis-report-content');
      if (!element) return;
      try {
          const canvas = await html2canvas(element, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save('Relatorio_Tendencias_Sugestoes.pdf');
      } catch (error) {
          alert('Erro ao gerar PDF.');
      }
  };

  const handleDeletePlan = async (id: string) => {
      if (confirm("Excluir plano?")) {
          await deleteSuggestionActionPlan(id);
          loadData();
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageSquare className="text-purple-600"/> {t('suggestions_title')}
            </h1>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerateAnalysis} isLoading={isAnalyzing}>
                    <Wand2 className="w-4 h-4 mr-2"/> {t('analyze_ai')}
                </Button>
            </div>
        </div>

        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <button onClick={() => setActiveTab('inbox')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'inbox' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>{t('inbox')}</button>
            <button onClick={() => setActiveTab('plans')} className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'plans' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>{t('saved_plans')}</button>
        </div>

        {activeTab === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LIST */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? <p className="text-center p-8 text-slate-500">Carregando...</p> : 
                     suggestions.length === 0 ? <p className="text-center p-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">Caixa de entrada vazia.</p> :
                     suggestions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => handleSelection(s)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedItems.find(i => i.id === s.id) 
                                ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                            }`}
                        >
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-sm text-slate-800 dark:text-white">{s.studentName}</span>
                                <span className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">"{s.content}"</p>
                        </div>
                     ))
                    }
                </div>

                {/* ACTION PLAN GENERATOR */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-4">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">{t('generate_action_plan')}</h3>
                        <p className="text-sm text-slate-500 mb-4">{selectedItems.length} sugestões selecionadas.</p>
                        
                        <div className="space-y-4">
                            <textarea 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 resize-none h-24"
                                placeholder="Suas observações ou restrições (opcional)..."
                                value={ownerObservations}
                                onChange={e => setOwnerObservations(e.target.value)}
                            />
                            <Button onClick={handleGeneratePlan} isLoading={isGenerating} disabled={selectedItems.length === 0} className="w-full">
                                <Wand2 className="w-4 h-4 mr-2"/> Gerar Plano
                            </Button>
                        </div>

                        {currentPlan && (
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-4">
                                <h4 className="font-bold text-green-600 text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> {t('action_plan_generated')}</h4>
                                <div className="max-h-60 overflow-y-auto text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded mb-4 prose prose-sm dark:prose-invert">
                                    <div dangerouslySetInnerHTML={{ __html: currentPlan }} />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPlan(null)} className="flex-1">Descartar</Button>
                                    <Button size="sm" onClick={handleSavePlan} className="flex-1">Salvar</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPlans.length === 0 ? <p className="col-span-3 text-center p-8 text-slate-500">Nenhum plano salvo.</p> :
                 savedPlans.map(plan => (
                    <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{plan.title}</h3>
                                <p className="text-xs text-slate-500">{new Date(plan.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3 rounded text-xs overflow-y-auto max-h-40 mb-4">
                            <div dangerouslySetInnerHTML={{ __html: plan.aiActionPlan }} />
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                            Baseado em {plan.selectedSuggestions.length} sugestões.
                        </div>
                    </div>
                 ))
                }
            </div>
        )}

        {/* TREND ANALYSIS MODAL */}
        {showAnalysisModal && analysisReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-purple-600"/> {t('trends_report')}
                        </h3>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={downloadAnalysisPDF}><Download className="w-4 h-4 mr-2"/> PDF</Button>
                            <button onClick={() => setShowAnalysisModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500"><X className="w-6 h-6"/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
                        <div id="analysis-report-content" className="bg-white p-12 shadow-lg max-w-3xl w-full min-h-[297mm]">
                            <div className="text-center border-b-2 border-purple-600 pb-6 mb-8">
                                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-widest">Relatório de Feedback</h1>
                                <p className="text-slate-500 mt-2">Análise de Tendências e Satisfação</p>
                            </div>
                            <div className="prose prose-slate max-w-none text-justify" dangerouslySetInnerHTML={{ __html: analysisReport }} />
                            <div className="mt-12 pt-6 border-t text-center text-xs text-slate-400">
                                Gerado por Plataforma VOLL IA em {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
