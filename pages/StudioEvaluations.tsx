
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchEvaluationsByStudio, deleteEvaluation, saveEvaluationAnalysis, fetchEvaluationAnalyses, deleteEvaluationAnalysis } from '../services/evaluationService';
import { generateEvaluationAnalysis } from '../services/geminiService';
import { ClassEvaluation, SavedEvaluationAnalysis } from '../types';
import { Button } from '../components/ui/Button';
import { Star, MessageSquare, Calendar, User, Activity, AlertTriangle, ThumbsUp, Trash2, Filter, Loader2, XCircle, Sparkles, FileText, Download, Save, ChevronRight, X, Building2 } from 'lucide-react';
import { fetchProfile } from '../services/storage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const StudioEvaluations: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'list' | 'analyses'>('list');

  // Data
  const [evaluations, setEvaluations] = useState<ClassEvaluation[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedEvaluationAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [studioName, setStudioName] = useState('');
  
  // Filters
  const [filterInstructor, setFilterInstructor] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterDate, setFilterDate] = useState<'all' | 'week' | 'month'>('all');

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const data = await fetchEvaluationsByStudio(user.id);
        setEvaluations(data);
        const analyses = await fetchEvaluationAnalyses(user.id);
        setSavedAnalyses(analyses);
        const profile = await fetchProfile(user.id);
        if (profile) setStudioName(profile.studioName);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta avaliação permanentemente?")) {
      setDeletingId(id);
      const result = await deleteEvaluation(id);
      
      if (result.success) {
        setEvaluations(prev => prev.filter(e => e.id !== id));
      } else {
        alert(`Erro ao excluir: ${result.error}`);
      }
      setDeletingId(null);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (window.confirm("Apagar esta análise salva?")) {
        await deleteEvaluationAnalysis(id);
        setSavedAnalyses(prev => prev.filter(a => a.id !== id));
    }
  };

  const uniqueInstructors = Array.from(new Set(evaluations.map(e => e.instructorName))).sort();
  const uniqueStudents = Array.from(new Set(evaluations.map(e => e.studentName))).sort();

  const filteredEvaluations = evaluations.filter(e => {
    const matchInstructor = !filterInstructor || e.instructorName === filterInstructor;
    const matchStudent = !filterStudent || e.studentName === filterStudent;
    
    let matchDate = true;
    if (filterDate !== 'all') {
      const evalDate = new Date(e.classDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - evalDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filterDate === 'week') matchDate = diffDays <= 7;
      if (filterDate === 'month') matchDate = diffDays <= 30;
    }

    return matchInstructor && matchStudent && matchDate;
  });

  const averageRating = filteredEvaluations.length 
    ? (filteredEvaluations.reduce((acc, curr) => acc + curr.rating, 0) / filteredEvaluations.length).toFixed(1) 
    : '0.0';

  // --- AI ACTIONS ---

  const handleGenerateAnalysis = async () => {
    if (filteredEvaluations.length === 0) {
      alert("Não há avaliações filtradas para analisar.");
      return;
    }
    
    setIsAnalyzing(true);
    const context = `Filtro: ${filterDate === 'all' ? 'Todo Período' : filterDate}, Instrutor: ${filterInstructor || 'Todos'}`;
    
    const html = await generateEvaluationAnalysis(filteredEvaluations, context);
    setAnalysisResult(html);
    setIsAnalyzing(false);
    setShowAnalysisModal(true);
  };

  const handleSaveAnalysis = async () => {
    if (!user?.id || !analysisResult) return;
    
    const title = prompt("Nome para esta análise:", `Análise - ${new Date().toLocaleDateString()}`);
    if (!title) return;

    setIsSavingAnalysis(true);
    const dateRange = filterDate === 'all' ? 'Todo Período' : (filterDate === 'week' ? 'Última Semana' : 'Último Mês');
    
    const result = await saveEvaluationAnalysis(
        user.id, 
        title, 
        analysisResult, 
        filteredEvaluations.length, 
        dateRange
    );

    if (result.success) {
        alert(t('save') + " com sucesso!");
        const updated = await fetchEvaluationAnalyses(user.id);
        setSavedAnalyses(updated);
        setShowAnalysisModal(false);
        setActiveTab('analyses');
    } else {
        alert("Erro ao salvar: " + result.error);
    }
    setIsSavingAnalysis(false);
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
          backgroundColor: '#ffffff' 
      });
      
      element.style.backgroundColor = originalBg;

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
      console.error(error);
      alert('Erro ao gerar PDF.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="text-yellow-500 fill-yellow-500" /> {t('evaluations_title')}
          </h1>
          <p className="text-slate-500">{t('evaluations_subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('list')} 
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
        >
          {t('evaluations_list')}
        </button>
        <button 
          onClick={() => setActiveTab('analyses')} 
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analyses' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
        >
          {t('saved_reports')}
        </button>
      </div>

      {activeTab === 'list' && (
        <>
          {/* Summary & Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
             {/* Summary Card */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-1">
                <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t('average')} ({filteredEvaluations.length})</p>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white flex justify-center items-center gap-2">
                        {averageRating} <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button onClick={handleGenerateAnalysis} isLoading={isAnalyzing} className="w-full bg-purple-600 hover:bg-purple-700">
                        <Sparkles className="w-4 h-4 mr-2" /> {t('analyze_ai')}
                    </Button>
                </div>
             </div>

             {/* Filters & List */}
             <div className="lg:col-span-3 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
                    <div className="flex items-center gap-2 text-slate-500 font-medium text-sm w-full sm:w-auto">
                        <Filter className="w-4 h-4" /> {t('filters')}:
                    </div>
                    <select className="flex-1 w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700 text-sm" value={filterInstructor} onChange={e => setFilterInstructor(e.target.value)}>
                        <option value="">{t('all_instructors')}</option>
                        {uniqueInstructors.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <select className="flex-1 w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700 text-sm" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
                        <option value="">{t('all_students')}</option>
                        {uniqueStudents.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <select className="flex-1 w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700 text-sm" value={filterDate} onChange={e => setFilterDate(e.target.value as any)}>
                        <option value="all">{t('all_period')}</option>
                        <option value="week">{t('last_week')}</option>
                        <option value="month">{t('last_month')}</option>
                    </select>
                    {(filterInstructor || filterStudent || filterDate !== 'all') && (
                        <button onClick={() => { setFilterInstructor(''); setFilterStudent(''); setFilterDate('all'); }} className="text-xs text-red-500 hover:underline">{t('clear')}</button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-600"/>{t('loading')}</div>
                ) : filteredEvaluations.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">Nenhuma avaliação encontrada.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredEvaluations.map(eva => (
                            <div key={eva.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:border-brand-300 transition-colors flex flex-col relative group">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`w-3 h-3 ${star <= eva.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(eva.classDate).toLocaleDateString()}</span>
                                            <button onClick={() => handleDelete(eva.id)} disabled={deletingId === eva.id} className="text-slate-300 hover:text-red-500 p-1">
                                                {deletingId === eva.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2"><User className="w-3 h-3 text-brand-600" /> {eva.studentName || 'Aluno(a)'}</h3>
                                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{eva.instructorName}</span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2 text-xs flex-1">
                                    <div className="flex gap-2">
                                        <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded flex-1"><span className="text-slate-400 block mb-0.5">Sensação</span>{eva.feeling}</div>
                                        <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded flex-1"><span className="text-slate-400 block mb-0.5">Ritmo</span>{eva.pace}</div>
                                    </div>
                                    {eva.discomfort && <div className="text-orange-600 bg-orange-50 dark:bg-orange-900/10 p-2 rounded border border-orange-100"><span className="font-bold block">Desconforto:</span>{eva.discomfort}</div>}
                                    {eva.suggestions && <div className="text-slate-600 bg-slate-50 dark:bg-slate-800 p-2 rounded italic">"{eva.suggestions}"</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
        </>
      )}

      {activeTab === 'analyses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedAnalyses.length === 0 ? (
                <p className="col-span-3 text-center py-12 text-slate-500">Nenhum relatório salvo.</p>
            ) : (
                savedAnalyses.map(analysis => (
                    <div key={analysis.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                                <FileText className="w-6 h-6" />
                            </div>
                            <button onClick={() => handleDeleteAnalysis(analysis.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{analysis.title}</h3>
                        <p className="text-sm text-slate-500 mb-4">{new Date(analysis.createdAt).toLocaleDateString()} • {analysis.evaluationCount} avaliações</p>
                        
                        <Button variant="outline" className="w-full" onClick={() => {
                            setAnalysisResult(analysis.content);
                            setShowAnalysisModal(true);
                        }}>
                            Ver Relatório
                        </Button>
                    </div>
                ))
            )}
        </div>
      )}

      {/* Analysis Modal - Report Style */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600"/> {t('quality_report')}
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadPDF('analysis-content', 'Relatorio_Qualidade')}>
                            <Download className="w-4 h-4 mr-2"/> {t('download_pdf')}
                        </Button>
                        <Button size="sm" onClick={handleSaveAnalysis} isLoading={isSavingAnalysis} disabled={isSavingAnalysis}>
                            <Save className="w-4 h-4 mr-2"/> {t('save')}
                        </Button>
                        <button onClick={() => setShowAnalysisModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                
                <div className="overflow-y-auto p-4 md:p-8 bg-slate-200 dark:bg-slate-950 flex justify-center">
                    {/* A4 Report Simulation */}
                    <div 
                        id="analysis-content" 
                        className="bg-white shadow-2xl relative flex flex-col box-border"
                        style={{ 
                            width: '210mm', 
                            minHeight: '297mm', 
                            paddingTop: '30mm',
                            paddingRight: '20mm',
                            paddingBottom: '20mm',
                            paddingLeft: '30mm'
                        }}
                    >
                        <div className="flex justify-between items-start border-b-4 border-purple-500 pb-6 mb-8">
                            <div>
                                <div className="flex items-center gap-2 text-purple-600 mb-1 font-bold uppercase text-xs tracking-wider">
                                    <Sparkles className="w-4 h-4" /> Análise de Qualidade
                                </div>
                                <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">Relatório de Avaliações</h1>
                                <h2 className="text-lg text-slate-500 font-medium">{studioName}</h2>
                            </div>
                            <div className="text-right">
                                <Building2 className="h-10 w-10 text-slate-200 mb-1 ml-auto" />
                                <span className="text-xs text-slate-400">Gerado: {new Date().toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div 
                            className="flex-1 prose prose-slate max-w-none 
                            prose-h2:text-2xl prose-h2:font-bold prose-h2:text-purple-700 prose-h2:border-b-2 prose-h2:border-purple-100 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
                            prose-ul:list-disc prose-li:marker:text-purple-500 prose-p:text-justify prose-p:leading-relaxed
                            prose-table:w-full prose-table:text-sm prose-table:border-collapse prose-table:my-4
                            prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left prose-th:font-bold
                            prose-td:p-2 prose-td:border prose-td:border-slate-200"
                            dangerouslySetInnerHTML={{ __html: analysisResult }} 
                        />

                        <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400 text-xs">
                            <p>Plataforma VOLL IA - Gestão de Qualidade</p>
                            <p>Confidencial</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
