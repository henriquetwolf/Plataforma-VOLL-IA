
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Instructor } from '../types';
import { fetchInstructors, createInstructorWithAuth, updateInstructor, deleteInstructor, toggleInstructorStatus } from '../services/instructorService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Plus, Trash2, Search, Phone, Mail, Pencil, X, BookUser, ShieldAlert, MapPin, CheckCircle, Ban, Share2, Key, CreditCard } from 'lucide-react';

export const Instructors: React.FC = () => {
  const { user } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    address: ''
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
      .replace(/\D/g, '') // Remove tudo o que não é dígito
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos de novo (para o segundo bloco de números)
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen entre o terceiro e o quarto dígitos
      .replace(/(-\d{2})\d+?$/, '$1'); // Impede que sejam digitados mais de 11 dígitos
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
      phone: inst.phone,
      address: inst.address
    });
    setEditingId(inst.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', cpf: '', phone: '', address: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.name || !formData.email) return;

    // Validação de CPF básico
    if (formData.cpf.length < 14) {
      alert("Por favor, preencha o CPF completo.");
      return;
    }

    setIsSubmitting(true);
    
    let result;
    if (editingId) {
      // Atualização normal
      result = await updateInstructor(editingId, {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf,
        phone: formData.phone,
        address: formData.address
      });
    } else {
      // Criação completa: Banco + Auth (Senha = CPF)
      result = await createInstructorWithAuth(user.id, formData);
    }
    
    if (result.success) {
      handleCancel();
      await loadData();
      if (!editingId) {
        alert(`Instrutor ${formData.name} cadastrado com sucesso!\n\nO Login é o E-mail e a Senha é o CPF (apenas números).`);
      }
    } else {
      alert(`Erro ao salvar: ${result.error}`);
    }
    setIsSubmitting(false);
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

  const shareInstructions = (email: string, cpf: string) => {
    const password = cpf ? cpf.replace(/\D/g, '') : '(CPF do Instrutor)';
    const text = `Olá! Cadastrei você na Plataforma VOLL IA.\n\nAcesse: ${window.location.origin}\nLogin: ${email}\nSenha: ${password}`;
    
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingId ? 'Editar Dados' : 'Cadastrar Novo Instrutor'}
            </h3>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {!editingId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-lg mb-6 text-sm flex gap-3 border border-blue-100 dark:border-blue-800">
              <Key className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold">Criação de Acesso Automática</p>
                <p className="mt-1">
                  A senha de acesso do instrutor será gerada automaticamente usando os números do <strong>CPF</strong>.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome Completo *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Email de Login *"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="email@exemplo.com"
              disabled={!!editingId}
            />
            
            <Input
                label="CPF (Será a Senha) *"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                required
                placeholder="000.000.000-00"
                maxLength={14}
            />

            <Input
              label="Telefone / WhatsApp"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <div className="md:col-span-2">
                <Input
                label="Endereço Completo"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Rua, Número, Bairro..."
                />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
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
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Contato</th>
                  <th className="px-6 py-3">CPF</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{inst.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3"/> {inst.address || 'Sem endereço'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {inst.email}</div>
                        {inst.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {inst.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                       {inst.cpf || '-'}
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
                        <button onClick={() => shareInstructions(inst.email, inst.cpf || '')} className="text-slate-400 hover:text-blue-600 p-2" title="Enviar Instruções de Acesso">
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
