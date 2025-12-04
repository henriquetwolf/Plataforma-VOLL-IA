
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from '../services/studentService';
import { fetchInstructors } from '../services/instructorService';
import { saveAssessment, fetchAssessments, deleteAssessment, saveAssessmentTemplate, fetchAssessmentTemplates, deleteAssessmentTemplate } from '../services/assessmentService';
import { Student, Instructor, StudentAssessment, AssessmentTemplate } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ClipboardList, Plus, History, Search, Trash2, Eye, FileText, Printer, Save, Layout, ArrowRight, X, ArrowLeft, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- SIMPLE EVALUATION TYPES ---
interface SimpleFormState {
  studentId: string;
  studentName: string;
  studentAge: string;
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
  clinicalConditions: string[];
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
  mobilityFlexibility: string;
  mobilityObs: string;
  strengthGlobal: string;
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

// --- COMPONENTS DEFINED OUTSIDE TO PREVENT RE-RENDER FOCUS LOSS ---

const SectionHeader = ({ title, icon: Icon }: any) => (
  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700 mt-6 mb-4">
      {Icon && <Icon className="w-5 h-5 text-brand-600" />}
      <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-wide">{title}</h3>
  </div>
);

interface FieldBuilderProps {
    label: string;
    setLabel: (val: string) => void;
    type: CustomField['type'];
    setType: (val: CustomField['type']) => void;
    options: string;
    setOptions: (val: string) => void;
    onAdd: () => void;
}

const FieldBuilder: React.FC<FieldBuilderProps> = ({ label, setLabel, type, setType, options, setOptions, onAdd }) => (
  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-lg mb-4 grid gap-4 animate-in fade-in">
      <Input label="Pergunta / Rótulo" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Qual seu objetivo?" autoFocus />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tipo de Campo</label>
              <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="text">Texto Curto</option>
                  <option value="long_text">Texto Longo</option>
                  <option value="radio">Múltipla Escolha</option>
                  <option value="checkbox">Caixas de Seleção</option>
                  <option value="select">Lista Suspensa</option>
              </select>
          </div>
          {['radio', 'checkbox', 'select'].includes(type) && (
              <Input label="Opções (separar por vírgula)" value={options} onChange={e => setOptions(e.target.value)} placeholder="Sim, Não, Talvez" />
          )}
      </div>
      <Button onClick={onAdd} size="sm" variant="secondary" className="self-end" disabled={!label}>
          <Plus className="w-4 h-4 mr-2"/> Adicionar Campo
      </Button>
  </div>
);

export const StudentAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'templates' | 'history'>('new');
  
  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NEW EVALUATION FLOW STATE ---
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [formMode, setFormMode] = useState<'none' | 'simple' | 'custom'>('none');
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null);

  // Forms Data
  const [simpleForm, setSimpleForm] = useState<SimpleFormState>(INITIAL_SIMPLE_FORM);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // --- TEMPLATE MANAGER STATE ---
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateFields, setTemplateFields] = useState<CustomField[]>([]);
  
  // Field Builder (Shared)
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
        const [s, i, a, t] = await Promise.all([
            fetchStudents(targetId),
            fetchInstructors(targetId),
            fetchAssessments(targetId),
            fetchAssessmentTemplates(targetId)
        ]);
        setStudents(s);
        setInstructors(i);
        setAssessments(a);
        setTemplates(t);
        
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

  const initSimpleForm = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    setSimpleForm({
        ...INITIAL_SIMPLE_FORM,
        studentId: student.id,
        studentName: student.name,
        studentAge: calculateAge(student.birthDate),
        evaluatorId: user?.isInstructor ? (user.dbId || user.id) : (user?.id || ''),
        evaluatorName: user?.name || ''
    });
  };

  const initCustomForm = (studentId: string, template: AssessmentTemplate) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    // Initialize fields with empty values based on template structure
    const initializedFields = template.fields.map((f: any) => ({
        ...f,
        value: f.type === 'checkbox' ? [] : ''
    }));

    setCustomFields(initializedFields);
    // We reuse simpleForm for header data (Evaluator, Date, Student Info)
    setSimpleForm(prev => ({
        ...prev,
        studentId: student.id,
        studentName: student.name,
        studentAge: calculateAge(student.birthDate),
        evaluatorId: user?.isInstructor ? (user.dbId || user.id) : (user?.id || ''),
        evaluatorName: user?.name || ''
    }));
  };

  const handleSaveSimple = async () => {
    if (!user) return;
    const targetId = user.isInstructor ? user.studioId : user.id;
    if (!targetId || !simpleForm.studentId) return;

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
        alert("Avaliação salva!");
        loadData();
        setFormMode('none');
        setSelectedStudent('');
        setActiveTab('history');
    } else {
        alert("Erro: " + result.error);
    }
  };

  const handleSaveCustomAssessment = async () => {
    if (!user || !selectedTemplate) return;
    const targetId = user.isInstructor ? user.studioId : user.id;
    
    const result = await saveAssessment(targetId!, {
        studioId: targetId!,
        studentId: simpleForm.studentId,
        instructorId: simpleForm.evaluatorId || undefined,
        studentName: simpleForm.studentName,
        instructorName: simpleForm.evaluatorName,
        type: 'custom',
        title: selectedTemplate.title,
        content: {
            ...simpleForm, // Header data
            fields: customFields
        }
    });

    if (result.success) {
        alert("Avaliação salva!");
        loadData();
        setFormMode('none');
        setSelectedStudent('');
        setCustomFields([]);
        setActiveTab('history');
    } else {
        alert("Erro: " + result.error);
    }
  };

  // --- TEMPLATE BUILDER ---
  const addFieldToTemplate = () => {
    if (!newFieldLabel) return;
    const options = ['radio', 'checkbox', 'select'].includes(newFieldType) 
        ? newFieldOptions.split(',').map(s => s.trim()) 
        : undefined;
    
    setTemplateFields([...templateFields, {
        id: crypto.randomUUID(),
        label: newFieldLabel,
        type: newFieldType,
        options,
        value: '' // Placeholder
    }]);
    setNewFieldLabel('');
    setNewFieldOptions('');
  };

  const saveNewTemplate = async () => {
      if (!user || !templateTitle) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      
      const result = await saveAssessmentTemplate(targetId!, templateTitle, templateFields);
      if (result.success) {
          alert("Modelo criado!");
          loadData();
          setIsCreatingTemplate(false);
          setTemplateFields([]);
          setTemplateTitle('');
      } else {
          alert("Erro: " + result.error);
      }
  };

  const handleDeleteTemplate = async (id: string) => {
      if (confirm("Excluir este modelo?")) {
          await deleteAssessmentTemplate(id);
          loadData();
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ClipboardList className="text-brand-600"/> Avaliação Física
            </h1>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
                <button onClick={() => { setActiveTab('new'); setSelectedStudent(''); setFormMode('none'); }} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Nova Avaliação</button>
                <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'templates' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Gerenciar Modelos</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Histórico</button>
            </div>
        </div>

        {/* --- TAB: NEW ASSESSMENT FLOW --- */}
        {activeTab === 'new' && (
            <div className="space-y-8 mt-4">
                
                {/* STEP 1: SELECT STUDENT */}
                {formMode === 'none' && !selectedStudent && (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">1. Selecione o Aluno</h2>
                        <div className="relative">
                            <select 
                                className="w-full p-4 text-lg border-2 border-brand-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:border-brand-500 outline-none transition-colors cursor-pointer"
                                value={selectedStudent}
                                onChange={e => setSelectedStudent(e.target.value)}
                            >
                                <option value="">-- Escolha um Aluno da Lista --</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* STEP 2: SELECT MODEL */}
                {formMode === 'none' && selectedStudent && (
                    <div className="animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-4 mb-6">
                            <Button variant="ghost" onClick={() => setSelectedStudent('')}><ArrowLeft className="w-4 h-4 mr-2"/> Voltar</Button>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Escolha o Modelo de Avaliação</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Standard Model Card */}
                            <button 
                                onClick={() => { initSimpleForm(selectedStudent); setFormMode('simple'); }}
                                className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-brand-100 dark:border-brand-900/30 hover:border-brand-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="absolute top-4 right-4 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                <div className="bg-brand-50 dark:bg-brand-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText className="w-8 h-8 text-brand-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Modelo Padrão VOLL</h3>
                                <p className="text-sm text-slate-500 text-center">Avaliação completa com anamnese, dor, postura e testes físicos.</p>
                            </button>

                            {/* Custom Templates Cards */}
                            {templates.map(tpl => (
                                <button 
                                    key={tpl.id}
                                    onClick={() => { setSelectedTemplate(tpl); initCustomForm(selectedStudent, tpl); setFormMode('custom'); }}
                                    className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                                >
                                    <div className="absolute top-4 right-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Layout className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 text-center">{tpl.title}</h3>
                                    <p className="text-sm text-slate-500 text-center">{tpl.fields.length} campos personalizados.</p>
                                </button>
                            ))}

                            {/* Create New Shortcut */}
                            <button 
                                onClick={() => setActiveTab('templates')}
                                className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-left flex flex-col items-center justify-center min-h-[200px] text-slate-400 group"
                            >
                                <Plus className="w-8 h-8 mb-2 group-hover:text-slate-600 dark:group-hover:text-slate-300"/>
                                <span className="font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300">Criar Novo Modelo</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: FILL FORM (Simple or Custom) */}
                {(formMode === 'simple' || formMode === 'custom') && (
                    <div className="animate-in slide-in-from-bottom-8">
                        <div className="flex items-center justify-between mb-6">
                            <Button variant="ghost" onClick={() => setFormMode('none')}><ArrowLeft className="w-4 h-4 mr-2"/> Trocar Modelo</Button>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {formMode === 'simple' ? 'Avaliação Padrão VOLL' : selectedTemplate?.title}
                            </h2>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            {/* Standard Header Data (Common to both) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg mb-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Aluno</label>
                                    <Input value={simpleForm.studentName} readOnly className="bg-white dark:bg-slate-900" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                                    <Input type="date" value={simpleForm.date} onChange={e => setSimpleForm({...simpleForm, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Avaliador</label>
                                    <Input value={simpleForm.evaluatorName} readOnly />
                                </div>
                            </div>

                            {/* Render Specific Form Content */}
                            {formMode === 'simple' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Idade</label><Input value={simpleForm.studentAge} readOnly className="bg-slate-100 dark:bg-slate-800" /></div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase">Sexo</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.studentSex} onChange={e => setSimpleForm({...simpleForm, studentSex: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                <option>Feminino</option>
                                                <option>Masculino</option>
                                                <option>Outro</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 1. Queixa */}
                                    <SectionHeader title="1. Queixa Principal" />
                                    <Input label="Qual a queixa principal?" value={simpleForm.complaint} onChange={e => setSimpleForm({...simpleForm, complaint: e.target.value})} />
                                    
                                    <div className="flex gap-6 items-center my-4">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Sente dor?</span>
                                        <label className="flex gap-2"><input type="radio" checked={simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: true})} /> Sim</label>
                                        <label className="flex gap-2"><input type="radio" checked={!simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: false})} /> Não</label>
                                    </div>

                                    {simpleForm.hasPain && (
                                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <Input label="Local da dor" value={simpleForm.painLocation} onChange={e => setSimpleForm({...simpleForm, painLocation: e.target.value})} />
                                                <div>
                                                    <label className="block text-sm font-medium mb-1 dark:text-red-200">Desde quando?</label>
                                                    <select className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white" value={simpleForm.painDuration} onChange={e => setSimpleForm({...simpleForm, painDuration: e.target.value})}>
                                                        <option>Dias</option>
                                                        <option>Semanas</option>
                                                        <option>Meses</option>
                                                        <option>Anos</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="my-4">
                                                <label className="block text-sm font-medium mb-2 dark:text-red-200">Intensidade (0-10): <span className="font-bold text-red-600">{simpleForm.painIntensity}</span></label>
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
                                            <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.historyInjuries} onChange={e => setSimpleForm({...simpleForm, historyInjuries: e.target.checked})} /> Lesões Prévias</label>
                                            {simpleForm.historyInjuries && <Input placeholder="Quais?" value={simpleForm.historyInjuriesDesc} onChange={e => setSimpleForm({...simpleForm, historyInjuriesDesc: e.target.value})} />}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.historySurgeries} onChange={e => setSimpleForm({...simpleForm, historySurgeries: e.target.checked})} /> Cirurgias</label>
                                            {simpleForm.historySurgeries && <Input placeholder="Quais?" value={simpleForm.historySurgeriesDesc} onChange={e => setSimpleForm({...simpleForm, historySurgeriesDesc: e.target.value})} />}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.historyChronicPain} onChange={e => setSimpleForm({...simpleForm, historyChronicPain: e.target.checked})} /> Episódios de Dor Crônica</label>
                                            {simpleForm.historyChronicPain && <Input placeholder="Descrição" value={simpleForm.historyChronicPainDesc} onChange={e => setSimpleForm({...simpleForm, historyChronicPainDesc: e.target.value})} />}
                                        </div>
                                    </div>

                                    {/* 3. Clínico */}
                                    <SectionHeader title="3. Condições Clínicas" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['Hipertensão', 'Diabetes', 'Cardiopatias', 'Artrose/Artrite', 'LER/DORT', 'Hernia de Disco', 'Gestante', 'Pós-parto'].map(cond => (
                                            <label key={cond} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer hover:border-brand-300">
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
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Atividade Física</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.activityLevel} onChange={e => setSimpleForm({...simpleForm, activityLevel: e.target.value})}>
                                                <option>Sedentário</option>
                                                <option>1-2x/semana</option>
                                                <option>3-4x/semana</option>
                                                <option>5+ vezes/semana</option>
                                            </select>
                                        </div>
                                        <Input label="Esportes (separar por vírgula)" value={simpleForm.sports.join(', ')} onChange={e => setSimpleForm({...simpleForm, sports: e.target.value.split(',')})} />
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Trabalho Sentado (h)</label>
                                            <input type="number" className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.workSitting} onChange={e => setSimpleForm({...simpleForm, workSitting: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Trabalho em Pé (h)</label>
                                            <input type="number" className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.workStanding} onChange={e => setSimpleForm({...simpleForm, workStanding: e.target.value})} />
                                        </div>
                                        
                                        <div className="md:col-span-2">
                                            <label className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.repetitiveMotion} onChange={e => setSimpleForm({...simpleForm, repetitiveMotion: e.target.checked})} /> Movimentos Repetitivos?</label>
                                            {simpleForm.repetitiveMotion && <Input placeholder="Quais?" value={simpleForm.repetitiveMotionDesc} onChange={e => setSimpleForm({...simpleForm, repetitiveMotionDesc: e.target.value})} />}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Sono (Qualidade)</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.sleepQuality} onChange={e => setSimpleForm({...simpleForm, sleepQuality: e.target.value})}>
                                                <option>Ótimo</option>
                                                <option>Bom</option>
                                                <option>Regular</option>
                                                <option>Ruim</option>
                                            </select>
                                        </div>
                                        <Input label="Horas por noite" value={simpleForm.sleepHours} onChange={e => setSimpleForm({...simpleForm, sleepHours: e.target.value})} />
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Estresse</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.stressLevel} onChange={e => setSimpleForm({...simpleForm, stressLevel: e.target.value})}>
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
                                        className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-24" 
                                        placeholder="Ex: Cabeça protraída, hiperlordose..." 
                                        value={simpleForm.postureObs} 
                                        onChange={e => setSimpleForm({...simpleForm, postureObs: e.target.value})}
                                    />

                                    {/* 6. Mobilidade */}
                                    <SectionHeader title="6. Mobilidade e Flexibilidade" />
                                    <div className="mb-2">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Nível Geral</label>
                                        <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.mobilityFlexibility} onChange={e => setSimpleForm({...simpleForm, mobilityFlexibility: e.target.value})}>
                                            <option>Excelente</option>
                                            <option>Boa</option>
                                            <option>Moderada</option>
                                            <option>Reduzida</option>
                                            <option>Muito Reduzida</option>
                                        </select>
                                    </div>
                                    <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-20" placeholder="Obs específicas..." value={simpleForm.mobilityObs} onChange={e => setSimpleForm({...simpleForm, mobilityObs: e.target.value})} />

                                    {/* 7. Força */}
                                    <SectionHeader title="7. Força Muscular" />
                                    <div className="mb-2">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Força Global (0-5)</label>
                                        <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.strengthGlobal} onChange={e => setSimpleForm({...simpleForm, strengthGlobal: e.target.value})}>
                                            <option value="5">5 - Excelente</option>
                                            <option value="4">4 - Boa Resistência</option>
                                            <option value="3">3 - Com compensações</option>
                                            <option value="2">2 - Fraca</option>
                                            <option value="1">1 - Muito Fraca</option>
                                            <option value="0">0 - Incapaz</option>
                                        </select>
                                    </div>
                                    <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-20" placeholder="Obs..." value={simpleForm.strengthObs} onChange={e => setSimpleForm({...simpleForm, strengthObs: e.target.value})} />

                                    {/* 8-11 Conclusão */}
                                    <SectionHeader title="Conclusão" />
                                    <Input label="8. Objetivos do Aluno" value={simpleForm.studentGoals} onChange={e => setSimpleForm({...simpleForm, studentGoals: e.target.value})} />
                                    <Input label="9. Opinião do Instrutor (Objetivos propostos)" value={simpleForm.instructorOpinion} onChange={e => setSimpleForm({...simpleForm, instructorOpinion: e.target.value})} />
                                    
                                    <div className="my-4">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">10. Grau de Certeza</label>
                                        <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.confidenceLevel} onChange={e => setSimpleForm({...simpleForm, confidenceLevel: e.target.value})}>
                                            <option>100% seguro</option>
                                            <option>Acho que acertei a maioria</option>
                                            <option>Estou inseguro</option>
                                        </select>
                                    </div>

                                    <div className="my-4">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">11. Informações Adicionais / Testes</label>
                                        <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-32" value={simpleForm.additionalInfo} onChange={e => setSimpleForm({...simpleForm, additionalInfo: e.target.value})} />
                                    </div>

                                    <Button onClick={handleSaveSimple} className="w-full text-lg py-4 shadow-lg shadow-brand-200">Salvar Avaliação Padrão</Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {customFields.map((field) => (
                                        <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <label className="block font-medium mb-2 text-slate-800 dark:text-white">{field.label}</label>
                                            
                                            {field.type === 'text' && (
                                                <input className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={field.value} onChange={e => {
                                                    setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: e.target.value} : f));
                                                }} />
                                            )}
                                            
                                            {field.type === 'long_text' && (
                                                <textarea className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg h-24 bg-white dark:bg-slate-950" value={field.value} onChange={e => {
                                                    setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: e.target.value} : f));
                                                }} />
                                            )}
                                            
                                            {field.type === 'select' && (
                                                <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={field.value} onChange={e => {
                                                    setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: e.target.value} : f));
                                                }}>
                                                    <option value="">Selecione...</option>
                                                    {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                                                </select>
                                            )}

                                            {field.type === 'radio' && (
                                                <div className="space-y-2">
                                                    {field.options?.map(opt => (
                                                        <label key={opt} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                            <input 
                                                                type="radio" 
                                                                name={field.id} 
                                                                checked={field.value === opt}
                                                                onChange={() => setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: opt} : f))}
                                                            />
                                                            {opt}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {field.type === 'checkbox' && (
                                                <div className="space-y-2">
                                                    {field.options?.map(opt => (
                                                        <label key={opt} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                            <input 
                                                                type="checkbox"
                                                                checked={(field.value as string[]).includes(opt)}
                                                                onChange={e => {
                                                                    const current = field.value as string[];
                                                                    const newVal = e.target.checked 
                                                                        ? [...current, opt]
                                                                        : current.filter(x => x !== opt);
                                                                    setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: newVal} : f));
                                                                }}
                                                            />
                                                            {opt}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    
                                    <Button onClick={handleSaveCustomAssessment} className="w-full mt-8 py-4 shadow-lg shadow-purple-200">Salvar Avaliação Personalizada</Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TAB: TEMPLATES --- */}
        {activeTab === 'templates' && (
            <div className="space-y-6">
                {!isCreatingTemplate ? (
                    <>
                        <div className="flex justify-end">
                            <Button onClick={() => setIsCreatingTemplate(true)}>
                                <Plus className="w-4 h-4 mr-2"/> Criar Novo Modelo
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand-300 transition-colors">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{tpl.title}</h3>
                                        <p className="text-sm text-slate-500">{tpl.fields.length} campos configurados.</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                        <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="col-span-3 text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    Nenhum modelo criado.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar Modelo de Avaliação</h2>
                            <Button variant="ghost" onClick={() => { setIsCreatingTemplate(false); setTemplateFields([]); }}>Cancelar</Button>
                        </div>
                        
                        <div className="space-y-6">
                            <Input label="Título do Modelo" value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder="Ex: Avaliação Postural Simplificada" />
                            
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Adicionar Campos</h3>
                                
                                <FieldBuilder 
                                    label={newFieldLabel} 
                                    setLabel={setNewFieldLabel} 
                                    type={newFieldType} 
                                    setType={setNewFieldType} 
                                    options={newFieldOptions} 
                                    setOptions={setNewFieldOptions} 
                                    onAdd={addFieldToTemplate} 
                                />
                                
                                <div className="space-y-2 mt-4">
                                    {templateFields.map((field, idx) => (
                                        <div key={field.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                                            <div>
                                                <span className="font-bold text-sm mr-2 text-slate-500">{idx+1}.</span>
                                                <span className="text-sm font-medium text-slate-800 dark:text-white">{field.label}</span>
                                                <span className="text-xs text-slate-500 ml-2 uppercase">({field.type})</span>
                                            </div>
                                            <button onClick={() => setTemplateFields(templateFields.filter(f => f.id !== field.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                    {templateFields.length === 0 && <p className="text-slate-400 text-sm italic text-center">Nenhum campo adicionado.</p>}
                                </div>
                            </div>

                            <Button onClick={saveNewTemplate} className="w-full mt-4" disabled={templateFields.length === 0}>Salvar Modelo</Button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TAB: HISTORY VIEW --- */}
        {activeTab === 'history' && !viewAssessment && (
            <div className="space-y-4 animate-in fade-in">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input className="w-full pl-10 p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Buscar por aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {assessments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                        <p>Nenhuma avaliação encontrada.</p>
                    </div>
                ) : (
                    assessments.filter(a => a.studentName.toLowerCase().includes(searchTerm.toLowerCase())).map(a => (
                        <div key={a.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center hover:border-brand-300 transition-colors">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{a.studentName}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold uppercase">{a.type === 'simple' ? 'Padrão' : 'Personalizada'}</span>
                                    {a.title} • {new Date(a.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setViewAssessment(a)}><Eye className="w-4 h-4 mr-2"/> Ver</Button>
                                <button onClick={async () => { if(confirm("Deletar?")) { await deleteAssessment(a.id); loadData(); } }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* --- VIEW / PRINT MODAL --- */}
        {viewAssessment && (
            <div className="fixed inset-0 bg-black/60 z-50 flex justify-center overflow-y-auto py-10 animate-in fade-in">
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
