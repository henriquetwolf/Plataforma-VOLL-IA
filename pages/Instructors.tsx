
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Instructor } from '../types';
import { fetchInstructors, createInstructorWithAuth, updateInstructor, deleteInstructor, toggleInstructorStatus, uploadInstructorPhoto } from '../services/instructorService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Plus, Trash2, Search, Phone, Mail, Pencil, X, BookUser, MapPin, CheckCircle, Ban, Share2, Award, Camera, Loader2 } from 'lucide-react';

export const Instructors: React.FC = () => {
  const { user } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para Upload de Foto
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Estados para Certificações
  const [newCertification, setNewCertification] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    photoUrl: '',
    certifications: [] as string[],
    password: '' 
  });

  const loadData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    // Explicitly pass the user ID (Owner ID) to fetch only this studio's instructors
    const data = await fetchInstructors(user.id);
    setInstructors(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') 
      .replace(/(-\d{2})\d+?$/, '$1'); 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
        setFormData(prev => ({ ...prev, [name]: formatCPF(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = (inst: Instructor) => {
    setFormData({
      name: inst.name,
      email: inst.email,
      cpf: inst.cpf || '',
      phone: inst.phone || '',
      address: inst.address || '',
      city: inst.city || '',
      state: inst.state || '',
      cep: inst.cep || '',
      photoUrl: inst.photoUrl || '',
      certifications: inst.certifications || [],
      password: '' 
    });
    setPhotoPreview(inst.photoUrl || null);
    setEditingId(inst.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', cpf: '', phone: '', address: '', city: '', state: '', cep: '', photoUrl: '', certifications: [], password: '' });
    setPhotoFile(null);
    setPhotoPreview(null);
    setNewCertification('');
    setEditingId(null);
    setShowForm(false);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB.");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.name || !formData.email) return;

    if (formData.password && formData.password.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    
    if (!editingId && !formData.password) {
        alert("A senha é obrigatória para novos cadastros.");
        return;
    }

    setIsSubmitting(true);
    
    try {
        let finalPhotoUrl = formData.photoUrl;

        // Upload Photo if new file selected
        if (photoFile) {
            const url = await uploadInstructorPhoto(user.id, photoFile);
            if (url) {
                finalPhotoUrl = url;
            } else {
                console.warn("Falha no upload da foto, salvando sem atualizar imagem.");
            }
        }

        const payload = {
            name: formData.name,
            email: formData.email,
            cpf: formData.cpf,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            cep: formData.cep,
            photoUrl: finalPhotoUrl,
            certifications: formData.certifications
        };

        let result;
        if (editingId) {
            result = await updateInstructor(editingId, payload, formData.password);
        } else {
            result = await createInstructorWithAuth(user.id, payload, formData.password);
        }
        
        if (result.success) {
            if (result.error) {
                alert(result.error);
            } else {
                alert(editingId ? "Dados atualizados com sucesso!" : "Instrutor cadastrado com sucesso!");
            }
            handleCancel();
            await loadData();
        } else {
            alert(`Erro ao salvar: ${result.error}`);
        }
    } catch (err: any) {
        alert("Erro inesperado: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este instrutor? Ele perderá o acesso.')) {
      const result = await deleteInstructor(id);
      if (result.success) {
        await loadData();
      } else {
        alert(`Erro ao deletar: ${result.error}`);
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? 'DESATIVAR' : 'ATIVAR';
    if (!window.confirm(`Tem certeza que deseja ${action} o acesso do instrutor ${name}?`)) return;

    const result = await toggleInstructorStatus(id, !currentStatus);
    
    if (result.success) {
        await loadData();
    } else {
        alert("Erro ao alterar status: " + result.error);
    }
  };

  const shareInstructions = (email: string) => {
    const text = `Olá! Cadastrei você na Plataforma VOLL IA.\n\nAcesse: ${window.location.origin}\nLogin: ${email}\nSenha: (Sua senha definida no cadastro)`;
    
    if (navigator.share) {
      navigator.share({ title: 'Acesso VOLL IA', text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(text);
      alert('Instruções copiadas! Envie para o instrutor.');
    }
  };

  const filtered = instructors.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookUser className="h-6 w-6 text-brand-600" /> Equipe de Instrutores
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Cadastre seus instrutores e gerencie o acesso.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Instrutor
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingId ? 'Editar Dados' : 'Cadastrar Novo Instrutor'}
            </h3>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Foto e Dados Principais */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 flex flex-col items-center gap-3">
                    <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center group hover:border-brand-500 transition-colors">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center">
                                <Camera className="h-8 w-8 mb-1" />
                                <span className="text-[10px]">Adicionar Foto</span>
                            </div>
                        )}
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <Pencil className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[140px]">
                        JPG ou PNG.<br/>Tamanho ideal: Quadrado.<br/>Max 5MB.
                    </p>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Nome Completo *"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                    />
                    <Input
                        label="CPF *"
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleInputChange}
                        required
                        placeholder="000.000.000-00"
                        maxLength={14}
                    />
                    <Input
                        label="Email de Login *"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="email@exemplo.com"
                    />
                    <Input
                        label={editingId ? "Nova Senha (Opcional)" : "Senha de Acesso *"}
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!editingId}
                        placeholder={editingId ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                    />
                    <Input
                        label="Telefone / WhatsApp"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Endereço */}
            <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Endereço
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                        <Input
                            label="CEP"
                            name="cep"
                            value={formData.cep}
                            onChange={handleInputChange}
                            placeholder="00000-000"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Input
                            label="Endereço (Rua, Número, Bairro)"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Input
                            label="Cidade"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Input
                            label="Estado"
                            name="state"
                            value={formData.state}
                            onChange={handleInputChange}
                            placeholder="UF"
                            maxLength={2}
                        />
                    </div>
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Certificações */}
            <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" /> Certificações e Especializações
                </h4>
                <div className="flex gap-2 mb-3">
                    <input 
                        type="text" 
                        value={newCertification} 
                        onChange={(e) => setNewCertification(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                        placeholder="Ex: Pilates Clássico, Treinamento Funcional..."
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Button type="button" onClick={addCertification} variant="secondary">Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.certifications.map((cert, index) => (
                        <span key={index} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 px-3 py-1 rounded-full text-sm border border-brand-100 dark:border-brand-800">
                            {cert}
                            <button type="button" onClick={() => removeCertification(index)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                    {formData.certifications.length === 0 && (
                        <p className="text-sm text-slate-400 italic">Nenhuma certificação adicionada.</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={handleCancel}>Cancelar</Button>
              <Button type="submit" isLoading={isSubmitting}>{editingId ? 'Salvar Alterações' : 'Cadastrar e Criar Acesso'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Instrutores */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar instrutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BookUser className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p>Nenhum instrutor encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-3">Instrutor</th>
                  <th className="px-6 py-3">Contato</th>
                  <th className="px-6 py-3">Localização</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                          {inst.photoUrl ? (
                              <img src={inst.photoUrl} alt={inst.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                          ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                                  {inst.name.charAt(0)}
                              </div>
                          )}
                          <div>
                              <div className="font-bold text-slate-900 dark:text-white">{inst.name}</div>
                              <div className="text-xs text-slate-500 font-mono">{inst.cpf}</div>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {inst.email}</div>
                        {inst.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {inst.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                       {inst.city && inst.state ? (
                           <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {inst.city} - {inst.state}</span>
                       ) : (
                           <span className="text-slate-400">-</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleToggleStatus(inst.id, inst.active, inst.name)}
                        title={inst.active ? "Clique para DESATIVAR o acesso deste instrutor" : "Clique para ATIVAR o acesso"}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${
                          inst.active 
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 cursor-pointer' 
                            : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 cursor-pointer'
                        }`}
                      >
                        {inst.active ? <><CheckCircle className="w-3 h-3"/> ATIVO</> : <><Ban className="w-3 h-3"/> INATIVO</>}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => shareInstructions(inst.email)} className="text-slate-400 hover:text-blue-600 p-2" title="Enviar Instruções de Acesso">
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleEdit(inst)} className="text-slate-400 hover:text-brand-600 p-2"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(inst.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
