import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { fetchTriageQuestion } from '../../services/geminiService';
import { ChatMessage, TriageStatus } from '../../types';
import { Send, X, Loader2, User, Stethoscope } from 'lucide-react';

interface Props {
  isOpen: boolean;
  initialQuery: string;
  onComplete: (history: ChatMessage[]) => void;
  onCancel: () => void;
  initialHistory?: ChatMessage[];
  studentName?: string;
}

export const AssessmentModal: React.FC<Props> = ({ 
  isOpen, 
  initialQuery, 
  onComplete, 
  onCancel,
  initialHistory,
  studentName
}) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialHistory) {
        setHistory(initialHistory);
        // Se já tem histórico, assumimos que pode continuar ou finalizar
        checkNextStep(initialHistory);
      } else {
        // Iniciar nova triagem (MENTOR PERSONA)
        const name = studentName || 'o aluno';
        setHistory([{ 
          role: 'ai', 
          text: `Olá, instrutor. Vamos analisar o caso do aluno **${name}** com queixa de **${initialQuery}**. Para eu te orientar melhor na montagem da aula, me conte: como está o nível de dor hoje (0-10) e qual a principal limitação de movimento que você observou?` 
        }]);
      }
    } else {
      setHistory([]);
      setIsFinished(false);
    }
  }, [isOpen, initialQuery, initialHistory, studentName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const checkNextStep = async (currentHistory: ChatMessage[]) => {
    setLoading(true);
    // Limita a 8 trocas para não ficar infinito (aumentei um pouco pois o usuario pediu 3 a 5 perguntas)
    if (currentHistory.length >= 10) {
      finishTriage(currentHistory);
      return;
    }

    try {
      const step = await fetchTriageQuestion(initialQuery, currentHistory, studentName);
      if (step.status === TriageStatus.FINISH) {
        finishTriage(currentHistory);
      } else if (step.question) {
        setHistory(prev => [...prev, { role: 'ai', text: step.question! }]);
      }
    } catch (e) {
      finishTriage(currentHistory);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newHistory = [...history, { role: 'user' as const, text: inputValue }];
    setHistory(newHistory);
    setInputValue('');
    
    checkNextStep(newHistory);
  };

  const finishTriage = (finalHistory: ChatMessage[]) => {
    setIsFinished(true);
    // Pequeno delay para usuário ver que acabou
    setTimeout(() => {
      onComplete(finalHistory);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-brand-50 dark:bg-brand-900/20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-100 dark:bg-brand-900 text-brand-600 rounded-full">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Mentor Clínico IA</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Analisando caso: {initialQuery}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
          {history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-brand-100 dark:bg-brand-900'
                }`}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-slate-600" /> : <Stethoscope className="h-4 w-4 text-brand-600" />}
                </div>
                <div className={`p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm'
                }`}>
                  <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                <span className="text-xs text-slate-400">Analisando resposta...</span>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="flex justify-center py-2">
              <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                Anamnese concluída! Preparando plano de aula...
              </span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua resposta..."
              disabled={loading || isFinished}
              className="mb-0"
              autoFocus
            />
            <Button type="submit" disabled={!inputValue.trim() || loading || isFinished}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-2">
             <button onClick={() => finishTriage(history)} className="text-xs text-slate-400 hover:text-brand-500 underline">
               Pular etapas e gerar agora
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};
