
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from '../services/studentService';
import { saveEvolution, fetchEvolutionsByStudent, deleteEvolution, fetchStudioEvolutions, saveEvolutionReport, fetchEvolutionReports, deleteEvolutionReport } from '../services/evolutionService';
import { generateEvolutionReport } from '../services/geminiService';
import { Student, StudentEvolution, SavedEvolutionReport } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TrendingUp, User, Save, Calendar, CheckCircle2, AlertTriangle, History, ChevronRight, Search, Trash2, Eye, X, FileText, ClipboardList, Filter, Sparkles, Download, BarChart2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const StudentEvolutionPage: React.FC = () => {
  const { user } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'entry' | 'analytics'>('entry');

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [evolutions, setEvolutions] = useState<StudentEvolution[]>([]); // Current view evolutions
  const [allStudioEvolutions, setAllStudioEvolutions] = useState<StudentEvolution[]>([]); // For analytics
  const [savedReports, setSavedReports] = useState<SavedEvolutionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Form State (Individual Entry)
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
        // Load global data for analytics
        const allEvolutions = await fetchStudioEvolutions(targetId);
        setAllStudioEvolutions(allEvolutions);
        const reports = await fetchEvolutionReports(targetId);
        setSavedReports(reports);
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

  // --- ANALYTICS LOGIC ---

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
        alert("Relatório salvo!");
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

  // --- RENDER ---

  const renderStudentSelection = () => {
    const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando alunos...</div>
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
            <TrendingUp className="text-brand-600 w-8 h-8" /> Evolução do Aluno
          </h1>
          <p className="text-slate-500">Acompanhamento de progresso e relatórios.</p>
        </div>
        
        {/* TABS */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
                onClick={() => { setActiveTab('entry'); setSelectedStudent(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'entry' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
            >
                Nova Avaliação
            </button>
            <button 
                onClick={() => { setActiveTab('analytics'); setSelectedStudent(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}
            >
                Relatórios & Análise
            </button>
        </div>
      </div>

      {/* --- TAB 1: ENTRY (Existing Flow) --- */}
      {activeTab === 'entry' && (
        <>
            {!selectedStudent ? renderStudentSelection() : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Header for selected student */}
                    <div className="lg:col-span-3 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <Button variant="outline" onClick={() => setSelectedStudent(null)}>Voltar</Button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                            <p className="text-slate-500 text-sm">Registro Individual</p>
                        </div>
                    </div>

                    {/* Form Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Avaliação da Aula</h2>
                                <div className="w-40"><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mb-0" /></div>
                            </div>

                            {/* Metrics */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide">1. Execução</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Stability */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Estabilidade</label>
                                        <select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.stability} onChange={e => setFormData({...formData, stability: e.target.value})}>
                                            {STABILITY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    {/* Mobility */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Mobilidade</label>
                                        <select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.mobility} onChange={e => setFormData({...formData, mobility: e.target.value})}>
                                            {MOBILITY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    {/* Strength */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Força</label>
                                        <select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})}>
                                            {STRENGTH_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    {/* Coordination */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Coordenação</label>
                                        <select className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={formData.coordination} onChange={e => setFormData({...formData, coordination: e.target.value})}>
                                            {COORDINATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Complaints */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide">2. Queixas e Cuidados</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <label className="w-32 text-sm font-medium">Dor?</label>
                                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={!formData.pain} onChange={() => setFormData({...formData, pain: false, painLocation: ''})} /> Não</label>
                                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={formData.pain} onChange={() => setFormData({...formData, pain: true})} /> Sim</label>
                                        {formData.pain && <input placeholder="Onde?" className="flex-1 p-1 text-sm border rounded" value={formData.painLocation} onChange={e => setFormData({...formData, painLocation: e.target.value})} />}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="w-32 text-sm font-medium">Limitação?</label>
                                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={!formData.limitation} onChange={() => setFormData({...formData, limitation: false, limitationDetails: ''})} /> Não</label>
                                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={formData.limitation} onChange={() => setFormData({...formData, limitation: true})} /> Sim</label>
                                        {formData.limitation && <input placeholder="Qual?" className="flex-1 p-1 text-sm border rounded" value={formData.limitationDetails} onChange={e => setFormData({...formData, limitationDetails: e.target.value})} />}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="w-32 text-sm font-medium">Contraindicação?</label>
                                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={!formData.contraindication} onChange={() => setFormData({...formData, contraindication: false, contraindicationDetails: ''})} /> Não</label>
                                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={formData.contraindication} onChange={() => setFormData({...formData, contraindication: true})} /> Sim</label>
                                        {formData.contraindication && <input placeholder="Detalhes..." className="flex-1 p-1 text-sm border rounded" value={formData.contraindicationDetails} onChange={e => setFormData({...formData, contraindicationDetails: e.target.value})} />}
                                    </div>
                                </div>
                            </div>

                            {/* Observations */}
                            <div>
                                <h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide mb-2">3. Observações</h3>
                                <textarea 
                                    className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24"
                                    value={formData.observations}
                                    onChange={e => setFormData({...formData, observations: e.target.value})}
                                />
                            </div>

                            <Button type="submit" isLoading={isSubmitting} className="w-full">Salvar Avaliação</Button>
                        </form>
                    </div>

                    {/* History Column */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-500" /> Histórico Recente
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
                                            {evo.pain && <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded">Dor</span>}
                                            {evo.limitation && <span className="text-[10px] bg-orange-100 text-orange-800 px-1 rounded">Limit.</span>}
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

      {/* --- TAB 2: ANALYTICS (New) --- */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in">
            
            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filtros de Análise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterStudentName} onChange={e => setFilterStudentName(e.target.value)}>
                        <option value="">Todos Alunos</option>
                        {getUniqueStudents().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterInstructorName} onChange={e => setFilterInstructorName(e.target.value)}>
                        <option value="">Todos Instrutores</option>
                        {getUniqueInstructors().map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <input type="date" className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} placeholder="Data Início" />
                    <input type="date" className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} placeholder="Data Fim" />
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-slate-500">Exibindo {filteredAnalyticsEvolutions.length} avaliações.</p>
                    <Button onClick={handleGenerateReport} isLoading={isGeneratingReport} className="bg-purple-600 hover:bg-purple-700">
                        <Sparkles className="w-4 h-4 mr-2" /> Gerar Relatório de Evolução IA
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Aluno</th>
                                <th className="p-4">Instrutor</th>
                                <th className="p-4">Métricas (E/M/F/C)</th>
                                <th className="p-4">Alertas</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredAnalyticsEvolutions.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum dado encontrado para os filtros selecionados.</td></tr>
                            ) : (
                                filteredAnalyticsEvolutions.map(evo => (
                                    <tr key={evo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4">{new Date(evo.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-medium">{evo.studentName}</td>
                                        <td className="p-4 text-slate-500">{evo.instructorName}</td>
                                        <td className="p-4 text-xs">
                                            <span className="block">E: {evo.stability}</span>
                                            <span className="block">M: {evo.mobility}</span>
                                            <span className="block">F: {evo.strength}</span>
                                            <span className="block">C: {evo.coordination}</span>
                                        </td>
                                        <td className="p-4">
                                            {evo.pain && <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded mr-1">Dor</span>}
                                            {evo.limitation && <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded mr-1">Limit</span>}
                                            {evo.contraindication && <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">Atenção</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleView(evo)} className="p-1 hover:text-brand-600"><Eye className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Saved Reports List */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Relatórios Salvos</h3>
                {savedReports.length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhum relatório salvo.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedReports.map(report => (
                            <div key={report.id} className="border border-slate-200 dark:border-slate-700 p-4 rounded-lg hover:border-brand-300 transition-colors">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-brand-700 dark:text-brand-400">{report.title}</h4>
                                    <button onClick={() => handleDeleteReport(report.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{new Date(report.createdAt).toLocaleDateString()} • {report.filterDescription}</p>
                                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setReportResult(report.content); setShowReportModal(true); }}>
                                    Visualizar
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModalOpen && viewEvolutionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
                <button onClick={() => setViewModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                <h2 className="text-xl font-bold mb-4">Detalhes da Evolução</h2>
                <div className="space-y-4 text-sm">
                    <p><strong>Aluno:</strong> {viewEvolutionData.studentName}</p>
                    <p><strong>Data:</strong> {new Date(viewEvolutionData.date).toLocaleDateString()}</p>
                    <p><strong>Instrutor:</strong> {viewEvolutionData.instructorName}</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                        <h4 className="font-bold text-brand-700 dark:text-brand-400 mb-2">1. Execução</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <p><strong>Estabilidade:</strong> {viewEvolutionData.stability}</p>
                            <p><strong>Mobilidade:</strong> {viewEvolutionData.mobility}</p>
                            <p><strong>Força:</strong> {viewEvolutionData.strength}</p>
                            <p><strong>Coordenação:</strong> {viewEvolutionData.coordination}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                        <h4 className="font-bold text-brand-700 dark:text-brand-400 mb-2">2. Queixas e Cuidados</h4>
                        {viewEvolutionData.pain ? (
                            <p className="text-red-600 mb-1"><strong>Dor:</strong> Sim - {viewEvolutionData.painLocation}</p>
                        ) : (
                            <p className="text-green-600 mb-1"><strong>Dor:</strong> Não</p>
                        )}
                        
                        {viewEvolutionData.limitation ? (
                            <p className="text-orange-600 mb-1"><strong>Limitação:</strong> Sim - {viewEvolutionData.limitationDetails}</p>
                        ) : (
                            <p className="text-green-600 mb-1"><strong>Limitação:</strong> Não</p>
                        )}

                        {viewEvolutionData.contraindication ? (
                            <p className="text-red-600 mb-1"><strong>Contraindicação:</strong> Sim - {viewEvolutionData.contraindicationDetails}</p>
                        ) : (
                            <p className="text-green-600 mb-1"><strong>Contraindicação:</strong> Não</p>
                        )}
                    </div>

                    {viewEvolutionData.observations && (
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                            <h4 className="font-bold text-brand-700 dark:text-brand-400 mb-2">3. Observações</h4>
                            <p className="text-slate-600 dark:text-slate-300 italic">{viewEvolutionData.observations}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && reportResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <h3 className="font-bold text-lg flex items-center gap-2"><BarChart2 className="w-5 h-5 text-brand-600"/> Relatório de Evolução</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadPDF('report-content', 'Relatorio_Evolucao')}>
                            <Download className="w-4 h-4 mr-2"/> PDF
                        </Button>
                        {!savedReports.find(r => r.content === reportResult) && (
                            <Button size="sm" onClick={handleSaveReport} isLoading={isSavingReport}>
                                <Save className="w-4 h-4 mr-2"/> Salvar
                            </Button>
                        )}
                        <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-200 rounded text-slate-500"><X className="w-5 h-5"/></button>
                    </div>
                </div>
                <div className="overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900">
                    <div id="report-content" className="bg-white p-12 shadow-lg max-w-3xl mx-auto min-h-[600px] text-slate-800">
                        <div className="border-b-2 border-brand-500 pb-4 mb-6">
                            <h1 className="text-3xl font-bold text-slate-900">Relatório de Evolução</h1>
                            <p className="text-slate-500 mt-2">Análise baseada em {filteredAnalyticsEvolutions.length} registros.</p>
                            <p className="text-xs text-slate-400 mt-1">Gerado em: {new Date().toLocaleDateString()}</p>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: reportResult }} className="prose prose-slate max-w-none" />
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
