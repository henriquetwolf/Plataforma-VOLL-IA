
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPathologyData, fetchLessonPlan, regenerateSingleExercise } from '../services/geminiService';
import { saveRehabLesson, fetchRehabLessons, deleteRehabLesson } from '../services/rehabService';
import { PathologyResponse, LessonPlanResponse, LoadingState, SavedRehabLesson, LessonExercise, ChatMessage } from '../types';
import { AssessmentModal } from '../components/rehab/AssessmentModal';
import { ResultCard, LessonPlanView } from '../components/rehab/RehabResults';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, History, BookOpen, Activity, Loader2, ArrowLeft, Trash2 } from 'lucide-react';

export const RehabAgent: React.FC = () => {
  const { user } = useAuth();
  
  // Tabs
  type TabType = 'reference' | 'lesson';
  const [activeTab, setActiveTab] = useState<TabType>('reference');

  // Search & History
  const [query, setQuery] = useState('');
  const [savedLessons, setSavedLessons] = useState<SavedRehabLesson[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // States
  const [refStatus, setRefStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refData, setRefData] = useState<PathologyResponse | null>(null);
  
  const [lessonStatus, setLessonStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [lessonData, setLessonData] = useState<LessonPlanResponse | null>(null);

  // Assessment
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<ChatMessage[] | undefined>(undefined);

  // Filters
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(["Mat", "Reformer", "Cadillac", "Chair", "Barrel"]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await fetchRehabLessons();
    setSavedLessons(data);
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    
    // Reset
    setRefData(null);
    setLessonData(null);
    setRefStatus(LoadingState.IDLE);
    setLessonStatus(LoadingState.IDLE);
    setAssessmentHistory(undefined);
    
    // Start Assessment
    setIsAssessmentOpen(true);
  };

  const handleAssessmentComplete = (history: ChatMessage[]) => {
    setAssessmentHistory(history);
    setIsAssessmentOpen(false);
    fetchReferenceData(query, history);
  };

  const handleAssessmentCancel = () => {
    setIsAssessmentOpen(false);
    fetchReferenceData(query, []);
  };

  const fetchReferenceData = async (q: string, history?: ChatMessage[]) => {
    setRefStatus(LoadingState.LOADING);
    const data = await fetchPathologyData(q, selectedEquipment, history);
    if (data) {
      setRefData(data);
      setRefStatus(LoadingState.SUCCESS);
    } else {
      setRefStatus(LoadingState.ERROR);
    }
  };

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'lesson' && !lessonData && query && lessonStatus === LoadingState.IDLE) {
      setLessonStatus(LoadingState.LOADING);
      const data = await fetchLessonPlan(query, selectedEquipment, assessmentHistory);
      if (data) {
        setLessonData(data);
        setLessonStatus(LoadingState.SUCCESS);
      } else {
        setLessonStatus(LoadingState.ERROR);
      }
    }
  };

  const handleSaveLesson = async (customName: string, patientName: string, updatedExercises: LessonExercise[]) => {
    if (!user?.id || !lessonData) return;
    
    const finalData = { ...lessonData, exercises: updatedExercises };
    const result = await saveRehabLesson(user.id, patientName, lessonData.pathologyName, finalData);
    
    if (result.success) {
      alert("Aula salva com sucesso!");
      loadHistory();
    } else {
      alert("Erro ao salvar.");
    }
  };

  const handleRegenerateExercise = async (index: number, oldExercise: LessonExercise) => {
    if (!lessonData) return;
    const newEx = await regenerateSingleExercise(query, oldExercise, selectedEquipment);
    const newExercises = [...lessonData.exercises];
    newExercises[index] = newEx;
    setLessonData({ ...lessonData, exercises: newExercises });
  };

  const handleLoadLesson = (lesson: SavedRehabLesson) => {
    setLessonData(lesson);
    setQuery(lesson.pathologyName);
    setLessonStatus(LoadingState.SUCCESS);
    setActiveTab('lesson');
    setShowHistory(false);
  };

  const handleDeleteLesson = async (id: string) => {
    if(confirm("Tem certeza?")) {
      await deleteRehabLesson(id);
      loadHistory();
    }
  };

  if (showHistory) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Aulas Salvas</h2>
          <Button variant="outline" onClick={() => setShowHistory(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
        <div className="grid gap-4">
          {savedLessons.map(l => (
            <div key={l.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{l.customName}</h3>
                <p className="text-sm text-slate-500">Paciente: {l.patientName}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleLoadLesson(l)}>Abrir</Button>
                <button onClick={() => handleDeleteLesson(l.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Activity className="h-8 w-8 text-brand-600" /> Pilates Rehab
          </h1>
          <p className="text-slate-500">Guia de patologias e gerador de aulas com triagem inteligente.</p>
        </div>
        <Button variant="outline" onClick={() => setShowHistory(true)}>
          <History className="h-4 w-4 mr-2" /> Aulas Salvas
        </Button>
      </header>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Patologia, Lesão ou Sintoma</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ex: Hérnia de Disco, Dor no Ombro..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        <Button onClick={handleSearch} className="w-full md:w-auto">
          Iniciar Triagem
        </Button>
      </div>

      {/* Main Content */}
      {refStatus === LoadingState.SUCCESS && refData && (
        <div className="space-y-6">
          
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            <button
              onClick={() => handleTabChange('reference')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'reference' 
                  ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BookOpen className="h-4 w-4" /> Referência Clínica
            </button>
            <button
              onClick={() => handleTabChange('lesson')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'lesson' 
                  ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Activity className="h-4 w-4" /> Plano de Aula
            </button>
          </div>

          {/* Reference View */}
          {activeTab === 'reference' && (
            <div className="animate-in fade-in">
              <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-xl border border-brand-100 dark:border-brand-800 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{refData.pathologyName}</h2>
                <p className="text-slate-600 dark:text-slate-300">{refData.summary}</p>
                <div className="mt-4 pt-4 border-t border-brand-200 dark:border-brand-800">
                  <h4 className="font-bold text-sm text-brand-800 dark:text-brand-300 uppercase mb-2">Objetivos do Tratamento</h4>
                  <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-400 grid grid-cols-1 md:grid-cols-2 gap-1">
                    {refData.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResultCard title="Indicados" type="indicated" items={refData.indicated} />
                <ResultCard title="Contra-Indicados" type="contraindicated" items={refData.contraindicated} />
              </div>
            </div>
          )}

          {/* Lesson View */}
          {activeTab === 'lesson' && (
            <div className="animate-in fade-in">
              {lessonStatus === LoadingState.LOADING ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-500" />
                  <p>Criando plano de aula personalizado...</p>
                </div>
              ) : lessonData ? (
                <LessonPlanView 
                  plan={lessonData} 
                  onSaveLesson={handleSaveLesson} 
                  onRegenerateExercise={handleRegenerateExercise}
                />
              ) : (
                <div className="p-4 text-center text-red-500">Erro ao carregar aula.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading Reference */}
      {refStatus === LoadingState.LOADING && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-brand-500" />
          <p>Analisando patologia e gerando guia clínico...</p>
        </div>
      )}

      <AssessmentModal 
        isOpen={isAssessmentOpen}
        initialQuery={query}
        onComplete={handleAssessmentComplete}
        onCancel={handleAssessmentCancel}
        initialHistory={assessmentHistory}
      />
    </div>
  );
};
