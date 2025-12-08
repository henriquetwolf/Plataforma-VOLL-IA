import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Terminology } from '../context/LanguageContext';
import { fetchProfile, upsertProfile } from '../services/storage';
import { StudioProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings as SettingsIcon, Save, CheckCircle, Mail, Type } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { setTerminology: setGlobalTerminology, t, language } = useLanguage();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Estados locais
  const [senderEmail, setSenderEmail] = useState('');
  const [selectedTerminology, setSelectedTerminology] = useState<Terminology>('student');

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const data = await fetchProfile(user.id);
        setProfile(data);
        if (data && data.settings) {
            if (data.settings.sender_email) setSenderEmail(data.settings.sender_email);
            if (data.settings.terminology) {
                setSelectedTerminology(data.settings.terminology);
                setGlobalTerminology(data.settings.terminology);
            }
        }
      }
      setLoading(false);
    };
    loadData();
  }, [user, setGlobalTerminology]);

  const handleSave = async () => {
    if (!user?.id || !profile) return;
    setSaving(true);
    setMessage('');

    // Atualiza o objeto settings
    const currentPermissions = profile.settings?.instructor_permissions || { rehab: true, newsletters: true, students: true };
    const updatedSettings = {
        sender_email: senderEmail,
        language: 'pt' as const, // Força PT no banco de dados também
        terminology: selectedTerminology,
        instructor_permissions: currentPermissions
    };

    const result = await upsertProfile(user.id, {
        settings: updatedSettings
    });

    if (result.success) {
        setGlobalTerminology(selectedTerminology);
        setMessage(t('save') + '!');
        setTimeout(() => setMessage(''), 3000);
    } else {
        alert('Erro ao salvar: ' + result.error);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-slate-500">Erro ao carregar perfil.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brand-100 dark:bg-brand-900/20 rounded-xl text-brand-600 dark:text-brand-400">
            <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('settings_title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('settings_subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Seção 1: Configuração de Email */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" /> {t('email_integration')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    {t('email_desc')}
                </p>
            </div>
            <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                        <Input 
                            label={t('email_label')}
                            placeholder="exemplo.studio@gmail.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Seção 2: Nomenclatura */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Type className="w-5 h-5 text-purple-600" /> {t('terminology_settings')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    {t('terminology_desc')}
                </p>
            </div>
            <div className="p-6">
                <div className="max-w-md space-y-4">
                    <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input 
                            type="radio" 
                            name="terminology" 
                            value="student" 
                            checked={selectedTerminology === 'student'} 
                            onChange={() => setSelectedTerminology('student')}
                            className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Aluno (Padrão)
                        </span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input 
                            type="radio" 
                            name="terminology" 
                            value="client" 
                            checked={selectedTerminology === 'client'} 
                            onChange={() => setSelectedTerminology('client')}
                            className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Cliente
                        </span>
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
              <Save className="w-5 h-5 mr-2" /> {t('save_all')}
          </Button>
      </div>
    </div>
  );
};
