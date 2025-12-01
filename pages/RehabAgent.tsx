import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPathologyData, fetchLessonPlan, regenerateSingleExercise, handleGeminiError } from '../services/geminiService';
import { saveRehabLesson, fetchRehabLessons, deleteRehabLesson } from '../services/rehabService';
import { fetchStudents } from '../services/studentService';
import { PathologyResponse, LessonPlanResponse, LoadingState, SavedRehabLesson, LessonExercise, ChatMessage, Student } from '../types';
import { AssessmentModal } from '../components/rehab/AssessmentModal';
import { ResultCard, LessonPlanView } from '../components/rehab/RehabResults';
import { Button } from '../components/ui/Button';
import { Search, History, BookOpen, Activity, Loader2, ArrowLeft, Trash2, CheckCircle2, User, ChevronRight, Folder } from 'lucide-react';

const COMMON_SUGGESTIONS = [
  "Hérnia de Disco L5-S1", "Dor Lombar Crônica", "Ombro Rígido", "Condromalácia", "Cervicalgia", "Fascite Plantar"
];
const EQUIPMENTS = ["Mat (Solo)", "Reformer", "Cadillac", "Chair", "Barrel", "Acessórios"];

export const RehabAgent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'reference' | 'lesson'>('reference');
  const [query, setQuery] = useState('');
  const [savedLessons, setSavedLessons] = useState<SavedRehabLesson[]>([]);
  
  // Student Selection
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  // History Navigation State
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);

  const [refStatus, setRefStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refData, setRefData] = useState<PathologyResponse | null>(null);
  const [errorHtml, setErrorHtml] = useState<string | null>(null);
  const [lessonStatus, setLessonStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [lessonData, setLessonData] = useState<LessonPlanResponse | null>(null);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<ChatMessage[] | undefined>(undefined);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(["Mat (Solo)", "Reformer", "Cadillac", "Chair", "Barrel"]);

  useEffect(() => { 
    loadHistory();
    loadStudents();
  }, []);

  const loadHistory = async () => { const data = await fetchRehabLessons(); setSavedLessons(data); };
  const loadStudents = async () => { const data = await fetchStudents(); setStudents(data); };

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment(prev => prev.includes(eq) ? prev.filter(i => i !== eq) : [...prev, eq]);
  };

  const handleSearch = (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;
    
    if (!currentStudent) {
      alert("Por favor, selecione um aluno para iniciar a triagem.");
      return;
    }

    setQuery(q); setRefData(null); setLessonData(null); setRefStatus(LoadingState.IDLE); setLessonStatus(LoadingState.IDLE); setErrorHtml(null); setAssessmentHistory(undefined);
    setIsAssessmentOpen(true);
  };

  const handleAssessmentComplete = (history: ChatMessage[]) => {
    setAssessmentHistory(history); setIsAssessmentOpen(false); fetchReferenceData(query, history);
  };

  const fetchReferenceData = async (q: string, history?: ChatMessage[]) => {
    setRefStatus(LoadingState.LOADING);
    try {
      const data = await fetchPathologyData(q, selectedEquipment, history);
      if (data) { 
        setRefData(data); 
        setRefStatus(LoadingState.SUCCESS); 
      } else { 
        // Em vez de lançar erro manual, apenas define status de erro se realmente não vier dados
        throw new Error("Não foi possível obter dados. Tente novamente.");
      }
    } catch (err: any) {
      setRefStatus(LoadingState.ERROR); 
      setErrorHtml(handleGeminiError(err));
    }
  };

  const handleTabChange = async (tab: 'reference' | 'lesson') => {
    setActiveTab(tab);
    if (tab === 'lesson' && !lessonData && query && lessonStatus === LoadingState.IDLE) {
      setLessonStatus(LoadingState.LOADING);
      try {
        const obs = currentStudent?.observations || '';
        const data = await fetchLessonPlan(query, selectedEquipment, assessmentHistory, obs);
        if (data) { setLessonData(data); setLessonStatus(LoadingState.SUCCESS); }
      } catch (err: any) { setLessonStatus(LoadingState.ERROR); setErrorHtml(handleGeminiError(err)); }
    }
  };

  const handleSaveLesson = async (customName: string, patientName: string, updatedExercises: LessonExercise[], studentId?: string) => {
    if (!user?.id || !lessonData) return;
    const finalData = { ...lessonData, exercises: updatedExercises };
    const result = await saveRehabLesson(user.id, patientName, lessonData.pathologyName, finalData, studentId);
    if (result.success) { alert("Salvo!"); loadHistory(); } else { alert("Erro ao salvar."); }
  };

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const student = students.find(s => s.id === id) || null;
    setCurrentStudent(student);
  };

  const studentsWithLessons = Array.from(new Set(savedLessons.map(l => l.patientName))).sort();

  if (showHistory) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Histórico Clínico</h2>
            {selectedStudentFilter && (
              <>
                <ChevronRight className="w-5 h-5 text-slate-400" />
                <span className="text-xl text-brand-600 font-medium">{selectedStudentFilter}</span>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => {
            if (selectedStudentFilter) setSelectedStudentFilter(null);
            else setShowHistory(false);
          }}>
            <ArrowLeft className="w-4 h-4 mr-2"/> {selectedStudentFilter ? "Voltar para Alunos" : "Voltar para Início"}
          </Button>
        </div>

        {!selectedStudentFilter && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in">
            {studentsWithLessons.length === 0 ? (
              <p className="text-slate-500 col-span-3 text-center py-12">Nenhum plano salvo ainda.</p>
            ) : (
              studentsWithLessons.map(studentName => {
                const count = savedLessons.filter(l => l.patientName === studentName).length;
                return (
                  <button 
                    key={studentName}
                    onClick={() => setSelectedStudentFilter(studentName)}
                    className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 transition-colors">
                        <Folder className="w-6 h-6" />
                      </div>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded-full">
                        {count}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{studentName}</h3>
                    <p className="text-sm text-slate-500 mt-1">Ver planos salvos</p>
                  </button>
                );
              })
            )}
          </div>
        )}

        {selectedStudentFilter && (
          <div className="grid gap-4 animate-in fade-in slide-in-from-right-8">
            {savedLessons.filter(l => l.patientName === selectedStudentFilter).map(l => (
              <div key={l.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center hover:border-brand-300 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-brand-700 dark:text-brand-400">{l.pathologyName}</h3>
                  <p className="text-sm text-slate-500">Criado em: {new Date(l.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setLessonData(l); setQuery(l.pathologyName); setLessonStatus(LoadingState.SUCCESS); setActiveTab('lesson'); setShowHistory(false); setSelectedStudentFilter(null); }}>
                    Abrir Plano
                  </Button>
                  <button onClick={async () => { if(confirm("Apagar este plano?")) { await deleteRehabLesson(l.id); loadHistory(); } }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      {!refData && !lessonData && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center p-3 bg-brand-100 rounded-xl mb-4"><Activity className="h-8 w-8 text-brand-600"/></div>
          <h1 className="text-4xl font-bold mb-2">Pilates Rehab</h1>
          <p className="text-lg text-slate-500">GUIA CLÍNICO DE PATOLOGIAS</p>
          <div className="mt-8 mb-4"><h2 className="text-2xl font-bold">Consulta Clínica & Sintomas</h2></div>
        </div>
      )}

      {(refData || lessonData) && (
        <header className="flex justify-between items-center border-b pb-6">
          <div className="flex items-center gap-3"><Activity className="h-6 w-6 text-brand-600"/><div><h1 className="text-2xl font-bold">Pilates Rehab</h1></div></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => { setRefData(null); setLessonData(null); setQuery(''); }}>Nova Busca</Button><Button variant="outline" onClick={() => setShowHistory(true)}>Histórico</Button></div>
        </header>
      )}

      {(!refData && !lessonData) && (
        <div className="max-w-3xl mx-auto space-y-6">
          {errorHtml && <div dangerouslySetInnerHTML={{ __html: errorHtml }} />}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Selecione o Aluno (Obrigatório para Triagem)</label>
                <select 
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  onChange={handleStudentSelect}
                  value={currentStudent?.id || ''}
                >
                  <option value="">-- Selecione um aluno --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {currentStudent && currentStudent.observations && (
                  <div className="mt-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-2 rounded border border-yellow-100 dark:border-yellow-800">
                    <strong>Obs:</strong> {currentStudent.observations}
                  </div>
                )}
             </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"/>
            <input 
              className="w-full pl-12 pr-4 py-4 text-lg border rounded-xl outline-none focus:ring-2 focus:ring-brand-500" 
              placeholder="Queixa Principal (Ex: Hérnia de Disco, Dor no Ombro...)" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
            />
            <Button className="absolute right-2 top-2 bottom-2" onClick={() => handleSearch()}>Consultar</Button>
          </div>
          
          <div className="text-center"><p className="text-xs font-bold uppercase mb-3">Equipamentos Disponíveis:</p><div className="flex flex-wrap justify-center gap-2">{EQUIPMENTS.map(eq => (<button key={eq} onClick={() => toggleEquipment(eq)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selectedEquipment.includes(eq) ? 'bg-slate-800 text-white' : 'bg-transparent text-slate-500'}`}>{selectedEquipment.includes(eq) && <CheckCircle2 className="inline w-3 h-3 mr-1"/>}{eq}</button>))}</div></div>
          
          <div className="bg-slate-900 rounded-xl p-6 text-white cursor-pointer hover:bg-slate-800 transition-all" onClick={() => setShowHistory(true)}>
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/10 rounded-full"><Folder className="h-6 w-6 text-brand-400"/></div>
                <div><h3 className="font-bold text-lg mb-1">Aulas Salvas</h3><p className="text-sm text-slate-300">Acesse rapidamente os planos de reabilitação dos seus alunos.</p></div>
              </div>
              <ChevronRight className="text-slate-400" />
            </div>
          </div>

          <div><p className="text-xs font-bold uppercase mb-3">Sugestões Rápidas:</p><div className="flex flex-wrap gap-2">{COMMON_SUGGESTIONS.map(sug => (<button key={sug} onClick={() => handleSearch(sug)} className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-brand-50 transition-colors">{sug}</button>))}</div></div>
        </div>
      )}

      {(refStatus === LoadingState.ERROR || lessonStatus === LoadingState.ERROR) && errorHtml && (refData || lessonData) && <div dangerouslySetInnerHTML={{ __html: errorHtml }} />}

      {refStatus === LoadingState.SUCCESS && refData && (
        <div className="space-y-6">
          <div className="flex p-1 bg-slate-100 rounded-lg w-fit mx-auto">
            <button onClick={() => handleTabChange('reference')} className={`px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'reference' ? 'bg-white shadow' : 'text-slate-500'}`}>Referência</button>
            <button onClick={() => handleTabChange('lesson')} className={`px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'lesson' ? 'bg-white shadow' : 'text-slate-500'}`}>Plano de Aula</button>
          </div>
          {activeTab === 'reference' && (
            <div className="animate-in fade-in">
              <div className="bg-brand-50 p-6 rounded-xl border border-brand-100 mb-6"><h2 className="text-3xl font-bold mb-3">{refData.pathologyName}</h2><p className="text-lg">{refData.summary}</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><ResultCard title="Indicados" type="indicated" items={refData.indicated} /><ResultCard title="Contra-Indicados" type="contraindicated" items={refData.contraindicated} /></div>
            </div>
          )}
          {activeTab === 'lesson' && (
            <div className="animate-in fade-in">
              {lessonStatus === LoadingState.LOADING ? <div className="text-center py-12"><Loader2 className="h-10 w-10 animate-spin mx-auto text-brand-500"/><p>Gerando aula...</p></div> : lessonData ? (
                <LessonPlanView 
                  plan={lessonData} 
                  studentId={currentStudent?.id}
                  studentName={currentStudent?.name}
                  onSaveLesson={handleSaveLesson} 
                  onRegenerateExercise={async (idx, ex) => { 
                    const newEx = await regenerateSingleExercise(query, ex, selectedEquipment); 
                    const newExs = [...lessonData.exercises]; 
                    newExs[idx] = newEx; 
                    setLessonData({...lessonData, exercises: newExs}); 
                  }} 
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      {refStatus === LoadingState.LOADING && <div className="py-24 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-brand-500"/><p className="mt-4">Consultando Mentor Clínico...</p></div>}
      
      <AssessmentModal 
        isOpen={isAssessmentOpen} 
        initialQuery={query} 
        studentName={currentStudent?.name}
        onComplete={handleAssessmentComplete} 
        onCancel={() => setIsAssessmentOpen(false)} 
        initialHistory={assessmentHistory} 
      />
    </div>
  );
};