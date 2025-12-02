
import React, { useState, useEffect } from 'react';
import { PathologyResponse, LessonPlanResponse, LessonExercise, Student } from '../../types';
import { Button } from '../ui/Button';
import { CheckCircle, AlertOctagon, Info, Save, RefreshCw, Printer, User, Bookmark, X, MessageCircle, Mail } from 'lucide-react';
import { fetchStudents } from '../../services/studentService';

// --- REFERENCE CARD ---
interface ResultCardProps {
  title: string;
  type: 'indicated' | 'contraindicated';
  items: any[];
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, type, items }) => {
  const isIndicated = type === 'indicated';
  const borderColor = isIndicated ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900';
  const bgColor = isIndicated ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10';
  const iconColor = isIndicated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const Icon = isIndicated ? CheckCircle : AlertOctagon;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      <div className={`p-4 border-b ${borderColor} flex items-center gap-2`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className={`font-bold ${iconColor}`}>{title}</h3>
      </div>
      <div className="p-4 space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-slate-800 dark:text-white">{item.name}</h4>
              <span className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-medium">
                {item.apparatus}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.reason}</p>
            {item.details && item.details !== "N/A" && (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Info className="h-3 w-3" /> {item.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- SAVE EXERCISE MODAL ---
const SaveExerciseModal: React.FC<{ 
  exercise: LessonExercise | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (comments: string) => void;
  isLoading: boolean;
}> = ({ exercise, isOpen, onClose, onConfirm, isLoading }) => {
  const [comments, setComments] = useState('');

  if (!isOpen || !exercise) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-brand-600" /> Salvar no Banco
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
          <p className="font-bold text-slate-800 dark:text-white">{exercise.name}</p>
          <p className="text-xs text-slate-500">{exercise.apparatus}</p>
        </div>

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Comentário do Instrutor (Opcional)
        </label>
        <textarea
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none h-24 resize-none mb-4"
          placeholder="Ex: Ótimo para alunos com encurtamento..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onConfirm(comments); setComments(''); }} isLoading={isLoading}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- LESSON PLAN VIEW ---
interface LessonPlanProps {
  plan: LessonPlanResponse;
  studentId?: string;
  studentName?: string;
  onSaveLesson: (name: string, patient: string, exercises: LessonExercise[], studentId?: string) => void;
  onRegenerateExercise: (index: number, exercise: LessonExercise) => void;
  onSaveToBank?: (exercise: LessonExercise, comments: string) => Promise<boolean>;
}

export const LessonPlanView: React.FC<LessonPlanProps> = ({ plan, studentId, studentName, onSaveLesson, onRegenerateExercise, onSaveToBank }) => {
  const [exercises, setExercises] = useState(plan.exercises);
  const [customTitle, setCustomTitle] = useState(`${plan.pathologyName} - Aula 1`);
  
  // States for Saving Exercise
  const [exerciseToSave, setExerciseToSave] = useState<LessonExercise | null>(null);
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  
  // Estado para seleção de aluno
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(studentId || '');
  const [patientName, setPatientName] = useState(studentName || '');

  // Carregar alunos ao montar
  useEffect(() => {
    fetchStudents().then(data => setStudents(data));
  }, []);

  // Atualizar quando props mudam
  useEffect(() => {
    if (studentId) setSelectedStudentId(studentId);
    if (studentName) setPatientName(studentName);
  }, [studentId, studentName]);

  // Atualizar nome quando selecionar aluno manualmente
  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedStudentId(id);
    if (id) {
      const student = students.find(s => s.id === id);
      if (student) setPatientName(student.name);
    } else {
      setPatientName('');
    }
  };

  const handleSave = () => {
    if (!patientName.trim()) {
      alert("Por favor, selecione um aluno para salvar o plano.");
      return;
    }
    onSaveLesson(customTitle, patientName, exercises, selectedStudentId);
  };

  const handleConfirmSaveExercise = async (comments: string) => {
    if (!exerciseToSave || !onSaveToBank) return;
    setIsSavingExercise(true);
    const success = await onSaveToBank(exerciseToSave, comments);
    setIsSavingExercise(false);
    if (success) {
      setExerciseToSave(null); // Fecha modal
    }
  };

  const handleWhatsAppShare = () => {
    let text = `*Plano de Aula: ${customTitle}*\n`;
    if (patientName) text += `*Aluno(a):* ${patientName}\n`;
    
    text += `\n*Foco:* ${plan.pathologyName}`;
    text += `\n*Objetivo:* ${plan.goal}`;
    text += `\n*Duração:* ${plan.duration}\n`;
    text += `\n*--- SEQUÊNCIA DE EXERCÍCIOS ---*\n`;

    exercises.forEach((ex, idx) => {
      text += `\n*${idx + 1}. ${ex.name}* (${ex.apparatus})`;
      text += `\n   👉 ${ex.reps} | ${ex.focus}`;
      text += `\n   📝 _${ex.instructions}_\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmailShare = () => {
    const subject = `Plano de Aula: ${customTitle}`;
    let body = `Aluno(a): ${patientName || 'N/A'}\n\n`;
    body += `Foco: ${plan.pathologyName}\n`;
    body += `Objetivo: ${plan.goal}\n`;
    body += `Duração: ${plan.duration}\n\n`;
    body += `--- SEQUÊNCIA DE EXERCÍCIOS ---\n`;

    exercises.forEach((ex, idx) => {
      body += `\n${idx + 1}. ${ex.name} (${ex.apparatus})\n`;
      body += `   Série: ${ex.reps} | Foco: ${ex.focus}\n`;
      body += `   Instrução: ${ex.instructions}\n`;
    });

    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-none">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 print:hidden">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <User className="w-3 h-3" /> Nome do Aluno
            </label>
            <select
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              value={selectedStudentId}
              onChange={handleStudentChange}
            >
              <option value="">Selecione um aluno cadastrado...</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            {students.length === 0 && (
              <p className="text-xs text-orange-500">Nenhum aluno encontrado. Cadastre em "Meus Alunos".</p>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Título da Aula</label>
            <input 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
             <Button 
                onClick={handleWhatsAppShare}
                className="h-[38px] bg-[#25D366] hover:bg-[#128C7E] text-white border-transparent px-3"
                title="Enviar por WhatsApp"
             >
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
             </Button>
             <Button 
                onClick={handleEmailShare}
                className="h-[38px] bg-red-600 hover:bg-red-700 text-white border-transparent px-3"
                title="Enviar por Email"
             >
                <Mail className="h-4 w-4 mr-2" /> Email
             </Button>
             <Button onClick={handleSave} className="h-[38px]" disabled={!selectedStudentId}>
               <Save className="h-4 w-4 mr-2" /> Salvar
             </Button>
             <Button variant="outline" onClick={() => window.print()} className="h-[38px]">
               <Printer className="h-4 w-4" />
             </Button>
          </div>
        </div>

        {/* Printable Header */}
        <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{customTitle}</h2>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-4">
            <p><strong>Objetivo:</strong> {plan.goal}</p>
            <p><strong>Duração:</strong> {plan.duration}</p>
            {patientName && <p className="print:block hidden"><strong>Aluno:</strong> {patientName}</p>}
          </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-4">
          {exercises.map((ex, idx) => (
            <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 group break-inside-avoid">
              <div className="flex-shrink-0 w-8 h-8 bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center font-bold text-sm">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 dark:text-white text-lg">{ex.name}</h4>
                  <span className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-medium">
                    {ex.apparatus}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 font-medium text-xs uppercase">Série / Reps</span>
                    <p className="text-slate-700 dark:text-slate-300">{ex.reps}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-xs uppercase">Foco</span>
                    <p className="text-slate-700 dark:text-slate-300">{ex.focus}</p>
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700 italic">
                  "{ex.instructions}"
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                {onSaveToBank && (
                  <button
                    onClick={() => setExerciseToSave(ex)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Salvar no Banco de Exercícios"
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                )}
                <button 
                  onClick={() => onRegenerateExercise(idx, ex)}
                  className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                  title="Trocar exercício"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SaveExerciseModal 
        exercise={exerciseToSave}
        isOpen={!!exerciseToSave}
        onClose={() => setExerciseToSave(null)}
        onConfirm={handleConfirmSaveExercise}
        isLoading={isSavingExercise}
      />
    </div>
  );
};
