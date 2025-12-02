
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchEvaluationsByStudio } from '../services/evaluationService';
import { ClassEvaluation } from '../types';
import { Button } from '../components/ui/Button';
import { Star, MessageSquare, Calendar, User, Activity, AlertTriangle, ThumbsUp } from 'lucide-react';

export const StudioEvaluations: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<ClassEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInstructor, setFilterInstructor] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const data = await fetchEvaluationsByStudio(user.id);
        setEvaluations(data);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const uniqueInstructors = Array.from(new Set(evaluations.map(e => e.instructorName))).sort();
  const filteredEvaluations = filterInstructor 
    ? evaluations.filter(e => e.instructorName === filterInstructor)
    : evaluations;

  const averageRating = filteredEvaluations.length 
    ? (filteredEvaluations.reduce((acc, curr) => acc + curr.rating, 0) / filteredEvaluations.length).toFixed(1) 
    : '0.0';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="text-yellow-500 fill-yellow-500" /> Avaliações das Aulas
          </h1>
          <p className="text-slate-500">Feedback recebido dos alunos após as aulas.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Média Geral</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-1">
              {averageRating} <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{filteredEvaluations.length}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filtrar por Instrutor:</span>
        <select 
          className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          value={filterInstructor}
          onChange={e => setFilterInstructor(e.target.value)}
        >
          <option value="">Todos</option>
          {uniqueInstructors.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando avaliações...</div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhuma avaliação encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvaluations.map(eva => (
            <div key={eva.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:border-brand-300 transition-colors flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= eva.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 dark:text-slate-700'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(eva.classDate).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" /> {eva.studentName || 'Aluno(a)'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Aula com: <strong>{eva.instructorName}</strong>
                </p>
              </div>
              
              <div className="p-5 space-y-3 flex-1 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                    <span className="text-xs text-slate-400 block mb-1">Sensação</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{eva.feeling}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                    <span className="text-xs text-slate-400 block mb-1">Ritmo</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{eva.pace}</span>
                  </div>
                </div>

                {eva.discomfort && (
                  <div className="flex gap-2 items-start text-orange-700 bg-orange-50 dark:bg-orange-900/10 p-2 rounded border border-orange-100 dark:border-orange-900/30">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">Desconforto:</span>
                      <p className="leading-snug">{eva.discomfort}</p>
                    </div>
                  </div>
                )}

                {eva.suggestions && (
                  <div className="flex gap-2 items-start text-slate-600 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                    <div>
                      <span className="text-xs font-bold block text-slate-500">Sugestão:</span>
                      <p className="leading-snug">{eva.suggestions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};