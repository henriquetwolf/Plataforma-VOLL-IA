
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ShieldCheck } from 'lucide-react';
import { AppRoute } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'studio' | 'admin' | 'instructor' | 'student'>('studio');
  
  const { login, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, preencha email e senha');
      return;
    }

    try {
      const result = await login(email, password);
      
      if (result.success && result.user) {
         // REDIRECIONAMENTO AUTOMÁTICO INTELIGENTE
         if (result.user.email === 'henriquetwolf@gmail.com') {
             navigate(AppRoute.ADMIN);
             return;
         }
         if (result.user.isStudent) {
             navigate(AppRoute.STUDENT_DASHBOARD);
             return;
         }
         if (result.user.isInstructor) {
             navigate(AppRoute.INSTRUCTOR_DASHBOARD);
             return;
         }
         if (result.user.isOwner) {
             navigate(AppRoute.DASHBOARD);
             return;
         }
         navigate(AppRoute.DASHBOARD);
      } else {
         setError(result.error || t('login_error'));
      }

    } catch (err) {
      console.error(err);
      setError('Erro inesperado ao conectar.');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${loginMode === 'admin' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl shadow-slate-200/50 relative overflow-hidden">
        
        {loginMode === 'admin' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600" />}
        {loginMode === 'instructor' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 to-cyan-500" />}
        {loginMode === 'student' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-400 to-teal-500" />}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {loginMode === 'admin' ? t('admin_panel') : loginMode === 'instructor' ? 'Portal do Instrutor' : loginMode === 'student' ? 'Área do Aluno' : t('welcome_login')}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {loginMode === 'student' ? 'Acesse seus treinos e receitas personalizadas' : t('login_subtitle')}
          </p>
        </div>

        {/* Tabs de Modo (Visual Only now) */}
        <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
          <button onClick={() => { setLoginMode('studio'); setError(''); }} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${loginMode === 'studio' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Studio</button>
          <button onClick={() => { setLoginMode('instructor'); setError(''); }} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${loginMode === 'instructor' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>{t('instructor')}</button>
          <button onClick={() => { setLoginMode('student'); setError(''); }} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${loginMode === 'student' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>{t('student')}</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('email_label')} type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={t('password_label')} type="password" placeholder="******" value={password} onChange={(e) => setPassword(e.target.value)} />
          
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in fade-in">{error}</div>}

          <Button type="submit" className={`w-full transition-all ${loginMode === 'student' ? 'bg-green-600 hover:bg-green-700' : ''}`} isLoading={isLoading}>
            {t('enter_button')}
          </Button>
        </form>

        {loginMode === 'studio' && (
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
             <p className="text-sm text-slate-500">{t('no_account')} <Link to={AppRoute.REGISTER} className="text-brand-600 font-medium hover:underline">{t('register_link')}</Link></p>
             <button onClick={() => setLoginMode('admin')} className="text-xs text-slate-400 hover:text-slate-600 mt-4 flex items-center justify-center gap-1 mx-auto"><ShieldCheck className="h-3 w-3"/> Admin</button>
          </div>
        )}
      </div>
    </div>
  );
};
