
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from '../services/studentService';
import { fetchInstructors } from '../services/instructorService';
import { saveAssessment, fetchAssessments, deleteAssessment } from '../services/assessmentService';
import { Student, Instructor, StudentAssessment } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ClipboardList, Plus, History, Search, Trash2, Eye, FileText, ChevronDown, ChevronUp, Printer, Calendar, User, CheckCircle, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- SIMPLE EVALUATION TYPES ---
interface SimpleFormState {
  studentId: string;
  studentName: string;
  studentAge: string; // Calculated
  studentSex: string;
  evaluatorId: string;
  evaluatorName: string;
  date: string;
  
  // 1. Queixa
  complaint: string;
  hasPain: boolean;
  painLocation: string;
  painDuration: string;
  painIntensity: number; // 0-10
  worsensWith: string;
  improvesWith: string;

  // 2. Histórico
  historyInjuries: boolean;
  historyInjuriesDesc: string;
  historySurgeries: boolean;
  historySurgeriesDesc: string;
  historyChronicPain: boolean;
  historyChronicPainDesc: string;

  // 3. Clínico
  clinicalConditions: string[]; // ['Hipertensão', 'Diabetes'...]
  clinicalOther: string;

  // 4. Hábitos
  activityLevel: string;
  sports: string[];
  workSitting: string;
  workStanding: string;
  repetitiveMotion: boolean;
  repetitiveMotionDesc: string;
  sleepQuality: string;
  sleepHours: string;
  stressLevel: string;

  // 5-9 Campos Abertos
  postureObs: string;
  mobilityFlexibility: string; // Escala 
  mobilityObs: string;
  strengthGlobal: string; // Escala 0-5
  strengthObs: string;
  studentGoals: string;
  instructorOpinion: string;
  
  // 10. Certeza
  confidenceLevel: string;

  // 11. Extra
  additionalInfo: string;
}

const INITIAL_SIMPLE_FORM: SimpleFormState = {
  studentId: '', studentName: '', studentAge: '', studentSex: '', evaluatorId: '', evaluatorName: '', date: new Date().toISOString().split('T')[0],
  complaint: '', hasPain: false, painLocation: '', painDuration: 'Semanas', painIntensity: 0, worsensWith: '', improvesWith: '',
  historyInjuries: false, historyInjuriesDesc: '', historySurgeries: false, historySurgeriesDesc: '', historyChronicPain: false, historyChronicPainDesc: '',
  clinicalConditions: [], clinicalOther: '',
  activityLevel: 'Sedentário', sports: [], workSitting: '', workStanding: '', repetitiveMotion: false, repetitiveMotionDesc: '', sleepQuality: 'Regular', sleepHours: '', stressLevel: 'Moderado',
  postureObs: '', mobilityFlexibility: 'Moderada', mobilityObs: '', strengthGlobal: '3', strengthObs: '',
  studentGoals: '', instructorOpinion: '', confidenceLevel: 'Acho que acertei a maioria', additionalInfo: ''
};

// --- CUSTOM BUILDER TYPES ---
interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'long_text' | 'radio' | 'checkbox' | 'select';
  options?: string[]; // Comma separated for builder
  value: any;
}

