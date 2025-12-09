import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchEvaluationsByStudio, deleteEvaluation, saveEvaluationAnalysis, fetchEvaluationAnalyses, deleteEvaluationAnalysis } from '../services/evaluationService';
import { generateEvaluationAnalysis } from '../services/geminiService';
import { recordGenerationUsage } from '../services/contentService';
import { ClassEvaluation, SavedEvaluationAnalysis } from '../types';
import { Button } from '../components/ui/Button';
import { Star, TrendingUp, Filter, Download, Trash2, Calendar, User, RefreshCw, X, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const StudioEvaluations: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [evaluations, setEvaluations] = useState<ClassEvaluation[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<ClassEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('');

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // Reports History
  const [showReports, setShowReports] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedEvaluationAnalysis[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    if (targetId) {
        const data = await fetchEvaluationsByStudio(targetId);
        setEvaluations(data);
        setFilteredEvaluations(data);
        
        const reports = await fetchEvaluationAnalyses(targetId);
        setSavedReports(reports);
    }
    setLoading(false);
  };

  useEffect(() => {
    let filtered = evaluations;
    if (startDate) {
        filtered = filtered.filter(e => new Date(e.classDate) >= new Date(startDate));
    }
    if (endDate) {
        filtered = filtered.filter(e => new Date(e.classDate) <= new Date(endDate));
    }
    if (instructorFilter) {
        filtered = filtered.filter(e => e.instructorName === instructorFilter);
    }
    setFilteredEvaluations(filtered);
  }, [startDate, endDate, instructorFilter, evaluations]);

  const handleGenerateAnalysis = async () => {
    if (filteredEvaluations.length === 0) {
        alert("Nenhuma avaliação no filtro para analisar.");
        return;
    }
    setIsAnalyzing(true);
    const context = `Período: ${startDate || 'Início'} a ${endDate || 'Hoje'}. Total: ${filteredEvaluations.length}`;
    try {
        const html = await generateEvaluationAnalysis(filteredEvaluations, context);
        setAnalysisResult(html);
        setIsAnalyzing(false);
        setShowAnalysisModal(true);
        
        // LOG USAGE
        if (user?.id) await recordGenerationUsage(user.id, 'evaluation');
        
    } catch (e) {
        alert("Erro ao gerar análise.");
        setIsAnalyzing(false);
    }
  };

  const handleSaveReport = async () => {
      if (!user || !analysisResult) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (!targetId) return;

      const title = `Relatório de Qualidade - ${new Date().toLocaleDateString()}`;
      const dateRange = `${startDate || 'Início'} a ${endDate || 'Hoje'}`;
      
      const result = await saveEvaluationAnalysis(targetId, title, analysisResult, filteredEvaluations.length, dateRange);
      if (result.success) {
          alert("Relatório salvo!");
          loadData();
      } else {
          alert("Erro ao salvar: " + result.error);
      }
  };

  const handleDeleteEvaluation = async (id: string) => {
      if(confirm("Excluir esta avaliação?")) {
          await deleteEvaluation(id);
          loadData();
      }
  };

  const handleDeleteReport = async (id: string) => {
      if(confirm("Excluir relatório?")) {
          await deleteEvaluationAnalysis(id);
          loadData();
      }
  };

  const uniqueInstructors = Array.from(new Set(evaluations.map(e => e.instructorName))).sort();

  // Metrics
  const averageRating = filteredEvaluations.length > 0 
    ? (filteredEvaluations.reduce((acc, cur) => acc + cur.rating, 0) / filteredEvaluations.length).toFixed(1) 
    : '0.0';

  const chartData = [1,2,3,4,5].map(star => ({
      name: `${star} Estrelas`,
      count: filteredEvaluations.filter(e => e.rating === star).length
  }));

  const downloadPDF = async () => {
      const element = document.getElementById('quality-report');
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
          pdf.save('Relatorio_Qualidade.pdf');
      } catch (error) {
          alert('Erro ao gerar PDF.');
      }
  };

  if (showReports) {
      return (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{t('saved_reports')}</h2>
                  <Button variant="outline" onClick={() => setShowReports(false)}>Voltar</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedReports.map(report => (
                      <div key={report.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                          <h3 className="font-bold text-lg mb-1">{report.title}</h3>
                          <p className="text-xs text-slate-500 mb-4">{report.dateRange} • {report.evaluationCount} avaliações</p>
                          <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3 rounded text-xs mb-4 overflow-y-auto max-h-32">
                              <div dangerouslySetInnerHTML={{ __html: report.content }} />
                          </div>
                          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                              <button onClick={() => { setAnalysisResult(report.content); setShowAnalysisModal(true); }} className="text-brand-600 hover:underline text-sm mr-4">Ver Completo</button>
                              <button onClick={() => handleDeleteReport(report.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                          </div>
                      </div>
                  ))}
                  {savedReports.length === 0 && <p className="col-span-3 text-center p-8 text-slate-500">Nenhum relatório salvo.</p>}
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Star className="text-yellow-500 fill-yellow-500"/> {t('evaluations_title')}
            </h1>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReports(true)}><FileText className="w-4 h-4 mr-2"/> {t('saved_reports')}</Button>
                <Button onClick={handleGenerateAnalysis} isLoading={isAnalyzing} className="bg-brand-600 hover:bg-brand-700">
                    <RefreshCw className="w-4 h-4 mr-2"/> {t('generate_analysis')}
                </Button>
            </div>
        </div>

        {/* METRICS & FILTERS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">{averageRating}</span>
                <div className="flex gap-1 my-2">
                    {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${parseFloat(averageRating) >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                    ))}
                </div>
                <p className="text-xs text-slate-500">{filteredEvaluations.length} avaliações</p>
            </div>

            <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase mb-4">
                    <Filter className="w-4 h-4"/> {t('filters')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)}>
                        <option value="">Todos Instrutores</option>
                        {uniqueInstructors.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <input type="date" className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <input type="date" className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>
        </div>

        {/* LIST */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300">
                {t('evaluations_list')}
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEvaluations.length === 0 ? <p className="p-12 text-center text-slate-500">Nenhuma avaliação encontrada.</p> :
                 filteredEvaluations.map(e => (
                    <div key={e.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-900 dark:text-white">{e.studentName}</span>
                                <span className="text-xs text-slate-400">• {new Date(e.classDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                                <User className="w-3 h-3"/> Instrutor: {e.instructorName}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">{e.feeling}</span>
                                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100">{e.pace}</span>
                                {e.discomfort && <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100">Desconforto: {e.discomfort}</span>}
                            </div>
                            {e.suggestions && <p className="mt-2 text-sm text-slate-600 italic">"{e.suggestions}"</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-4 h-4 ${e.rating >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                ))}
                            </div>
                            <button onClick={() => handleDeleteEvaluation(e.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                 ))
                }
            </div>
        </div>

        {/* ANALYSIS MODAL */}
        {showAnalysisModal && analysisResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-brand-600"/> {t('quality_report')}
                        </h3>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={downloadPDF}><Download className="w-4 h-4 mr-2"/> PDF</Button>
                            <Button size="sm" onClick={handleSaveReport}><Save className="w-4 h-4 mr-2"/> Salvar</Button>
                            <button onClick={() => setShowAnalysisModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500"><X className="w-6 h-6"/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
                        <div id="quality-report" className="bg-white p-12 shadow-lg max-w-3xl w-full min-h-[297mm]">
                            <div className="text-center border-b-2 border-brand-600 pb-6 mb-8">
                                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-widest">Relatório de Qualidade</h1>
                                <p className="text-slate-500 mt-2">Análise de Satisfação e Desempenho</p>
                            </div>
                            
                            {/* Charts in Report */}
                            <div className="h-64 w-full mb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="prose prose-slate max-w-none text-justify" dangerouslySetInnerHTML={{ __html: analysisResult }} />
                            
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
