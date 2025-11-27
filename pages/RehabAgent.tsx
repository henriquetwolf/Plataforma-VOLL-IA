
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPathologyData, fetchLessonPlan, regenerateSingleExercise, handleGeminiError } from '../services/geminiService';
import { saveRehabLesson, fetchRehabLessons, deleteRehabLesson } from '../services/rehabService';
import { PathologyResponse, LessonPlanResponse, LoadingState, SavedRehabLesson, LessonExercise, ChatMessage } from '../types';
import { AssessmentModal } from '../components/rehab/AssessmentModal';
import { ResultCard, LessonPlanView } from '../components/rehab/RehabResults';
import { Button } from '../components/ui/Button';
import { Search, History, BookOpen, Activity, Loader2, ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';

const COMMON_SUGGESTIONS = [
  "Hérnia de Disco L5-S1",
  "Dor Lombar Crônica",
  "Ombro Rígido / Congelado",
  "Condromalácia Patelar",
  "Dor no Pescoço (Tensão)",
  "Fascite Plantar"
];

const EQUIPMENTS = ["Mat (Solo)", "Reformer", "Cadillac", "Chair", "Barrel", "Acessórios"];

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
  const [errorHtml, setErrorHtml] = useState<string | null>(null);
  
  const [lessonStatus, setLessonStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [lessonData, setLessonData] = useState<LessonPlanResponse | null>(null);

  // Assessment
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<ChatMessage[] | undefined>(undefined);

  // Filters
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(["Mat (Solo)", "Reformer", "Cadillac", "Chair", "Barrel"]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await fetchRehabLessons();
    setSavedLessons(data);
  };

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment(prev => 
      prev.includes(eq) ? prev.filter(item => item !== eq) : [...prev, eq]
    );
  };

  const handleSearch = (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;
    
    // Reset
    setQuery(q);
    setRefData(null);
    setLessonData(null);
    setRefStatus(LoadingState.IDLE);
    setLessonStatus(LoadingState.IDLE);
    setErrorHtml(null);
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
    try {
      const data = await fetchPathologyData(q, selectedEquipment, history);
      if (data) {
        setRefData(data);
        setRefStatus(LoadingState.SUCCESS);
      } else {
        throw new Error("Dados vazios");
      }
    } catch (err: any) {
      setRefStatus(LoadingState.ERROR);
      setErrorHtml(handleGeminiError(err));
    }
  };

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'lesson' && !lessonData && query && lessonStatus === LoadingState.IDLE) {
      setLessonStatus(LoadingState.LOADING);
      try {
        const data = await fetchLessonPlan(query, selectedEquipment, assessmentHistory);
        if (data) {
          setLessonData(data);
          setLessonStatus(LoadingState.SUCCESS);
        } else {
          throw new Error("Erro ao gerar plano");
        }
      } catch (err: any) {
        setLessonStatus(LoadingState.ERROR);
        setErrorHtml(handleGeminiError(err));
      }
    }
  };

  const handleSaveLesson = async (customName: string, patientName: string, updatedExercises: LessonExercise[], studentId?: string) => {
    if (!user?.id || !lessonData) return;
    
    const finalData = { ...lessonData, exercises: updatedExercises };
    const result = await saveRehabLesson(user.id, patientName, lessonData.pathologyName, finalData, studentId);
    
    if (result.success) {
      alert("Aula salva com sucesso e associada ao aluno!");
      loadHistory();
    } else {
      alert("Erro ao salvar.");
    }
  };

  const handleRegenerateExercise = async (index: number, oldExercise: LessonExercise) => {
    if (!lessonData) return;
    try {
      const newEx = await regenerateSingleExercise(query, oldExercise, selectedEquipment);
      const newExercises = [...lessonData.exercises];
      newExercises[index] = newEx;
      setLessonData({ ...lessonData, exercises: newExercises });
    } catch (err: any) {
      alert("Erro ao regenerar exercício. Verifique a chave de API.");
    }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Aulas Salvas</h2>
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header Centralizado e Limpo */}
      {!refData && !lessonData && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl mb-4">
            <Activity className="h-8 w-8 text-brand-600 dark:text-brand-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Pilates Rehab</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">GUIA CLÍNICO DE PATOLOGIAS</p>
          
          <div className="mt-8 mb-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Consulta Clínica & Sintomas</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Digite uma patologia (ex: "Hérnia de Disco") ou descreva um sintoma.
            </p>
          </div>
        </div>
      )}

      {/* Se já tiver dados, mostra header compacto */}
      {(refData || lessonData) && (
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-brand-100 dark:bg-brand-900 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pilates Rehab</h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Guia Clínico</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setRefData(null); setLessonData(null); setQuery(''); }}>
              Nova Busca
            </Button>
            <Button variant="outline" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4 mr-2" /> Histórico
            </Button>
          </div>
        </header>
      )}

      {/* Área de Busca e Filtros */}
      {(!refData && !lessonData) && (
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Barra de Busca Grande */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              className="w-full pl-12 pr-4 py-4 text-lg border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              placeholder="Ex: Ciático inflamado, Dor no ombro, Joelho estalando..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              className="absolute right-2 top-2 bottom-2" 
              onClick={() => handleSearch()}
            >
              Consultar
            </Button>
          </div>

          {/* Filtros de Equipamento */}
          <div className="text-center">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Equipamentos Disponíveis:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EQUIPMENTS.map(eq => (
                <button
                  key={eq}
                  onClick={() => toggleEquipment(eq)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedEquipment.includes(eq)
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                      : 'bg-transparent text-slate-500 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {selectedEquipment.includes(eq) && <CheckCircle2 className="inline w-3 h-3 mr-1" />}
                  {eq}
                </button>
              ))}
            </div>
          </div>

          {/* Card de Marketing / Info */}
          <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="relative z-10 flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-full">
                <Activity className="h-6 w-6 text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Tecnologia + Profissional Atualizado</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  A Inteligência Artificial <strong>jamais substituirá</strong> o toque humano, a empatia e o raciocínio clínico. 
                  Estou aqui apenas para processar evidências e acelerar seu planejamento.
                </p>
                <p className="text-xs text-slate-400 mt-2">O protagonista da reabilitação é você.</p>
              </div>
            </div>
          </div>

          {/* Sugestões */}
          <div>
            <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Sugestões (Patologias ou Sintomas)
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_SUGGESTIONS.map(sug => (
                <button
                  key={sug}
                  onClick={() => handleSearch(sug)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Error Display */}
      {refStatus === LoadingState.ERROR && errorHtml && (
        <div className="max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: errorHtml }} />
      )}

      {/* Main Content (Results) */}
      {refStatus === LoadingState.SUCCESS && refData && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit mx-auto">
            <button
              onClick={() => handleTabChange('reference')}
              className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'reference' 
                  ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BookOpen className="h-4 w-4" /> Referência Clínica
            </button>
            <button
              onClick={() => handleTabChange('lesson')}
              className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
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
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{refData.pathologyName}</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">{refData.summary}</p>
                
                <div className="mt-6 pt-6 border-t border-brand-200 dark:border-brand-800">
                  <h4 className="font-bold text-sm text-brand-800 dark:text-brand-300 uppercase mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Objetivos do Tratamento
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {refData.objectives.map((obj, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 shrink-0" />
                        {obj}
                      </div>
                    ))}
                  </div>
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
                  <Loader2 className="h-10 w-10 animate-spin mb-4 text-brand-500" />
                  <p>Criando plano de aula personalizado baseado na triagem...</p>
                </div>
              ) : lessonStatus === LoadingState.ERROR ? (
                 <div className="max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: errorHtml || '<p>Erro ao carregar aula.</p>' }} />
              ) : lessonData ? (
                <LessonPlanView 
                  plan={lessonData} 
                  onSaveLesson={handleSaveLesson} 
                  onRegenerateExercise={handleRegenerateExercise}
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Loading Reference */}
      {refStatus === LoadingState.LOADING && (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-12 w-12 animate-spin mb-6 text-brand-500" />
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Analisando patologia e gerando guia clínico...</p>
          <p className="text-sm mt-2">Consultando base de dados de reabilitação</p>
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
