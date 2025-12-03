




import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { fetchProfile, upsertProfile } from '../services/storage';
import { StudioProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings as SettingsIcon, Save, CheckCircle, Mail, ExternalLink, Globe } from 'lucide-react';

const AVAILABLE_LANGUAGES: { code: Language; label: string }[] = [
  { code: 'pt', label: '🇧🇷 Português (Brasil)' },
  { code: 'en', label: '🇺🇸 English (US)' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'zh', label: '🇨🇳 中文 (Chinese)' },
  { code: 'ja', label: '🇯🇵 日本語 (Japanese)' },
  { code: 'ru', label: '🇷🇺 Русский (Russian)' },
  { code: 'ko', label: '🇰🇷 한국어 (Korean)' }
];

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { setLanguage: setGlobalLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Estados locais
  const [senderEmail, setSenderEmail] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('pt');

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const data = await fetchProfile(user.id);
        setProfile(data);
        if (data && data.settings) {
            if (data.settings.sender_email) setSenderEmail(data.settings.sender_email);
            if (data.settings.language) {
                setSelectedLanguage(data.settings.language);
                setGlobalLanguage(data.settings.language); // Sync context on load
            }
        }
      }
      setLoading(false);
    };
    loadData();
  }, [user, setGlobalLanguage]);

  const handleSave = async () => {
    if (!user?.id || !profile) return;
    setSaving(true);
    setMessage('');

    // Atualiza o objeto settings
    const currentPermissions = profile.settings?.instructor_permissions || { rehab: true, newsletters: true, students: true };
    const updatedSettings = {
        sender_email: senderEmail,
        language: selectedLanguage,
        instructor_permissions: currentPermissions
    };

    const result = await upsertProfile(user.id, {
        settings: updatedSettings
    });

    if (result.success) {
        setGlobalLanguage(selectedLanguage); // Update global context immediately
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

        {/* Seção 2: Idioma (Nova) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-600" /> {t('language_settings')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    {t('language_desc')}
                </p>
            </div>
            <div className="p-6">
                <div className="max-w-md">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Idioma / Language
                    </label>
                    <select 
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value as any)}
                    >
                        {AVAILABLE_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>
                                {lang.label}
                            </option>
                        ))}
                    </select>
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