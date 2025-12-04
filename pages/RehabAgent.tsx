
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { fetchPathologyData, fetchLessonPlan, fetchTreatmentPlan, regenerateSingleExercise, handleGeminiError } from '../services/geminiService';
import { saveRehabLesson, fetchRehabLessons, deleteRehabLesson, saveTreatmentPlan, fetchTreatmentPlans, deleteTreatmentPlan } from '../services/rehabService';
import { saveStudioExercise, fetchStudioExercises, deleteStudioExercise, updateStudioExercise, createStudioExercise, uploadExerciseImage } from '../services/exerciseService';
import { fetchStudents } from '../services/studentService';
import { fetchProfile } from '../services/storage';
import { PathologyResponse, LessonPlanResponse, LoadingState, SavedRehabLesson, LessonExercise, ChatMessage, Student, StudioExercise, AppRoute, TreatmentPlanResponse, SavedTreatmentPlan } from '../types';
import { AssessmentModal } from '../components/rehab/AssessmentModal';
import { ResultCard, LessonPlanView } from '../components/rehab/RehabResults';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, History, Activity, Loader2, ArrowLeft, Trash2, CheckCircle2, User, ChevronRight, Folder, Dumbbell, Filter, Plus, Pencil, X, Upload, ImageIcon, Maximize2, Home, AlertTriangle, List, CheckSquare, Save, Download, FileText, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COMMON_SUGGESTIONS = [
  "Hérnia de Disco L5-S1", "Dor Lombar Crônica", "Ombro Rígido", "Condromalácia", "Cervicalgia", "Fascite Plantar"
];
const EQUIPMENTS = ["Mat (Solo)", "Reformer", "Cadillac", "Chair", "Barrel", "Acessórios"];

