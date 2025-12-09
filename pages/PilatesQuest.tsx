import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserProgress, generateLessonContent, advanceProgress, fetchStudioRanking } from '../services/duoService';
import { DuoUserProgress, DuoLesson } from '../types';
import { DuoQuiz } from '../components/duo/DuoQuiz';
import { Button } from '../components/ui/Button';
import { Trophy, Sparkles, Map, Lock, Play, RotateCcw, Loader2, CheckCircle } from 'lucide-react';

export const PilatesQuest: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<DuoUserProgress | null>(null);
  const [ranking, setRanking] = useState<DuoUserProgress[]>([]);
  const [mode, setMode] = useState<'map' | 'quiz'>('map');
  const [currentLesson, setCurrentLesson] = useState<DuoLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (user?.id) {
        // Identificar Studio ID corretamente para Donos (id) e Instrutores (studioId)
        const studioId = user.isInstructor ? user.studioId : user.id;
        const role = user.isOwner ? 'owner' : 'instructor';
        
        if (studioId) {
          try {
            const [userProg, rank] = await Promise.all([
              fetchUserProgress(user.id, studioId, user.name, role),
              fetchStudioRanking(studioId)
            ]);
            setProgress(userProg);
            setRanking(rank);
          } catch (error) {
            console.error("Erro ao carregar dados do Quest:", error);
          }
        } else {
            console.warn("Studio ID não encontrado para o usuário.");
        }
      }
      setLoading(false);
    };
    init();
  }, [user]);

  const handleStartLevel = async () => {
    if (!progress) {
        alert("Erro ao carregar seu progresso. Por favor, recarregue a página.");
        return;
    }
    
    // Verificação de Limite Diário (Regra 2)
    const today = new Date().toISOString().split('T')[0];
    if (progress.lastPlayedAt === today) {
      alert("Você já completou sua aula de hoje! Volte amanhã para liberar o próximo nível e manter sua sequência.");
      return;
    }

    setLoadingLesson(true);
    try {
        const lesson = await generateLessonContent(progress.currentLevel);
        if (lesson && lesson.questions && lesson.questions.length > 0) {
            setCurrentLesson(lesson);
            setMode('quiz');
        } else {
            alert("Erro ao gerar conteúdo da aula. Tente novamente.");
        }
    } catch (error) {
        console.error("Erro fatal ao iniciar aula:", error);
        alert("Ocorreu um erro ao conectar com o servidor de aulas.");
    } finally {
        setLoadingLesson(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (!progress || !currentLesson) return;
    
    const totalQuestions = currentLesson.questions?.length || 5;
    
    // Só avança se acertar TUDO (Regra 3)
    if (score === totalQuestions) {
      // Success! Update DB and State
      const newProg = await advanceProgress(progress, score * 5);
      setProgress(newProg);
      // Update local ranking view optimistically
      const newRank = ranking.map(r => r.userId === user?.id ? newProg : r).sort((a,b) => b.totalVolls - a.totalVolls);
      setRanking(newRank);
    }
    
    // Return to map quietly
    setMode('map');
    setCurrentLesson(null);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-brand-600"/></div>;

  if (mode === 'quiz' && currentLesson) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-auto animate-in fade-in">
        <div className="max-w-2xl mx-auto p-6 h-full flex flex-col">
          <DuoQuiz 
            lesson={currentLesson} 
            onCancel={() => setMode('map')}
            onComplete={handleQuizComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in pb-12">
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-3 rounded-2xl shadow-lg shadow-green-200">
          <Trophy className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pilates Quest</h1>
          <p className="text-slate-500">Educação diária gamificada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAP AREA */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
             <div className="flex items-center gap-2">
               <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                 <Sparkles className="w-6 h-6 text-brand-600" />
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase">Total VOLLs</p>
                 <p className="font-bold text-xl">{progress?.totalVolls || 0}</p>
               </div>
             </div>
             <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">Sequência</p>
                <p className="font-bold text-xl text-orange-500">🔥 {progress?.streak || 0} dias</p>
             </div>
          </div>

          {/* Path */}
          <div className="relative flex flex-col items-center py-8">
             <div className="absolute top-0 bottom-0 w-2 bg-slate-100 dark:bg-slate-800 rounded-full -z-10"></div>
             
             {/* Dynamic Levels rendering (Simulating infinity) */}
             {[0, 1, 2].map((offset) => {
               const levelNum = (progress?.currentLevel || 1) + offset;
               const isCurrent = offset === 0;
               const isLocked = offset > 0;
               
               // Check if current level is already played today
               const today = new Date().toISOString().split('T')[0];
               const playedToday = isCurrent && progress?.lastPlayedAt === today;
               
               return (
                 <div key={levelNum} className="mb-12 relative group">
                    <button
                      onClick={isCurrent ? handleStartLevel : undefined}
                      disabled={isLocked || loadingLesson || playedToday}
                      className={`w-20 h-20 rounded-full flex items-center justify-center border-b-4 transition-all transform active:scale-95 active:border-b-0 ${
                        isCurrent 
                          ? (playedToday 
                              ? 'bg-green-100 border-green-200 text-green-600 cursor-default' // Visual de concluído
                              : 'bg-green-500 border-green-700 text-white shadow-lg shadow-green-200 hover:brightness-110 cursor-pointer')
                          : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {loadingLesson && isCurrent ? (
                        <Loader2 className="animate-spin w-8 h-8" />
                      ) : isLocked ? (
                        <Lock className="w-8 h-8" />
                      ) : playedToday ? (
                        <CheckCircle className="w-10 h-10" />
                      ) : (
                        <Play className="w-8 h-8 fill-current" />
                      )}
                    </button>
                    
                    <div className="absolute top-4 left-24 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 w-48">
                       <h3 className="font-bold text-sm text-slate-800 dark:text-white">Nível {levelNum}</h3>
                       <p className="text-xs text-slate-500">
                           {loadingLesson && isCurrent 
                             ? 'Gerando Aula...' 
                             : isCurrent 
                               ? (playedToday ? 'Aula concluída!' : 'Sua aula de hoje') 
                               : 'Bloqueado'}
                       </p>
                    </div>
                 </div>
               );
             })}
             
             <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
               <span className="text-2xl">...</span>
             </div>
          </div>
        </div>

        {/* RANKING SIDEBAR */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-6">
            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800 flex justify-between items-center">
              <h3 className="font-bold text-brand-800 dark:text-brand-300">Ranking do Studio</h3>
              <Trophy className="w-5 h-5 text-brand-600" />
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ranking.map((r, index) => (
                <div key={r.userId} className={`p-4 flex items-center gap-3 ${r.userId === user?.id ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                  <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${
                    index === 0 ? 'bg-yellow-400 text-white' : 
                    index === 1 ? 'bg-slate-300 text-white' :
                    index === 2 ? 'bg-orange-300 text-white' :
                    'text-slate-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${r.userId === user?.id ? 'text-brand-700' : 'text-slate-700 dark:text-slate-200'}`}>
                      {r.userName} {r.userId === user?.id && '(Você)'}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{r.userRole === 'owner' ? 'Dono' : 'Instrutor'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{r.totalVolls} VOLLs</p>
                  </div>
                </div>
              ))}
              
              {ranking.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Seja o primeiro a jogar!
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};