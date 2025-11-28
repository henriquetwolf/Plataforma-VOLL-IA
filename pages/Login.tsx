import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowRight, ShieldCheck, User, BookUser } from 'lucide-react';
import { AppRoute } from '../types';
import { getInstructorProfile } from '../services/instructorService';
import { fetchProfile } from '../services/storage';
import { supabase } from '../services/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'studio' | 'admin' | 'instructor'>('studio');
  const [isChecking, setIsChecking] = useState(false);
  
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // Função auxiliar para pré-checar o tipo de usuário ANTES de logar completamente no contexto
  const checkUserRole = async (uid: string, email: string) => {
    // 1. Verifica se é INSTRUTOR
    const instructor = await getInstructorProfile(uid, email);
    if (instructor) return 'instructor';

    // 2. Verifica se é DONO (tem perfil)
    const profile = await fetchProfile(uid);
    if (profile && profile.userId === uid) return 'studio';

    // 3. Caso indefinido (novo cadastro ou admin sem perfil de studio)
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
      // 1. Fazemos um login "silencioso" primeiro para pegar o ID e verificar o papel
      // Não usamos o login do contexto ainda para não disparar o estado global antes da hora
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError || !data.user) {
        setIsChecking(false);
        if (loginError?.message.includes('Invalid login credentials')) {
           if (loginMode === 'instructor') {
             setError('Email ou senha incorretos. Se é seu primeiro acesso, crie sua conta.');
           } else {
             setError('Email ou senha incorretos.');
           }
        } else {
           setError('Erro ao entrar. Verifique suas credenciais.');
        }
        return;
      }

      // 2. Verificamos quem é esse usuário
      const role = await checkUserRole(data.user.id, data.user.email || '');
      
      // 3. Aplicamos a política de "Porta Errada"
      if (loginMode === 'studio') {
        if (role === 'instructor') {
          await supabase.auth.signOut(); // Desloga imediatamente
          setError('Você é um Instrutor. Por favor, use a aba "Sou Instrutor" para entrar.');
          setLoginMode('instructor'); // Muda a aba para ajudar
          setIsChecking(false);
          return;
        }
      } else if (loginMode === 'instructor') {
        if (role === 'studio') {
          await supabase.auth.signOut();
          setError('Este login pertence a um Dono de Estúdio. Use a aba "Dono de Studio".');
          setLoginMode('studio');
          setIsChecking(false);
          return;
        }
      }

      // 4. Se passou na verificação, faz o login "oficial" no contexto para carregar tudo
      // (Como já estamos logados no supabase client, o contexto vai apenas sincronizar o estado)
      const result = await login(email, password);
      
      if (result.success) {
         if (loginMode === 'admin') navigate(AppRoute.ADMIN);
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

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {loginMode === 'admin' ? 'Acesso Administrativo' : loginMode === 'instructor' ? 'Portal do Instrutor' : 'Bem-vindo(a)'}
          </h1>
          <p className="text-slate-500 mt-2">
            {loginMode === 'admin' ? 'Gerencie a plataforma' : loginMode === 'instructor' ? 'Acesse o painel da sua equipe' : 'Faça login para gerenciar seu Studio'}
          </p>
        </div>

        {/* Tabs de Modo */}
        <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
          <button 
            onClick={() => { setLoginMode('studio'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMode === 'studio' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Dono de Studio
          </button>
          <button 
            onClick={() => { setLoginMode('instructor'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMode === 'instructor' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sou Instrutor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder={loginMode === 'admin' ? "admin@volll.com" : "email@exemplo.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <Input
            label="Senha"
            type="password"
            placeholder="******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in fade-in">
              {error}
              {error.includes('primeiro acesso') && loginMode === 'instructor' && (
                <Link to={AppRoute.REGISTER} className="block mt-2 font-bold text-blue-700 underline">
                  Criar conta agora
                </Link>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className={`w-full transition-all ${loginMode === 'admin' ? 'bg-slate-800 hover:bg-slate-900' : loginMode === 'instructor' ? 'bg-blue-600 hover:bg-blue-700' : ''}`} 
            isLoading={isLoading || isChecking}
          >
            Entrar {loginMode === 'instructor' && 'como Instrutor'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          {loginMode === 'instructor' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Ainda não tem senha? <Link to={AppRoute.INSTRUCTOR_WELCOME} className="text-blue-600 font-medium hover:underline">Veja como ativar seu acesso</Link>
              </p>
              <button onClick={() => setLoginMode('studio')} className="text-xs text-slate-400 hover:text-slate-600">
                Voltar para login de Dono
              </button>
            </div>
          ) : loginMode === 'studio' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Não tem uma conta? <Link to={AppRoute.REGISTER} className="text-brand-600 font-medium hover:underline">Cadastrar meu Studio</Link>
              </p>
              <button onClick={() => setLoginMode('admin')} className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto transition-colors">
                <ShieldCheck className="h-3 w-3" /> Área Administrativa
              </button>
            </div>
          ) : (
            <button onClick={() => setLoginMode('studio')} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center justify-center gap-1 mx-auto transition-colors">
              <User className="h-4 w-4" /> Voltar para Login de Studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};