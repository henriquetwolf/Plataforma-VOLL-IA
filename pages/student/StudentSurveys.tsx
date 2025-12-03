
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAvailableSurveys, fetchSurveyQuestions, submitSurveyResponse } from '../../services/surveyService';
import { Survey, SurveyQuestion } from '../../types';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, ClipboardList, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppRoute } from '../../types';

// Generic Survey Form Component (Can be reused for instructors)
export const SurveyAnswerForm: React.FC<{ survey: Survey; userId: string; userName: string; userType: 'student' | 'instructor'; onComplete: () => void; onCancel: () => void }> = ({ survey, userId, userName, userType, onComplete, onCancel }) => {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSurveyQuestions(survey.id).then(qs => {
      setQuestions(qs);
      setLoading(false);
    });
  }, [survey.id]);

  const handleAnswerChange = (qId: string, value: string, type: string) => {
    if (type === 'checkbox') {
        const current = (answers[qId] as string[]) || [];
        if (current.includes(value)) {
            setAnswers({ ...answers, [qId]: current.filter(v => v !== value) });
        } else {
            setAnswers({ ...answers, [qId]: [...current, value] });
        }
    } else {
        setAnswers({ ...answers, [qId]: value });
    }
  };

  const handleSubmit = async () => {
    // Validate required
    for (const q of questions) {
        if (q.required) {
            const ans = answers[q.id];
            if (!ans || (Array.isArray(ans) && ans.length === 0)) {
                alert(`A pergunta "${q.text}" é obrigatória.`);
                return;
            }
        }
    }

    setSubmitting(true);
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({ questionId: qId, value: val }));
    
    const result = await submitSurveyResponse(survey.id, userId, userName, userType, formattedAnswers);
    setSubmitting(false);

    if (result.success) {
        alert("Obrigado por responder!");
        onComplete();
    } else {
        alert("Erro ao enviar: " + result.error);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando perguntas...</div>;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{survey.title}</h2>
        {survey.description && <p className="text-slate-500 mb-6">{survey.description}</p>}

        <div className="space-y-6">
            {questions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        {idx + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {q.type === 'text' && (
                        <input className="w-full p-2 border rounded dark:bg-slate-950 dark:border-slate-700" value={answers[q.id] as string || ''} onChange={e => handleAnswerChange(q.id, e.target.value, 'text')} />
                    )}
                    {q.type === 'long_text' && (
                        <textarea className="w-full p-2 border rounded dark:bg-slate-950 dark:border-slate-700" rows={3} value={answers[q.id] as string || ''} onChange={e => handleAnswerChange(q.id, e.target.value, 'long_text')} />
                    )}
                    {q.type === 'select' && (
                        <select className="w-full p-2 border rounded dark:bg-slate-950 dark:border-slate-700" value={answers[q.id] as string || ''} onChange={e => handleAnswerChange(q.id, e.target.value, 'select')}>
                            <option value="">Selecione...</option>
                            {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    )}
                    {q.type === 'radio' && (
                        <div className="space-y-1">
                            {q.options?.map(opt => (
                                <label key={opt} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => handleAnswerChange(q.id, opt, 'radio')} />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    )}
                    {q.type === 'checkbox' && (
                        <div className="space-y-1">
                            {q.options?.map(opt => (
                                <label key={opt} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <input type="checkbox" value={opt} checked={((answers[q.id] as string[]) || []).includes(opt)} onChange={() => handleAnswerChange(q.id, opt, 'checkbox')} />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSubmit} isLoading={submitting}>Enviar Respostas</Button>
        </div>
    </div>
  );
};

export const StudentSurveys: React.FC = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    const load = async () => {
        if (user?.studioId && user?.id) {
            const data = await fetchAvailableSurveys(user.studioId, 'student', user.id);
            setSurveys(data);
        }
        setLoading(false);
    };
    load();
  }, [user]);

  if (selectedSurvey && user) {
      return (
          <div className="max-w-3xl mx-auto p-4 animate-in fade-in">
              <SurveyAnswerForm 
                survey={selectedSurvey} 
                userId={user.id} 
                userName={user.name} 
                userType="student" 
                onCancel={() => setSelectedSurvey(null)}
                onComplete={() => { setSelectedSurvey(null); window.location.reload(); }}
              />
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600"/>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <ClipboardList className="text-blue-600"/> Pesquisas
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
           <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3"/>
           <p className="text-slate-500">Você respondeu todas as pesquisas disponíveis!</p>
        </div>
      ) : (
        <div className="space-y-4">
            {surveys.map(s => (
                <div key={s.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{s.title}</h3>
                        <p className="text-slate-500 text-sm">Pesquisa do Studio</p>
                    </div>
                    <Button onClick={() => setSelectedSurvey(s)}>Responder</Button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
