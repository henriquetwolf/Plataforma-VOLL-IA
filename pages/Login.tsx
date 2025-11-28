import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowRight, ShieldCheck, User, BookUser } from 'lucide-react';
import { AppRoute } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'studio' | 'admin' | 'instructor'>('studio');
  
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, preencha email e senha');
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      try {
        if (loginMode === 'admin') navigate(AppRoute.ADMIN);
        else if (loginMode === 'instructor') navigate(AppRoute.DASHBOARD);
        else navigate(AppRoute.DASHBOARD);
      } catch (e) {
        navigate(AppRoute.DASHBOARD);
      }
    } else {
      const msg = result.error || '';
      if (msg.includes('Invalid login credentials')) {
        // Se for instrutor e der erro de credencial, sugerir primeiro acesso
        if (loginMode === 'instructor') {
          setError('Email ou senha incorretos. Se este é seu primeiro acesso, você precisa criar sua conta na tela de cadastro.');
        } else {
          setError('Email ou senha incorretos.');
        }
      } else {
        setError(msg || 'Ocorreu um erro ao entrar. Verifique suas credenciais.');
      }
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
              {/* Botão de ação rápida se for erro de primeiro acesso */}
              {error.includes('primeiro acesso') && (
                <Link to={AppRoute.REGISTER} className="block mt-2 font-bold text-blue-700 underline">
                  Criar conta agora
                </Link>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className={`w-full transition-all ${loginMode === 'admin' ? 'bg-slate-800 hover:bg-slate-900' : loginMode === 'instructor' ? 'bg-blue-600 hover:bg-blue-700' : ''}`} 
            isLoading={isLoading}
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