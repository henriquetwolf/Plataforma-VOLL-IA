
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchProfile, upsertProfile, uploadLogo, uploadOwnerPhoto } from '../services/storage';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Save, Building2, MapPin, Palette, Upload, Loader2, X, AlertTriangle, Lock, Instagram, Smartphone, Shield, Key, User, Camera } from 'lucide-react';
import { StudioProfile } from '../types';
import { supabase } from '../services/supabase';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { setBrandColor } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingOwner, setIsUploadingOwner] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [dataLoaded, setDataLoaded] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isReadOnly = user?.isInstructor;

  const [formData, setFormData] = useState<StudioProfile>({
    id: '',
    userId: '',
    studioName: '',
    ownerName: '',
    description: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    phone: '',
    website: '',
    specialties: [],
    logoUrl: '',
    brandColor: '#14b8a6',
    isAdmin: false,
    isActive: true,
    cnpj: '',
    instagram: '',
    whatsapp: '',
    ownerCpf: '',
    ownerBirthDate: '',
    ownerPhotoUrl: ''
  });
  
  const [specialtiesInput, setSpecialtiesInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
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
        setFormData(prev => ({ 
          ...prev, 
          userId: user?.id || '',
          ownerName: user?.name || '' 
        }));
      }
      setDataLoaded(true);
    };
    loadData();
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

  const handleOwnerPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || !e.target.files || e.target.files.length === 0 || !user?.id) return;
    
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: 'A imagem deve ter no máximo 2MB.', type: 'error' });
      return;
    }

    setIsUploadingOwner(true);
    const publicUrl = await uploadOwnerPhoto(user.id, file);
    
    if (publicUrl) {
      setFormData(prev => ({ ...prev, ownerPhotoUrl: publicUrl }));
      setMessage({ text: 'Foto enviada com sucesso! Clique em Salvar.', type: 'success' });
    } else {
      setMessage({ text: 'Erro ao fazer upload da foto.', type: 'error' });
    }
    setIsUploadingOwner(false);
  };

  const removeLogo = () => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  const removeOwnerPhoto = () => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, ownerPhotoUrl: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !user?.id) return;

    setIsLoading(true);
    try {
      // 1. Save Profile Data
      const result = await upsertProfile(user.id, formData);
      
      let passwordMsg = '';
      
      // 2. Change Password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
            setMessage({ text: 'A senha deve ter no mínimo 6 caracteres.', type: 'error' });
            setIsLoading(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ text: 'As senhas não coincidem.', type: 'error' });
            setIsLoading(false);
            return;
        }

        const { error: pwdError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (pwdError) {
            passwordMsg = ' Erro ao atualizar senha: ' + pwdError.message;
        } else {
            passwordMsg = ' Senha atualizada com sucesso!';
            setNewPassword('');
            setConfirmPassword('');
        }
      }

      if (result.success) {
        setMessage({ text: 'Perfil salvo com sucesso!' + passwordMsg, type: 'success' });
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Perfil do Studio</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie as informações do seu negócio, marca e contato.</p>
        </div>
        {isReadOnly && (
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-orange-200">
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
                label="CNPJ do Studio (Opcional)"
                name="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj || ''}
                onChange={handleChange}
                disabled={isReadOnly}
              />
              <Input
                label="Nome do Proprietário"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                disabled={isReadOnly}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                    label="CPF (Opcional)"
                    name="ownerCpf"
                    placeholder="000.000.000-00"
                    value={formData.ownerCpf || ''}
                    onChange={handleChange}
                    disabled={isReadOnly}
                />
                <Input
                    label="Data Nascimento"
                    name="ownerBirthDate"
                    type="date"
                    value={formData.ownerBirthDate || ''}
                    onChange={handleChange}
                    disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Foto do Proprietário</label>
              <div className="flex items-center gap-4">
                <div className={`relative w-20 h-20 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 overflow-hidden group ${!isReadOnly && 'cursor-pointer hover:border-brand-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    {isUploadingOwner ? (
                        <div className="flex flex-col items-center"><Loader2 className="h-6 w-6 text-brand-500 animate-spin" /></div>
                    ) : formData.ownerPhotoUrl ? (
                        <div className="relative w-full h-full">
                            <img src={formData.ownerPhotoUrl} alt="Proprietário" className="w-full h-full object-cover" />
                            {!isReadOnly && (
                                <button type="button" onClick={removeOwnerPhoto} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-slate-400">
                            <Camera className="h-6 w-6" />
                        </div>
                    )}
                    {!isReadOnly && (
                        <input type="file" accept="image/*" onChange={handleOwnerPhotoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploadingOwner} />
                    )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-medium mb-1">Foto para perfil e assinatura.</p>
                    <p>Formato ideal: JPG/PNG, Rosto bem visível (Max 2MB).</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Biografia / Sobre</label>
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                disabled={isReadOnly}
                placeholder="Conte sobre a história do studio, metodologia, e o que torna seu espaço único..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-800"
              />
              <p className="text-xs text-slate-500 mt-2">
                Dica: Uma boa biografia ajuda na criação de conteúdo personalizado pela IA. Mencione seus diferenciais!
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-brand-500" /> Identidade Visual
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Logotipo</label>
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
                       <span className="text-xs">Upload</span>
                    </div>
                  )}
                  {!isReadOnly && (
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                    Formato ideal: PNG ou JPG (Quadrado 1:1), mín. 500x500px.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Cor da Marca</label>
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
            <Input label="Lista de Especialidades (separadas por vírgula)" value={specialtiesInput} onChange={handleSpecialtiesChange} disabled={isReadOnly} />
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
              <MapPin className="h-5 w-5 text-brand-500" /> Dados de Contato
            </h2>
            <div className="grid grid-cols-3 gap-2">
               <div className="col-span-3">
                   <Input label="CEP" name="cep" value={formData.cep || ''} onChange={handleChange} disabled={isReadOnly} placeholder="00000-000" />
               </div>
               <div className="col-span-2">
                   <Input label="Cidade" name="city" value={formData.city || ''} onChange={handleChange} disabled={isReadOnly} />
               </div>
               <div className="col-span-1">
                   <Input label="UF" name="state" value={formData.state || ''} onChange={handleChange} disabled={isReadOnly} maxLength={2} />
               </div>
            </div>
            
            <Input label="Endereço Completo (Rua, Nº, Bairro)" name="address" value={formData.address} onChange={handleChange} disabled={isReadOnly} />
            
            <Input label="Telefone" name="phone" value={formData.phone} onChange={handleChange} disabled={isReadOnly} />
            
            <div className="relative">
                <Input label="Whatsapp (Opcional)" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} disabled={isReadOnly} className="pl-10" />
                <Smartphone className="absolute left-3 top-9 w-4 h-4 text-slate-400" />
            </div>

            <div className="relative">
                <Input label="Instagram (Opcional)" name="instagram" value={formData.instagram || ''} onChange={handleChange} disabled={isReadOnly} placeholder="@seu.studio" className="pl-10" />
                <Instagram className="absolute left-3 top-9 w-4 h-4 text-slate-400" />
            </div>

            <Input label="Website / Link" name="website" value={formData.website} onChange={handleChange} disabled={isReadOnly} />
          </div>

          {!isReadOnly && (
            <>
                {/* Password Change Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-red-500" /> Segurança
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">Use este campo para alterar sua senha provisória ou atualizar seu acesso.</p>
                    <div className="space-y-4">
                        <div className="relative">
                            <Input 
                                label="Nova Senha" 
                                type="password" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                placeholder="Mínimo 6 caracteres"
                                className="pl-10"
                            />
                            <Key className="absolute left-3 top-9 w-4 h-4 text-slate-400" />
                        </div>
                        <div className="relative">
                            <Input 
                                label="Confirmar Senha" 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                placeholder="Repita a senha"
                                className="pl-10"
                            />
                            <Key className="absolute left-3 top-9 w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                </div>

                <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-brand-200/50" isLoading={isLoading}>
                <Save className="h-5 w-5 mr-2" /> Salvar Perfil
                </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
