
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { AppRoute } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      navigate(AppRoute.DASHBOARD);
    } else {
      const msg = result.error || '';
      
      if (msg.includes('Email not confirmed')) {
        setError('Email pendente de confirmação. Se você desativou a confirmação no Supabase recentemente, crie uma NOVA conta com outro email.');
      } else if (msg.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else {
        setError('Ocorreu um erro ao entrar. Verifique suas credenciais.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl shadow-slate-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Bem-vindo(a)</h1>
          <p className="text-slate-500 mt-2">Faça login para gerenciar seu Studio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="studio@exemplo.com"
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
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Entrar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Não tem uma conta?{' '}
          <Link to={AppRoute.REGISTER} className="text-brand-600 font-medium hover:underline">
            Cadastrar meu Studio
          </Link>
        </div>
      </div>
    </div>
  );
};
