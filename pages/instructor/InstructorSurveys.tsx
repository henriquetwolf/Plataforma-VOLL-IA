
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAvailableSurveys } from '../../services/surveyService';
import { Survey } from '../../types';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, ClipboardList, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../../types';
import { SurveyAnswerForm } from '../student/StudentSurveys'; // Reuse component

export const InstructorSurveys: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    const load = async () => {
        // Instructor usually has studioId in user object from login context
        if (user?.studioId && user?.id) {
            const data = await fetchAvailableSurveys(user.studioId, 'instructor', user.id);
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
                userType="instructor" 
                onCancel={() => setSelectedSurvey(null)}
                onComplete={() => { setSelectedSurvey(null); window.location.reload(); }}
              />
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate(AppRoute.INSTRUCTOR_DASHBOARD)}
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600"
        >
            <Home className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <ClipboardList className="text-blue-600"/> Pesquisas do Studio
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
           <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3"/>
           <p className="text-slate-500">Você respondeu todas as pesquisas pendentes!</p>
        </div>
      ) : (
        <div className="space-y-4">
            {surveys.map(s => (
                <div key={s.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{s.title}</h3>
                        <p className="text-slate-500 text-sm">Pesquisa Interna</p>
                    </div>
                    <Button onClick={() => setSelectedSurvey(s)}>Responder</Button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
