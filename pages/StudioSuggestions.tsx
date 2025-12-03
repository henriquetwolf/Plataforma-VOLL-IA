
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSuggestionsByStudio, saveSuggestionActionPlan, fetchSuggestionActionPlans, deleteSuggestionActionPlan } from '../services/suggestionService';
import { generateActionPlanFromSuggestions, generateSuggestionTrends } from '../services/geminiService';
import { Suggestion, SuggestionActionPlan } from '../types';
import { Button } from '../components/ui/Button';
import { MessageSquare, CheckSquare, Sparkles, FileText, Download, Save, Trash2, ChevronRight, Loader2, Calendar, Filter, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const StudioSuggestions: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'plans'>('inbox');
  
  // Inbox State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ownerObservations, setOwnerObservations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null); // Conteúdo HTML gerado
  
  // Analysis Report State
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filters State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Plans State
  const [savedPlans, setSavedPlans] = useState<SuggestionActionPlan[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadSuggestions();
      loadSavedPlans();
    }
  }, [user]);

  const loadSuggestions = async () => {
    if (user?.id) {
       const data = await fetchSuggestionsByStudio(user.id);
       setSuggestions(data);
    }
  };

  const loadSavedPlans = async () => {
    if (user?.id) {
       const data = await fetchSuggestionActionPlans(user.id);
       setSavedPlans(data);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // Filter Logic
  const filteredSuggestions = suggestions.filter(s => {
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0,0,0,0);
      if (new Date(s.createdAt) < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23,59,59,999);
      if (new Date(s.createdAt) > end) return false;
    }
    return true;
  });

  const handleGeneratePlan = async () => {
    if (selectedIds.size === 0) {
      alert("Selecione pelo menos uma sugestão.");
      return;
    }
    
    setIsGenerating(true);
    const selectedItems = suggestions.filter(s => selectedIds.has(s.id));
    
    try {
      const planHtml = await generateActionPlanFromSuggestions(selectedItems, ownerObservations);
      setCurrentPlan(planHtml);
    } catch (e) {
      alert("Erro ao gerar plano. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (filteredSuggestions.length === 0) {
      alert("Nenhuma sugestão encontrada com os filtros atuais.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const reportHtml = await generateSuggestionTrends(filteredSuggestions);
      setAnalysisReport(reportHtml);
    } catch (e) {
      alert("Erro ao gerar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSavePlan = async () => {
    if (!currentPlan || !user?.id) return;
    
    const title = prompt("Dê um nome para este Plano de Ação:", `Plano - ${new Date().toLocaleDateString()}`);
    if (!title) return;

    const selectedItems = suggestions.filter(s => selectedIds.has(s.id));
    const result = await saveSuggestionActionPlan(user.id, title, selectedItems, ownerObservations, currentPlan);
    
    if (result.success) {
      alert("Plano salvo com sucesso!");
      setCurrentPlan(null);
      setSelectedIds(new Set());
      setOwnerObservations('');
      loadSavedPlans();
      setActiveTab('plans');
    } else {
      alert("Erro ao salvar.");
    }
  };

  const downloadPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
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

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      alert('Erro ao gerar PDF.');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm("Apagar este plano?")) {
      await deleteSuggestionActionPlan(id);
      loadSavedPlans();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-brand-600"/> Gestão de Sugestões
          </h1>
          <p className="text-slate-500">Transforme feedback dos alunos em planos de ação práticos.</p>
        </div>
      </div>

      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('inbox')} 
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
        >
          Caixa de Entrada
        </button>
        <button 
          onClick={() => setActiveTab('plans')} 
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
        >
          Planos Salvos
        </button>
      </div>

      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Filter className="w-4 h-4"/> Filtros:
                </div>
                <div className="flex items-center gap-2 flex-1 w-full">
                    <input 
                        type="date" 
                        value={filterStartDate} 
                        onChange={e => setFilterStartDate(e.target.value)}
                        className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm flex-1"
                        placeholder="Início"
                    />
                    <span className="text-slate-400">-</span>
                    <input 
                        type="date" 
                        value={filterEndDate} 
                        onChange={e => setFilterEndDate(e.target.value)}
                        className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm flex-1"
                        placeholder="Fim"
                    />
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}>
                        Limpar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleGenerateAnalysis} isLoading={isAnalyzing} disabled={filteredSuggestions.length === 0}>
                        <FileText className="w-4 h-4 mr-2" /> Analisar Lista ({filteredSuggestions.length})
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300">
                Sugestões Recentes
              </div>
              {filteredSuggestions.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    {suggestions.length > 0 ? "Nenhuma sugestão encontrada com estes filtros." : "Nenhuma sugestão recebida ainda."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                  {filteredSuggestions.map(s => (
                    <div key={s.id} className={`p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedIds.has(s.id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`} onClick={() => toggleSelection(s.id)}>
                      <div className="pt-1">
                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelection(s.id)} className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-800 dark:text-slate-200 text-sm font-medium">"{s.content}"</p>
                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                          <span>{s.studentName}</span>
                          <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-4">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" /> Gerar Plano de Ação
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {selectedIds.size} sugestão(ões) selecionada(s).
                </p>
                <textarea
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none h-32 resize-none"
                  placeholder="Adicione suas observações ou contexto para a IA (ex: 'Estamos com orçamento limitado para reformas')..."
                  value={ownerObservations}
                  onChange={e => setOwnerObservations(e.target.value)}
                />
              </div>

              <Button onClick={handleGeneratePlan} isLoading={isGenerating} disabled={selectedIds.size === 0} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" /> Gerar Plano
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Plan Modal */}
      {currentPlan && activeTab === 'inbox' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
               <h3 className="font-bold text-lg">Plano de Ação Gerado</h3>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadPDF('generated-plan-content', 'Plano_Acao')}>
                    <Download className="w-4 h-4 mr-2"/> PDF
                  </Button>
                  <Button size="sm" onClick={handleSavePlan}>
                    <Save className="w-4 h-4 mr-2"/> Salvar
                  </Button>
                  <button onClick={() => setCurrentPlan(null)} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4"/></button>
               </div>
             </div>
             <div className="overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900">
                <div id="generated-plan-content" className="bg-white p-12 shadow-lg max-w-3xl mx-auto min-h-[600px] text-slate-800">
                   <div className="border-b-2 border-brand-500 pb-4 mb-6">
                      <h1 className="text-3xl font-bold text-slate-900">Plano de Ação: Feedback</h1>
                      <p className="text-slate-500 mt-2">Baseado em {selectedIds.size} sugestões dos alunos.</p>
                   </div>
                   <div dangerouslySetInnerHTML={{ __html: currentPlan }} className="prose prose-slate max-w-none" />
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis Modal */}
      {analysisReport && activeTab === 'inbox' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
               <h3 className="font-bold text-lg flex items-center gap-2">
                   <FileText className="w-5 h-5 text-purple-600" /> Relatório de Tendências
               </h3>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadPDF('analysis-report-content', 'Relatorio_Sugestoes')}>
                    <Download className="w-4 h-4 mr-2"/> PDF
                  </Button>
                  <button onClick={() => setAnalysisReport(null)} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4"/></button>
               </div>
             </div>
             <div className="overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900">
                <div id="analysis-report-content" className="bg-white p-12 shadow-lg max-w-3xl mx-auto min-h-[600px] text-slate-800">
                   <div className="border-b-2 border-purple-500 pb-4 mb-6">
                      <h1 className="text-3xl font-bold text-slate-900">Análise de Feedback</h1>
                      <p className="text-slate-500 mt-2">Baseado em {filteredSuggestions.length} sugestões filtradas.</p>
                      <p className="text-xs text-slate-400 mt-1">Período: {filterStartDate || 'Início'} até {filterEndDate || 'Hoje'}</p>
                   </div>
                   <div dangerouslySetInnerHTML={{ __html: analysisReport }} className="prose prose-slate max-w-none" />
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedPlans.length === 0 ? (
            <p className="col-span-3 text-center py-12 text-slate-500">Nenhum plano salvo.</p>
          ) : (
            savedPlans.map(plan => (
              <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                </div>
                <h3 className="font-bold text-lg mb-1">{plan.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{new Date(plan.createdAt).toLocaleDateString()} • {plan.selectedSuggestions.length} sugestões analisadas</p>
                
                <Button variant="outline" className="w-full" onClick={() => {
                  setCurrentPlan(plan.aiActionPlan);
                  setSelectedIds(new Set(plan.selectedSuggestions.map(s => s.id))); // Visual reference only
                  setActiveTab('inbox'); // Hack to reuse modal, ideally should be a separate modal
                }}>
                  Ver Detalhes
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
