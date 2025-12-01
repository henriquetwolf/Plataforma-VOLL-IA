
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchInstructorNewsletters } from '../../services/newsletterService';
import { fetchProfile } from '../../services/storage';
import { Newsletter } from '../../types';
import { ArrowLeft, Newspaper, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppRoute } from '../../types';

export const InstructorNewsletters: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificação de Permissão
  useEffect(() => {
    const checkPermission = async () => {
      if (user?.isInstructor && user.studioId) {
        const profile = await fetchProfile(user.studioId);
        if (profile?.settings?.instructor_permissions?.newsletters === false) {
          navigate(AppRoute.DASHBOARD);
        }
      }
    };
    checkPermission();
  }, [user, navigate]);

  useEffect(() => {
    const loadData = async () => {
      // Instructors usually have studioId in their user object (from login logic)
      if (user?.studioId) {
        const data = await fetchInstructorNewsletters(user.studioId);
        setNewsletters(data);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to={AppRoute.DASHBOARD} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Newspaper className="text-blue-600"/> Comunicados Internos
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Mural de avisos para a equipe.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : newsletters.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
           <Newspaper className="h-12 w-12 mx-auto text-slate-300 mb-3"/>
           <p className="text-slate-500">Nenhum comunicado recente.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {newsletters.map(news => (
            <div key={news.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:border-blue-300 transition-colors">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{news.title}</h2>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-100">
                    {news.targetAudience === 'both' ? 'Geral' : 'Instrutores'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                  <Calendar className="w-3 h-3"/>
                  {new Date(news.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50">
                <div 
                  className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: news.content }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
