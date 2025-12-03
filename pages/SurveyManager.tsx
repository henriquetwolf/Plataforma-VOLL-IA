
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createSurvey, fetchSurveysByStudio, deleteSurvey, toggleSurveyStatus, fetchSurveyDetailsWithResults } from '../services/surveyService';
import { Survey, SurveyQuestion, SurveyTarget, QuestionType, SurveyResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ClipboardList, Plus, Trash2, BarChart2, CheckCircle, X, Users, ArrowLeft, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- CREATE SURVEY COMPONENT ---
const CreateSurvey: React.FC<{ onComplete: () => void; onCancel: () => void }> = ({ onComplete, onCancel }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState<SurveyTarget>('both');
  const [questions, setQuestions] = useState<Omit<SurveyQuestion, 'id'>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Question State
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<QuestionType>('text');
  const [newQOptions, setNewQOptions] = useState(''); // Comma separated for simplicity

  const addQuestion = () => {
    if (!newQText) return;
    if (questions.length >= 20) {
      alert("Limite de 20 perguntas atingido.");
      return;
    }

    const options = ['select', 'radio', 'checkbox'].includes(newQType) 
      ? newQOptions.split(',').map(s => s.trim()).filter(s => s) 
      : undefined;

    if (['select', 'radio', 'checkbox'].includes(newQType) && (!options || options.length === 0)) {
        alert("Adicione opções separadas por vírgula.");
        return;
    }

    setQuestions([...questions, {
      text: newQText,
      type: newQType,
      options,
      required: true
    }]);

    setNewQText('');
    setNewQOptions('');
    setNewQType('text');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title || questions.length === 0 || !user?.id) {
        alert("Preencha o título e adicione pelo menos uma pergunta.");
        return;
    }
    
    setIsSubmitting(true);
    // Use user.id directly as studioId for owners
    const result = await createSurvey(user.id, title, '', target, questions);
    setIsSubmitting(false);

    if (result.success) {
      alert("Pesquisa criada com sucesso!");
      onComplete();
    } else {
      alert("Erro ao criar: " + result.error);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Nova Pesquisa</h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
      </div>

      <div className="space-y-4 mb-8">
        <Input label="Título da Pesquisa" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Satisfação 2025" />
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Público Alvo</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={target === 'students'} onChange={() => setTarget('students')} /> Alunos</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={target === 'instructors'} onChange={() => setTarget('instructors')} /> Instrutores</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={target === 'both'} onChange={() => setTarget('both')} /> Ambos</label>
          </div>
        </div>
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="font-bold text-lg mb-4">Adicionar Perguntas ({questions.length}/20)</h3>
        
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4 grid gap-4">
            <Input label="Pergunta" value={newQText} onChange={e => setNewQText(e.target.value)} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Resposta</label>
                    <select className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:border-slate-700" value={newQType} onChange={e => setNewQType(e.target.value as QuestionType)}>
                        <option value="text">Texto Curto</option>
                        <option value="long_text">Texto Longo</option>
                        <option value="radio">Múltipla Escolha (Uma opção)</option>
                        <option value="checkbox">Caixas de Seleção (Várias opções)</option>
                        <option value="select">Lista Suspensa</option>
                    </select>
                </div>
                {['radio', 'checkbox', 'select'].includes(newQType) && (
                    <Input label="Opções (separadas por vírgula)" value={newQOptions} onChange={e => setNewQOptions(e.target.value)} placeholder="Ex: Sim, Não, Talvez" />
                )}
            </div>
            
            <Button onClick={addQuestion} size="sm" variant="secondary" className="w-full md:w-auto self-end">
                <Plus className="w-4 h-4 mr-2"/> Adicionar Pergunta
            </Button>
        </div>

        <div className="space-y-2">
            {questions.map((q, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div>
                        <span className="font-bold mr-2">{i+1}.</span>
                        <span className="font-medium">{q.text}</span>
                        <span className="text-xs text-slate-500 ml-2 uppercase">({q.type})</span>
                        {q.options && <p className="text-xs text-slate-400 pl-6 mt-1">Opções: {q.options.join(', ')}</p>}
                    </div>
                    <button onClick={() => removeQuestion(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                </div>
            ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} isLoading={isSubmitting}>Salvar e Ativar</Button>
      </div>
    </div>
  );
};

// --- RESULTS COMPONENT ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const SurveyResults: React.FC<{ surveyId: string; onBack: () => void }> = ({ surveyId, onBack }) => {
  const [data, setData] = useState<{ survey: Survey; responses: SurveyResponse[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSurveyDetailsWithResults(surveyId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [surveyId]);

  if (loading) return <div className="p-8 text-center">Carregando resultados...</div>;
  if (!data) return <div className="p-8 text-center">Erro ao carregar dados.</div>;

  const { survey, responses } = data;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2"/> Voltar</Button>
        <div>
            <h2 className="text-2xl font-bold">{survey.title}</h2>
            <p className="text-slate-500">{responses.length} respostas totais</p>
        </div>
      </div>

      <div className="grid gap-8">
        {survey.questions.map((q, idx) => {
            // Aggregate Answers
            const allAnswers = responses.flatMap(r => {
                const ans = r.answers.find(a => a.questionId === q.id);
                if (!ans) return [];
                return Array.isArray(ans.value) ? ans.value : [ans.value];
            });

            const isText = q.type === 'text' || q.type === 'long_text';

            return (
                <div key={q.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm break-inside-avoid">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">{idx + 1}. {q.text}</h3>
                    
                    {isText ? (
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg max-h-60 overflow-y-auto space-y-2">
                            {allAnswers.length === 0 && <p className="text-slate-400 text-sm italic">Sem respostas.</p>}
                            {allAnswers.map((txt, i) => (
                                <div key={i} className="text-sm text-slate-700 dark:text-slate-300 border-b border-slate-100 last:border-0 pb-2 mb-2">"{txt}"</div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 w-full">
                            {(() => {
                                const counts: Record<string, number> = {};
                                allAnswers.forEach(a => counts[a] = (counts[a] || 0) + 1);
                                const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));
                                
                                if (chartData.length === 0) return <p className="text-center text-slate-400 pt-20">Sem dados.</p>;

                                return (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" allowDecimals={false} />
                                            <YAxis dataKey="name" type="category" width={100} style={{fontSize: '12px'}} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                );
                            })()}
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};

// --- MAIN MANAGER ---
export const SurveyManager: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'results'>('list');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadSurveys();
  }, [user, view]);

  const loadSurveys = async () => {
    if (user?.id) {
        const data = await fetchSurveysByStudio(user.id);
        setSurveys(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza? Todas as respostas serão perdidas.")) {
        await deleteSurvey(id);
        loadSurveys();
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleSurveyStatus(id, !currentStatus);
    loadSurveys();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
      {view === 'list' && (
        <>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="text-brand-600"/> Pesquisas Personalizadas</h1>
                    <p className="text-slate-500">Crie e gerencie pesquisas de satisfação.</p>
                </div>
                <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2"/> Nova Pesquisa
                </Button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Título</th>
                                <th className="p-4">Público</th>
                                <th className="p-4 text-center">Respostas</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {surveys.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma pesquisa criada.</td></tr>
                            ) : (
                                surveys.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 font-medium">{s.title}</td>
                                        <td className="p-4 capitalize text-slate-500">
                                            {s.targetAudience === 'students' ? 'Alunos' : s.targetAudience === 'instructors' ? 'Instrutores' : 'Todos'}
                                        </td>
                                        <td className="p-4 text-center font-bold">{s.responseCount}</td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleToggle(s.id, s.isActive)} className={`px-2 py-1 rounded text-xs font-bold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {s.isActive ? 'ATIVA' : 'PAUSADA'}
                                            </button>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => { setSelectedSurveyId(s.id); setView('results'); }}>
                                                <BarChart2 className="w-4 h-4 mr-2"/> Resultados
                                            </Button>
                                            <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
      )}

      {view === 'create' && <CreateSurvey onComplete={() => setView('list')} onCancel={() => setView('list')} />}
      
      {view === 'results' && selectedSurveyId && <SurveyResults surveyId={selectedSurveyId} onBack={() => setView('list')} />}
    </div>
  );
};
