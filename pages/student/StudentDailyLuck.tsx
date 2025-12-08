
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppRoute } from '../../types';
import { ArrowLeft, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';

// Lista de Aulas Possíveis (16 items for clean wheel division)
const CLASS_TYPES = [
  "Mat Pilates Clássico",
  "Alongamento Profundo",
  "Mobilidade de Quadril",
  "Fortalecimento de Core",
  "Relaxamento & Respiração",
  "Pilates para Postura",
  "Desafio da Prancha",
  "Mobilidade de Coluna",
  "Glúteos e Pernas",
  "Power Pilates",
  "Equilíbrio & Foco",
  "Alívio de Tensão (Pescoço)",
  "Pilates Flow",
  "Flexibilidade Total",
  "Fortalecimento de Braços",
  "Pilates com Parede"
];

// Cores alternadas para a roleta
const COLORS = [
  '#FCD34D', // Amarelo
  '#F87171', // Vermelho
  '#60A5FA', // Azul
  '#34D399', // Verde
  '#A78BFA', // Roxo
  '#F472B6', // Rosa
  '#FB923C', // Laranja
  '#4ADE80', // Verde Lima
];

export const StudentDailyLuck: React.FC = () => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check local storage for today's spin
    const lastSpinDate = localStorage.getItem('daily_spin_date');
    const today = new Date().toDateString();

    if (lastSpinDate === today) {
      const savedResult = localStorage.getItem('daily_spin_result');
      setCanSpin(false);
      if (savedResult) setResult(savedResult);
    }
  }, []);

  const spinWheel = () => {
    if (!canSpin || spinning) return;

    setSpinning(true);
    
    // Random spin logic
    // Minimum 5 spins (360 * 5) + random segment
    const extraSpins = 360 * 5;
    const randomDegree = Math.floor(Math.random() * 360);
    const newRotation = rotation + extraSpins + randomDegree;
    
    setRotation(newRotation);

    // Calculate result
    // The wheel rotates clockwise. The pointer is at the top (0deg).
    // The winning segment is determined by: (360 - (finalAngle % 360)) / segmentSize
    // Note: We need to account for the initial offset if any. Here we assume 0 start.
    
    setTimeout(() => {
      setSpinning(false);
      setCanSpin(false);
      
      const segmentSize = 360 / CLASS_TYPES.length;
      const normalizedRotation = newRotation % 360;
      // Because pointer is at top and wheel spins clockwise, 
      // the index effectively counts backwards or needs adjustment.
      // Easiest is: (360 - normalized) / segmentSize
      let winningIndex = Math.floor((360 - normalizedRotation) / segmentSize);
      // Clamp index just in case of float precision issues
      if (winningIndex >= CLASS_TYPES.length) winningIndex = 0;
      if (winningIndex < 0) winningIndex = CLASS_TYPES.length - 1;

      const wonClass = CLASS_TYPES[winningIndex];
      setResult(wonClass);

      // Save to local storage
      localStorage.setItem('daily_spin_date', new Date().toDateString());
      localStorage.setItem('daily_spin_result', wonClass);
      
      // Trigger confetti/celebration (visual only via CSS/State here)
    }, 4000); // 4 seconds spin duration
  };

  return (
    <div className="max-w-xl mx-auto p-4 min-h-screen flex flex-col items-center animate-in fade-in">
      <div className="w-full flex items-center justify-between mb-8">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400"/>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="text-yellow-500 fill-yellow-500" /> Sorte do Dia!
        </h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-12">
        
        {/* WHEEL CONTAINER */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-slate-800 dark:border-t-white drop-shadow-md"></div>

          {/* The Wheel */}
          <div 
            className="w-full h-full rounded-full border-8 border-white dark:border-slate-800 shadow-2xl overflow-hidden relative transition-transform cubic-bezier(0.2, 0.8, 0.2, 1)"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transitionDuration: '4000ms'
            }}
          >
            {CLASS_TYPES.map((item, index) => {
              const rotation = (360 / CLASS_TYPES.length) * index;
              return (
                <div
                  key={index}
                  className="absolute w-[50%] h-[50%] top-[50%] left-[50%] origin-top-left flex items-center justify-center"
                  style={{
                    backgroundColor: COLORS[index % COLORS.length],
                    transform: `rotate(${rotation}deg) skewY(-67.5deg)`, // Skew needed for 16 slices (90 - 360/16)
                  }}
                >
                  <span 
                    className="absolute left-8 bottom-4 text-[10px] sm:text-xs font-bold text-white uppercase tracking-wide w-32 text-center"
                    style={{ 
                        transform: `skewY(67.5deg) rotate(12deg)`, // Counter skew + adjust text
                    }}
                  >
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-lg z-10 flex items-center justify-center">
             <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-yellow-500" />
             </div>
          </div>
        </div>

        {/* CONTROLS & RESULT */}
        <div className="text-center w-full max-w-sm space-y-6">
          {result ? (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-brand-200 dark:border-brand-900 shadow-lg animate-in zoom-in">
                <div className="flex justify-center mb-2">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-500 uppercase tracking-wide">Sua aula de hoje é:</h3>
                <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-2 mb-4">{result}</p>
                <div className="text-sm text-slate-400 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4"/>
                    Volte amanhã para girar novamente!
                </div>
            </div>
          ) : (
            <div className="space-y-4">
                <Button 
                    onClick={spinWheel} 
                    disabled={spinning}
                    className={`w-full h-16 text-xl rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 ${spinning ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white'}`}
                >
                    {spinning ? 'Girando...' : 'GIRAR ROLETA!'}
                </Button>
                <p className="text-sm text-slate-500 dark:text-slate-400">Descubra seu desafio do dia.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
