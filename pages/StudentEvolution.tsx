import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from '../services/studentService';
import { fetchInstructors } from '../services/instructorService';
import { saveEvolution, fetchEvolutionsByStudent, fetchStudioEvolutions, saveEvolutionReport, fetchEvolutionReports, deleteEvolutionReport } from '../services/evolutionService';
import { generateEvolutionReport } from '../services/geminiService';
import { recordGenerationUsage } from '../services/contentService';
import { StudentEvolution, Student, Instructor, SavedEvolutionReport } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TrendingUp, Plus, History, Search, FileText, BarChart2, Save, Download, Trash2, X, RefreshCw, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const StudentEvolutionPage: React.FC = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'new' | 'analytics'>('new');
  
  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  
  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [evolutionData, setEvolutionData] = useState({
      date: new Date().toISOString().split('T')[0],
      stability: 'Bom',
      mobility: 'Bom',
      strength: 'Bom',
      coordination: 'Bom',
      pain: false,
      painLocation: '',
      limitation: false,
      limitationDetails: '',
      contraindication: false,
      contraindicationDetails: '',
      observations: ''
  });
  const [evaluatorId, setEvaluatorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Analytics State
  const [analyticsEvolutions, setAnalyticsEvolutions] = useState<StudentEvolution[]>([]);
  const [filteredAnalyticsEvolutions, setFilteredAnalyticsEvolutions] = useState<StudentEvolution[]>([]);
  const [analyticsStudentId, setAnalyticsStudentId] = useState('');
  const [analyticsInstructorId, setAnalyticsInstructorId] = useState('');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [savedReports, setSavedReports] = useState<SavedEvolutionReport[]>([]);
  const [showSavedReports, setShowSavedReports] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    if (targetId) {
        const [s, i, allEvols, reports] = await Promise.all([
            fetchStudents(targetId),
            fetchInstructors(targetId),
            fetchStudioEvolutions(targetId),
            fetchEvolutionReports(targetId)
        ]);
        setStudents(s);
        setInstructors(i);
        setAnalyticsEvolutions(allEvols);
        setSavedReports(reports);

        // Auto-set evaluator
        if (user?.isInstructor) {
            setEvaluatorId(user.dbId || user.id);
        } else if (user?.isOwner) {
            setEvaluatorId(user.id);
        }
    }
  };

  const handleSaveEvolution = async () => {
      if (!user || !selectedStudentId) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (!targetId) return;

      setIsSubmitting(true);
      
      const student = students.find(s => s.id === selectedStudentId);
      
      // Determine evaluator name
      let evaluatorName = user.name;
      if (evaluatorId !== user.id) {
          const inst = instructors.find(i => i.id === evaluatorId);
          if (inst) evaluatorName = inst.name;
      }

      // Check if evaluator is owner or instructor for ID field
      const instructorIdVal = instructors.find(i => i.id === evaluatorId)?.id; // Only set if matches an instructor ID

      const result = await saveEvolution({
          studioId: targetId,
          studentId: selectedStudentId,
          studentName: student?.name || 'Aluno',
          instructorId: instructorIdVal,
          instructorName: evaluatorName,
          ...evolutionData
      });

      if (result.success) {
          alert("Evolução registrada!");
          // Reset form
          setEvolutionData({
              date: new Date().toISOString().split('T')[0],
              stability: 'Bom', mobility: 'Bom', strength: 'Bom', coordination: 'Bom',
              pain: false, painLocation: '', limitation: false, limitationDetails: '',
              contraindication: false, contraindicationDetails: '', observations: ''
          });
          setSelectedStudentId('');
          // Refresh analytics data
          const allEvols = await fetchStudioEvolutions(targetId);
          setAnalyticsEvolutions(allEvols);
      } else {
          alert("Erro: " + result.error);
      }
      setIsSubmitting(false);
  };

  // Filter Logic
  useEffect(() => {
      let filtered = analyticsEvolutions;
      if (analyticsStudentId) filtered = filtered.filter(e => e.studentId === analyticsStudentId);
      if (analyticsInstructorId) filtered = filtered.filter(e => e.instructorId === analyticsInstructorId);
      if (analyticsStartDate) filtered = filtered.filter(e => new Date(e.date) >= new Date(analyticsStartDate));
      if (analyticsEndDate) filtered = filtered.filter(e => new Date(e.date) <= new Date(analyticsEndDate));
      setFilteredAnalyticsEvolutions(filtered);
  }, [analyticsEvolutions, analyticsStudentId, analyticsInstructorId, analyticsStartDate, analyticsEndDate]);

  const handleGenerateReport = async () => {
      if (filteredAnalyticsEvolutions.length === 0) {
          alert("Nenhum dado filtrado para gerar relatório.");
          return;
      }
      setIsGeneratingReport(true);
      
      const context = `Análise de ${filteredAnalyticsEvolutions.length} registros. 
      Aluno: ${analyticsStudentId ? students.find(s => s.id === analyticsStudentId)?.name : 'Vários'}. 
      Período: ${analyticsStartDate || 'Início'} a ${analyticsEndDate || 'Hoje'}.`;

      try {
        const html = await generateEvolutionReport(filteredAnalyticsEvolutions, context);
        setReportResult(html);
        setShowReportModal(true);
        
        // LOG USAGE
        const studioId = user?.isInstructor ? user.studioId : user?.id;
        if (studioId) await recordGenerationUsage(studioId, 'evaluation'); // Categorize as evaluation
      } catch (e) {
          alert("Erro ao gerar relatório.");
      }
      setIsGeneratingReport(false);
  };

  const handleSaveGeneratedReport = async () => {
      if (!user || !reportResult) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (!targetId) return;

      const title = `Relatório Evolutivo - ${new Date().toLocaleDateString()}`;
      const filterDesc = `${analyticsStudentId ? students.find(s => s.id === analyticsStudentId)?.name : 'Geral'} (${analyticsStartDate || 'Inicio'} - ${analyticsEndDate || 'Fim'})`;

      const res = await saveEvolutionReport(targetId, title, reportResult, filterDesc, filteredAnalyticsEvolutions.length);
      if (res.success) {
          alert("Relatório salvo!");
          // Refresh reports
          const reports = await fetchEvolutionReports(targetId);
          setSavedReports(reports);
      } else {
          alert("Erro ao salvar.");
      }
  };

  const downloadPDF = async () => {
      const element = document.getElementById('evolution-report-content');
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
          pdf.save('Relatorio_Evolutivo.pdf');
      } catch (e) {
          alert("Erro no PDF");
      }
  };

  // Prepare Chart Data
  const chartData = filteredAnalyticsEvolutions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => ({
        date: new Date(e.date).toLocaleDateString(),
        pain: e.pain ? 1 : 0, // Binary for simplicity, or could map text levels if available
        // Map qualitative to quantitative for charts
        stability: e.stability === 'Ótimo' ? 3 : e.stability === 'Bom' ? 2 : 1,
        mobility: e.mobility === 'Ótimo' ? 3 : e.mobility === 'Bom' ? 2 : 1,
        strength: e.strength === 'Ótimo' ? 3 : e.strength === 'Bom' ? 2 : 1
    }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <TrendingUp className="text-orange-600"/> Evolução do Aluno
            </h1>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button onClick={() => setActiveTab('new')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 shadow text-orange-600 dark:text-white' : 'text-slate-500'}`}>Novo Registro</button>
                <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-700 shadow text-orange-600 dark:text-white' : 'text-slate-500'}`}>Relatórios & Análise</button>
            </div>
        </div>

        {activeTab === 'new' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Aluno</label>
                        <select className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                            <option value="">Selecione...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Data</label>
                        <input type="date" className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950" value={evolutionData.date} onChange={e => setEvolutionData({...evolutionData, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Instrutor</label>
                        {user?.isInstructor ? (
                            <input value={user.name} disabled className="w-full p-2 border rounded-lg bg-slate-200 dark:bg-slate-800 cursor-not-allowed" />
                        ) : (
                            <select className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950" value={evaluatorId} onChange={e => setEvaluatorId(e.target.value)}>
                                <option value={user?.id}>{user?.name} (Eu)</option>
                                {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-white border-b pb-2">1. Execução do Movimento</h3>
                        {['stability', 'mobility', 'strength', 'coordination'].map((key) => (
                            <div key={key} className="flex items-center justify-between">
                                <span className="capitalize text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {key === 'stability' ? 'Estabilidade' : key === 'mobility' ? 'Mobilidade' : key === 'strength' ? 'Força' : 'Coordenação'}
                                </span>
                                <div className="flex gap-2">
                                    {['Ruim', 'Regular', 'Bom', 'Ótimo'].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setEvolutionData({...evolutionData, [key]: val})}
                                            className={`px-3 py-1 rounded text-xs border transition-colors ${evolutionData[key as keyof typeof evolutionData] === val ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700'}`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-white border-b pb-2">2. Queixas e Cuidados</h3>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={evolutionData.pain} onChange={e => setEvolutionData({...evolutionData, pain: e.target.checked})} /> Relatou Dor?</label>
                                {evolutionData.pain && <Input placeholder="Local da dor" value={evolutionData.painLocation} onChange={e => setEvolutionData({...evolutionData, painLocation: e.target.value})} />}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={evolutionData.limitation} onChange={e => setEvolutionData({...evolutionData, limitation: e.target.checked})} /> Apresentou Limitação?</label>
                                {evolutionData.limitation && <Input placeholder="Detalhes" value={evolutionData.limitationDetails} onChange={e => setEvolutionData({...evolutionData, limitationDetails: e.target.value})} />}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={evolutionData.contraindication} onChange={e => setEvolutionData({...evolutionData, contraindication: e.target.checked})} /> Alguma Contraindicação?</label>
                                {evolutionData.contraindication && <Input placeholder="Exercícios evitados" value={evolutionData.contraindicationDetails} onChange={e => setEvolutionData({...evolutionData, contraindicationDetails: e.target.value})} />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Observações Gerais</label>
                    <textarea 
                        className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 h-24"
                        placeholder="Evolução técnica, humor do aluno, etc..."
                        value={evolutionData.observations}
                        onChange={e => setEvolutionData({...evolutionData, observations: e.target.value})}
                    />
                </div>

                <Button onClick={handleSaveEvolution} isLoading={isSubmitting} className="w-full mt-6 bg-orange-600 hover:bg-orange-700">
                    Salvar Registro
                </Button>
            </div>
        )}

        {activeTab === 'analytics' && (
            <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase">Aluno</label>
                        <select className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={analyticsStudentId} onChange={e => setAnalyticsStudentId(e.target.value)}>
                            <option value="">Todos</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase">Período</label>
                        <div className="flex gap-2">
                            <input type="date" className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={analyticsStartDate} onChange={e => setAnalyticsStartDate(e.target.value)} />
                            <input type="date" className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={analyticsEndDate} onChange={e => setAnalyticsEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowSavedReports(true)}><History className="w-4 h-4 mr-2"/> Histórico</Button>
                        <Button onClick={handleGenerateReport} isLoading={isGeneratingReport} className="bg-purple-600 hover:bg-purple-700"><Wand2 className="w-4 h-4 mr-2"/> Gerar Relatório IA</Button>
                    </div>
                </div>

                {/* Charts */}
                {analyticsStudentId && filteredAnalyticsEvolutions.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Progresso Técnico (Últimos Registros)</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis domain={[0, 3]} ticks={[1, 2, 3]} tickFormatter={(val) => val === 1 ? 'Ruim' : val === 2 ? 'Reg' : 'Ótimo'} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="stability" name="Estabilidade" stroke="#f97316" strokeWidth={2} />
                                    <Line type="monotone" dataKey="strength" name="Força" stroke="#3b82f6" strokeWidth={2} />
                                    <Line type="monotone" dataKey="mobility" name="Mobilidade" stroke="#22c55e" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
                        Selecione um aluno para ver o gráfico de evolução.
                    </div>
                )}

                {/* List */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAnalyticsEvolutions.length === 0 ? <p className="p-8 text-center text-slate-500">Nenhum registro encontrado.</p> : 
                         filteredAnalyticsEvolutions.map(e => (
                            <div key={e.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-900 dark:text-white">{e.studentName}</span>
                                    <span className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs mb-2">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Estabilidade: {e.stability}</span>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Força: {e.strength}</span>
                                    {e.pain && <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Dor: {e.painLocation}</span>}
                                </div>
                                {e.observations && <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{e.observations}"</p>}
                            </div>
                         ))
                        }
                    </div>
                </div>
            </div>
        )}

        {/* REPORT MODAL */}
        {showReportModal && reportResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600"/> Relatório Evolutivo
                        </h3>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={downloadPDF}><Download className="w-4 h-4 mr-2"/> PDF</Button>
                            <Button size="sm" onClick={handleSaveGeneratedReport}><Save className="w-4 h-4 mr-2"/> Salvar</Button>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500"><X className="w-6 h-6"/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
                        <div id="evolution-report-content" className="bg-white p-12 shadow-lg max-w-3xl w-full min-h-[297mm]">
                            <div className="text-center border-b-2 border-orange-500 pb-6 mb-8">
                                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-widest">Relatório de Evolução</h1>
                                <p className="text-slate-500 mt-2">Acompanhamento Técnico e Clínico</p>
                            </div>
                            <div className="prose prose-slate max-w-none text-justify" dangerouslySetInnerHTML={{ __html: reportResult }} />
                            <div className="mt-12 pt-6 border-t text-center text-xs text-slate-400">
                                Gerado por Plataforma VOLL IA em {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* SAVED REPORTS MODAL */}
        {showSavedReports && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios Salvos</h3>
                        <button onClick={() => setShowSavedReports(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="space-y-4">
                        {savedReports.length === 0 ? <p className="text-center text-slate-500">Nenhum relatório salvo.</p> :
                         savedReports.map(r => (
                            <div key={r.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{r.title}</h4>
                                    <p className="text-xs text-slate-500">{r.filterDescription}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => { setReportResult(r.content); setShowReportModal(true); setShowSavedReports(false); }}>Abrir</Button>
                                    <button onClick={async () => { if(confirm('Excluir?')) { await deleteEvolutionReport(r.id); const updated = await fetchEvolutionReports(user!.studioId!); setSavedReports(updated); }}} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                         ))
                        }
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
