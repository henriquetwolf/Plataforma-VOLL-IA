import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentProfile } from '../../services/studentService';
import { generateHomeWorkout } from '../../services/geminiService';
import { Button } from '../../components/ui/Button';
import { Activity, Sparkles, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppRoute, WorkoutResponse } from '../../types';

export const StudentWorkout: React.FC = () => {
  const { user } = useAuth();
  const [observations, setObservations] = useState('');
  const [duration, setDuration] = useState('20 min');
  const [equipment, setEquipment] = useState('Apenas colchonete');
  const [workout, setWorkout] = useState<WorkoutResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const profile = await getStudentProfile(user.id);
        if (profile?.observations) setObservations(profile.observations);
      }
    };
    loadProfile();
  }, [user]);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateHomeWorkout(user?.name || 'Aluno', observations, equipment, duration);
    setWorkout(result);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-5 h-5"/></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="text-blue-600"/> Pilates em Casa</h1>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0"/>
        <p>Seu treino será personalizado com base nas observações do seu instrutor: <strong>"{observations || 'Sem restrições específicas'}"</strong>.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-700">Tempo Disponível</label>
          <select className="w-full p-2 border rounded mt-1" value={duration} onChange={e => setDuration(e.target.value)}>
            <option>15 min</option>
            <option>20 min</option>
            <option>30 min</option>
            <option>45 min</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700">Equipamento em Casa</label>
          <input className="w-full p-2 border rounded mt-1" value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="Ex: Bola, Elástico..." />
        </div>
        <Button onClick={handleGenerate} isLoading={loading} className="w-full bg-blue-600 hover:bg-blue-700">
          <Sparkles className="w-4 h-4 mr-2"/> Gerar Treino
        </Button>
      </div>

      {workout && (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-md animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-blue-900">{workout.title}</h2>
              <p className="text-slate-500 text-sm">Foco: {workout.focus}</p>
            </div>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Clock className="w-3 h-3"/> {workout.duration}
            </span>
          </div>
          
          <div className="space-y-4">
            {workout.exercises.map((ex, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between mb-1">
                  <h4 className="font-bold text-slate-800">{i+1}. {ex.name}</h4>
                  <span className="text-xs font-bold text-slate-400">{ex.reps}</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{ex.instructions}</p>
                {ex.safetyNote && <p className="text-xs text-orange-600 font-medium">⚠️ {ex.safetyNote}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};