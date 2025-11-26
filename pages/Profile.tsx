import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile, upsertProfile } from '../services/storage';
import { generateStudioDescription } from '../services/geminiService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Save, Wand2, Building2, MapPin, Phone, Globe, Briefcase } from 'lucide-react';
import { StudioProfile } from '../types';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
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
  });
  
  const [specialtiesInput, setSpecialtiesInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const existingProfile = await fetchProfile(user.id);
        if (existingProfile) {
          setFormData(existingProfile);
          setSpecialtiesInput(existingProfile.specialties.join(', '));
        } else {
          // Initialize defaults
          setFormData(prev => ({ 
            ...prev, 
            userId: user.id,
            ownerName: user.name 
          }));
        }
      }
    };
    loadData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpecialtiesInput(e.target.value);
    setFormData(prev => ({ 
      ...prev, 
      specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') 
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const success = await upsertProfile(user.id, formData);
      if (success) {
        setMessage({ text: 'Perfil salvo com sucesso!', type: 'success' });
      } else {
        setMessage({ text: 'Erro ao salvar. Tente novamente.', type: 'error' });
      }
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({ text: 'Falha ao salvar perfil.', type: 'error' });
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Perfil do Studio</h1>
          <p className="text-slate-500">Gerencie as informações públicas e detalhes do seu negócio</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
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
                <label className="text-sm font-medium text-slate-700">Biografia do Studio</label>
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isAiLoading}
                  className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded-md transition-colors"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                placeholder="Fale um pouco sobre seu estúdio..."
              />
              <p className="text-xs text-slate-400 mt-1">
                Dica: Use o botão de IA para gerar uma descrição profissional baseada no nome e especialidades.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-brand-500" /> Serviços & Especialidades
            </h2>
            <Input
              label="Especialidades (separadas por vírgula)"
              value={specialtiesInput}
              onChange={handleSpecialtiesChange}
              placeholder="Ex: Reformer, Pilates Solo, Pré-natal, Reabilitação"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.specialties.map((tag, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" /> Detalhes de Contato
            </h2>
            <Input
              label="Endereço"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Av. Paulista, 1000"
            />
             <div className="flex items-center gap-2 mb-2 text-slate-400">
                 <Phone className="h-4 w-4" />
             </div>
            <Input
              label="Telefone / WhatsApp"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
            />
             <div className="flex items-center gap-2 mb-2 text-slate-400">
                 <Globe className="h-4 w-4" />
             </div>
            <Input
              label="Site / Instagram"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-brand-200" isLoading={isLoading}>
            <Save className="h-5 w-5 mr-2" /> Salvar Perfil
          </Button>
        </div>
      </form>
    </div>
  );
};
