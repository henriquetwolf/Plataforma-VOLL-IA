
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Sparkles } from 'lucide-react';
import { AppRoute } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError(t('login_error'));
      return;
    }

    try {
      const result = await login(email, password);
      
      if (result.success && result.user) {
         // Redirecionamento Automático baseado na Role identificada no Backend/AuthContext
         if (result.user.isAdmin) {
             navigate(AppRoute.ADMIN);
         } else if (result.user.isInstructor) {
             navigate(AppRoute.INSTRUCTOR_DASHBOARD);
         } else if (result.user.isStudent) {
             navigate(AppRoute.STUDENT_DASHBOARD);
         } else if (result.user.isOwner) {
             navigate(AppRoute.DASHBOARD);
         } else {
             // Fallback de segurança
             navigate(AppRoute.DASHBOARD);
         }
      } else {
         setError(result.error || t('login_error'));
      }

    } catch (err) {
      console.error(err);
      setError('Erro de conexão. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 transition-colors duration-500">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl shadow-slate-200/50 relative overflow-hidden">
        
        {/* Barra de destaque superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 via-cyan-500 to-brand-600" />

        <div className="text-center mb-8 mt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 mb-4 shadow-sm border border-brand-100">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Plataforma VOLL IA
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
            Acesse sua conta para gerenciar, ensinar ou treinar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            label={t('email_label')} 
            type="email" 
            placeholder="seu@email.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            autoFocus
          />
          
          <div className="space-y-1">
            <Input 
                label={t('password_label')} 
                type="password" 
                placeholder="******" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
            />
            {/* Opcional: Link de esqueci a senha poderia vir aqui */}
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in fade-in flex items-center justify-center">
                {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-brand-600 hover:bg-brand-700 text-white h-11 text-base font-medium shadow-lg shadow-brand-200" 
            isLoading={isLoading}
          >
            {t('enter_button')}
          </Button>
        </form>
      </div>
    </div>
  );
};
