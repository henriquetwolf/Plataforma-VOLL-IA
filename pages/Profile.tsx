import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchProfile, upsertProfile, uploadLogo } from '../services/storage';
import { generateStudioDescription } from '../services/geminiService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Save, Wand2, Building2, MapPin, Palette, Upload, Loader2, X } from 'lucide-react';
import { StudioProfile } from '../types';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { setBrandColor } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState<StudioProfile>({
    id: '',
    userId: user?.id || '',
    studioName: '',
    ownerName: user?.name || '',
    description: '',
    address: '',
    phone: '',
    website: '',
    specialties: [],
    logoUrl: '',
    brandColor: '#14b8a6',
  });
  
  const [specialtiesInput, setSpecialtiesInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const existingProfile = await fetchProfile(user.id);
        if (existingProfile) {
          setFormData(existingProfile);
          setSpecialtiesInput(existingProfile.specialties.join(', '));
          // Sincroniza a cor do contexto com a do perfil carregado
          if (existingProfile.brandColor) {
            setBrandColor(existingProfile.brandColor);
          }
        } else {
          setFormData(prev => ({ 
            ...prev, 
            userId: user.id,
            ownerName: user.name 
          }));
        }
      }
    };
    loadData();
  }, [user, setBrandColor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setFormData(prev => ({ ...prev, brandColor: color }));
    setBrandColor(color); // Preview instantâneo
  };

  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpecialtiesInput(e.target.value);
    setFormData(prev => ({ 
      ...prev, 
      specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') 
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user?.id) return;
    
    const file = e.target.files[0];
    
    // Validação simples de tamanho (2MB)
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
      setMessage({ text: 'Erro ao fazer upload da imagem. Tente novamente.', type: 'error' });
    }
    setIsUploading(false);
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const result = await upsertProfile(user.id, formData);
      if (result.success) {
        setMessage({ text: 'Perfil salvo com sucesso!', type: 'success' });
        // Garante que a cor fique salva no contexto
        if (formData.brandColor) setBrandColor(formData.brandColor);
      } else {
        setMessage({ text: `Erro ao salvar: ${result.error}`, type: 'error' });
      }
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      setMessage({ text: 'Falha crítica ao salvar perfil.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!formData.studioName || !formData.ownerName) {
      setMessage({ text: 'Por favor, preencha o Nome do Studio e do Proprietário primeiro.', type: 'error' });
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
          <p className="text-slate-500 dark:text-slate-400">Gerencie as informações públicas e personalização</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info Card */}
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
                placeholder="Ex: Zen Pilates Studio"
                required
              />
              <Input
                label="Nome do Proprietário(a)"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Ex: Maria Silva"
                required
              />
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Biografia do Studio</label>
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isAiLoading}
                  className="text-xs flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-md transition-colors"
                >
                  {isAiLoading ? (
                    <span className="animate-spin h-3 w-3 border-2 border-brand-600 rounded-full border-t-transparent"></span>
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {isAiLoading ? 'Escrevendo...' : 'IA Escreva para mim'}
                </button>
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                placeholder="Fale um pouco sobre seu estúdio..."
              />
            </div>
          </div>
          
          {/* Customização da Marca */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-brand-500" /> Identidade Visual
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Logomarca do Studio</label>
                
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                  {isUploading ? (
                     <div className="flex flex-col items-center py-4">
                        <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-2" />
                        <span className="text-xs text-slate-500">Enviando imagem...</span>
                     </div>
                  ) : formData.logoUrl ? (
                    <div className="relative w-full flex justify-center group">
                      <img src={formData.logoUrl} alt="Logo Preview" className="h-24 object-contain" />
                      <button 
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-slate-400">
                       <Upload className="h-8 w-8 mb-2" />
                       <span className="text-xs font-medium">Clique para enviar logo</span>
                       <span className="text-[10px] mt-1">(JPG, PNG até 2MB)</span>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Cor Principal do Studio</label>
                <div className="flex items-center gap-3">
                  <div className="relative overflow-hidden w-12 h-12 rounded-lg shadow-sm ring-1 ring-slate-200">
                    <input
                      type="color"
                      value={formData.brandColor || '#14b8a6'}
                      onChange={handleColorChange}
                      className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer p-0 border-0"
                    />
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg font-mono border border-slate-200 dark:border-slate-700">
                    {formData.brandColor || '#14b8a6'}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">Escolha a cor da sua marca para personalizar o sistema.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-500" /> Serviços & Especialidades
            </h2>
            <Input
              label="Especialidades (separadas por vírgula)"
              value={specialtiesInput}
              onChange={handleSpecialtiesChange}
              placeholder="Ex: Reformer, Pilates Solo, Pré-natal, Reabilitação"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.specialties.map((tag, idx) => (
                <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
             <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" /> Detalhes de Contato
            </h2>
            <Input
              label="Endereço"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Av. Paulista, 1000"
            />
            <Input
              label="Telefone / WhatsApp"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
            />
            <Input
              label="Site / Instagram"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-brand-200/50" isLoading={isLoading}>
            <Save className="h-5 w-5 mr-2" /> Salvar Perfil
          </Button>
        </div>
      </form>
    </div>
  );
};