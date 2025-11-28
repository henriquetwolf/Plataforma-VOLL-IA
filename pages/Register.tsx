import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Sparkles } from 'lucide-react';
import { AppRoute } from '../types';
import { upsertProfile } from '../services/storage';
import { getInstructorProfile } from '../services/instructorService'; // Importar serviço

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const result = await register(email, name, password);
    
    if (result.success) {
      if (result.data?.session?.user) {
        try {
          const userId = result.data.session.user.id;
          const userEmail = result.data.session.user.email;

          // VERIFICAÇÃO CRÍTICA: É UM INSTRUTOR CONVIDADO?
          // Se for, NÃO criamos um perfil de estúdio novo. Apenas vinculamos.
          const instructor = await getInstructorProfile(userId, userEmail);

          if (instructor) {
            // É instrutor! Não cria estúdio. Vai direto pro dashboard.
            // O AuthContext (loadUser) vai detectar o vínculo e carregar o estúdio do chefe.
            navigate(AppRoute.DASHBOARD);
          } else {
            // É um novo dono de estúdio. Cria perfil.
            await upsertProfile(userId, {
              ownerName: name,
              email: email, 
              studioName: '',
              specialties: []
            });
            navigate(AppRoute.PROFILE);
          }
          
        } catch (err) {
          console.error("Erro no fluxo pós-registro:", err);
          navigate(AppRoute.PROFILE);
        }
      } else {
        setError('Conta criada, mas o login automático falhou. Se o Supabase exigir confirmação de email, verifique sua caixa de entrada.');
      }
    } else {
      const msg = result.error || '';
      if (msg.includes('User already registered')) {
        setError('Este email já está cadastrado. Por favor, faça login ou use outro email.');
      } else if (msg.includes('Password should be at least 6 characters')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(msg || 'Não foi possível criar a conta. Verifique os dados e tente novamente.');
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
          <h1 className="text-2xl font-bold text-slate-900">Plataforma VOLL IA</h1>
          <p className="text-slate-500 mt-2">Comece a gerenciar seu estúdio de forma inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Proprietário(a)"
            type="text"
            placeholder="Maria Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            placeholder="Mínimo de 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Criar Conta e Entrar
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Já tem uma conta?{' '}
          <Link to={AppRoute.LOGIN} className="text-brand-600 font-medium hover:underline">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
};