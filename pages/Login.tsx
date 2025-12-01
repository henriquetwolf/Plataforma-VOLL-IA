
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowRight, ShieldCheck, User, BookUser, GraduationCap } from 'lucide-react';
import { AppRoute } from '../types';
import { getInstructorProfile } from '../services/instructorService';
import { getStudentProfile } from '../services/studentService'; 
import { fetchProfile } from '../services/storage';
import { supabase } from '../services/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'studio' | 'admin' | 'instructor' | 'student'>('studio');
  const [isChecking, setIsChecking] = useState(false);
  
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const checkUserRole = async (uid: string, email: string) => {
    // Ordem importante: Aluno primeiro para evitar que instrutores pendentes (por email) capturem o login
    
    const student = await getStudentProfile(uid);
    if (student) return 'student';

    const instructor = await getInstructorProfile(uid, email);
    if (instructor) return 'instructor';
    
    const profile = await fetchProfile(uid);
    if (profile && profile.userId === uid) return 'studio';

    return 'unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, preencha email e senha');
      return;
    }

    setIsChecking(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError || !data.user) {
        setIsChecking(false);
        if (loginError?.message.includes('Invalid login credentials')) {
           if (loginMode === 'student') setError('Dados incorretos. Peça para seu estúdio criar seu acesso.');
           else setError('Email ou senha incorretos.');
        } else {
           setError('Erro ao entrar. Verifique suas credenciais.');
        }
        return;
      }

      const role = await checkUserRole(data.user.id, data.user.email || '');
      
      // Validação de Aba Correta
      if (loginMode === 'studio' && role !== 'studio') {
         await supabase.auth.signOut();
         setError(`Você não é Dono de Studio. Tente a aba "${role === 'instructor' ? 'Sou Instrutor' : 'Sou Aluno'}".`);
         setLoginMode(role === 'instructor' ? 'instructor' : 'student');
         setIsChecking(false);
         return;
      }
      if (loginMode === 'student' && role !== 'student') {
         await supabase.auth.signOut();
         setError('Este login não é de aluno.');
         setIsChecking(false);
         return;
      }

      const result = await login(email, password);
      
      if (result.success) {
         if (loginMode === 'admin') navigate(AppRoute.ADMIN);
         else if (loginMode === 'student') navigate(AppRoute.STUDENT_DASHBOARD);
         else if (loginMode === 'instructor') navigate(AppRoute.INSTRUCTOR_DASHBOARD); // Redireciona para o Dashboard do Instrutor
         else navigate(AppRoute.DASHBOARD);
      } else {
         setError(result.error || 'Erro ao finalizar login.');
      }

    } catch (err) {
      console.error(err);
      setError('Erro inesperado.');
    } finally {
      setIsChecking(false);
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
            {loginMode === 'admin' ? 'Admin' : loginMode === 'instructor' ? 'Portal do Instrutor' : loginMode === 'student' ? 'Área do Aluno' : 'Bem-vindo(a)'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {loginMode === 'student' ? 'Acesse seus treinos e receitas personalizadas' : 'Faça login para acessar a plataforma'}
          </p>
        </div>

        {/* Tabs de Modo */}
        <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
          <button onClick={() => { setLoginMode('studio'); setError(''); }} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${loginMode === 'studio' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Studio</button>
          <button onClick={() => { setLoginMode('instructor'); setError(''); }} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${loginMode === 'instructor' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Instrutor</button>
          <button onClick={() => { setLoginMode('student'); setError(''); }} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${loginMode === 'student' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>Aluno</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Senha" type="password" placeholder="******" value={password} onChange={(e) => setPassword(e.target.value)} />
          
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in fade-in">{error}</div>}

          <Button type="submit" className={`w-full transition-all ${loginMode === 'student' ? 'bg-green-600 hover:bg-green-700' : ''}`} isLoading={isLoading || isChecking}>
            Entrar {loginMode === 'student' && 'como Aluno'}
          </Button>
        </form>

        {loginMode === 'studio' && (
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
             <p className="text-sm text-slate-500">Não tem conta? <Link to={AppRoute.REGISTER} className="text-brand-600 font-medium hover:underline">Cadastrar Studio</Link></p>
             <button onClick={() => setLoginMode('admin')} className="text-xs text-slate-400 hover:text-slate-600 mt-4 flex items-center justify-center gap-1 mx-auto"><ShieldCheck className="h-3 w-3"/> Admin</button>
          </div>
        )}
      </div>
    </div>
  );
};