interface ExerciseCardProps {
  ex: StudioExercise;
  onEdit: (ex: StudioExercise) => void;
  onDelete: (id: string) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ ex, onEdit, onDelete }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all group h-full flex flex-col">
      <div className="h-48 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
        {ex.imageUrl && !imgError ? (
          <img 
            src={ex.imageUrl} 
            alt={ex.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
            <Dumbbell className="w-12 h-12 mb-2" />
            {imgError && <span className="text-[10px] text-red-400">Erro na imagem</span>}
          </div>
        )}
        <span className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-sm z-10">
          {ex.equipment}
        </span>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight line-clamp-2">{ex.name}</h4>
          <div className="flex gap-1 shrink-0 ml-2">
            <button onClick={() => onEdit(ex)} className="p-1.5 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(ex.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Excluir">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 mb-3">
          <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-medium truncate max-w-[120px]">{ex.focus}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded truncate max-w-[80px]">{ex.reps}</span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3 flex-1">
          {ex.description}
        </p>

        {ex.instructorComments && (
          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 italic flex items-start gap-1">
              <User className="w-3 h-3 mt-0.5 flex-shrink-0" /> <span className="line-clamp-2">"{ex.instructorComments}"</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const RehabAgent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [studioLogo, setStudioLogo] = useState<string | null>(null);

  // App States
  const [activeTab, setActiveTab] = useState<'reference' | 'lesson' | 'bank'>('reference');
  const [query, setQuery] = useState('');
  const [savedLessons, setSavedLessons] = useState<SavedRehabLesson[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedTreatmentPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState(''); // New history filter
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
  const [refStatus, setRefStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refData, setRefData] = useState<PathologyResponse | null>(null);
  const [errorHtml, setErrorHtml] = useState<string | null>(null);
  
  // Lesson & Treatment State
  const [planMode, setPlanMode] = useState<'single' | 'treatment'>('single');
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlanResponse | null>(null);
  const [lessonStatus, setLessonStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [lessonData, setLessonData] = useState<LessonPlanResponse | null>(null);
  // Cache to store generated lessons within the session so we don't regenerate
  const [sessionLessonsCache, setSessionLessonsCache] = useState<Record<number, LessonPlanResponse>>({});
  
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<ChatMessage[] | undefined>(undefined);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(["Mat (Solo)", "Reformer", "Cadillac", "Chair", "Barrel"]);
  
  // Bank State
  const [savedExercises, setSavedExercises] = useState<StudioExercise[]>([]);
  const [bankEquipmentFilter, setBankEquipmentFilter] = useState('All');
  const [bankFocusFilter, setBankFocusFilter] = useState(''); // New Focus Filter
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<StudioExercise | null>(null);
  const [exerciseFormData, setExerciseFormData] = useState<Partial<StudioExercise>>({});
  const [exerciseImageFile, setExerciseImageFile] = useState<File | null>(null);
  const [exerciseImagePreview, setExerciseImagePreview] = useState<string | null>(null);
  const [isExerciseSaving, setIsExerciseSaving] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) return;
      
      const targetId = user.isInstructor ? user.studioId : user.id;
      if (targetId) {
          fetchProfile(targetId).then(p => {
              if (p?.logoUrl) setStudioLogo(p.logoUrl);
          });
      }

      if (!user.isInstructor) {
        setIsAuthorized(true);
        setCheckingAuth(false);
        return;
      }
      if (user.isInstructor && user.studioId) {
        try {
          const profile = await fetchProfile(user.studioId);
          if (profile && profile.settings?.instructor_permissions?.rehab !== false) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
            navigate(AppRoute.DASHBOARD);
          }
        } catch (error) {
          setIsAuthorized(false);
          navigate(AppRoute.DASHBOARD);
        }
      }
      setCheckingAuth(false);
    };
    checkPermission();
  }, [user, navigate]);

  useEffect(() => { 
    if (user && isAuthorized) {
      loadHistory();
      loadStudents();
    }
  }, [isAuthorized, user]);

  useEffect(() => {
    if (activeTab === 'bank' && isAuthorized && (user?.isInstructor || user?.id)) {
      loadBank();
    }
  }, [activeTab, user, isAuthorized]);

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin h-8 w-8 text-brand-600" /></div>;
  if (!isAuthorized) return null;

  const loadHistory = async () => { 
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    const [lessons, plans] = await Promise.all([
        fetchRehabLessons(targetId),
        fetchTreatmentPlans(targetId)
    ]);
    setSavedLessons(lessons.map(d => ({ ...d, patientName: d.patientName || 'Sem Nome' }))); 
    setSavedPlans(plans.map(d => ({ ...d, patientName: d.patientName || 'Sem Nome' })));
  };
  
  const loadStudents = async () => { 
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    const data = await fetchStudents(targetId); 
    setStudents(data); 
  };

  const loadBank = async () => {
    const ownerId = user?.isInstructor ? user.studioId : user?.id;
    if (ownerId) {
      const data = await fetchStudioExercises(ownerId);
      setSavedExercises(data);
    }
  };

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
    setQuery(q); 
    setRefData(null); 
    setLessonData(null); 
    setTreatmentPlan(null); // Clear treatment plan
    setRefStatus(LoadingState.IDLE); 
    setLessonStatus(LoadingState.IDLE); 
    setErrorHtml(null); 
    setAssessmentHistory(undefined);
    setIsAssessmentOpen(true);
  };

  const handleAssessmentComplete = (history: ChatMessage[]) => {
    setAssessmentHistory(history); 
    setIsAssessmentOpen(false); 
    // IMPORTANT: Set status immediately to show loading
    setRefStatus(LoadingState.LOADING);
    fetchReferenceData(query, history);
  };

  const fetchReferenceData = async (q: string, history?: ChatMessage[]) => {
    setRefStatus(LoadingState.LOADING);
    try {
      const data = await fetchPathologyData(q, selectedEquipment, history);
      if (data) { setRefData(data); setRefStatus(LoadingState.SUCCESS); } else { throw new Error("Não foi possível obter dados. Tente novamente."); }
    } catch (err: any) { setRefStatus(LoadingState.ERROR); setErrorHtml(handleGeminiError(err)); }
  };

  const handleTabChange = async (tab: 'reference' | 'lesson' | 'bank') => {
    setActiveTab(tab);
    
    // Auto-fetch logic ONLY if lessonData is missing AND we have a query
    if (tab === 'lesson' && !lessonData && !treatmentPlan && query && lessonStatus === LoadingState.IDLE) {
      if (planMode === 'single') {
          generateSingleLesson();
      } else {
          generateTreatmentPlan();
      }
    }
  };

  const generateSingleLesson = async () => {
      setLessonStatus(LoadingState.LOADING);
      try {
        const obs = currentStudent?.observations || '';
        const data = await fetchLessonPlan(query, selectedEquipment, assessmentHistory, obs);
        if (data) { setLessonData(data); setLessonStatus(LoadingState.SUCCESS); }
      } catch (err: any) { setLessonStatus(LoadingState.ERROR); setErrorHtml(handleGeminiError(err)); }
  };

  const generateTreatmentPlan = async () => {
      setLessonStatus(LoadingState.LOADING);
      setSessionLessonsCache({}); // Clear cache for new plan
      try {
        const obs = currentStudent?.observations || '';
        const data = await fetchTreatmentPlan(query, selectedEquipment, assessmentHistory, obs);
        if (data) { setTreatmentPlan(data); setLessonStatus(LoadingState.SUCCESS); }
      } catch (err: any) { setLessonStatus(LoadingState.ERROR); setErrorHtml(handleGeminiError(err)); }
  };

  const generateSessionLesson = async (sessionNumber: number, focus: string) => {
      // If already generated, just view it
      if (sessionLessonsCache[sessionNumber]) {
          setLessonData(sessionLessonsCache[sessionNumber]);
          return;
      }

      setLessonStatus(LoadingState.LOADING);
      try {
        const obs = currentStudent?.observations || '';
        const fullQuery = `${query} - Fase ${sessionNumber}`;
        const data = await fetchLessonPlan(fullQuery, selectedEquipment, assessmentHistory, obs, focus);
        if (data) { 
            setLessonData(data); 
            setLessonStatus(LoadingState.SUCCESS); 
            // Save to cache
            setSessionLessonsCache(prev => ({...prev, [sessionNumber]: data}));
        }
      } catch (err: any) { setLessonStatus(LoadingState.ERROR); setErrorHtml(handleGeminiError(err)); }
  };

  const handleSaveLesson = async (customName: string, patientName: string, updatedExercises: LessonExercise[], studentId?: string) => {
    const ownerId = user?.isInstructor ? user.studioId : user?.id;
    if (!ownerId || !lessonData) return;
    const finalData = { ...lessonData, exercises: updatedExercises };
    const result = await saveRehabLesson(ownerId, patientName, lessonData.pathologyName, finalData, studentId);
    if (result.success) { alert("Salvo!"); loadHistory(); } else { alert("Erro ao salvar."); }
  };

  const handleSaveTreatmentPlan = async () => {
      const ownerId = user?.isInstructor ? user.studioId : user?.id;
      if (!ownerId || !treatmentPlan) return;
      
      if (!currentStudent) {
          alert("Selecione um aluno antes de salvar.");
          return;
      }

      const result = await saveTreatmentPlan(ownerId, currentStudent.name, treatmentPlan.pathologyName, treatmentPlan, assessmentHistory, currentStudent.id);
      
      if (result.success) {
          alert("Planejamento salvo com sucesso!");
          loadHistory();
      } else {
          alert("Erro ao salvar planejamento: " + result.error);
      }
  };

  const handleSaveToBank = async (exercise: LessonExercise, comments: string) => {
    const ownerId = user?.isInstructor ? user.studioId : user?.id;
    if (!ownerId) return false;
    const result = await saveStudioExercise(ownerId, exercise, comments);
    if (result.success) { alert("Exercício salvo no banco com sucesso!"); loadBank(); return true; } else { alert("Erro ao salvar: " + result.error); return false; }
  };

  const handleDeleteExercise = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este exercício do banco?")) { await deleteStudioExercise(id); loadBank(); }
  };

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const student = students.find(s => s.id === id) || null;
    setCurrentStudent(student);
  };

  const openExerciseModal = (exercise?: StudioExercise) => {
    if (exercise) { setEditingExercise(exercise); setExerciseFormData({ ...exercise }); setExerciseImagePreview(exercise.imageUrl || null); } else { setEditingExercise(null); setExerciseFormData({ name: '', equipment: 'Mat (Solo)', focus: '', reps: '', description: '', instructorComments: '' }); setExerciseImagePreview(null); }
    setExerciseImageFile(null); setIsExerciseModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validação de Tamanho (Max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB.");
        return;
      }
      setExerciseImageFile(file);
      setExerciseImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveExerciseForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const ownerId = user?.isInstructor ? user.studioId : user?.id;
    if (!ownerId || !exerciseFormData.name) return;
    setIsExerciseSaving(true);
    
    try {
      let imageUrl = exerciseFormData.imageUrl;
      
      if (exerciseImageFile) { 
          const url = await uploadExerciseImage(ownerId, exerciseImageFile); 
          if (url) {
              imageUrl = url; 
          } else {
              const proceed = window.confirm("Falha ao subir imagem. Deseja salvar sem imagem?");
              if (!proceed) {
                setIsExerciseSaving(false);
                return;
              }
          }
      }
      
      const finalData = { ...exerciseFormData, imageUrl };
      
      if (editingExercise) { 
        await updateStudioExercise(editingExercise.id, finalData); 
      } else { 
        await createStudioExercise(ownerId, finalData); 
      }
      
      loadBank(); 
      setIsExerciseModalOpen(false);
    } catch (err) { 
      console.error(err); 
      alert("Erro ao salvar exercício."); 
    } finally { 
      setIsExerciseSaving(false); 
    }
  };

  const downloadReferencePDF = async () => {
    const element = document.getElementById('reference-report-content');
    if (!element || !refData) return;

    try {
      // Force white background for capture
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = "#ffffff";

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      
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

      pdf.save(`Guia_Clinico_${refData.pathologyName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      alert('Erro ao gerar PDF.');
    }
  };

  const studentsWithLessons = Array.from(new Set([...savedLessons.map(l => l.patientName), ...savedPlans.map(p => p.patientName)])).sort() as string[];
  
  // Filter Bank Exercises
  const filteredBankExercises = savedExercises.filter(ex => {
      const matchEquip = bankEquipmentFilter === 'All' || ex.equipment === bankEquipmentFilter;
      const matchFocus = !bankFocusFilter || ex.focus.toLowerCase().includes(bankFocusFilter.toLowerCase()) || ex.name.toLowerCase().includes(bankFocusFilter.toLowerCase());
      return matchEquip && matchFocus;
  });
  
  const bankEquipments = Array.from(new Set([...EQUIPMENTS, ...savedExercises.map(e => e.equipment)])).sort();

  // RENDER HELPERS for HISTORY View
  const renderHistory = () => {
      const filteredStudents = studentsWithLessons.filter((name: string) => name.toLowerCase().includes(historySearchTerm.toLowerCase()));

      return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{t('view_history')}</h2>
            {selectedStudentFilter !== null && (
              <>
                <ChevronRight className="w-5 h-5 text-slate-400" />
                <span className="text-xl text-brand-600 font-medium">{selectedStudentFilter || 'Sem Nome'}</span>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => {
            if (selectedStudentFilter !== null) setSelectedStudentFilter(null);
            else setShowHistory(false);
          }}>
            <ArrowLeft className="w-4 h-4 mr-2"/> {selectedStudentFilter !== null ? t('back') : t('back')}
          </Button>
        </div>

        {selectedStudentFilter === null && (
          <>
            <div className="mb-4">
                <Input 
                    placeholder="Filtrar por nome do aluno..." 
                    value={historySearchTerm} 
                    onChange={e => setHistorySearchTerm(e.target.value)} 
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in">
                {filteredStudents.length === 0 ? (
                <p className="text-slate-500 col-span-3 text-center py-12">Nenhum histórico encontrado.</p>
                ) : (
                filteredStudents.map(studentName => {
                    const lessonsCount = savedLessons.filter(l => l.patientName === studentName).length;
                    const plansCount = savedPlans.filter(p => p.patientName === studentName).length;
                    const count = lessonsCount + plansCount;
                    return (
                    <button 
                        key={studentName || 'unknown'}
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
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{studentName || 'Sem Nome'}</h3>
                        <p className="text-sm text-slate-500 mt-1">Ver arquivos</p>
                    </button>
                    );
                })
                )}
            </div>
          </>
        )}

        {selectedStudentFilter !== null && (
          <div className="grid gap-6 animate-in fade-in slide-in-from-right-8">
            <div className="mb-4">
                <Input 
                    placeholder="Filtrar por patologia..." 
                    value={historySearchTerm} 
                    onChange={e => setHistorySearchTerm(e.target.value)} 
                />
            </div>

            {/* Section: Treatment Plans */}
            <h3 className="font-bold text-slate-600 dark:text-slate-400 text-sm uppercase">Planejamentos (4 Aulas)</h3>
            <div className="grid gap-3">
                {savedPlans
                    .filter(p => p.patientName === selectedStudentFilter)
                    .filter(p => p.pathologyName.toLowerCase().includes(historySearchTerm.toLowerCase()))
                    .map(p => (
                    <div key={p.id} className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800 flex justify-between items-center hover:border-purple-300 transition-colors">
                        <div>
                            <div className="flex items-center gap-2">
                                <List className="w-4 h-4 text-purple-600"/>
                                <h3 className="font-bold text-lg text-purple-800 dark:text-purple-300">{p.pathologyName}</h3>
                            </div>
                            <p className="text-sm text-purple-600/80">Criado em: {new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => { 
                                setTreatmentPlan(p);
                                setQuery(p.pathologyName);
                                if (p.assessmentContext) setAssessmentHistory(p.assessmentContext); // Restore context!
                                setLessonData(null);
                                setLessonStatus(LoadingState.SUCCESS); 
                                setRefStatus(LoadingState.IDLE);
                                setRefData(null);
                                setActiveTab('lesson'); 
                                setShowHistory(false); 
                                setSelectedStudentFilter(null);
                                setPlanMode('treatment');
                                setSessionLessonsCache({}); // Reset view cache for fresh load
                            }}>
                                Abrir Planejamento
                            </Button>
                            <button onClick={async () => { if(confirm("Apagar este planejamento?")) { await deleteTreatmentPlan(p.id); loadHistory(); } }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                ))}
                {savedPlans.filter(p => p.patientName === selectedStudentFilter).length === 0 && (
                    <p className="text-sm text-slate-400 italic">Nenhum planejamento salvo.</p>
                )}
            </div>

            {/* Section: Individual Lessons */}
            <h3 className="font-bold text-slate-600 dark:text-slate-400 text-sm uppercase mt-4">Aulas Individuais Salvas</h3>
            <div className="grid gap-3">
                {savedLessons
                    .filter(l => l.patientName === selectedStudentFilter)
                    .filter(l => l.pathologyName.toLowerCase().includes(historySearchTerm.toLowerCase()))
                    .map(l => (
                <div key={l.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center hover:border-brand-300 transition-colors">
                    <div>
                    <h3 className="font-bold text-lg text-brand-700 dark:text-brand-400">{l.pathologyName}</h3>
                    <p className="text-sm text-slate-500">Criado em: {new Date(l.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => { 
                        setLessonData(l); 
                        setQuery(l.pathologyName); 
                        setLessonStatus(LoadingState.SUCCESS); 
                        setRefStatus(LoadingState.IDLE);
                        setRefData(null);
                        setTreatmentPlan(null);
                        setActiveTab('lesson'); 
                        setShowHistory(false); 
                        setSelectedStudentFilter(null); 
                    }}>
                        Abrir Aula
                    </Button>
                    <button onClick={async () => { if(confirm("Apagar este plano?")) { await deleteRehabLesson(l.id); loadHistory(); } }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4"/>
                    </button>
                    </div>
                </div>
                ))}
                {savedLessons.filter(l => l.patientName === selectedStudentFilter).length === 0 && (
                    <p className="text-sm text-slate-400 italic">Nenhuma aula salva.</p>
                )}
            </div>
          </div>
        )}
      </div>
  )};

  if (showHistory) return renderHistory();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      {(refData || lessonData || treatmentPlan || activeTab === 'bank' || refStatus === LoadingState.LOADING) && (
        <header className="flex justify-between items-center border-b pb-6">
          <div className="flex items-center gap-3">
            {user?.isInstructor && (
                <Button variant="outline" size="icon" onClick={() => navigate(AppRoute.INSTRUCTOR_DASHBOARD)} className="mr-2 border-slate-200 shadow-sm">
                    <Home className="h-5 w-5 text-slate-600" />
                </Button>
            )}
            <div className="p-2 bg-brand-100 rounded-lg"><Activity className="h-6 w-6 text-brand-600"/></div>
            <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Guia Clínico</h1></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setRefData(null); setLessonData(null); setTreatmentPlan(null); setQuery(''); setActiveTab('reference'); setSessionLessonsCache({}); }}>{t('new')}</Button>
            <Button variant="outline" onClick={() => setShowHistory(true)}>{t('view_history')}</Button>
          </div>
        </header>
      )}

      {/* Landing Search View */}
      {(!refData && !lessonData && !treatmentPlan && activeTab !== 'bank' && refStatus !== LoadingState.LOADING) && (
        <div className="max-w-3xl mx-auto space-y-6 pt-8">
          <div className="text-center mb-8">
             <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('clinical_guide')}</h2>
             <p className="text-slate-500">{t('clinical_guide_desc')}</p>
          </div>

          {errorHtml && <div dangerouslySetInnerHTML={{ __html: errorHtml }} />}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('select_student_required')}</label>
                <select 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  onChange={handleStudentSelect}
                  value={currentStudent?.id || ''}
                >
                  <option value="">-- Selecione um aluno --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {currentStudent && currentStudent.observations && (
                  <div className="mt-3 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800 flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5"/>
                    <div><strong>Observações:</strong> {currentStudent.observations}</div>
                  </div>
                )}
             </div>
          </div>

          <div className="relative shadow-lg rounded-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"/>
            <input 
              className="w-full pl-12 pr-28 py-4 text-lg border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900" 
              placeholder={t('main_complaint')}
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
            />
            <Button className="absolute right-2 top-2 bottom-2" onClick={() => handleSearch()}>{t('consult')}</Button>
          </div>

          {/* Mode Selection and Equipment Filter */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              
              {/* Mode Toggle */}
              <div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase">Modo de Geração</h3>
                  <div className="flex gap-4">
                      <label className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${planMode === 'single' ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'bg-slate-50 border-slate-200'}`}>
                          <input type="radio" name="planMode" value="single" checked={planMode === 'single'} onChange={() => setPlanMode('single')} className="hidden"/>
                          <div className="flex items-center gap-2 mb-1">
                              <Activity className={`w-5 h-5 ${planMode === 'single' ? 'text-brand-600' : 'text-slate-400'}`}/>
                              <span className={`font-bold ${planMode === 'single' ? 'text-brand-700' : 'text-slate-600'}`}>Aula Única</span>
                          </div>
                          <p className="text-xs text-slate-500">Gera um plano de aula imediato para a queixa.</p>
                      </label>
                      <label className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${planMode === 'treatment' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-slate-50 border-slate-200'}`}>
                          <input type="radio" name="planMode" value="treatment" checked={planMode === 'treatment'} onChange={() => setPlanMode('treatment')} className="hidden"/>
                          <div className="flex items-center gap-2 mb-1">
                              <List className={`w-5 h-5 ${planMode === 'treatment' ? 'text-purple-600' : 'text-slate-400'}`}/>
                              <span className={`font-bold ${planMode === 'treatment' ? 'text-purple-700' : 'text-slate-600'}`}>Tratamento (4 Sessões)</span>
                          </div>
                          <p className="text-xs text-slate-500">Planejamento progressivo de 4 fases.</p>
                      </label>
                  </div>
              </div>

              {/* Equipment Selection */}
              <div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase">Aparelhos Disponíveis</h3>
                  <div className="flex flex-wrap gap-2">
                      {EQUIPMENTS.map(eq => (
                          <button 
                              key={eq}
                              onClick={() => toggleEquipment(eq)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedEquipment.includes(eq) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                          >
                              {eq}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
          
          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-brand-400 transition-all group" onClick={() => setShowHistory(true)}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600"><Folder className="h-6 w-6"/></div>
                  <div><h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">Aulas Salvas</h3><p className="text-sm text-slate-500">Histórico de planos.</p></div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-brand-400 transition-all group" onClick={() => setActiveTab('bank')}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600"><Dumbbell className="h-6 w-6"/></div>
                  <div><h3 className="font-bold text-lg mb-1 group-hover:text-purple-600 transition-colors">{t('exercise_bank')}</h3><p className="text-sm text-slate-500">Biblioteca do studio.</p></div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading States */}
      {refStatus === LoadingState.LOADING && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
              <Loader2 className="h-12 w-12 text-brand-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gerando Guia Clínico e Referências...</h3>
              <p className="text-slate-500 mt-2">A IA está analisando o caso e consultando a base de dados.</p>
          </div>
      )}

      {(refStatus === LoadingState.ERROR || lessonStatus === LoadingState.ERROR) && errorHtml && (refData || lessonData) && <div dangerouslySetInnerHTML={{ __html: errorHtml }} />}

      {(refData || lessonData || treatmentPlan || activeTab === 'bank') && refStatus !== LoadingState.LOADING && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap justify-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit mx-auto gap-1">
            <button onClick={() => handleTabChange('reference')} className={`px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'reference' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>{t('reference')}</button>
            <button onClick={() => handleTabChange('lesson')} className={`px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'lesson' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>{treatmentPlan ? 'Tratamento' : t('lesson_plan')}</button>
            <button onClick={() => handleTabChange('bank')} className={`px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'bank' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}><Dumbbell className="w-4 h-4"/> {t('exercise_bank')}</button>
          </div>
          
          {/* Reference View (A4 Report Style) */}
          {activeTab === 'reference' && (
            <div className="animate-in fade-in">
              {refData ? (
                <div className="max-w-4xl mx-auto space-y-4">
                    {/* Action Bar */}
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={downloadReferencePDF} className="bg-white border-slate-200 shadow-sm">
                            <Download className="w-4 h-4 mr-2"/> Baixar PDF
                        </Button>
                    </div>

                    {/* Report Wrapper */}
                    <div className="bg-slate-100 dark:bg-slate-950 p-4 md:p-8 rounded-xl shadow-inner flex justify-center">
                        <div 
                            id="reference-report-content" 
                            className="bg-white text-slate-800 shadow-2xl relative flex flex-col box-border overflow-hidden break-words"
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm', 
                                paddingTop: '25mm',
                                paddingRight: '20mm',
                                paddingBottom: '20mm',
                                paddingLeft: '25mm',
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start border-b-4 border-brand-500 pb-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-2 text-brand-600 mb-1 font-bold uppercase text-xs tracking-wider">
                                        <Activity className="w-4 h-4" /> Guia Clínico
                                    </div>
                                    <h1 className="text-2xl font-extrabold text-slate-900 leading-tight mb-1">{refData.pathologyName}</h1>
                                    <h2 className="text-sm text-slate-500 font-medium">Aluno: {currentStudent?.name || 'Não informado'}</h2>
                                </div>
                                <div className="text-right">
                                    {studioLogo ? (
                                        <img src={studioLogo} alt="Logo" className="h-16 w-auto max-w-[120px] object-contain mb-1 ml-auto" />
                                    ) : (
                                        <Home className="h-10 w-10 text-slate-300 mb-1 ml-auto" />
                                    )}
                                    <span className="text-xs text-slate-400 block">Data: {new Date().toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="mb-6 bg-slate-50 p-4 rounded-lg border-l-4 border-brand-400">
                                <h3 className="font-bold text-brand-800 mb-2 text-sm uppercase">Resumo Clínico</h3>
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">{refData.summary}</p>
                            </div>

                            {/* Contraindications (Priority) */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-red-100">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <h3 className="font-bold text-red-700 text-lg">Contraindicações e Cuidados</h3>
                                </div>
                                <div className="grid gap-3">
                                    {refData.contraindicated.map((item, idx) => (
                                        <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-100 break-inside-avoid">
                                            <div className="flex justify-between items-start mb-1">
                                                <strong className="text-red-900 text-sm">{item.name}</strong>
                                                <span className="text-[10px] bg-white px-2 py-0.5 rounded text-red-600 font-bold border border-red-200">{item.apparatus}</span>
                                            </div>
                                            <p className="text-xs text-red-800">{item.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Indications (Optional if present in response, mainly focusing on Contra per request) */}
                            {refData.indicated && refData.indicated.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3 pb-1 border-b border-green-100">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <h3 className="font-bold text-green-700 text-lg">Exercícios Indicados</h3>
                                    </div>
                                    <div className="grid gap-3">
                                        {refData.indicated.slice(0, 5).map((item, idx) => (
                                            <div key={idx} className="bg-green-50 p-3 rounded-lg border border-green-100 break-inside-avoid">
                                                <div className="flex justify-between items-start mb-1">
                                                    <strong className="text-green-900 text-sm">{item.name}</strong>
                                                    <span className="text-[10px] bg-white px-2 py-0.5 rounded text-green-600 font-bold border border-green-200">{item.apparatus}</span>
                                                </div>
                                                <p className="text-xs text-green-800">{item.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-auto pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
                                <p>Gerado pela Plataforma VOLL IA • Guia de Referência Rápida</p>
                            </div>
                        </div>
                    </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                   <p className="mb-4">Use a busca para carregar o Guia Clínico.</p>
                   {query && <Button variant="outline" onClick={() => fetchReferenceData(query)}>Carregar Guia para "{query}"</Button>}
                </div>
              )}
            </div>
          )}
          
          {/* Lesson View (Single or Treatment) */}
          {activeTab === 'lesson' && (
            <div className="animate-in fade-in">
              {lessonStatus === LoadingState.LOADING ? (
                  <div className="text-center py-12"><Loader2 className="h-10 w-10 animate-spin mx-auto text-brand-500"/><p>Gerando com IA...</p></div> 
              ) : (
                <>
                    {/* Treatment Plan View */}
                    {treatmentPlan && !lessonData && (
                        <div className="space-y-6">
                            <div className="bg-purple-50 border border-purple-100 p-6 rounded-xl flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-purple-800 mb-2">Planejamento de Tratamento: {treatmentPlan.pathologyName}</h2>
                                    <p className="text-purple-700 mb-1">{treatmentPlan.overview}</p>
                                    {currentStudent && <p className="text-xs text-purple-600 font-medium mt-2">Aluno: {currentStudent.name}</p>}
                                </div>
                                <Button onClick={handleSaveTreatmentPlan} variant="secondary" className="bg-white text-purple-700 border border-purple-200 hover:bg-purple-100">
                                    <Save className="w-4 h-4 mr-2"/> Salvar Planejamento
                                </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {treatmentPlan.sessions.map(session => {
                                    // Check if we have generated this lesson in this session
                                    const isGenerated = !!sessionLessonsCache[session.sessionNumber];
                                    
                                    return (
                                        <div key={session.sessionNumber} className={`bg-white border p-5 rounded-xl shadow-sm transition-all ${isGenerated ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200 hover:border-purple-300'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${isGenerated ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    Sessão {session.sessionNumber} {isGenerated && '(Gerada)'}
                                                </span>
                                                {isGenerated && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                            </div>
                                            <h3 className="font-bold text-lg mb-2">{session.goal}</h3>
                                            <div className="text-sm text-slate-600 space-y-1 mb-4">
                                                <p><strong>Foco:</strong> {session.focus}</p>
                                                <p><strong>Aparelhos:</strong> {session.apparatusFocus}</p>
                                            </div>
                                            
                                            {isGenerated ? (
                                                <Button 
                                                    variant="secondary" 
                                                    className="w-full bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                    onClick={() => generateSessionLesson(session.sessionNumber, session.focus)}
                                                >
                                                    <FileText className="w-4 h-4 mr-2"/> Visualizar Aula
                                                </Button>
                                            ) : (
                                                <Button 
                                                    variant="outline" 
                                                    className="w-full"
                                                    onClick={() => generateSessionLesson(session.sessionNumber, session.focus)}
                                                >
                                                    Gerar Aula {session.sessionNumber}
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Single Lesson View (Used by both Single Mode and Treatment Mode Drill-down) */}
                    {lessonData && (
                        <div>
                            {treatmentPlan && (
                                <button onClick={() => setLessonData(null)} className="mb-4 text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1">
                                    <ArrowLeft className="w-4 h-4"/> Voltar ao Planejamento
                                </button>
                            )}
                            <LessonPlanView 
                                plan={lessonData} 
                                studentId={currentStudent?.id}
                                studentName={(lessonData as any).patientName || currentStudent?.name}
                                onSaveLesson={handleSaveLesson} 
                                onSaveToBank={handleSaveToBank}
                                onRegenerateExercise={async (idx, ex) => { 
                                    // Update State Correctly using functional update
                                    setLessonStatus(LoadingState.LOADING);
                                    const newEx = await regenerateSingleExercise(query, ex, selectedEquipment); 
                                    
                                    setLessonData(prev => {
                                        if(!prev) return null;
                                        const newExs = [...prev.exercises]; 
                                        newExs[idx] = newEx; 
                                        const updatedPlan = {...prev, exercises: newExs};
                                        
                                        // If inside treatment plan, update cache too
                                        if (treatmentPlan) {
                                            // Find session number? Hard without passing it. 
                                            // Simplification: We update current lesson view. Cache might be stale on back, 
                                            // but user can view 'stale' version or we need to pass session ID.
                                            // For now, simple view update is enough.
                                        }
                                        return updatedPlan;
                                    });
                                    setLessonStatus(LoadingState.SUCCESS);
                                }} 
                            />
                        </div>
                    )}

                    {!lessonData && !treatmentPlan && (
                        <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="mb-4">Nenhum plano ativo.</p>
                            {query && (
                                <div className="flex justify-center gap-4">
                                    <Button variant="outline" onClick={generateSingleLesson}>Gerar Aula Única</Button>
                                    <Button variant="secondary" onClick={generateTreatmentPlan}>Gerar Tratamento Completo</Button>
                                </div>
                            )}
                        </div>
                    )}
                </>
              )}
            </div>
          )}

          {/* Bank View */}
          {activeTab === 'bank' && (
            <div className="animate-in fade-in space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
                <div className="mb-4 md:mb-0">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('exercise_bank')}</h3>
                  <p className="text-sm text-slate-500">{filteredBankExercises.length} exercícios salvos</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select 
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
                      value={bankEquipmentFilter}
                      onChange={(e) => setBankEquipmentFilter(e.target.value)}
                    >
                      <option value="All">Todos Equipamentos</option>
                      {bankEquipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                        className="mb-0 w-40 h-10" 
                        placeholder="Buscar Foco/Nome..." 
                        value={bankFocusFilter} 
                        onChange={e => setBankFocusFilter(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => openExerciseModal()} size="sm" className="ml-2">
                    <Plus className="w-4 h-4 mr-2" /> {t('create_exercise')}
                  </Button>
                </div>
              </div>

              {filteredBankExercises.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum exercício encontrado.</p>
                  <Button variant="outline" onClick={() => openExerciseModal()} className="mt-4">{t('create_exercise')}</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBankExercises.map((ex) => (
                    <ExerciseCard 
                      key={ex.id} 
                      ex={ex} 
                      onEdit={openExerciseModal} 
                      onDelete={handleDeleteExercise} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals ... (AssessmentModal and Exercise Edit Modal kept as is) */}
      <AssessmentModal 
        isOpen={isAssessmentOpen} 
        initialQuery={query} 
        studentName={currentStudent?.name}
        onComplete={handleAssessmentComplete} 
        onCancel={() => setIsAssessmentOpen(false)} 
        initialHistory={assessmentHistory} 
      />

      {isExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingExercise ? 'Editar Exercício' : t('create_exercise')}
              </h3>
              <button onClick={() => setIsExerciseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExerciseForm} className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors overflow-hidden group">
                  {exerciseImagePreview ? (
                    <>
                      <img src={exerciseImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="text-white w-8 h-8" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Clique para adicionar foto (Max 5MB)</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              <Input 
                label="Nome do Exercício" 
                value={exerciseFormData.name || ''} 
                onChange={e => setExerciseFormData({...exerciseFormData, name: e.target.value})} 
                required 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Equipamento</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-brand-500"
                    value={exerciseFormData.equipment || ''}
                    onChange={e => setExerciseFormData({...exerciseFormData, equipment: e.target.value})}
                  >
                    {bankEquipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <Input 
                  label="Foco Muscular" 
                  value={exerciseFormData.focus || ''} 
                  onChange={e => setExerciseFormData({...exerciseFormData, focus: e.target.value})} 
                />
              </div>

              <Input 
                label="Série / Repetições" 
                value={exerciseFormData.reps || ''} 
                onChange={e => setExerciseFormData({...exerciseFormData, reps: e.target.value})} 
                placeholder="Ex: 3x 10"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição / Instruções</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-brand-500 h-24 resize-none"
                  value={exerciseFormData.description || ''}
                  onChange={e => setExerciseFormData({...exerciseFormData, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comentários Pessoais</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-brand-500 h-16 resize-none"
                  value={exerciseFormData.instructorComments || ''}
                  onChange={e => setExerciseFormData({...exerciseFormData, instructorComments: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsExerciseModalOpen(false)}>Cancelar</Button>
                <Button type="submit" isLoading={isExerciseSaving}>
                  {editingExercise ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
