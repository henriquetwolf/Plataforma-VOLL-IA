
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchEvaluationsByStudio, deleteEvaluation } from '../services/evaluationService';
import { ClassEvaluation } from '../types';
import { Button } from '../components/ui/Button';
import { Star, MessageSquare, Calendar, User, Activity, AlertTriangle, ThumbsUp, Trash2, Filter, Loader2, XCircle } from 'lucide-react';

export const StudioEvaluations: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<ClassEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Filters
  const [filterInstructor, setFilterInstructor] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterDate, setFilterDate] = useState<'all' | 'week' | 'month'>('all');

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

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta avaliação permanentemente?")) {
      setDeletingId(id);
      const result = await deleteEvaluation(id);
      
      if (result.success) {
        setEvaluations(prev => prev.filter(e => e.id !== id));
      } else {
        console.error("Erro ao excluir:", result.error);
        alert(`Erro ao excluir: ${result.error}\n\nVerifique se o SQL de permissões (DROP/CREATE POLICY) foi rodado no Supabase.`);
      }
      setDeletingId(null);
    }
  };

  const uniqueInstructors = Array.from(new Set(evaluations.map(e => e.instructorName))).sort();
  const uniqueStudents = Array.from(new Set(evaluations.map(e => e.studentName))).sort();

  const filteredEvaluations = evaluations.filter(e => {
    const matchInstructor = !filterInstructor || e.instructorName === filterInstructor;
    const matchStudent = !filterStudent || e.studentName === filterStudent;
    
    let matchDate = true;
    if (filterDate !== 'all') {
      const evalDate = new Date(e.classDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - evalDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filterDate === 'week') matchDate = diffDays <= 7;
      if (filterDate === 'month') matchDate = diffDays <= 30;
    }

    return matchInstructor && matchStudent && matchDate;
  });

  const averageRating = filteredEvaluations.length 
    ? (filteredEvaluations.reduce((acc, curr) => acc + curr.rating, 0) / filteredEvaluations.length).toFixed(1) 
    : '0.0';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
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

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm w-full md:w-auto">
          <Filter className="w-4 h-4" /> Filtros:
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <select 
              className="w-full sm:w-auto p-2 pl-3 pr-8 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
              value={filterInstructor}
              onChange={e => setFilterInstructor(e.target.value)}
            >
              <option value="">Todos Instrutores</option>
              {uniqueInstructors.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select 
              className="w-full sm:w-auto p-2 pl-3 pr-8 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
              value={filterStudent}
              onChange={e => setFilterStudent(e.target.value)}
            >
              <option value="">Todos Alunos</option>
              {uniqueStudents.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select 
              className="w-full sm:w-auto p-2 pl-3 pr-8 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value as any)}
            >
              <option value="all">Todo o Período</option>
              <option value="week">Última Semana</option>
              <option value="month">Último Mês</option>
            </select>
          </div>
          
          {(filterInstructor || filterStudent || filterDate !== 'all') && (
             <button 
               onClick={() => { setFilterInstructor(''); setFilterStudent(''); setFilterDate('all'); }}
               className="text-xs text-slate-400 hover:text-slate-600 underline self-center"
             >
               Limpar
             </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2"/>
          Carregando avaliações...
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhuma avaliação encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvaluations.map(eva => (
            <div key={eva.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:border-brand-300 transition-colors flex flex-col group relative">
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(eva.classDate).toLocaleDateString()}
                    </span>
                    <button 
                        onClick={() => handleDelete(eva.id)} 
                        disabled={deletingId === eva.id}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        title="Excluir Avaliação"
                    >
                        {deletingId === eva.id ? <Loader2 className="w-4 h-4 animate-spin text-red-500"/> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
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
