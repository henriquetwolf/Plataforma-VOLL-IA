import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, Search, RefreshCw, Wand2, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AssessmentModal } from '../components/rehab/AssessmentModal';
import { LessonPlanView, ResultCard } from '../components/rehab/RehabResults';
import { fetchPathologyData, fetchLessonPlan, fetchTreatmentPlan, handleGeminiError, regenerateSingleExercise } from '../services/geminiService';
import { saveRehabLesson, saveTreatmentPlan } from '../services/rehabService';
import { saveStudioExercise } from '../services/exerciseService';
import { recordGenerationUsage } from '../services/contentService';
import { PathologyResponse, LessonPlanResponse, TreatmentPlanResponse, ChatMessage, LoadingState, LessonExercise } from '../types';

export const RehabAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Input State
  const [query, setQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Mat', 'Reformer']);
  const [studentName, setStudentName] = useState('');
  
  // Triage & Context
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<ChatMessage[]>([]);
  
  // Results State
  const [pathologyData, setPathologyData] = useState<PathologyResponse | null>(null);
  const [lessonData, setLessonData] = useState<LessonPlanResponse | null>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlanResponse | null>(null);
  
  // UI Loading/Error
  const [pathologyStatus, setPathologyStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [lessonStatus, setLessonStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [errorHtml, setErrorHtml] = useState<string | null>(null);

  const EQUIPMENT_LIST = ['Mat', 'Reformer', 'Cadillac', 'Chair', 'Barrel', 'Bola', 'Faixa Elástica'];

  const toggleEquipment = (item: string) => {
    setSelectedEquipment(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const getCombinedContext = () => {
    // Convert assessment history to a simple string context
    if (assessmentHistory.length === 0) return '';
    return assessmentHistory
        .filter(m => m.role !== 'ai') // Only user answers matter mostly
        .map(m => `Resposta do instrutor: ${m.text}`)
        .join('. ');
  };

  // 1. Consultar Patologia (Rápido)
  const handleQuickConsult = async () => {
    if (!query.trim()) return;
    setPathologyStatus(LoadingState.LOADING);
    setErrorHtml(null);
    setPathologyData(null);
    
    try {
        const context = getCombinedContext();
        const data = await fetchPathologyData(query, selectedEquipment, assessmentHistory);
        if (data) {
            setPathologyData(data);
            setPathologyStatus(LoadingState.SUCCESS);
            
            // LOG USAGE
            const studioId = user?.isInstructor ? user.studioId : user?.id;
            if(studioId) await recordGenerationUsage(studioId, 'rehab');
        } else {
            throw new Error("Não foi possível gerar dados da patologia.");
        }
    } catch (err: any) {
        setPathologyStatus(LoadingState.ERROR);
        setErrorHtml(handleGeminiError(err));
    }
  };

  // 2. Gerar Plano de Aula (Single)
  const generateSingleLesson = async () => {
      setLessonStatus(LoadingState.LOADING);
      setLessonData(null);
      setTreatmentPlan(null);
      try {
        const obs = getCombinedContext();
        const data = await fetchLessonPlan(query, selectedEquipment, assessmentHistory, obs);
        if (data) { 
            setLessonData(data); 
            setLessonStatus(LoadingState.SUCCESS); 
            
            // LOG USAGE
            const studioId = user?.isInstructor ? user.studioId : user?.id;
            if(studioId) await recordGenerationUsage(studioId, 'rehab');
        } else {
            throw new Error("Falha ao gerar plano de aula.");
        }
      } catch (err: any) { 
          setLessonStatus(LoadingState.ERROR); 
          setErrorHtml(handleGeminiError(err)); 
      }
  };

  // 3. Gerar Plano de Tratamento (Long Term)
  const generateTreatmentPlanAction = async () => {
      setLessonStatus(LoadingState.LOADING);
      setLessonData(null);
      setTreatmentPlan(null);
      try {
        const obs = getCombinedContext();
        const data = await fetchTreatmentPlan(query, selectedEquipment, assessmentHistory, obs);
        if (data) { 
            setTreatmentPlan(data); 
            setLessonStatus(LoadingState.SUCCESS);
            
            // LOG USAGE
            const studioId = user?.isInstructor ? user.studioId : user?.id;
            if(studioId) await recordGenerationUsage(studioId, 'rehab');
        } else {
            throw new Error("Falha ao gerar plano de tratamento.");
        }
      } catch (err: any) { 
          setLessonStatus(LoadingState.ERROR); 
          setErrorHtml(handleGeminiError(err)); 
      }
  };

  const handleAssessmentComplete = (history: ChatMessage[]) => {
    setAssessmentHistory(history);
    setShowAssessment(false);
    // Auto-trigger lesson generation after assessment?
    // Let user decide.
  };

  const handleSaveLesson = async (name: string, patient: string, exercises: LessonExercise[], studentId?: string) => {
      if (!user) return;
      const studioId = user.isInstructor ? user.studioId : user.id;
      if (!studioId) return;

      const result = await saveRehabLesson(studioId, patient, query, { 
          pathologyName: query, 
          goal: lessonData?.goal || '', 
          duration: lessonData?.duration || '', 
          exercises 
      }, studentId);

      if (result.success) {
          alert('Aula salva com sucesso!');
      } else {
          alert('Erro ao salvar: ' + result.error);
      }
  };

  const handleRegenerateExercise = async (index: number, currentExercise: LessonExercise) => {
      if (!lessonData) return;
      
      const newExercise = await regenerateSingleExercise(query, currentExercise, selectedEquipment);
      if (newExercise) {
          const updatedExercises = [...lessonData.exercises];
          updatedExercises[index] = newExercise;
          setLessonData({ ...lessonData, exercises: updatedExercises });
      }
  };

  const handleSaveToBank = async (exercise: LessonExercise, comments: string) => {
      if (!user) return false;
      const studioId = user.isInstructor ? user.studioId : user.id;
      if (!studioId) return false;

      const result = await saveStudioExercise(studioId, exercise, comments);
      if (result.success) {
          alert('Exercício salvo no banco do studio!');
          return true;
      } else {
          alert('Erro: ' + result.error);
          return false;
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-12">
        <div className="flex items-center gap-4">
            <div className="bg-brand-100 dark:bg-brand-900/20 p-3 rounded-full text-brand-600 dark:text-brand-400">
                <Activity className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('clinical_guide')}</h1>
                <p className="text-slate-500 dark:text-slate-400">{t('clinical_guide_desc')}</p>
            </div>
        </div>

        {/* --- INPUT SECTION --- */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('main_complaint')}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                        <input 
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="Ex: Hérnia de Disco L4-L5, Condromalácia..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Equipamentos Disponíveis</label>
                    <div className="flex flex-wrap gap-2">
                        {EQUIPMENT_LIST.map(eq => (
                            <button
                                key={eq}
                                onClick={() => toggleEquipment(eq)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                    selectedEquipment.includes(eq)
                                        ? 'bg-brand-600 text-white border-brand-600'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
                                }`}
                            >
                                {eq}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Assessment Trigger */}
            <div className="bg-brand-50 dark:bg-brand-900/10 p-4 rounded-xl border border-brand-100 dark:border-brand-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm text-brand-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Triagem Clínica com IA</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Responda perguntas para personalizar o plano (Dor, Limitações).</p>
                    </div>
                </div>
                {assessmentHistory.length > 0 ? (
                    <div className="flex items-center gap-2">
                        <span className="text-green-600 font-bold text-sm flex items-center"><Activity className="w-4 h-4 mr-1"/> Triagem Realizada</span>
                        <Button size="sm" variant="outline" onClick={() => setShowAssessment(true)}>Refazer</Button>
                    </div>
                ) : (
                    <Button size="sm" onClick={() => setShowAssessment(true)}>Iniciar Triagem</Button>
                )}
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button 
                    onClick={handleQuickConsult} 
                    isLoading={pathologyStatus === LoadingState.LOADING}
                    variant="secondary"
                    className="flex-1"
                >
                    <Search className="w-4 h-4 mr-2"/> {t('consult')} Patologia
                </Button>
                <Button 
                    onClick={generateSingleLesson} 
                    isLoading={lessonStatus === LoadingState.LOADING}
                    className="flex-1"
                >
                    <Wand2 className="w-4 h-4 mr-2"/> Gerar {t('lesson_plan')}
                </Button>
                <Button 
                    onClick={generateTreatmentPlanAction}
                    isLoading={lessonStatus === LoadingState.LOADING}
                    variant="outline"
                    className="flex-1"
                >
                    <Activity className="w-4 h-4 mr-2"/> Plano de Tratamento
                </Button>
            </div>
        </div>

        {/* --- ERROR DISPLAY --- */}
        {errorHtml && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="text-red-700 dark:text-red-300 text-sm" dangerouslySetInnerHTML={{__html: errorHtml}} />
            </div>
        )}

        {/* --- RESULTS SECTION --- */}
        
        {/* 1. Pathology Info */}
        {pathologyData && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{pathologyData.pathologyName}</h2>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{pathologyData.summary}</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
                        <h4 className="font-bold text-sm text-slate-500 uppercase mb-2">Objetivos Clínicos</h4>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                            {pathologyData.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                        </ul>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <ResultCard title="Exercícios Indicados" type="indicated" items={pathologyData.indicated} />
                        <ResultCard title="Contraindicações (Evitar)" type="contraindicated" items={pathologyData.contraindicated} />
                    </div>
                </div>
            </div>
        )}

        {/* 2. Lesson Plan */}
        {lessonData && (
            <div className="animate-in slide-in-from-bottom-8">
                <LessonPlanView 
                    plan={lessonData} 
                    studentId={undefined} // Or pass from context if linked
                    studentName={studentName}
                    onSaveLesson={handleSaveLesson}
                    onRegenerateExercise={handleRegenerateExercise}
                    onSaveToBank={handleSaveToBank}
                />
            </div>
        )}

        {/* 3. Treatment Plan */}
        {treatmentPlan && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Plano de Tratamento Progressivo</h2>
                        <div className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            4 Sessões
                        </div>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-300 mb-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        {treatmentPlan.overview}
                    </p>

                    <div className="grid gap-6 md:grid-cols-2">
                        {treatmentPlan.sessions.map((session, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500"></div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Sessão {session.sessionNumber}</h3>
                                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wide mb-3">{session.focus}</p>
                                
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">Objetivo Específico</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{session.goal}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">Foco nos Aparelhos</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{session.apparatusFocus}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <AssessmentModal 
            isOpen={showAssessment}
            initialQuery={query}
            studentName={studentName}
            onComplete={handleAssessmentComplete}
            onCancel={() => setShowAssessment(false)}
            initialHistory={assessmentHistory}
        />
    </div>
  );
};
