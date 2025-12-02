
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendSuggestion } from '../../services/suggestionService';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppRoute } from '../../types';

export const StudentSuggestions: React.FC = () => {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.isStudent || !user.studioId || !suggestion.trim()) return;

    setIsSubmitting(true);
    // Use user.dbId if available (Student Table ID), fallback to user.id (Auth ID)
    const studentTableId = user.dbId || user.id;
    
    const result = await sendSuggestion(user.studioId, studentTableId, user.name, suggestion);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setSuggestion('');
      setTimeout(() => setSuccess(false), 5000);
    } else {
      alert("Erro ao enviar sugestão. Tente novamente.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600"/>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <MessageSquare className="text-blue-600"/> Caixa de Sugestões
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="mb-6">
          <p className="text-slate-600 dark:text-slate-400">
            Sua opinião é muito importante para nós! Envie suas ideias, elogios ou sugestões de melhoria para o estúdio.
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-6 rounded-lg flex flex-col items-center justify-center text-center animate-in zoom-in">
            <CheckCircle className="w-12 h-12 mb-2"/>
            <h3 className="font-bold text-lg">Sugestão Enviada!</h3>
            <p>Obrigado por contribuir com o nosso estúdio.</p>
            <Button variant="ghost" className="mt-4" onClick={() => setSuccess(false)}>Enviar outra</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Sua Sugestão
              </label>
              <textarea
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none h-40 resize-none"
                placeholder="Ex: Gostaria de ter aulas de alongamento aos sábados..."
                value={suggestion}
                onChange={e => setSuggestion(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 px-1">
              <span>Data: {new Date().toLocaleDateString()}</span>
              <span>Aluno: {user?.name}</span>
            </div>

            <Button type="submit" isLoading={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4 mr-2" /> Enviar para o Studio
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};