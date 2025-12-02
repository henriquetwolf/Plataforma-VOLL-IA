
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile, upsertProfile } from '../services/storage';
import { StudioProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings as SettingsIcon, Users, Activity, Newspaper, Save, CheckCircle, Mail, ExternalLink } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Estado local para o email
  const [senderEmail, setSenderEmail] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const data = await fetchProfile(user.id);
        setProfile(data);
        if (data && data.settings?.sender_email) {
            setSenderEmail(data.settings.sender_email);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handlePermissionChange = (key: 'rehab' | 'newsletters' | 'students', value: boolean) => {
    if (!profile) return;
    
    const currentSettings = profile.settings || {};
    const currentPermissions = currentSettings.instructor_permissions || { rehab: true, newsletters: true, students: true };

    setProfile({
      ...profile,
      settings: {
        ...currentSettings,
        instructor_permissions: {
          ...currentPermissions,
          [key]: value
        }
      }
    });
  };

  const handleSave = async () => {
    if (!user?.id || !profile) return;
    setSaving(true);
    setMessage('');

    // Atualiza o objeto settings com o email do estado local e permissões do estado profile
    const currentPermissions = profile.settings?.instructor_permissions || { rehab: true, newsletters: true, students: true };
    const updatedSettings = {
        sender_email: senderEmail,
        instructor_permissions: currentPermissions
    };

    const result = await upsertProfile(user.id, {
        settings: updatedSettings
    });

    if (result.success) {
        setMessage('Configurações salvas com sucesso!');
        setTimeout(() => setMessage(''), 3000);
    } else {
        alert('Erro ao salvar: ' + result.error);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-slate-500">Erro ao carregar perfil.</div>;
  }

  const permissions = profile.settings?.instructor_permissions || { rehab: true, newsletters: true, students: true };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brand-100 dark:bg-brand-900/20 rounded-xl text-brand-600 dark:text-brand-400">
            <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações do Studio</h1>
            <p className="text-slate-500 dark:text-slate-400">Gerencie permissões e preferências da plataforma.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Seção 1: Configuração de Email */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" /> Integração de Email
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Conecte seu Gmail para facilitar o envio de mensagens aos alunos diretamente pela plataforma.
                </p>
            </div>
            <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                        <Input 
                            label="Email Remetente (Gmail)"
                            placeholder="exemplo.studio@gmail.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Ao salvar, a plataforma usará este email para abrir o compositor do Gmail Web automaticamente.
                        </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 text-sm text-blue-800 dark:text-blue-300 max-w-sm">
                        <strong>Como funciona?</strong><br/>
                        Não armazenamos sua senha. Ao clicar em "Enviar Email" nos alunos, o sistema abrirá uma nova aba do seu navegador já logada no seu Gmail, com o destinatário e o assunto preenchidos.
                    </div>
                </div>
            </div>
        </div>

        {/* Seção 2: Permissões */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-600" /> Portal do Instrutor
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Defina quais agentes e funcionalidades seus instrutores podem acessar.
                </p>
            </div>

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <Activity className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Agente Pilates Rehab</h3>
                            <p className="text-sm text-slate-500">Acesso ao guia clínico, criação de aulas e banco de exercícios.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={permissions.rehab !== false} // Default true
                            onChange={(e) => handlePermissionChange('rehab', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <Newspaper className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Comunicados e Newsletters</h3>
                            <p className="text-sm text-slate-500">Visualização do mural de avisos internos.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={permissions.newsletters !== false}
                            onChange={(e) => handlePermissionChange('newsletters', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Visualizar Alunos</h3>
                            <p className="text-sm text-slate-500">Acesso à lista de alunos do estúdio.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={permissions.students !== false}
                            onChange={(e) => handlePermissionChange('students', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                    </label>
                </div>
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
          <span className={`text-sm font-medium flex items-center gap-2 ${message ? 'text-green-600 opacity-100' : 'opacity-0'} transition-opacity`}>
              <CheckCircle className="w-4 h-4" /> {message}
          </span>
          <Button onClick={handleSave} isLoading={saving} className="bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-200 h-12 px-8 text-lg">
              <Save className="w-5 h-5 mr-2" /> Salvar Tudo
          </Button>
      </div>
    </div>
  );
};
