import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchProfile, upsertProfile, uploadLogo } from '../services/storage';
import { generateStudioDescription } from '../services/geminiService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Save, Wand2, Building2, MapPin, Palette, Upload, Loader2, X, AlertTriangle, Lock } from 'lucide-react';
import { StudioProfile } from '../types';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { setBrandColor } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [dataLoaded, setDataLoaded] = useState(false);

  const isReadOnly = user?.isInstructor; // Bloqueia edição para instrutores

  const [formData, setFormData] = useState<StudioProfile>({
    id: '',
    userId: '',
    studioName: '',
    ownerName: '',
    description: '',
    address: '',
    phone: '',
    website: '',
    specialties: [],
    logoUrl: '',
    brandColor: '#14b8a6',
    isAdmin: false,
    isActive: true,
  });
  
  const [specialtiesInput, setSpecialtiesInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Carrega o perfil do dono (studioId) ou o próprio (id)
      const targetId = user?.isInstructor ? user.studioId : user?.id;
      
      if (!targetId || dataLoaded) return;

      const existingProfile = await fetchProfile(targetId);
      if (existingProfile) {
        setFormData(existingProfile);
        setSpecialtiesInput(existingProfile.specialties.join(', '));
        if (existingProfile.brandColor) {
          setBrandColor(existingProfile.brandColor);
        }
      } else {
        // Novo perfil (apenas para donos)
        setFormData(prev => ({ 
          ...prev, 
          userId: user?.id || '',
          ownerName: user?.name || '' 
        }));
      }
      setDataLoaded(true);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const color = e.target.value;
    setFormData(prev => ({ ...prev, brandColor: color }));
    setBrandColor(color);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const color = e.target.value;
    setFormData(prev => ({ ...prev, brandColor: color }));
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      setBrandColor(color);
    }
  };

  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    setSpecialtiesInput(e.target.value);
    setFormData(prev => ({ 
      ...prev, 
      specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') 
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || !e.target.files || e.target.files.length === 0 || !user?.id) return;
    
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: 'A imagem deve ter no máximo 2MB.', type: 'error' });
      return;
    }

    setIsUploading(true);
    const publicUrl = await uploadLogo(user.id, file);
    
    if (publicUrl) {
      setFormData(prev => ({ ...prev, logoUrl: publicUrl }));
      setMessage({ text: 'Logo enviada com sucesso! Clique em Salvar.', type: 'success' });
    } else {
      setMessage({ text: 'Erro ao fazer upload.', type: 'error' });
    }
    setIsUploading(false);
  };

  const removeLogo = () => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !user?.id) return;

    setIsLoading(true);
    try {
      const result = await upsertProfile(user.id, formData);
      if (result.success) {
        setMessage({ text: 'Perfil salvo com sucesso!', type: 'success' });
        if (formData.brandColor) setBrandColor(formData.brandColor);
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      } else {
        setMessage({ text: `Erro ao salvar: ${result.error}`, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Falha crítica ao salvar perfil.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (isReadOnly) return;
    if (!formData.studioName || !formData.ownerName) {
      setMessage({ text: 'Preencha o Nome do Studio e Proprietário.', type: 'error' });
      return;
    }
    setIsAiLoading(true);
    const description = await generateStudioDescription(
      formData.studioName,
      formData.ownerName,
      formData.specialties
    );
    setFormData(prev => ({ ...prev, description }));
    setIsAiLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Perfil do Studio</h1>
          <p className="text-slate-500 dark:text-slate-400">Informações do estúdio.</p>
        </div>
        {isReadOnly && (
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
            <Lock className="w-3 h-3"/> Modo Leitura (Instrutor)
          </div>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'error' && <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
          <p>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-500" /> Informações Básicas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Studio"
                name="studioName"
                value={formData.studioName}
                onChange={handleChange}
                disabled={isReadOnly}
              />
              <Input
                label="Nome do Proprietário(a)"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                disabled={isReadOnly}
              />
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Biografia do Studio</label>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={isAiLoading}
                    className="text-xs flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-md transition-colors"
                  >
                    {isAiLoading ? <span className="animate-spin h-3 w-3 border-2 border-brand-600 rounded-full border-t-transparent"></span> : <Wand2 className="h-3 w-3" />}
                    {isAiLoading ? 'Escrevendo...' : 'IA Escreva para mim'}
                  </button>
                )}
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm disabled:opacity-60"
              />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-brand-500" /> Identidade Visual
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Logomarca</label>
                <div className={`border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 relative ${!isReadOnly && 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'}`}>
                  {isUploading ? (
                     <div className="flex flex-col items-center py-4"><Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-2" /></div>
                  ) : formData.logoUrl ? (
                    <div className="relative w-full flex justify-center group">
                      <img src={formData.logoUrl} alt="Logo" className="h-24 object-contain" />
                      {!isReadOnly && (
                        <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-slate-400">
                       <Upload className="h-8 w-8 mb-2" />
                       <span className="text-xs">Sem logo</span>
                    </div>
                  )}
                  {!isReadOnly && (
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Cor Principal</label>
                <div className="flex items-center gap-3">
                  <div className="relative overflow-hidden w-12 h-12 rounded-lg shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                    <input type="color" value={formData.brandColor || '#14b8a6'} onChange={handleColorChange} disabled={isReadOnly} className="absolute -top-2 -left-2 w-24 h-24 cursor-pointer p-0 border-0 disabled:cursor-not-allowed" />
                  </div>
                  <input type="text" value={formData.brandColor || ''} onChange={handleHexChange} disabled={isReadOnly} maxLength={7} className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg font-mono border border-slate-200 dark:border-slate-700 w-36 uppercase disabled:opacity-60" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-500" /> Serviços
            </h2>
            <Input label="Especialidades" value={specialtiesInput} onChange={handleSpecialtiesChange} disabled={isReadOnly} />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.specialties.map((tag, idx) => (
                <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
             <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" /> Contato
            </h2>
            <Input label="Endereço" name="address" value={formData.address} onChange={handleChange} disabled={isReadOnly} />
            <Input label="Telefone" name="phone" value={formData.phone} onChange={handleChange} disabled={isReadOnly} />
            <Input label="Site" name="website" value={formData.website} onChange={handleChange} disabled={isReadOnly} />
          </div>

          {!isReadOnly && (
            <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-brand-200/50" isLoading={isLoading}>
              <Save className="h-5 w-5 mr-2" /> Salvar Perfil
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};