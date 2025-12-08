import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Student } from '../types';
import { 
  fetchStudents, 
  createStudentWithAutoAuth, 
  updateStudent, 
  deleteStudent, 
  uploadStudentPhoto, 
  createStudentWithAuth, 
  revokeStudentAccess 
} from '../services/studentService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  LayoutGrid, List, Plus, X, Unlock, User, Camera, Loader2, 
  Eye, Ban, Pencil, Trash2, Mail, Phone, Lock, Key, Search 
} from 'lucide-react';

export const Students: React.FC = () => {
  const { user } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    birthDate: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    goals: '',
    observations: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reactivation Modal State
  const [reactivatingStudent, setReactivatingStudent] = useState<Student | null>(null);
  const [reactivationPassword, setReactivationPassword] = useState('');
  const [isReactivating, setIsReactivating] = useState(false);

  // Detail View State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (user?.id) {
        const targetId = user.isInstructor ? user.studioId : user.id;
        if (targetId) {
            const data = await fetchStudents(targetId);
            setStudents(data);
        }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', password: '', phone: '', cpf: '', birthDate: '',
      address: '', city: '', state: '', cep: '', goals: '', observations: '',
      emergencyContactName: '', emergencyContactPhone: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingStudent(null);
    setShowForm(false);
  };

  const openForm = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        email: student.email,
        password: '',
        phone: student.phone || '',
        cpf: student.cpf || '',
        birthDate: student.birthDate || '',
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        cep: student.cep || '',
        goals: student.goals || '',
        observations: student.observations || '',
        emergencyContactName: student.emergencyContactName || '',
        emergencyContactPhone: student.emergencyContactPhone || ''
      });
      setPhotoPreview(student.photoUrl || null);
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetId = user.isInstructor ? user.studioId : user.id;
    if (!targetId) return;

    setIsSubmitting(true);
    try {
      let photoUrl = editingStudent?.photoUrl;
      if (photoFile) {
        const uploaded = await uploadStudentPhoto(targetId, photoFile);
        if (uploaded) photoUrl = uploaded;
      }

      const payload = { ...formData, photoUrl };

      if (editingStudent) {
        await updateStudent(editingStudent.id, payload, formData.password);
        alert('Aluno atualizado com sucesso!');
      } else {
        const res = await createStudentWithAutoAuth(targetId, payload, formData.password);
        if (!res.success) throw new Error(res.error);
        alert('Aluno cadastrado com sucesso!');
      }
      
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
      await deleteStudent(id);
      loadData();
    }
  };

  const handleToggleStatus = async (student: Student) => {
    if (student.authUserId) {
      if (confirm('Deseja bloquear o acesso deste aluno ao aplicativo?')) {
        await revokeStudentAccess(student.id);
        loadData();
      }
    } else {
      setReactivatingStudent(student);
      setReactivationPassword('');
    }
  };

  const handleConfirmReactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactivatingStudent) return;
    setIsReactivating(true);
    const res = await createStudentWithAuth(reactivatingStudent.id, reactivatingStudent.email, reactivationPassword);
    setIsReactivating(false);
    
    if (res.success) {
      alert(res.message || 'Acesso liberado!');
      setReactivatingStudent(null);
      loadData();
    } else {
      alert('Erro: ' + res.error);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-6 w-6 text-brand-600" /> Meus Alunos
          </h1>
          <p className="text-slate-500">Gerencie cadastros, fichas e acesso ao aplicativo.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    placeholder="Buscar aluno..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('grid')} 
                    className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                    title="Grade"
                >
                    <LayoutGrid className="w-4 h-4"/>
                </button>
                <button 
                    onClick={() => setViewMode('list')} 
                    className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                    title="Lista"
                >
                    <List className="w-4 h-4"/>
                </button>
            </div>

            {!showForm && (
                <Button onClick={() => openForm()}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Aluno
                </Button>
            )}
        </div>
      </div>

      {reactivatingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Unlock className="w-5 h-5 text-green-600" /> Liberar Acesso
                    </h3>
                    <button onClick={() => setReactivatingStudent(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Defina uma nova senha para reativar o acesso de <strong>{reactivatingStudent.name}</strong> ao aplicativo.
                </p>
                <form onSubmit={handleConfirmReactivation} className="space-y-4">
                    <Input 
                        label="Nova Senha de Acesso" 
                        type="password" 
                        value={reactivationPassword} 
                        onChange={e => setReactivationPassword(e.target.value)} 
                        placeholder="Mínimo 6 caracteres"
                        required
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setReactivatingStudent(null)}>Cancelar</Button>
                        <Button type="submit" isLoading={isReactivating} className="bg-green-600 hover:bg-green-700">Confirmar e Liberar</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {selectedStudent && !showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
                <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                <div className="flex flex-col items-center mb-6">
                    {selectedStudent.photoUrl ? (
                        <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-slate-100 dark:border-slate-800" />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-3xl mb-4">
                            {selectedStudent.name.charAt(0)}
                        </div>
                    )}
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                    <p className="text-slate-500">{selectedStudent.email}</p>
                </div>
                
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                            <p className="text-xs text-slate-400 uppercase font-bold">Telefone</p>
                            <p className="text-slate-800 dark:text-white">{selectedStudent.phone || '-'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                            <p className="text-xs text-slate-400 uppercase font-bold">CPF</p>
                            <p className="text-slate-800 dark:text-white">{selectedStudent.cpf || '-'}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                        <p className="text-xs text-slate-400 uppercase font-bold">Endereço</p>
                        <p className="text-slate-800 dark:text-white">{selectedStudent.address || '-'}</p>
                        <p className="text-slate-800 dark:text-white">{selectedStudent.city} - {selectedStudent.state} ({selectedStudent.cep})</p>
                    </div>
                    {selectedStudent.goals && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-900">
                            <p className="text-xs text-blue-600 uppercase font-bold">Objetivos</p>
                            <p className="text-blue-900 dark:text-blue-100">{selectedStudent.goals}</p>
                        </div>
                    )}
                    {selectedStudent.observations && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-100 dark:border-yellow-900">
                            <p className="text-xs text-yellow-600 uppercase font-bold">Observações Clínicas</p>
                            <p className="text-yellow-900 dark:text-yellow-100">{selectedStudent.observations}</p>
                        </div>
                    )}
                    {selectedStudent.emergencyContactName && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-900">
                            <p className="text-xs text-red-600 uppercase font-bold">Emergência</p>
                            <p className="text-red-900 dark:text-red-100">{selectedStudent.emergencyContactName} - {selectedStudent.emergencyContactPhone}</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex gap-2">
                    <Button onClick={() => { setSelectedStudent(null); openForm(selectedStudent); }} className="flex-1">
                        <Pencil className="w-4 h-4 mr-2"/> Editar
                    </Button>
                    <button 
                        onClick={() => { if(confirm('Excluir aluno?')) { deleteStudent(selectedStudent.id); setSelectedStudent(null); loadData(); } }}
                        className="p-2 text-slate-400 hover:text-red-600 border rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
      )}

      {showForm ? (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h3>
                  <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
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
                                      <span className="text-[10px]">Foto</span>
                                  </div>
                              )}
                              <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Nome Completo *" name="name" value={formData.name} onChange={handleInputChange} required />
                          <Input label="Email (Login) *" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                          <Input label={editingStudent ? "Nova Senha (Opcional)" : "Senha de Acesso *"} name="password" type="password" value={formData.password} onChange={handleInputChange} required={!editingStudent} placeholder={editingStudent ? "Deixar em branco para manter" : "Mínimo 6 caracteres"} />
                          <Input label="Telefone / WhatsApp" name="phone" value={formData.phone} onChange={handleInputChange} />
                          <Input label="Data de Nascimento" name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} />
                          <Input label="CPF" name="cpf" value={formData.cpf} onChange={handleInputChange} />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="md:col-span-3">
                          <h4 className="font-medium text-sm text-slate-500 uppercase mb-2">Endereço</h4>
                      </div>
                      <div className="md:col-span-1"><Input label="CEP" name="cep" value={formData.cep} onChange={handleInputChange} /></div>
                      <div className="md:col-span-2"><Input label="Cidade/Estado" name="city" placeholder="Cidade" value={formData.city} onChange={handleInputChange} /></div>
                      <div className="md:col-span-3"><Input label="Endereço Completo" name="address" value={formData.address} onChange={handleInputChange} /></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="md:col-span-2">
                          <h4 className="font-medium text-sm text-slate-500 uppercase mb-2">Clínico & Emergência</h4>
                      </div>
                      <Input label="Objetivos" name="goals" value={formData.goals} onChange={handleInputChange} />
                      <Input label="Observações / Patologias" name="observations" value={formData.observations} onChange={handleInputChange} />
                      <Input label="Contato de Emergência (Nome)" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} />
                      <Input label="Telefone de Emergência" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                      <Button type="submit" isLoading={isSubmitting}>{editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno'}</Button>
                  </div>
              </form>
          </div>
      ) : (
          <>
            {loading ? (
                <div className="text-center py-12 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-600"/>Carregando alunos...</div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <User className="h-12 w-12 mx-auto text-slate-300 mb-3"/>
                    <p className="text-slate-500">Nenhum aluno encontrado.</p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStudents.map(student => (
                                <div key={student.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all group relative flex flex-col">
                                    <div className="p-5 flex items-start gap-4">
                                        <div className="flex-shrink-0 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                            {student.photoUrl ? (
                                                <img src={student.photoUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xl border-2 border-slate-200 dark:border-slate-700">
                                                    {student.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{student.name}</h3>
                                            <p className="text-sm text-slate-500 truncate">{student.email}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                {student.authUserId ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                        <Unlock className="w-3 h-3"/> Acesso App
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                                        <Lock className="w-3 h-3"/> Sem Acesso
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto border-t border-slate-100 dark:border-slate-800 flex divide-x divide-slate-100 dark:divide-slate-800">
                                        <button 
                                            onClick={() => setSelectedStudent(student)}
                                            className="flex-1 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4"/> Ver Detalhes
                                        </button>
                                        <button 
                                            onClick={() => handleToggleStatus(student)}
                                            className={`px-3 py-3 transition-colors ${student.authUserId ? 'text-green-600 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                                            title={student.authUserId ? "Bloquear Acesso" : "Liberar Acesso"}
                                        >
                                            {student.authUserId ? <Ban className="w-4 h-4"/> : <Key className="w-4 h-4"/>}
                                        </button>
                                        <button 
                                            onClick={() => openForm(student)}
                                            className="px-3 py-3 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(student.id)}
                                            className="px-3 py-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Aluno</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4 text-center">Acesso</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                                    <div className="flex-shrink-0 w-10 h-10">
                                                        {student.photoUrl ? (
                                                            <img src={student.photoUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                                                        {student.city && <div className="text-xs text-slate-500">{student.city}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><Mail className="w-3 h-3"/> {student.email}</div>
                                                {student.phone && <div className="text-xs text-slate-500 flex items-center gap-2 mt-1"><Phone className="w-3 h-3"/> {student.phone}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {student.authUserId ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                        <Unlock className="w-3 h-3"/> Acesso App
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                                        <Lock className="w-3 h-3"/> Sem Acesso
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setSelectedStudent(student)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Ver Detalhes">
                                                        <Eye className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(student)}
                                                        className={`p-1.5 rounded transition-colors ${student.authUserId ? 'text-green-600 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                                                        title={student.authUserId ? "Bloquear" : "Ativar"}
                                                    >
                                                        {student.authUserId ? <Ban className="w-4 h-4"/> : <Key className="w-4 h-4"/>}
                                                    </button>
                                                    <button onClick={() => openForm(student)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                                        <Pencil className="w-4 h-4"/>
                                                    </button>
                                                    <button onClick={() => handleDelete(student.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
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