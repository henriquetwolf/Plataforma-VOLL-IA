import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserProgress, generateLessonContent, advanceProgress, fetchStudioRanking } from '../services/duoService';
import { DuoLesson, DuoUserProgress } from '../types';
import { DuoQuiz } from '../components/duo/DuoQuiz';
import { recordGenerationUsage } from '../services/contentService';
import { Button } from '../components/ui/Button';
import { Trophy, Star, Map, Play, Lock, User, Crown, Flame } from 'lucide-react';

export const PilatesQuest: React.FC = () => {
  const { user } = useAuth();
  
  const [progress, setProgress] = useState<DuoUserProgress | null>(null);
  const [ranking, setRanking] = useState<DuoUserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [mode, setMode] = useState<'map' | 'quiz'>('map');
  const [currentLesson, setCurrentLesson] = useState<DuoLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);

  useEffect(() => {
    const load = async () => {
        if (user?.id) {
            const studioId = user.isInstructor ? user.studioId : user.id;
            if (studioId) {
                const [prog, rank] = await Promise.all([
                    fetchUserProgress(user.id, studioId, user.name, user.isInstructor ? 'instructor' : 'owner'),
                    fetchStudioRanking(studioId)
                ]);
                setProgress(prog);
                setRanking(rank);
            }
        }
        setLoading(false);
    };
    load();
  }, [user]);

  const handleStartLevel = async () => {
    if (!progress) return;
    
    setLoadingLesson(true);
    try {
        const lesson = await generateLessonContent(progress.currentLevel);
        if (lesson && lesson.questions && lesson.questions.length > 0) {
            setCurrentLesson(lesson);
            setMode('quiz');
            
            // LOG USAGE
            // Identificar Studio ID corretamente para Donos (id) e Instrutores (studioId)
            const studioId = user?.isInstructor ? user.studioId : user?.id;
            if (studioId) await recordGenerationUsage(studioId, 'quest');

        } else {
            alert("Erro ao gerar conteúdo da aula. Tente novamente.");
        }
    } catch (e) {
        alert("Erro de conexão com o gerador de aulas.");
    } finally {
        setLoadingLesson(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (!progress) return;
    
    const pointsGained = score * 5; // 5 points per correct answer
    // Pass level threshold? (e.g. need 3/5 correct to advance)
    const passed = score >= 3;

    if (passed) {
        const newProgress = await advanceProgress(progress, pointsGained);
        setProgress(newProgress);
        
        // Refresh ranking
        if (user?.studioId || user?.id) {
             const studioId = user.isInstructor ? user.studioId : user.id;
             if (studioId) {
                 const rank = await fetchStudioRanking(studioId);
                 setRanking(rank);
             }
        }
        alert(`Parabéns! Você ganhou ${pointsGained} VOLLs e avançou para o Nível ${newProgress.currentLevel}!`);
    } else {
        alert(`Você fez ${score} pontos. Precisa de pelo menos 3 acertos para passar. Tente novamente!`);
    }
    
    setMode('map');
    setCurrentLesson(null);
  };

  if (loading) return <div className="text-center p-12">Carregando Quest...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
        {mode === 'map' && progress && (
            <>
                {/* Header Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 flex flex-col items-center">
                        <div className="text-yellow-600 dark:text-yellow-400 font-bold flex items-center gap-2">
                            <Star className="w-5 h-5 fill-yellow-500" /> Nível
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{progress.currentLevel}</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col items-center">
                        <div className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> VOLLs
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{progress.totalVolls}</span>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800 flex flex-col items-center">
                        <div className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-2">
                            <Flame className="w-5 h-5 fill-orange-500" /> Ofensiva
                        </div>
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{progress.streak} dias</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Map Area */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
                        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        
                        {/* Path Visualization (Simplified) */}
                        <div className="relative z-10 flex flex-col items-center gap-8">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center grayscale opacity-50">
                                <Lock className="w-8 h-8 text-slate-400" />
                                <span className="absolute -bottom-6 text-xs font-bold text-slate-400">Nível {progress.currentLevel + 1}</span>
                            </div>
                            
                            <div className="h-12 w-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>

                            <button 
                                onClick={handleStartLevel}
                                disabled={loadingLesson}
                                className="w-24 h-24 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-[0_8px_0_rgb(13,148,136)] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-center relative group"
                            >
                                {loadingLesson ? (
                                    <span className="animate-spin text-2xl">⏳</span>
                                ) : (
                                    <Play className="w-10 h-10 fill-white ml-1 group-hover:scale-110 transition-transform" />
                                )}
                                <span className="absolute -bottom-8 text-sm font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                                    Nível {progress.currentLevel}
                                </span>
                            </button>

                            <div className="h-12 w-2 bg-brand-200 dark:bg-brand-900/50 rounded-full"></div>

                            <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xl shadow-md border-4 border-green-200 dark:border-green-900">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    {/* Ranking Area */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Crown className="w-5 h-5 text-yellow-500" /> Ranking do Studio
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {ranking.map((r, i) => (
                                <div key={r.userId} className={`flex items-center gap-3 p-3 rounded-xl border ${r.userId === user?.id ? 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-transparent text-slate-400'}`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{r.userName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Nível {r.currentLevel}</p>
                                    </div>
                                    <div className="font-bold text-brand-600 dark:text-brand-400 text-sm">
                                        {r.totalVolls} XP
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        )}

        {mode === 'quiz' && currentLesson && (
            <DuoQuiz 
                lesson={currentLesson}
                onComplete={handleQuizComplete}
                onCancel={() => { setMode('map'); setCurrentLesson(null); }}
            />
        )}
    </div>
  );
};

// Missing Icon CheckCircle import fallback (if not in lucide imports above)
import { CheckCircle } from 'lucide-react';
