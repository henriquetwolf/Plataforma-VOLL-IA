import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AppRoute } from '../types';
import { BookUser, CheckCircle, Mail, Key } from 'lucide-react';

export const InstructorWelcome: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
            <BookUser className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Bem-vindo(a), Instrutor!</h1>
          <p className="text-slate-500 mt-2 text-lg">Veja como acessar a plataforma do seu estúdio.</p>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <h3 className="font-bold text-slate-800">Confirme seu Email</h3>
              <p className="text-slate-500 text-sm">O dono do estúdio cadastrou seu email no sistema. Você deve usar <strong>exatamente o mesmo email</strong> para criar sua conta de acesso.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <h3 className="font-bold text-slate-800">Crie sua Senha</h3>
              <p className="text-slate-500 text-sm">Vá para a tela de Cadastro e crie uma conta nova. O sistema vai reconhecer seu email e te vincular automaticamente ao estúdio.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <h3 className="font-bold text-slate-800">Faça Login</h3>
              <p className="text-slate-500 text-sm">Volte para a tela de login, selecione a aba "Sou Instrutor" e entre com seus dados.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4 justify-center">
          <Link to={AppRoute.REGISTER}>
            <Button className="bg-blue-600 hover:bg-blue-700">Criar minha Conta</Button>
          </Link>
          <Link to={AppRoute.LOGIN}>
            <Button variant="outline">Já tenho conta</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};