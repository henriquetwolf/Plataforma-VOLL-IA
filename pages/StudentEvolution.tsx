
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchStudents } from '../services/studentService';
import { saveEvolution, fetchEvolutionsByStudent, deleteEvolution, fetchStudioEvolutions, saveEvolutionReport, fetchEvolutionReports, deleteEvolutionReport } from '../services/evolutionService';
import { generateEvolutionReport } from '../services/geminiService';
import { Student, StudentEvolution, SavedEvolutionReport } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TrendingUp, User, Save, Calendar, CheckCircle2, AlertTriangle, History, ChevronRight, Search, Trash2, Eye, X, FileText, ClipboardList, Filter, Sparkles, Download, BarChart2, Building2 } from 'lucide-react';
import { fetchProfile } from '../services/storage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const StudentEvolutionPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'entry' | 'analytics'>('entry');

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [evolutions, setEvolutions] = useState<StudentEvolution[]>([]); 
  const [allStudioEvolutions, setAllStudioEvolutions] = useState<StudentEvolution[]>([]);
  const [savedReports, setSavedReports] = useState<SavedEvolutionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [studioName, setStudioName] = useState('');

  // View Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewEvolutionData, setViewEvolutionData] = useState<StudentEvolution | null>(null);

  // Analytics Filters
  const [filterStudentName, setFilterStudentName] = useState('');
  const [filterInstructorName, setFilterInstructorName] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // AI Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    stability: 'Boa',
    mobility: 'Boa',
    strength: 'Adequada',
    coordination: 'Boa',
    pain: false,
    painLocation: '',
    limitation: false,
    limitationDetails: '',
    contraindication: false,
    contraindicationDetails: '',
    observations: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Constants
  const STABILITY_OPTS = ['Excelente', 'Boa', 'Regular', 'Comprometida'];
  const MOBILITY_OPTS = ['Excelente', 'Boa', 'Regular', 'Restrita'];
  const STRENGTH_OPTS = ['Acima da média', 'Adequada', 'Em desenvolvimento', 'Baixa'];
  const COORDINATION_OPTS = ['Excelente', 'Boa', 'Regular', 'Insuficiente'];

  useEffect(() => {
    const loadData = async () => {
      const targetId = user?.isInstructor ? user.studioId : user?.id;
      if (targetId) {
        const studentsData = await fetchStudents(targetId);
        setStudents(studentsData);
        // Load global data
        const allEvolutions = await fetchStudioEvolutions(targetId);
        setAllStudioEvolutions(allEvolutions);
        const reports = await fetchEvolutionReports(targetId);
        setSavedReports(reports);
        const profile = await fetchProfile(targetId);
        if(profile) setStudioName(profile.studioName);
      }
      setLoading(false);
    };
    loadData();
  }, [user, activeTab]);

  useEffect(() => {
    const loadHistory = async () => {
      if (selectedStudent) {
        const history = await fetchEvolutionsByStudent(selectedStudent.id);
        setEvolutions(history);
      }
    };
    if (selectedStudent) loadHistory();
  }, [selectedStudent]);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudent) return;

    const studioId = user.isInstructor ? user.studioId : user.id;
    const instructorId = user.dbId || null;
    const instructorName = user.name;

    if (!studioId) return;

    setIsSubmitting(true);
    const result = await saveEvolution({
      studioId,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      instructorId: instructorId || undefined,
      instructorName,
      ...formData
    });

    if (result.success) {
      alert("Avaliação salva com sucesso!");
      setFormData(prev => ({
        ...prev,
        pain: false, painLocation: '', limitation: false, limitationDetails: '', contraindication: false, contraindicationDetails: '', observations: ''
      }));
      const history = await fetchEvolutionsByStudent(selectedStudent.id);
      setEvolutions(history);
    } else {
      alert("Erro ao salvar: " + result.error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta avaliação permanentemente?")) {
      const result = await deleteEvolution(id);
      if (result.success) {
        setEvolutions(prev => prev.filter(e => e.id !== id));
        setAllStudioEvolutions(prev => prev.filter(e => e.id !== id));
      } else {
        alert(`Erro ao excluir: ${result.error}`);
      }
    }
  };

  const handleView = (evolution: StudentEvolution) => {
    setViewEvolutionData(evolution);
    setViewModalOpen(true);
  };

  const getUniqueInstructors = () => Array.from(new Set(allStudioEvolutions.map(e => e.instructorName || 'Desconhecido'))).sort();
  const getUniqueStudents = () => Array.from(new Set(allStudioEvolutions.map(e => e.studentName || 'Desconhecido'))).sort();

  const filteredAnalyticsEvolutions = allStudioEvolutions.filter(e => {
    const matchStudent = !filterStudentName || e.studentName === filterStudentName;
    const matchInstructor = !filterInstructorName || e.instructorName === filterInstructorName;
    
    let matchDate = true;
    const evalDate = new Date(e.date);
    if (filterStartDate) {
        matchDate = matchDate && evalDate >= new Date(filterStartDate);
    }
    if (filterEndDate) {
        matchDate = matchDate && evalDate <= new Date(filterEndDate);
    }

    return matchStudent && matchInstructor && matchDate;
  });

  const handleGenerateReport = async () => {
    if (filteredAnalyticsEvolutions.length === 0) {
        alert("Não há evoluções filtradas para gerar relatório.");
        return;
    }
    setIsGeneratingReport(true);
    const context = `Aluno: ${filterStudentName || 'Todos'}, Instrutor: ${filterInstructorName || 'Todos'}, Período: ${filterStartDate || 'Início'} a ${filterEndDate || 'Fim'}`;
    
    const html = await generateEvolutionReport(filteredAnalyticsEvolutions, context);
    setReportResult(html);
    setIsGeneratingReport(false);
    setShowReportModal(true);
  };

  const handleSaveReport = async () => {
    if (!user?.id || !reportResult) return;
    const studioId = user.isInstructor ? user.studioId : user.id;
    if (!studioId) return;

    const title = prompt("Nome para este relatório:", `Relatório Evolução - ${new Date().toLocaleDateString()}`);
    if (!title) return;

    setIsSavingReport(true);
    const filterDesc = `${filterStudentName || 'Geral'} | ${filterInstructorName || 'Todos Instr.'}`;
    
    const result = await saveEvolutionReport(studioId, title, reportResult, filterDesc, filteredAnalyticsEvolutions.length);
    if (result.success) {
        alert(t('save') + " com sucesso!");
        const updated = await fetchEvolutionReports(studioId);
        setSavedReports(updated);
        setShowReportModal(false);
    } else {
        alert("Erro ao salvar: " + result.error);
    }
    setIsSavingReport(false);
  };

  const handleDeleteReport = async (id: string) => {
      if(confirm("Excluir este relatório?")) {
          await deleteEvolutionReport(id);
          setSavedReports(prev => prev.filter(r => r.id !== id));
      }
  }

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

  const renderStudentSelection = () => {
    const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder={t('search')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">{t('loading')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <button 
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-400 hover:shadow-md transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                    <p className="text-xs text-slate-500">Selecionar</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-brand-600 w-8 h-8" /> {t('evolution_title')}
          </h1>
          <p className="text-slate-500">{t('evolution_subtitle')}</p>
        </div>
        
        {/* TABS */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
                onClick={() => { setActiveTab('entry'); setSelectedStudent(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'entry' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
            >
                {t('new_entry')}
            </button>
            <button 
                onClick={() => { setActiveTab('analytics'); setSelectedStudent(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
            >
                {t('reports_analysis')}
            </button>
        </div>
      </div>

      {/* --- TAB 1: ENTRY --- */}
      {activeTab === 'entry' && (
        <>
            {!selectedStudent ? renderStudentSelection() : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Header for selected student */}
                    <div className="lg:col-span-3 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <Button variant="outline" onClick={() => setSelectedStudent(null)}>{t('back')}</Button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                            <p className="text-slate-500 text-sm">{t('individual_record')}</p>
                        </div>
                    </div>

                    {/* Form Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                            {/* ... (Existing form content kept as is for brevity) ... */}
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('new_entry')}</h2>
                                <div className="w-40"><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mb-0" /></div>
                            </div>
                            {/* Metrics */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide">1. {t('execution')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-sm font-medium mb-1">{t('stability')}</label><select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.stability} onChange={e => setFormData({...formData, stability: e.target.value})}>{STABILITY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium mb-1">{t('mobility')}</label><select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.mobility} onChange={e => setFormData({...formData, mobility: e.target.value})}>{MOBILITY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium mb-1">{t('strength')}</label><select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})}>{STRENGTH_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium mb-1">{t('coordination')}</label><select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.coordination} onChange={e => setFormData({...formData, coordination: e.target.value})}>{COORDINATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                                </div>
                            </div>
                            {/* Complaints */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide">2. {t('complaints_care')}</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4"><label className="w-32 text-sm font-medium">{t('pain')}?</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={!formData.pain} onChange={() => setFormData({...formData, pain: false, painLocation: ''})} /> Não</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={formData.pain} onChange={() => setFormData({...formData, pain: true})} /> Sim</label>{formData.pain && <input placeholder="Onde?" className="flex-1 p-1 text-sm border rounded" value={formData.painLocation} onChange={e => setFormData({...formData, painLocation: e.target.value})} />}</div>
                                    <div className="flex items-center gap-4"><label className="w-32 text-sm font-medium">{t('limitation')}?</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={!formData.limitation} onChange={() => setFormData({...formData, limitation: false, limitationDetails: ''})} /> Não</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={formData.limitation} onChange={() => setFormData({...formData, limitation: true})} /> Sim</label>{formData.limitation && <input placeholder="Qual?" className="flex-1 p-1 text-sm border rounded" value={formData.limitationDetails} onChange={e => setFormData({...formData, limitationDetails: e.target.value})} />}</div>
                                    <div className="flex items-center gap-4"><label className="w-32 text-sm font-medium">{t('contraindication')}?</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={!formData.contraindication} onChange={() => setFormData({...formData, contraindication: false, contraindicationDetails: ''})} /> Não</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={formData.contraindication} onChange={() => setFormData({...formData, contraindication: true})} /> Sim</label>{formData.contraindication && <input placeholder="Detalhes..." className="flex-1 p-1 text-sm border rounded" value={formData.contraindicationDetails} onChange={e => setFormData({...formData, contraindicationDetails: e.target.value})} />}</div>
                                </div>
                            </div>
                            {/* Observations */}
                            <div><h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide mb-2">3. {t('observations_label')}</h3><textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} /></div>
                            <Button type="submit" isLoading={isSubmitting} className="w-full">{t('save_evaluation')}</Button>
                        </form>
                    </div>

                    {/* History Column */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-500" /> {t('recent_history')}
                            </h3>
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {evolutions.map(evo => (
                                    <div key={evo.id} className="text-sm border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold">{new Date(evo.date).toLocaleDateString()}</p>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleView(evo)} className="p-1 hover:text-brand-600"><Eye className="w-4 h-4"/></button>
                                                <button onClick={() => handleDelete(evo.id)} className="p-1 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-1">{evo.instructorName}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {evo.pain && <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded">{t('pain')}</span>}
                                            {evo.limitation && <span className="text-[10px] bg-orange-100 text-orange-800 px-1 rounded">{t('limitation')}</span>}
                                        </div>
                                    </div>
                                ))}
                                {evolutions.length === 0 && <p className="text-sm text-slate-500">Sem histórico.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* --- TAB 2: ANALYTICS --- */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in">
            {/* Filters Bar (Existing) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Filter className="w-4 h-4" /> {t('evolution_filters')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterStudentName} onChange={e => setFilterStudentName(e.target.value)}><option value="">{t('all_students')}</option>{getUniqueStudents().map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterInstructorName} onChange={e => setFilterInstructorName(e.target.value)}><option value="">{t('all_instructors')}</option>{getUniqueInstructors().map(i => <option key={i} value={i}>{i}</option>)}</select>
                    <input type="date" className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} placeholder="Data Início" />
                    <input type="date" className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} placeholder="Data Fim" />
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-slate-500">Exibindo {filteredAnalyticsEvolutions.length} avaliações.</p>
                    <Button onClick={handleGenerateReport} isLoading={isGeneratingReport} className="bg-purple-600 hover:bg-purple-700"><Sparkles className="w-4 h-4 mr-2" /> {t('generate_evolution_report')}</Button>
                </div>
            </div>

            {/* Saved Reports List (Existing) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">{t('saved_reports')}</h3>
                {savedReports.length === 0 ? <p className="text-slate-500 text-sm">Nenhum relatório salvo.</p> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{savedReports.map(report => <div key={report.id} className="border border-slate-200 dark:border-slate-700 p-4 rounded-lg hover:border-brand-300 transition-colors"><div className="flex justify-between items-start"><h4 className="font-bold text-brand-700 dark:text-brand-400">{report.title}</h4><button onClick={() => handleDeleteReport(report.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div><p className="text-xs text-slate-500 mt-1">{new Date(report.createdAt).toLocaleDateString()} • {report.filterDescription}</p><Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setReportResult(report.content); setShowReportModal(true); }}>Visualizar</Button></div>)}</div>}
            </div>
        </div>
      )}

      {/* VIEW MODAL (Individual Entry) */}
      {viewModalOpen && viewEvolutionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
                <button onClick={() => setViewModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                <h2 className="text-xl font-bold mb-4">Detalhes da Evolução</h2>
                {/* ... (keep existing view details content) ... */}
                <div className="space-y-4 text-sm">
                    <p><strong>Aluno:</strong> {viewEvolutionData.studentName}</p>
                    <p><strong>Data:</strong> {new Date(viewEvolutionData.date).toLocaleDateString()}</p>
                    <p><strong>Instrutor:</strong> {viewEvolutionData.instructorName}</p>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded"><h4 className="font-bold text-brand-700 dark:text-brand-400 mb-2">1. Execução</h4><div className="grid grid-cols-2 gap-2"><p><strong>Estabilidade:</strong> {viewEvolutionData.stability}</p><p><strong>Mobilidade:</strong> {viewEvolutionData.mobility}</p><p><strong>Força:</strong> {viewEvolutionData.strength}</p><p><strong>Coordenação:</strong> {viewEvolutionData.coordination}</p></div></div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded"><h4 className="font-bold text-brand-700 dark:text-brand-400 mb-2">2. Queixas</h4>{viewEvolutionData.pain ? <p className="text-red-600 mb-1"><strong>Dor:</strong> Sim - {viewEvolutionData.painLocation}</p> : <p className="text-green-600 mb-1"><strong>Dor:</strong> Não</p>}{viewEvolutionData.limitation ? <p className="text-orange-600 mb-1"><strong>Limitação:</strong> Sim - {viewEvolutionData.limitationDetails}</p> : <p className="text-green-600 mb-1"><strong>Limitação:</strong> Não</p>}</div>
                    {viewEvolutionData.observations && <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded"><h4 className="font-bold text-brand-700 dark:text-brand-400 mb-2">3. Observações</h4><p className="text-slate-600 dark:text-slate-300 italic">{viewEvolutionData.observations}</p></div>}
                </div>
            </div>
        </div>
      )}

      {/* REPORT MODAL (A4 Style) */}
      {showReportModal && reportResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <h3 className="font-bold text-lg flex items-center gap-2"><BarChart2 className="w-5 h-5 text-brand-600"/> Relatório de Evolução</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadPDF('evolution-report-content', 'Relatorio_Evolucao')}>
                            <Download className="w-4 h-4 mr-2"/> {t('download_pdf')}
                        </Button>
                        {!savedReports.find(r => r.content === reportResult) && (
                            <Button size="sm" onClick={handleSaveReport} isLoading={isSavingReport}>
                                <Save className="w-4 h-4 mr-2"/> {t('save')}
                            </Button>
                        )}
                        <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-200 rounded text-slate-500"><X className="w-5 h-5"/></button>
                    </div>
                </div>
                
                <div className="overflow-y-auto p-4 md:p-8 bg-slate-200 dark:bg-slate-950 flex justify-center">
                    {/* A4 Page Simulation */}
                    <div 
                        id="evolution-report-content" 
                        className="bg-white p-12 shadow-2xl max-w-[210mm] w-full min-h-[297mm] text-slate-800 flex flex-col"
                    >
                        {/* Report Header */}
                        <div className="flex justify-between items-start border-b-4 border-brand-500 pb-6 mb-8">
                            <div>
                                <div className="flex items-center gap-2 text-brand-600 mb-1 font-bold uppercase text-xs tracking-wider">
                                    <TrendingUp className="w-4 h-4" /> Acompanhamento Técnico
                                </div>
                                <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">Relatório de Evolução</h1>
                                <h2 className="text-lg text-slate-500 font-medium">{studioName}</h2>
                            </div>
                            <div className="text-right">
                                <Building2 className="h-10 w-10 text-slate-200 mb-1 ml-auto" />
                                <span className="text-xs text-slate-400">Data: {new Date().toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div 
                            className="flex-1 prose prose-slate max-w-none 
                            prose-h2:text-2xl prose-h2:font-bold prose-h2:text-brand-700 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
                            prose-ul:list-disc prose-li:marker:text-brand-500 prose-p:text-justify prose-p:leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: reportResult }} 
                        />

                        {/* Footer */}
                        <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400 text-xs">
                            <p>Plataforma VOLL IA - Acompanhamento do Aluno</p>
                            <p>Uso Interno</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
