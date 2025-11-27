
import React from 'react';
import { PathologyResponse, LessonPlanResponse, LessonExercise } from '../../types';
import { Button } from '../ui/Button';
import { CheckCircle, AlertOctagon, Info, Save, RefreshCw, Printer } from 'lucide-react';

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
              <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">
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

// --- LESSON PLAN VIEW ---
interface LessonPlanProps {
  plan: LessonPlanResponse;
  onSaveLesson: (name: string, patient: string, exercises: LessonExercise[]) => void;
  onRegenerateExercise: (index: number, exercise: LessonExercise) => void;
}

export const LessonPlanView: React.FC<LessonPlanProps> = ({ plan, onSaveLesson, onRegenerateExercise }) => {
  const [exercises, setExercises] = useState(plan.exercises);
  const [patientName, setPatientName] = useState('');
  const [customTitle, setCustomTitle] = useState(`${plan.pathologyName} - Aula 1`);

  const handleSave = () => {
    if (!patientName.trim()) {
      alert("Digite o nome do paciente para salvar.");
      return;
    }
    onSaveLesson(customTitle, patientName, exercises);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-none">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 print:hidden">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome do Paciente</label>
            <input 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Ex: João Silva"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
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
             <Button onClick={handleSave} className="h-[38px]">
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
            {patientName && <p className="print:block hidden"><strong>Paciente:</strong> {patientName}</p>}
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
    </div>
  );
};

import { useState } from 'react';
