
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchSuggestionsByStudio, saveSuggestionActionPlan, fetchSuggestionActionPlans, deleteSuggestionActionPlan } from '../services/suggestionService';
import { generateActionPlanFromSuggestions, generateSuggestionTrends } from '../services/geminiService';
import { Suggestion, SuggestionActionPlan } from '../types';
import { Button } from '../components/ui/Button';
import { MessageSquare, CheckSquare, Sparkles, FileText, Download, Save, Trash2, ChevronRight, Loader2, Calendar, Filter, X, Building2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { fetchProfile } from '../services/storage';

export const StudioSuggestions: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
  const [studioName, setStudioName] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadSuggestions();
      loadSavedPlans();
      fetchProfile(user.id).then(p => { if(p) setStudioName(p.studioName) });
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
      alert(t('save') + " com sucesso!");
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
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = "#ffffff";

      const canvas = await html2canvas(element, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff',
          width: element.offsetWidth,
          height: element.offsetHeight
      });
      
      element.style.backgroundColor = originalBg;

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
            <MessageSquare className="text-brand-600"/> {t('suggestions_title')}
          </h1>
          <p className="text-slate-500">{t('suggestions_subtitle')}</p>
        </div>
      </div>

      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('inbox')} 
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
        >
          {t('inbox')}
        </button>
        <button 
          onClick={() => setActiveTab('plans')} 
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
        >
          {t('saved_plans')}
        </button>
      </div>

      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filters (Existing) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Filter className="w-4 h-4"/> {t('filters')}:
                </div>
                <div className="flex items-center gap-2 flex-1 w-full">
                    <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm flex-1"/>
                    <span className="text-slate-400">-</span>
                    <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm flex-1"/>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}>{t('clear')}</Button>
                    <Button size="sm" variant="secondary" onClick={handleGenerateAnalysis} isLoading={isAnalyzing} disabled={filteredSuggestions.length === 0}><FileText className="w-4 h-4 mr-2" /> {t('analyze_list')} ({filteredSuggestions.length})</Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300">
                {t('recent_suggestions')}
              </div>
              {filteredSuggestions.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    {suggestions.length > 0 ? "Nenhuma sugestão encontrada com estes filtros." : "Nenhuma sugestão recebida ainda."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                  {filteredSuggestions.map(s => (
                    <div key={s.id} className={`p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedIds.has(s.id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`} onClick={() => toggleSelection(s.id)}>
                      <div className="pt-1"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelection(s.id)} className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer" /></div>
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
                <Sparkles className="h-4 w-4 text-brand-600" /> {t('generate_action_plan')}
              </h3>
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{selectedIds.size} sugestão(ões) selecionada(s).</p>
                <textarea className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none h-32 resize-none" placeholder="Observações para a IA..." value={ownerObservations} onChange={e => setOwnerObservations(e.target.value)} />
              </div>
              <Button onClick={handleGeneratePlan} isLoading={isGenerating} disabled={selectedIds.size === 0} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" /> {t('generate_action_plan')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Plan Modal (A4 Style) */}
      {currentPlan && activeTab === 'inbox' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
               <h3 className="font-bold text-lg flex items-center gap-2"><CheckSquare className="w-5 h-5 text-green-600"/> {t('action_plan_generated')}</h3>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadPDF('generated-plan-content', 'Plano_Acao')}>
                    <Download className="w-4 h-4 mr-2"/> {t('download_pdf')}
                  </Button>
                  <Button size="sm" onClick={handleSavePlan}>
                    <Save className="w-4 h-4 mr-2"/> {t('save')}
                  </Button>
                  <button onClick={() => setCurrentPlan(null)} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4"/></button>
               </div>
             </div>
             
             <div className="overflow-y-auto p-4 md:p-8 bg-slate-200 dark:bg-slate-950 flex justify-center">
                {/* A4 Page Simulation */}
                <div 
                    id="generated-plan-content" 
                    className="bg-white shadow-2xl relative flex flex-col box-border overflow-hidden break-words"
                    style={{ 
                        width: '210mm', 
                        minHeight: '297mm', 
                        paddingTop: '30mm',
                        paddingRight: '20mm',
                        paddingBottom: '20mm',
                        paddingLeft: '30mm',
                        boxSizing: 'border-box'
                    }}
                >
                   <div className="flex justify-between items-start border-b-4 border-green-500 pb-6 mb-8">
                      <div>
                          <div className="flex items-center gap-2 text-green-600 mb-1 font-bold uppercase text-xs tracking-wider">
                              <CheckSquare className="w-4 h-4" /> Gestão de Melhorias
                          </div>
                          <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">Plano de Ação</h1>
                          <h2 className="text-lg text-slate-500 font-medium">{studioName}</h2>
                      </div>
                      <div className="text-right">
                          <Building2 className="h-10 w-10 text-slate-200 mb-1 ml-auto" />
                          <span className="text-xs text-slate-400">Data: {new Date().toLocaleDateString()}</span>
                      </div>
                   </div>

                   <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 italic">
                      "Este plano foi elaborado com base na análise de {selectedIds.size} sugestões dos alunos, visando melhorias práticas e rápidas."
                   </div>

                   <div 
                        className="flex-1 prose prose-slate max-w-none 
                        prose-h2:text-2xl prose-h2:font-bold prose-h2:text-green-700 prose-h2:border-b-2 prose-h2:border-green-100 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
                        prose-ul:list-disc prose-li:marker:text-green-500 prose-p:text-justify prose-p:leading-relaxed
                        prose-table:w-full prose-table:text-sm prose-table:border-collapse prose-table:my-4
                        prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left prose-th:font-bold
                        prose-td:p-2 prose-td:border prose-td:border-slate-200"
                        dangerouslySetInnerHTML={{ __html: currentPlan }} 
                   />

                   <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400 text-xs">
                        <p>Plataforma VOLL IA - Satisfação do Cliente</p>
                        <p>Uso Interno</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis Modal (A4 Style) */}
      {analysisReport && activeTab === 'inbox' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
               <h3 className="font-bold text-lg flex items-center gap-2">
                   <FileText className="w-5 h-5 text-purple-600" /> {t('trends_report')}
               </h3>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadPDF('analysis-report-content', 'Relatorio_Sugestoes')}>
                    <Download className="w-4 h-4 mr-2"/> {t('download_pdf')}
                  </Button>
                  <button onClick={() => setAnalysisReport(null)} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4"/></button>
               </div>
             </div>
             
             <div className="overflow-y-auto p-4 md:p-8 bg-slate-200 dark:bg-slate-950 flex justify-center">
                {/* A4 Page Simulation */}
                <div 
                    id="analysis-report-content" 
                    className="bg-white shadow-2xl relative flex flex-col box-border overflow-hidden break-words"
                    style={{ 
                        width: '210mm', 
                        minHeight: '297mm', 
                        paddingTop: '30mm',
                        paddingRight: '20mm',
                        paddingBottom: '20mm',
                        paddingLeft: '30mm',
                        boxSizing: 'border-box'
                    }}
                >
                   <div className="flex justify-between items-start border-b-4 border-purple-500 pb-6 mb-8">
                      <div>
                          <div className="flex items-center gap-2 text-purple-600 mb-1 font-bold uppercase text-xs tracking-wider">
                              <FileText className="w-4 h-4" /> Análise de Feedback
                          </div>
                          <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">Relatório de Tendências</h1>
                          <h2 className="text-lg text-slate-500 font-medium">{studioName}</h2>
                      </div>
                      <div className="text-right">
                          <Building2 className="h-10 w-10 text-slate-200 mb-1 ml-auto" />
                          <span className="text-xs text-slate-400">Data: {new Date().toLocaleDateString()}</span>
                      </div>
                   </div>

                   <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-800">
                      Análise realizada com base em {filteredSuggestions.length} sugestões coletadas entre {filterStartDate || 'o início'} e {filterEndDate || 'hoje'}.
                   </div>

                   <div 
                        className="flex-1 prose prose-slate max-w-none 
                        prose-h2:text-2xl prose-h2:font-bold prose-h2:text-purple-700 prose-h2:border-b-2 prose-h2:border-purple-100 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
                        prose-ul:list-disc prose-li:marker:text-purple-500 prose-p:text-justify prose-p:leading-relaxed
                        prose-table:w-full prose-table:text-sm prose-table:border-collapse prose-table:my-4
                        prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left prose-th:font-bold
                        prose-td:p-2 prose-td:border prose-td:border-slate-200"
                        dangerouslySetInnerHTML={{ __html: analysisReport }} 
                   />

                   <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400 text-xs">
                        <p>Plataforma VOLL IA - Satisfação do Cliente</p>
                        <p>Confidencial</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Saved Plans List (Existing) */}
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
                  setSelectedIds(new Set(plan.selectedSuggestions.map(s => s.id)));
                  setActiveTab('inbox');
                }}>
                  {t('view_details')}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
