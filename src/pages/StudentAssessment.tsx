import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from '../services/studentService';
import { fetchInstructors } from '../services/instructorService';
import { saveAssessment } from '../services/assessmentService';
import { Student, Instructor } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ClipboardList, Search, ChevronRight, Save, ArrowLeft, User, Activity, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

export const StudentAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'list' | 'create'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [simpleForm, setSimpleForm] = useState({
    studentName: '',
    date: new Date().toISOString().split('T')[0],
    evaluatorId: '',
    evaluatorName: '',
    studentAge: '',
    // Queixa
    complaint: '',
    hasPain: false,
    painLocation: '',
    painIntensity: 0,
    worsensWith: '',
    improvesWith: '',
    // Histórico
    historyInjuries: false,
    historyInjuriesDesc: '',
    historySurgeries: false,
    historySurgeriesDesc: '',
    clinicalConditions: [] as string[],
    clinicalOther: '',
    // Físico
    postureObs: '',
    mobilityFlexibility: 'Normal',
    mobilityObs: '',
    strengthGlobal: 'Normal',
    strengthObs: '',
    // Conclusão
    studentGoals: '',
    instructorOpinion: '',
    additionalInfo: ''
  });

  useEffect(() => {
    const loadData = async () => {
      const targetId = user?.isInstructor ? user.studioId : user?.id;
      if (targetId) {
        const s = await fetchStudents(targetId);
        setStudents(s);
        
        // Load instructors for dropdown if owner
        const i = await fetchInstructors(targetId);
        setInstructors(i);
      }
    };
    loadData();
  }, [user]);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    
    // Calculate Age if birthDate exists
    let age = '';
    if (student.birthDate) {
        const today = new Date();
        const birthDate = new Date(student.birthDate);
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
        }
        age = calculatedAge.toString();
    }

    // Default Evaluator
    const evalId = user?.dbId || user?.id || '';
    const evalName = user?.name || '';

    setSimpleForm(prev => ({
        ...prev,
        studentName: student.name,
        studentAge: age,
        evaluatorId: evalId,
        evaluatorName: evalName
    }));
    setView('create');
  };

  const handleSave = async () => {
      if (!user) return;
      const studioId = user.isInstructor ? user.studioId : user.id;
      if (!studioId || !selectedStudent) return;

      setIsSubmitting(true);

      const title = `Avaliação Física - ${simpleForm.studentName} (${new Date(simpleForm.date).toLocaleDateString()})`;

      const result = await saveAssessment(studioId, {
          studioId: studioId,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          instructorId: simpleForm.evaluatorId,
          instructorName: simpleForm.evaluatorName,
          type: 'simple',
          title: title,
          content: simpleForm
      });

      setIsSubmitting(false);

      if (result.success) {
          alert("Avaliação salva com sucesso!");
          setView('list');
          setSelectedStudent(null);
          // Reset form (optional, but good practice)
      } else {
          alert("Erro ao salvar: " + result.error);
      }
  };

  // Helper for toggling array values
  const toggleCondition = (condition: string) => {
      setSimpleForm(prev => {
          const conditions = prev.clinicalConditions.includes(condition)
              ? prev.clinicalConditions.filter(c => c !== condition)
              : [...prev.clinicalConditions, condition];
          return { ...prev, clinicalConditions: conditions };
      });
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(AppRoute.DASHBOARD)}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ClipboardList className="text-emerald-600 w-8 h-8" /> Avaliação Física
            </h1>
        </div>

        {view === 'list' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Selecione o Aluno para Avaliar</h3>
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Buscar aluno..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
                        {filteredStudents.map(student => (
                            <button 
                                key={student.id}
                                onClick={() => handleStudentSelect(student)}
                                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 font-bold border border-slate-100 dark:border-slate-600">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{student.name}</p>
                                        <p className="text-xs text-slate-500">Nova Avaliação</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {view === 'create' && selectedStudent && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                {/* Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Aluno</label>
                        <Input value={simpleForm.studentName} readOnly className="bg-white dark:bg-slate-900 mb-0" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                        <Input type="date" value={simpleForm.date} onChange={e => setSimpleForm({...simpleForm, date: e.target.value})} className="mb-0" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Avaliador Responsável</label>
                        <select 
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            value={simpleForm.evaluatorId}
                            onChange={(e) => {
                                const selectedId = e.target.value;
                                const inst = instructors.find(i => i.id === selectedId);
                                if (inst) {
                                    setSimpleForm(prev => ({ ...prev, evaluatorId: inst.id, evaluatorName: inst.name }));
                                } else if (selectedId === user?.id) {
                                    setSimpleForm(prev => ({ ...prev, evaluatorId: user.id, evaluatorName: user.name }));
                                }
                            }}
                        >
                            <option value={user?.id}>{user?.name} (Eu)</option>
                            {instructors.filter(i => i.id !== user?.id).map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 1. Queixa Principal */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-emerald-600" /> 1. Queixa Principal
                    </h3>
                    <div className="space-y-4">
                        <Input label="Motivo da Procura / Queixa Principal" value={simpleForm.complaint} onChange={e => setSimpleForm({...simpleForm, complaint: e.target.value})} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4">
                                <label className="font-medium text-sm text-slate-700 dark:text-slate-300">Sente Dor?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="radio" checked={!simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: false})} /> Não</label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="radio" checked={simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: true})} /> Sim</label>
                                </div>
                            </div>
                            {simpleForm.hasPain && (
                                <div className="flex items-center gap-2">
                                    <label className="font-medium text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">Intensidade (0-10):</label>
                                    <input type="number" min="0" max="10" className="w-20 p-2 border rounded text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={simpleForm.painIntensity} onChange={e => setSimpleForm({...simpleForm, painIntensity: parseInt(e.target.value)})} />
                                </div>
                            )}
                        </div>

                        {simpleForm.hasPain && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input label="Local da Dor" value={simpleForm.painLocation} onChange={e => setSimpleForm({...simpleForm, painLocation: e.target.value})} />
                                <Input label="O que piora?" value={simpleForm.worsensWith} onChange={e => setSimpleForm({...simpleForm, worsensWith: e.target.value})} />
                                <Input label="O que melhora?" value={simpleForm.improvesWith} onChange={e => setSimpleForm({...simpleForm, improvesWith: e.target.value})} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* 2. Histórico Clínico */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-600" /> 2. Histórico Clínico
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                    <input type="checkbox" checked={simpleForm.historyInjuries} onChange={e => setSimpleForm({...simpleForm, historyInjuries: e.target.checked})} />
                                    Histórico de Lesões?
                                </label>
                                {simpleForm.historyInjuries && (
                                    <Input placeholder="Descreva (ex: entorse tornozelo dir.)" value={simpleForm.historyInjuriesDesc} onChange={e => setSimpleForm({...simpleForm, historyInjuriesDesc: e.target.value})} />
                                )}
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                    <input type="checkbox" checked={simpleForm.historySurgeries} onChange={e => setSimpleForm({...simpleForm, historySurgeries: e.target.checked})} />
                                    Cirurgias Prévias?
                                </label>
                                {simpleForm.historySurgeries && (
                                    <Input placeholder="Descreva (ex: cesárea, apêndice)" value={simpleForm.historySurgeriesDesc} onChange={e => setSimpleForm({...simpleForm, historySurgeriesDesc: e.target.value})} />
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Condições Clínicas (Marque as aplicáveis)</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {['Hipertensão', 'Diabetes', 'Hérnia de Disco', 'Escoliose', 'Labirintite', 'Osteoporose', 'Condromalácia', 'Fibromialgia'].map(cond => (
                                    <label key={cond} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <input type="checkbox" checked={simpleForm.clinicalConditions.includes(cond)} onChange={() => toggleCondition(cond)} />
                                        {cond}
                                    </label>
                                ))}
                            </div>
                            <div className="mt-2">
                                <Input label="Outras condições" value={simpleForm.clinicalOther} onChange={e => setSimpleForm({...simpleForm, clinicalOther: e.target.value})} placeholder="Ex: Artrose, Asma..." />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* 3. Avaliação Física */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-emerald-600" /> 3. Avaliação Física
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Análise Postural (Observações)</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-24 resize-none focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                value={simpleForm.postureObs}
                                onChange={e => setSimpleForm({...simpleForm, postureObs: e.target.value})}
                                placeholder="Ex: Ombro direito elevado, hiperlordose lombar, joelhos valgos..."
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Mobilidade / Flexibilidade</label>
                                <select 
                                    className="w-full p-2 border rounded mb-2 dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                                    value={simpleForm.mobilityFlexibility}
                                    onChange={e => setSimpleForm({...simpleForm, mobilityFlexibility: e.target.value})}
                                >
                                    <option>Excelente</option>
                                    <option>Normal</option>
                                    <option>Reduzida</option>
                                    <option>Muito Reduzida</option>
                                </select>
                                <Input placeholder="Obs (ex: encurtamento isquiotibiais)" value={simpleForm.mobilityObs} onChange={e => setSimpleForm({...simpleForm, mobilityObs: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Força Global</label>
                                <select 
                                    className="w-full p-2 border rounded mb-2 dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                                    value={simpleForm.strengthGlobal}
                                    onChange={e => setSimpleForm({...simpleForm, strengthGlobal: e.target.value})}
                                >
                                    <option>Forte</option>
                                    <option>Normal</option>
                                    <option>Fraca</option>
                                </select>
                                <Input placeholder="Obs (ex: fraqueza abdominal)" value={simpleForm.strengthObs} onChange={e => setSimpleForm({...simpleForm, strengthObs: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* 4. Conclusão */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">4. Conclusão e Objetivos</h3>
                    <div className="space-y-4">
                        <Input label="Objetivos do Aluno" value={simpleForm.studentGoals} onChange={e => setSimpleForm({...simpleForm, studentGoals: e.target.value})} placeholder="Ex: Melhorar postura e aliviar dores nas costas" />
                        
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Parecer do Instrutor / Plano Inicial</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-24 resize-none focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                value={simpleForm.instructorOpinion}
                                onChange={e => setSimpleForm({...simpleForm, instructorOpinion: e.target.value})}
                                placeholder="Ex: Iniciar com foco em estabilização lombo-pélvica e mobilidade de coluna. Evitar extensão excessiva."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button variant="ghost" onClick={() => { setView('list'); setSelectedStudent(null); }}>Cancelar</Button>
                    <Button onClick={handleSave} isLoading={isSubmitting}>
                        <Save className="w-4 h-4 mr-2" /> Salvar Avaliação
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
};
