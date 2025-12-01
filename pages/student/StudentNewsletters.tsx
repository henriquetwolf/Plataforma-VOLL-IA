
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchStudentNewsletters } from '../../services/newsletterService';
import { Newsletter } from '../../types';
import { ArrowLeft, Newspaper, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppRoute } from '../../types';

export const StudentNewsletters: React.FC = () => {
  const { user } = useAuth();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user?.studioId) {
        const data = await fetchStudentNewsletters(user.studioId);
        setNewsletters(data);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <Newspaper className="text-brand-600"/> Mural de Novidades
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : newsletters.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
           <Newspaper className="h-12 w-12 mx-auto text-slate-300 mb-3"/>
           <p className="text-slate-500">Nenhuma notícia recente.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {newsletters.map(news => (
            <div key={news.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{news.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
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
