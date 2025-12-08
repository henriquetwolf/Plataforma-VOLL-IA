
import React, { useState } from 'react';
import { DuoLesson, DuoQuestion } from '../../types';
import { Button } from '../ui/Button';
import { CheckCircle, XCircle, ArrowRight, Trophy, AlertTriangle } from 'lucide-react';

interface Props {
  lesson: DuoLesson;
  onComplete: (score: number) => void; // Score = number of correct answers
  onCancel: () => void;
}

export const DuoQuiz: React.FC<Props> = ({ lesson, onComplete, onCancel }) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = lesson.questions?.[currentQIndex];

  if (!currentQuestion) return <div>Erro ao carregar questão.</div>;

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleCheck = () => {
    if (selectedOption === null) return;
    
    const correct = selectedOption === currentQuestion.correctAnswerIndex;
    setIsCorrect(correct);
    setIsAnswered(true);
    if (correct) setScore(prev => prev + 1);
  };

  const handleNext = () => {
    if (currentQIndex < (lesson.questions?.length || 0) - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      setShowResult(true);
    }
  };

  const finishQuiz = () => {
    onComplete(score);
  };

  if (showResult) {
    const passed = score === (lesson.questions?.length || 0);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {passed ? <Trophy size={48} /> : <AlertTriangle size={48} />}
        </div>
        <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">
          {passed ? "Aula Concluída!" : "Tente Novamente"}
        </h2>
        <p className="text-slate-500 mb-6">
          Você acertou {score} de {lesson.questions?.length} questões.
          {passed ? " Você ganhou 25 VOLLs!" : " Você precisa acertar todas para avançar."}
        </p>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={onCancel}>Sair</Button>
          <Button onClick={finishQuiz} className={passed ? "bg-green-600 hover:bg-green-700" : ""}>
            {passed ? "Receber Pontos" : "Refazer Aula"}
          </Button>
        </div>
      </div>
    );
  }

  const progressPercent = ((currentQIndex + (isAnswered ? 1 : 0)) / (lesson.questions?.length || 1)) * 100;

  return (
    <div className="max-w-xl mx-auto w-full flex flex-col h-full min-h-[500px]">
      {/* Header / Progress */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <XCircle size={24} />
        </button>
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 leading-relaxed">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((opt, idx) => {
            let stateClass = "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800";
            if (selectedOption === idx && !isAnswered) {
              stateClass = "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20";
            }
            if (isAnswered) {
              if (idx === currentQuestion.correctAnswerIndex) {
                stateClass = "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20";
              } else if (idx === selectedOption && selectedOption !== currentQuestion.correctAnswerIndex) {
                stateClass = "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20";
              } else {
                stateClass = "opacity-50 border-slate-200";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${stateClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs opacity-70">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / Feedback */}
      <div className={`mt-8 p-4 rounded-xl transition-all ${isAnswered ? (isCorrect ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20') : 'bg-transparent'}`}>
        {isAnswered ? (
          <div className="flex items-center justify-between">
            <div className={isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
              <div className="font-bold flex items-center gap-2 mb-1">
                {isCorrect ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                {isCorrect ? "Correto!" : "Incorreto"}
              </div>
              {!isCorrect && <p className="text-sm opacity-90">Resposta correta: {currentQuestion.options[currentQuestion.correctAnswerIndex]}</p>}
              <p className="text-xs mt-1 opacity-80">{currentQuestion.explanation}</p>
            </div>
            <Button onClick={handleNext} className={isCorrect ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              Continuar <ArrowRight size={16} className="ml-2"/>
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full h-12 text-lg uppercase tracking-wide font-bold shadow-lg" 
            disabled={selectedOption === null}
            onClick={handleCheck}
          >
            Verificar
          </Button>
        )}
      </div>
    </div>
  );
};