export const StudentAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [mode, setMode] = useState<'select' | 'simple' | 'custom'>('select');
  
  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [simpleForm, setSimpleForm] = useState<SimpleFormState>(INITIAL_SIMPLE_FORM);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customTitle, setCustomTitle] = useState('Avaliação Personalizada');
  
  // Custom Field Builder
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // History View
  const [viewAssessment, setViewAssessment] = useState<StudentAssessment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    if (targetId) {
        const [s, i, a] = await Promise.all([
            fetchStudents(targetId),
            fetchInstructors(targetId),
            fetchAssessments(targetId)
        ]);
        setStudents(s);
        setInstructors(i);
        setAssessments(a);
        
        // Auto-set evaluator if current user is instructor
        if (user?.isInstructor) {
            setSimpleForm(prev => ({ ...prev, evaluatorId: user.dbId || user.id, evaluatorName: user.name }));
        }
    }
    setLoading(false);
  };

  // --- HELPERS ---
  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return '';
    const diff = Date.now() - new Date(birthDate).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
  };

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const student = students.find(s => s.id === id);
    if (student) {
        setSimpleForm(prev => ({
            ...prev,
            studentId: student.id,
            studentName: student.name,
            studentAge: calculateAge(student.birthDate)
        }));
    }
  };

  const handleEvaluatorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const inst = instructors.find(i => i.id === id);
    if (inst) {
        setSimpleForm(prev => ({ ...prev, evaluatorId: inst.id, evaluatorName: inst.name }));
    } else if (id === user?.id) { // Owner case
        setSimpleForm(prev => ({ ...prev, evaluatorId: user.id, evaluatorName: user.name }));
    }
  };

  const handleSaveSimple = async () => {
    if (!user) return;
    const targetId = user.isInstructor ? user.studioId : user.id;
    if (!targetId || !simpleForm.studentId) {
        alert("Selecione um aluno.");
        return;
    }

    const result = await saveAssessment(targetId, {
        studioId: targetId,
        studentId: simpleForm.studentId,
        instructorId: simpleForm.evaluatorId || undefined,
        studentName: simpleForm.studentName,
        instructorName: simpleForm.evaluatorName,
        type: 'simple',
        title: 'Avaliação Padrão VOLL',
        content: simpleForm
    });

    if (result.success) {
        alert("Avaliação salva com sucesso!");
        loadData();
        setMode('select');
        setSimpleForm(INITIAL_SIMPLE_FORM);
        setActiveTab('history');
    } else {
        alert("Erro ao salvar: " + result.error);
    }
  };

  // --- CUSTOM BUILDER ---
  const addCustomField = () => {
    if (!newFieldLabel) return;
    const options = ['radio', 'checkbox', 'select'].includes(newFieldType) 
        ? newFieldOptions.split(',').map(s => s.trim()) 
        : undefined;
    
    setCustomFields([...customFields, {
        id: crypto.randomUUID(),
        label: newFieldLabel,
        type: newFieldType,
        options,
        value: newFieldType === 'checkbox' ? [] : ''
    }]);
    setNewFieldLabel('');
    setNewFieldOptions('');
  };

  const handleCustomValueChange = (id: string, val: any) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, value: val } : f));
  };

  const handleSaveCustom = async () => {
    if (!user) return;
    const targetId = user.isInstructor ? user.studioId : user.id;
    // For custom, allow flexible student selection or just name text? Let's enforce selection for data integrity
    if (!targetId || !simpleForm.studentId) {
        alert("Selecione um aluno no cabeçalho.");
        return;
    }
    
    const result = await saveAssessment(targetId, {
        studioId: targetId,
        studentId: simpleForm.studentId,
        instructorId: simpleForm.evaluatorId || undefined,
        studentName: simpleForm.studentName,
        instructorName: simpleForm.evaluatorName,
        type: 'custom',
        title: customTitle,
        content: {
            ...simpleForm, // Header data
            fields: customFields
        }
    });

    if (result.success) {
        alert("Avaliação salva!");
        loadData();
        setMode('select');
        setCustomFields([]);
        setActiveTab('history');
    } else {
        alert("Erro: " + result.error);
    }
  };

  // --- PRINT ---
  const handlePrint = () => {
    const input = document.getElementById('printable-assessment');
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
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
        pdf.save('avaliacao.pdf');
      });
    }
  };

  // --- RENDER HELPERS ---
  const SectionHeader = ({ title, icon: Icon }: any) => (
    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700 mt-6 mb-4">
        {Icon && <Icon className="w-5 h-5 text-brand-600" />}
        <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-wide">{title}</h3>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ClipboardList className="text-brand-600"/> Avaliação Física
            </h1>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button onClick={() => setActiveTab('new')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Nova Avaliação</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Histórico</button>
            </div>
        </div>

        {activeTab === 'new' && mode === 'select' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <button onClick={() => setMode('simple')} className="bg-white dark:bg-slate-900 p-8 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:shadow-lg transition-all text-left group">
                    <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <FileText className="w-8 h-8 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Modelo Padrão VOLL</h3>
                    <p className="text-slate-500">Avaliação completa pré-definida: Anamnese, Dor, Histórico, Postura e Testes Físicos.</p>
                </button>
                
                <button onClick={() => setMode('custom')} className="bg-white dark:bg-slate-900 p-8 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:shadow-lg transition-all text-left group">
                    <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Plus className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Criar do Zero</h3>
                    <p className="text-slate-500">Monte sua própria avaliação adicionando perguntas e campos personalizados.</p>
                </button>
            </div>
        )}

        {/* --- SIMPLE FORM --- */}
        {activeTab === 'new' && mode === 'simple' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between mb-6">
                    <h2 className="text-xl font-bold">Nova Avaliação (Padrão)</h2>
                    <Button variant="ghost" onClick={() => setMode('select')}>Cancelar</Button>
                </div>

                <div className="space-y-6">
                    {/* Header Data */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Aluno</label>
                            <select className="w-full p-2 border rounded" value={simpleForm.studentId} onChange={handleStudentSelect}>
                                <option value="">Selecione...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Idade</label>
                            <Input value={simpleForm.studentAge} readOnly className="bg-slate-100" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Sexo</label>
                            <select className="w-full p-2 border rounded" value={simpleForm.studentSex} onChange={e => setSimpleForm({...simpleForm, studentSex: e.target.value})}>
                                <option value="">Selecione...</option>
                                <option>Feminino</option>
                                <option>Masculino</option>
                                <option>Outro</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                            <Input type="date" value={simpleForm.date} onChange={e => setSimpleForm({...simpleForm, date: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Avaliador</label>
                            <select className="w-full p-2 border rounded" value={simpleForm.evaluatorId} onChange={handleEvaluatorSelect}>
                                <option value="">Selecione...</option>
                                {user?.role === 'owner' && <option value={user.id}>{user.name} (Dono)</option>}
                                {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 1. Queixa */}
                    <SectionHeader title="1. Queixa Principal" />
                    <Input label="Qual a queixa principal?" value={simpleForm.complaint} onChange={e => setSimpleForm({...simpleForm, complaint: e.target.value})} />
                    
                    <div className="flex gap-6 items-center my-4">
                        <span className="font-medium">Sente dor?</span>
                        <label className="flex gap-2"><input type="radio" checked={simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: true})} /> Sim</label>
                        <label className="flex gap-2"><input type="radio" checked={!simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: false})} /> Não</label>
                    </div>

                    {simpleForm.hasPain && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900">
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input label="Local da dor" value={simpleForm.painLocation} onChange={e => setSimpleForm({...simpleForm, painLocation: e.target.value})} />
                                <div>
                                    <label className="block text-sm font-medium mb-1">Desde quando?</label>
                                    <select className="w-full p-2 border rounded" value={simpleForm.painDuration} onChange={e => setSimpleForm({...simpleForm, painDuration: e.target.value})}>
                                        <option>Dias</option>
                                        <option>Semanas</option>
                                        <option>Meses</option>
                                        <option>Anos</option>
                                    </select>
                                </div>
                            </div>
                            <div className="my-4">
                                <label className="block text-sm font-medium mb-2">Intensidade (0-10): <span className="font-bold text-red-600">{simpleForm.painIntensity}</span></label>
                                <input type="range" min="0" max="10" className="w-full" value={simpleForm.painIntensity} onChange={e => setSimpleForm({...simpleForm, painIntensity: parseInt(e.target.value)})} />
                                <div className="flex justify-between text-xs text-slate-400"><span>0 (Sem dor)</span><span>10 (Insuportável)</span></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input label="O que piora?" value={simpleForm.worsensWith} onChange={e => setSimpleForm({...simpleForm, worsensWith: e.target.value})} />
                                <Input label="O que melhora?" value={simpleForm.improvesWith} onChange={e => setSimpleForm({...simpleForm, improvesWith: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {/* 2. Histórico */}
                    <SectionHeader title="2. Histórico de Lesões" />
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={simpleForm.historyInjuries} onChange={e => setSimpleForm({...simpleForm, historyInjuries: e.target.checked})} /> Lesões Prévias</label>
                            {simpleForm.historyInjuries && <Input placeholder="Quais?" value={simpleForm.historyInjuriesDesc} onChange={e => setSimpleForm({...simpleForm, historyInjuriesDesc: e.target.value})} />}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={simpleForm.historySurgeries} onChange={e => setSimpleForm({...simpleForm, historySurgeries: e.target.checked})} /> Cirurgias</label>
                            {simpleForm.historySurgeries && <Input placeholder="Quais?" value={simpleForm.historySurgeriesDesc} onChange={e => setSimpleForm({...simpleForm, historySurgeriesDesc: e.target.value})} />}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={simpleForm.historyChronicPain} onChange={e => setSimpleForm({...simpleForm, historyChronicPain: e.target.checked})} /> Episódios de Dor Crônica</label>
                            {simpleForm.historyChronicPain && <Input placeholder="Descrição" value={simpleForm.historyChronicPainDesc} onChange={e => setSimpleForm({...simpleForm, historyChronicPainDesc: e.target.value})} />}
                        </div>
                    </div>

                    {/* 3. Clínico */}
                    <SectionHeader title="3. Condições Clínicas" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['Hipertensão', 'Diabetes', 'Cardiopatias', 'Artrose/Artrite', 'LER/DORT', 'Hernia de Disco', 'Gestante', 'Pós-parto'].map(cond => (
                            <label key={cond} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border">
                                <input 
                                    type="checkbox" 
                                    checked={simpleForm.clinicalConditions.includes(cond)}
                                    onChange={e => {
                                        if (e.target.checked) setSimpleForm(prev => ({...prev, clinicalConditions: [...prev.clinicalConditions, cond]}));
                                        else setSimpleForm(prev => ({...prev, clinicalConditions: prev.clinicalConditions.filter(c => c !== cond)}));
                                    }}
                                /> {cond}
                            </label>
                        ))}
                    </div>
                    <Input label="Outras (Descreva)" value={simpleForm.clinicalOther} onChange={e => setSimpleForm({...simpleForm, clinicalOther: e.target.value})} className="mt-2" />

                    {/* 4. Hábitos */}
                    <SectionHeader title="4. Hábitos e Rotina" />
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Atividade Física</label>
                            <select className="w-full p-2 border rounded" value={simpleForm.activityLevel} onChange={e => setSimpleForm({...simpleForm, activityLevel: e.target.value})}>
                                <option>Sedentário</option>
                                <option>1-2x/semana</option>
                                <option>3-4x/semana</option>
                                <option>5+ vezes/semana</option>
                            </select>
                        </div>
                        <Input label="Esportes (separar por vírgula)" value={simpleForm.sports.join(', ')} onChange={e => setSimpleForm({...simpleForm, sports: e.target.value.split(',')})} />
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Trabalho Sentado (h)</label>
                            <input type="number" className="w-full p-2 border rounded" value={simpleForm.workSitting} onChange={e => setSimpleForm({...simpleForm, workSitting: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Trabalho em Pé (h)</label>
                            <input type="number" className="w-full p-2 border rounded" value={simpleForm.workStanding} onChange={e => setSimpleForm({...simpleForm, workStanding: e.target.value})} />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={simpleForm.repetitiveMotion} onChange={e => setSimpleForm({...simpleForm, repetitiveMotion: e.target.checked})} /> Movimentos Repetitivos?</label>
                            {simpleForm.repetitiveMotion && <Input placeholder="Quais?" value={simpleForm.repetitiveMotionDesc} onChange={e => setSimpleForm({...simpleForm, repetitiveMotionDesc: e.target.value})} />}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Sono (Qualidade)</label>
                            <select className="w-full p-2 border rounded" value={simpleForm.sleepQuality} onChange={e => setSimpleForm({...simpleForm, sleepQuality: e.target.value})}>
                                <option>Ótimo</option>
                                <option>Bom</option>
                                <option>Regular</option>
                                <option>Ruim</option>
                            </select>
                        </div>
                        <Input label="Horas por noite" value={simpleForm.sleepHours} onChange={e => setSimpleForm({...simpleForm, sleepHours: e.target.value})} />
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Estresse</label>
                            <select className="w-full p-2 border rounded" value={simpleForm.stressLevel} onChange={e => setSimpleForm({...simpleForm, stressLevel: e.target.value})}>
                                <option>Baixo</option>
                                <option>Moderado</option>
                                <option>Alto</option>
                                <option>Muito Alto</option>
                            </select>
                        </div>
                    </div>

                    {/* 5. Postura */}
                    <SectionHeader title="5. Observações Posturais" />
                    <textarea 
                        className="w-full p-3 border rounded h-24" 
                        placeholder="Ex: Cabeça protraída, hiperlordose..." 
                        value={simpleForm.postureObs} 
                        onChange={e => setSimpleForm({...simpleForm, postureObs: e.target.value})}
                    />

                    {/* 6. Mobilidade */}
                    <SectionHeader title="6. Mobilidade e Flexibilidade" />
                    <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">Nível Geral</label>
                        <select className="w-full p-2 border rounded" value={simpleForm.mobilityFlexibility} onChange={e => setSimpleForm({...simpleForm, mobilityFlexibility: e.target.value})}>
                            <option>Excelente</option>
                            <option>Boa</option>
                            <option>Moderada</option>
                            <option>Reduzida</option>
                            <option>Muito Reduzida</option>
                        </select>
                    </div>
                    <textarea className="w-full p-3 border rounded h-20" placeholder="Obs específicas..." value={simpleForm.mobilityObs} onChange={e => setSimpleForm({...simpleForm, mobilityObs: e.target.value})} />

                    {/* 7. Força */}
                    <SectionHeader title="7. Força Muscular" />
                    <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">Força Global (0-5)</label>
                        <select className="w-full p-2 border rounded" value={simpleForm.strengthGlobal} onChange={e => setSimpleForm({...simpleForm, strengthGlobal: e.target.value})}>
                            <option value="5">5 - Excelente</option>
                            <option value="4">4 - Boa Resistência</option>
                            <option value="3">3 - Com compensações</option>
                            <option value="2">2 - Fraca</option>
                            <option value="1">1 - Muito Fraca</option>
                            <option value="0">0 - Incapaz</option>
                        </select>
                    </div>
                    <textarea className="w-full p-3 border rounded h-20" placeholder="Obs..." value={simpleForm.strengthObs} onChange={e => setSimpleForm({...simpleForm, strengthObs: e.target.value})} />

                    {/* 8-11 Conclusão */}
                    <SectionHeader title="Conclusão" />
                    <Input label="8. Objetivos do Aluno" value={simpleForm.studentGoals} onChange={e => setSimpleForm({...simpleForm, studentGoals: e.target.value})} />
                    <Input label="9. Opinião do Instrutor (Objetivos propostos)" value={simpleForm.instructorOpinion} onChange={e => setSimpleForm({...simpleForm, instructorOpinion: e.target.value})} />
                    
                    <div className="my-4">
                        <label className="block text-sm font-medium mb-1">10. Grau de Certeza</label>
                        <select className="w-full p-2 border rounded" value={simpleForm.confidenceLevel} onChange={e => setSimpleForm({...simpleForm, confidenceLevel: e.target.value})}>
                            <option>100% seguro</option>
                            <option>Acho que acertei a maioria</option>
                            <option>Estou inseguro</option>
                        </select>
                    </div>

                    <div className="my-4">
                        <label className="block text-sm font-medium mb-1">11. Informações Adicionais / Testes</label>
                        <textarea className="w-full p-3 border rounded h-32" value={simpleForm.additionalInfo} onChange={e => setSimpleForm({...simpleForm, additionalInfo: e.target.value})} />
                    </div>

                    <Button onClick={handleSaveSimple} className="w-full text-lg py-4">Salvar Avaliação</Button>
                </div>
            </div>
        )}

        {/* --- CUSTOM BUILDER FORM --- */}
        {activeTab === 'new' && mode === 'custom' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between mb-6">
                    <h2 className="text-xl font-bold">Criar Avaliação Personalizada</h2>
                    <Button variant="ghost" onClick={() => setMode('select')}>Cancelar</Button>
                </div>

                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg">
                    <h3 className="font-bold mb-4">1. Cabeçalho (Padrão)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Aluno</label>
                            <select className="w-full p-2 border rounded" value={simpleForm.studentId} onChange={handleStudentSelect}>
                                <option value="">Selecione...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Título da Avaliação</label>
                            <Input value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold mb-4">2. Adicionar Campos</h3>
                    <div className="flex gap-2 items-end bg-slate-100 p-4 rounded-lg">
                        <div className="flex-1">
                            <label className="text-xs block mb-1">Pergunta / Rótulo</label>
                            <Input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} className="mb-0" />
                        </div>
                        <div className="w-40">
                            <label className="text-xs block mb-1">Tipo</label>
                            <select className="w-full p-2 border rounded" value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)}>
                                <option value="text">Texto Curto</option>
                                <option value="long_text">Texto Longo</option>
                                <option value="select">Seleção</option>
                                <option value="checkbox">Checkbox</option>
                            </select>
                        </div>
                        {['select', 'radio', 'checkbox'].includes(newFieldType) && (
                            <div className="flex-1">
                                <label className="text-xs block mb-1">Opções (separar por vírgula)</label>
                                <Input value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)} className="mb-0" placeholder="Opção 1, Opção 2" />
                            </div>
                        )}
                        <Button onClick={addCustomField}><Plus className="w-4 h-4"/></Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="font-bold border-b pb-2">Preenchimento</h3>
                    {customFields.length === 0 && <p className="text-slate-400 italic">Adicione campos acima para começar.</p>}
                    
                    {customFields.map((field) => (
                        <div key={field.id} className="p-4 border rounded-lg relative hover:bg-slate-50 transition-colors group">
                            <button onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                            <label className="block font-medium mb-2">{field.label}</label>
                            
                            {field.type === 'text' && <input className="w-full p-2 border rounded" value={field.value} onChange={e => handleCustomValueChange(field.id, e.target.value)} />}
                            {field.type === 'long_text' && <textarea className="w-full p-2 border rounded h-24" value={field.value} onChange={e => handleCustomValueChange(field.id, e.target.value)} />}
                            {field.type === 'select' && (
                                <select className="w-full p-2 border rounded" value={field.value} onChange={e => handleCustomValueChange(field.id, e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                                </select>
                            )}
                            {field.type === 'checkbox' && (
                                <div className="flex flex-wrap gap-4">
                                    {field.options?.map(opt => (
                                        <label key={opt} className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={(field.value as string[]).includes(opt)}
                                                onChange={e => {
                                                    const current = field.value as string[];
                                                    if (e.target.checked) handleCustomValueChange(field.id, [...current, opt]);
                                                    else handleCustomValueChange(field.id, current.filter(x => x !== opt));
                                                }}
                                            />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <Button onClick={handleSaveCustom} className="w-full mt-8 py-4" disabled={customFields.length === 0}>Salvar Avaliação Personalizada</Button>
            </div>
        )}

        {/* --- HISTORY VIEW --- */}
        {activeTab === 'history' && !viewAssessment && (
            <div className="space-y-4 animate-in fade-in">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input className="w-full pl-10 p-2 border rounded-lg" placeholder="Buscar por aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {assessments.filter(a => a.studentName.toLowerCase().includes(searchTerm.toLowerCase())).map(a => (
                    <div key={a.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{a.studentName}</h3>
                            <p className="text-sm text-slate-500">{a.title} • {new Date(a.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setViewAssessment(a)}><Eye className="w-4 h-4 mr-2"/> Ver</Button>
                            <button onClick={async () => { if(confirm("Deletar?")) { await deleteAssessment(a.id); loadData(); } }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- VIEW / PRINT MODAL --- */}
        {viewAssessment && (
            <div className="fixed inset-0 bg-black/60 z-50 flex justify-center overflow-y-auto py-10">
                <div className="bg-white w-full max-w-4xl min-h-[297mm] shadow-2xl relative p-8 md:p-16">
                    <button onClick={() => setViewAssessment(null)} className="absolute top-4 right-4 bg-slate-100 p-2 rounded-full hover:bg-slate-200 print:hidden"><X className="w-6 h-6"/></button>
                    
                    <div className="print:hidden flex justify-end mb-8">
                        <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2"/> Imprimir / PDF</Button>
                    </div>

                    <div id="printable-assessment">
                        <div className="text-center border-b-2 border-slate-800 pb-4 mb-8">
                            <h1 className="text-3xl font-bold uppercase tracking-widest">{viewAssessment.title}</h1>
                            <p className="text-slate-500">Avaliação Física & Anamnese</p>
                        </div>

                        {/* Standard Header Display */}
                        <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 border rounded">
                            <p><strong>Aluno:</strong> {viewAssessment.content.studentName}</p>
                            <p><strong>Data:</strong> {new Date(viewAssessment.createdAt).toLocaleDateString()}</p>
                            <p><strong>Idade:</strong> {viewAssessment.content.studentAge}</p>
                            <p><strong>Avaliador:</strong> {viewAssessment.content.evaluatorName}</p>
                        </div>

                        {/* Content Rendering Logic */}
                        {viewAssessment.type === 'simple' ? (
                            <div className="space-y-6 text-sm">
                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">1. Queixa Principal</h3>
                                    <p>{viewAssessment.content.complaint}</p>
                                    {viewAssessment.content.hasPain && (
                                        <div className="ml-4 mt-2">
                                            <p><strong>Dor:</strong> Sim - {viewAssessment.content.painLocation}</p>
                                            <p><strong>Intensidade:</strong> {viewAssessment.content.painIntensity}/10</p>
                                            <p><strong>Piora:</strong> {viewAssessment.content.worsensWith} | <strong>Melhora:</strong> {viewAssessment.content.improvesWith}</p>
                                        </div>
                                    )}
                                </section>
                                
                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">2. Histórico & Clínico</h3>
                                    <ul className="list-disc pl-5">
                                        {viewAssessment.content.historyInjuries && <li>Lesões: {viewAssessment.content.historyInjuriesDesc}</li>}
                                        {viewAssessment.content.historySurgeries && <li>Cirurgias: {viewAssessment.content.historySurgeriesDesc}</li>}
                                        {viewAssessment.content.clinicalConditions?.map((c:string) => <li key={c}>{c}</li>)}
                                        {viewAssessment.content.clinicalOther && <li>Outros: {viewAssessment.content.clinicalOther}</li>}
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">3. Análise Física</h3>
                                    <p><strong>Postura:</strong> {viewAssessment.content.postureObs}</p>
                                    <p><strong>Mobilidade:</strong> {viewAssessment.content.mobilityFlexibility} - {viewAssessment.content.mobilityObs}</p>
                                    <p><strong>Força:</strong> {viewAssessment.content.strengthGlobal}/5 - {viewAssessment.content.strengthObs}</p>
                                </section>

                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">4. Conclusão</h3>
                                    <p><strong>Objetivos Aluno:</strong> {viewAssessment.content.studentGoals}</p>
                                    <p><strong>Parecer Instrutor:</strong> {viewAssessment.content.instructorOpinion}</p>
                                    <p><strong>Info Adicional:</strong> {viewAssessment.content.additionalInfo}</p>
                                </section>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {viewAssessment.content.fields?.map((field: any) => (
                                    <div key={field.id} className="border-b pb-2">
                                        <p className="font-bold text-sm text-slate-600 mb-1">{field.label}</p>
                                        <p className="text-slate-900">
                                            {Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between text-xs text-slate-400">
                            <p>Gerado por Plataforma VOLL IA</p>
                            <p>Confidencial</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
