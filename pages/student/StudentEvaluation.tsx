
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchInstructorsForStudent, saveEvaluation } from '../../services/evaluationService';
import { Instructor, AppRoute } from '../../types';
import { Button } from '../../components/ui/Button';
import { Star, ArrowLeft, CheckCircle, Calendar, Heart, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const FEELING_OPTIONS = ['Muito melhor', 'Melhor', 'Neutro', 'Cansado', 'Desconfortável'];
const PACE_OPTIONS = ['Abaixo do esperado', 'Adequados', 'Acima do esperado'];

export const StudentEvaluation: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [loading, setLoading] = useState(true); 
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(0);
  const [feeling, setFeeling] = useState('');
  const [pace, setPace] = useState('');
  const [discomfort, setDiscomfort] = useState('');
  const [suggestions, setSuggestions] = useState('');

  useEffect(() => {
    const loadInstructors = async () => {
      setLoadingInstructors(true);
      if (user?.studioId) {
        const data = await fetchInstructorsForStudent(user.studioId);
        setInstructors(data);
        
        // Auto-select if only one instructor
        if (data.length === 1) {
            setSelectedInstructorId(data[0].id);
        }
      }
      setLoadingInstructors(false);
      setLoading(false);
    };
    loadInstructors();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.studioId) return;
    
    if (!selectedInstructorId || rating === 0 || !feeling || !pace) {
      alert("Por favor, preencha todos os campos obrigatórios e dê sua nota.");
      return;
    }

    const selectedInstructor = instructors.find(i => i.id === selectedInstructorId);

    setSubmitting(true);
    const result = await saveEvaluation({
      studioId: user.studioId,
      studentId: user.id,
      studentName: user.name,
      instructorId: selectedInstructorId,
      instructorName: selectedInstructor?.name || 'Instrutor',
      classDate,
      rating,
      feeling,
      pace,
      discomfort,
      suggestions
    });

    if (result.success) {
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert("Erro ao enviar avaliação: " + result.error);
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Avaliação Enviada!</h2>
        <p className="text-slate-500 mb-8">Obrigado pelo seu feedback. Isso nos ajuda a melhorar cada vez mais.</p>
        <Button onClick={() => navigate(AppRoute.STUDENT_DASHBOARD)}>Voltar ao Início</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600"/>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Avaliar Aula
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
             <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-600" />
             Carregando formulário...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Detalhes da Aula */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-600" /> Detalhes da Aula
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instrutor</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                    value={selectedInstructorId}
                    onChange={e => setSelectedInstructorId(e.target.value)}
                    required
                    disabled={loadingInstructors}
                  >
                    <option value="">{loadingInstructors ? 'Carregando...' : 'Selecione...'}</option>
                    {instructors.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                    {!loadingInstructors && instructors.length === 0 && (
                      <option value="" disabled>Nenhum instrutor encontrado</option>
                    )}
                  </select>
                  {!loadingInstructors && instructors.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">Peça ao estúdio para cadastrar instrutores.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                  <input 
                    type="date"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                    value={classDate}
                    onChange={e => setClassDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* 2. Avaliação Geral */}
            <div className="space-y-4 text-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Como você avalia a aula de hoje?</h3>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star 
                      className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500">{rating > 0 ? (rating === 5 ? 'Excelente!' : rating === 1 ? 'Ruim' : '') : 'Toque nas estrelas'}</p>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* 3. Perguntas de Checkbox */}
            <div className="space-y-6">
              <div>
                <label className="block font-medium text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" /> Como você saiu da aula hoje?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FEELING_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFeeling(opt)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        feeling === opt 
                          ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/20' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> O ritmo e dificuldade estavam:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PACE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPace(opt)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        pace === opt 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* 4. Texto Aberto */}
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" /> Teve algum desconforto ou dificuldade?
                </label>
                <textarea
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 h-24 resize-none"
                  placeholder="Se sim, conte-nos um pouco (opcional)..."
                  value={discomfort}
                  onChange={e => setDiscomfort(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-800 dark:text-white mb-2">
                  Há algo que você gostaria que ajustássemos?
                </label>
                <textarea
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 h-24 resize-none"
                  placeholder="Sugestões para as próximas aulas (opcional)..."
                  value={suggestions}
                  onChange={e => setSuggestions(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg shadow-lg" isLoading={submitting}>
              Enviar Avaliação
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
