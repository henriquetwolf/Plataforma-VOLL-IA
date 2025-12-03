
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Instructor } from '../types';
import { fetchInstructors, createInstructorWithAuth, updateInstructor, deleteInstructor, toggleInstructorStatus, uploadInstructorPhoto } from '../services/instructorService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Plus, Trash2, Search, Phone, Mail, Pencil, X, BookUser, MapPin, CheckCircle, Ban, Share2, Award, Camera, Loader2, Filter, MoreVertical, LayoutGrid, List } from 'lucide-react';

export const Instructors: React.FC = () => {
  const { user } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Filtros e View Mode
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para Upload de Foto
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
            alert(editingId ? "Dados atualizados com sucesso!" : "Instrutor cadastrado com sucesso!");
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

  const filtered = instructors.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' 
                          ? true 
                          : statusFilter === 'active' ? i.active : !i.active;

    return matchesSearch && matchesStatus;
  });

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

      {showForm ? (
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
                    <Input label="Nome Completo *" name="name" value={formData.name} onChange={handleInputChange} required />
                    <Input label="CPF *" name="cpf" value={formData.cpf} onChange={handleInputChange} required placeholder="000.000.000-00" maxLength={14} />
                    <Input label="Email de Login *" name="email" type="email" value={formData.email} onChange={handleInputChange} required placeholder="email@exemplo.com" />
                    <Input label={editingId ? "Nova Senha (Opcional)" : "Senha de Acesso *"} name="password" type="password" value={formData.password} onChange={handleInputChange} required={!editingId} placeholder={editingId ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} />
                    <Input label="Telefone / WhatsApp" name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Endereço
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1"><Input label="CEP" name="cep" value={formData.cep} onChange={handleInputChange} placeholder="00000-000" /></div>
                    <div className="md:col-span-3"><Input label="Endereço (Rua, Número, Bairro)" name="address" value={formData.address} onChange={handleInputChange} /></div>
                    <div className="md:col-span-3"><Input label="Cidade" name="city" value={formData.city} onChange={handleInputChange} /></div>
                    <div className="md:col-span-1"><Input label="Estado" name="state" value={formData.state} onChange={handleInputChange} placeholder="UF" maxLength={2} /></div>
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

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
                    {formData.certifications.length === 0 && <p className="text-sm text-slate-400 italic">Nenhuma certificação adicionada.</p>}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={handleCancel}>Cancelar</Button>
              <Button type="submit" isLoading={isSubmitting}>{editingId ? 'Salvar Alterações' : 'Cadastrar e Criar Acesso'}</Button>
            </div>
          </form>
        </div>
      ) : (
        <>
            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-500 font-medium text-sm w-full md:w-auto">
                    <Filter className="w-4 h-4" /> Filtros:
                </div>
                
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-brand-500 w-full md:w-40"
                    >
                        <option value="all">Status: Todos</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                    </select>
                </div>

                {/* Toggle View Mode */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                        title="Grade"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                        title="Lista"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* List/Grid Content */}
            {isLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-brand-600"/></div>
            ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <BookUser className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p>Nenhum instrutor encontrado com os filtros atuais.</p>
                </div>
            ) : (
                <>
                    {/* GRID VIEW (CARDS) */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((inst) => (
                                <div key={inst.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col group relative">
                                    {/* Card Header */}
                                    <div className="p-5 flex items-start gap-4 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex-shrink-0">
                                            {inst.photoUrl ? (
                                                <img src={inst.photoUrl} alt={inst.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shadow-sm" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xl border-2 border-slate-200 dark:border-slate-700">
                                                    {inst.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate" title={inst.name}>{inst.name}</h3>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider w-fit px-2 py-0.5 rounded-full ${inst.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {inst.active ? <><CheckCircle className="w-3 h-3"/> Ativo</> : <><Ban className="w-3 h-3"/> Inativo</>}
                                                </span>
                                                {inst.city && (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                                        <MapPin className="w-3 h-3"/> {inst.city}, {inst.state}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-5 flex-1 flex flex-col gap-4">
                                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-brand-500"/> <span className="truncate">{inst.email}</span>
                                            </div>
                                            {inst.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-brand-500"/> <span>{inst.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {inst.certifications && inst.certifications.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Especialidades</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {inst.certifications.slice(0, 3).map((cert, idx) => (
                                                        <span key={idx} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[150px]">
                                                            {cert}
                                                        </span>
                                                    ))}
                                                    {inst.certifications.length > 3 && (
                                                        <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded">+{inst.certifications.length - 3}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                                        <button 
                                            onClick={() => handleToggleStatus(inst.id, inst.active, inst.name)}
                                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${inst.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                        >
                                            {inst.active ? 'Bloquear' : 'Ativar'}
                                        </button>
                                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                                        <div className="flex gap-1">
                                            <button onClick={() => shareInstructions(inst.email)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Compartilhar Acesso">
                                                <Share2 className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleEdit(inst)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                                <Pencil className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleDelete(inst.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LIST VIEW (TABLE) */}
                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Instrutor</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4">Localização</th>
                                        <th className="px-6 py-4">Especialidades</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filtered.map(inst => (
                                        <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10">
                                                        {inst.photoUrl ? (
                                                            <img src={inst.photoUrl} alt={inst.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                                                                {inst.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{inst.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-600 dark:text-slate-300">{inst.email}</div>
                                                {inst.phone && <div className="text-xs text-slate-500">{inst.phone}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {inst.city ? (
                                                    <span className="text-slate-600 dark:text-slate-300">{inst.city}, {inst.state}</span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {inst.certifications?.slice(0, 2).map((cert, i) => (
                                                        <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[100px]">{cert}</span>
                                                    ))}
                                                    {(inst.certifications?.length || 0) > 2 && <span className="text-[10px] text-slate-400">+{inst.certifications!.length - 2}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${inst.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {inst.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => shareInstructions(inst.email)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Compartilhar Acesso">
                                                        <Share2 className="w-4 h-4"/>
                                                    </button>
                                                    <button onClick={() => handleEdit(inst)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Editar">
                                                        <Pencil className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(inst.id, inst.active, inst.name)} 
                                                        className={`p-1.5 rounded transition-colors ${inst.active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                                        title={inst.active ? "Bloquear" : "Ativar"}
                                                    >
                                                        {inst.active ? <Ban className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                                                    </button>
                                                    <button onClick={() => handleDelete(inst.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </>
      )}
    </div>
  );
};
