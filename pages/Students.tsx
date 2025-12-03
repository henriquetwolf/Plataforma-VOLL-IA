
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Student, AppRoute } from '../types';
import { fetchStudents, createStudentWithAutoAuth, updateStudent, deleteStudent, createStudentWithAuth, revokeStudentAccess, uploadStudentPhoto } from '../services/studentService';
import { fetchRehabLessonsByStudent } from '../services/rehabService'; 
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Users, Plus, Trash2, Search, Pencil, Activity, X, Key, CheckCircle, Home, Building2, ArrowLeft, AlertCircle, Ban, MapPin, Phone, User, Camera, Filter, Mail, Eye, Lock, Unlock } from 'lucide-react';

export const Students: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Modal de Acesso (Reativação)
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessStudent, setAccessStudent] = useState<Student | null>(null);
  const [accessPassword, setAccessPassword] = useState('');
  const [isCreatingAccess, setIsCreatingAccess] = useState(false);
  
  const [permissionError, setPermissionError] = useState(false);

  // Estados para Upload de Foto
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    birthDate: '',
    goals: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    observations: '',
    password: '',
    photoUrl: ''
  });

  const isInstructor = user?.isInstructor;

  const loadStudents = async () => {
    if (!user) return;

    const targetId = user.isInstructor ? user.studioId : user.id;
    
    if (!targetId) {
        if (isInstructor) setPermissionError(true);
        setIsLoading(false);
        return;
    }

    setPermissionError(false);
    setIsLoading(true);
    try {
        const data = await fetchStudents(targetId);
        setStudents(data);
    } catch (e) {
        console.error("Erro ao buscar alunos:", e);
        setPermissionError(true);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, [user]);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') 
      .replace(/(-\d{2})\d+?$/, '$1'); 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
        setFormData(prev => ({ ...prev, [name]: formatCPF(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
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

  const handleEdit = (student: Student) => {
    setFormData({
      name: student.name,
      email: student.email || '',
      cpf: student.cpf || '',
      phone: student.phone || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      cep: student.cep || '',
      birthDate: student.birthDate || '',
      goals: student.goals || '',
      emergencyContactName: student.emergencyContactName || '',
      emergencyContactPhone: student.emergencyContactPhone || '',
      observations: student.observations || '',
      photoUrl: student.photoUrl || '',
      password: '' 
    });
    setPhotoPreview(student.photoUrl || null);
    setEditingId(student.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetails = async (student: Student) => {
    setSelectedStudent(student);
    setLoadingHistory(true);
    const lessons = await fetchRehabLessonsByStudent(student.id);
    setStudentLessons(lessons);
    setLoadingHistory(false);
  };

  const handleCancel = () => {
    setFormData({ 
        name: '', email: '', cpf: '', phone: '', address: '', city: '', state: '', cep: '', 
        birthDate: '', goals: '', emergencyContactName: '', emergencyContactPhone: '', 
        observations: '', password: '', photoUrl: '' 
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ownerId = user?.isInstructor ? user.studioId : user?.id;
    
    if (!ownerId || !formData.name) return;

    if (!editingId) {
        if (!formData.email) {
            alert("O email é obrigatório para novos cadastros.");
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            alert("Senha mínima de 6 caracteres é obrigatória.");
            return;
        }
    }

    if (editingId && formData.password && formData.password.length < 6) {
        alert("A nova senha deve ter no mínimo 6 caracteres.");
        return;
    }

    setIsSubmitting(true);
    
    try {
        let finalPhotoUrl = formData.photoUrl;

        if (photoFile) {
            const url = await uploadStudentPhoto(ownerId, photoFile);
            if (url) {
                finalPhotoUrl = url;
            } else {
                console.warn("Falha no upload da foto, salvando sem atualizar imagem.");
            }
        }

        const payload = {
            ...formData,
            photoUrl: finalPhotoUrl
        };

        let result;
        if (editingId) {
            result = await updateStudent(editingId, payload, formData.password);
        } else {
            result = await createStudentWithAutoAuth(ownerId, payload, formData.password);
        }
        
        if (result.success) {
            handleCancel();
            await loadStudents();
            if (!editingId) {
                alert(`Aluno cadastrado!\nLogin: ${formData.email}\nSenha: ${formData.password}`);
            } else {
                alert("Dados atualizados!");
            }
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
    if (isInstructor) {
        alert("Apenas o proprietário pode excluir alunos.");
        return;
    }
    if (window.confirm('Tem certeza que deseja remover este aluno?')) {
      const result = await deleteStudent(id);
      if (result.success) {
        await loadStudents();
      } else {
        alert(`Erro ao deletar: ${result.error}`);
      }
    }
  };

  const handleToggleAccess = async (student: Student) => {
    if (student.authUserId) {
        if (window.confirm(`REVOGAR o acesso de ${student.name}?`)) {
            const result = await revokeStudentAccess(student.id);
            if (result.success) {
                await loadStudents();
            } else {
                alert("Erro ao desativar: " + result.error);
            }
        }
    } else {
        if (!student.email) {
            alert("Adicione um email antes de ativar.");
            return;
        }
        setAccessStudent(student);
        setAccessPassword('');
        setAccessModalOpen(true);
    }
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessStudent || !accessStudent.email) return;

    if (accessPassword.length < 6) {
      alert("Senha mínima 6 caracteres.");
      return;
    }

    setIsCreatingAccess(true);
    const result = await createStudentWithAuth(accessStudent.id, accessStudent.email, accessPassword);
    setIsCreatingAccess(false);

    if (result.success) {
      alert(`Acesso criado!\nLogin: ${accessStudent.email}\nSenha: ${accessPassword}`);
      setAccessModalOpen(false);
      loadStudents();
    } else {
      alert(`Erro: ${result.error}`);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.cpf?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' ? !!student.authUserId : !student.authUserId;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {isInstructor && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => navigate(AppRoute.INSTRUCTOR_DASHBOARD)}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 shadow-sm"
            >
              <Home className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {isInstructor ? t('students_title') : t('my_students_title')} 
            </h1>
            <p className="text-slate-500 dark:text-slate-400">{t('students_subtitle')}</p>
          </div>
        </div>
        
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('new_student_btn')}
          </Button>
        )}
      </div>

      {permissionError && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          Erro de permissão.
        </div>
      )}

      {showForm ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingId ? t('edit') : t('new_student_btn')}
            </h3>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Foto e Dados Básicos */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Upload Foto */}
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
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <Pencil className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[140px]">
                        JPG/PNG.<br/>Quadrado ideal.<br/>Max 5MB.
                    </p>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label={t('student_name_label') + ' *'} name="name" value={formData.name} onChange={handleInputChange} required />
                    <Input label={t('student_email_label') + ' *'} name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={!!editingId} />
                    <Input label={t('student_cpf_label')} name="cpf" value={formData.cpf} onChange={handleInputChange} maxLength={14} />
                    <Input label={t('phone_label')} name="phone" value={formData.phone} onChange={handleInputChange} />
                    
                    <div className="md:col-span-1">
                        <Input label="Data de Nascimento" name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} />
                    </div>
                    <div className="md:col-span-1">
                        <Input 
                            label={editingId ? "Alterar Senha" : "Senha de Acesso *"} 
                            name="password" 
                            type="password" 
                            value={formData.password} 
                            onChange={handleInputChange} 
                            placeholder={editingId ? "Deixe em branco para manter" : "Mín 6 caracteres"} 
                            required={!editingId}
                        />
                    </div>
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Endereço */}
            <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Endereço
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1"><Input label="CEP" name="cep" value={formData.cep} onChange={handleInputChange} placeholder="00000-000" /></div>
                    <div className="md:col-span-3"><Input label={t('address_label')} name="address" value={formData.address} onChange={handleInputChange} placeholder="Rua, Número, Bairro" /></div>
                    <div className="md:col-span-3"><Input label="Cidade" name="city" value={formData.city} onChange={handleInputChange} /></div>
                    <div className="md:col-span-1"><Input label="Estado" name="state" value={formData.state} onChange={handleInputChange} placeholder="UF" maxLength={2} /></div>
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Objetivos e Obs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Objetivos do Aluno</label>
                    <textarea name="goals" value={formData.goals} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: Melhorar postura, flexibilidade..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('student_obs_label')}</label>
                    <textarea name="observations" value={formData.observations} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: Hérnia de disco, dores no joelho..." />
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Contato de Emergência */}
            <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Contato de Emergência
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nome do Contato" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} placeholder="Ex: Mãe, Esposo(a)..." />
                    <Input label="Telefone de Emergência" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} placeholder="(00) 00000-0000" />
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={handleCancel}>{t('cancel')}</Button>
              <Button type="submit" isLoading={isSubmitting}>{editingId ? t('update_student_btn') : t('save_student_btn')}</Button>
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
                        placeholder="Buscar por nome, email ou CPF..."
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
                        <option value="active">Com Acesso</option>
                        <option value="inactive">Sem Acesso</option>
                    </select>
                </div>
            </div>

            {/* Cards Grid */}
            {isLoading ? (
                <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
            ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p>{t('no_students_found')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.map((student) => (
                        <div key={student.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col group">
                            {/* Card Header */}
                            <div className="p-5 flex items-start gap-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex-shrink-0">
                                    {student.photoUrl ? (
                                        <img src={student.photoUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shadow-sm" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 flex items-center justify-center font-bold text-xl border-2 border-brand-200 dark:border-brand-800">
                                            {student.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate" title={student.name}>{student.name}</h3>
                                    <div className="mt-1">
                                        {student.authUserId ? (
                                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <CheckCircle className="w-3 h-3"/> {t('active')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <Ban className="w-3 h-3"/> {t('inactive')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col gap-3">
                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-brand-500"/> <span className="truncate">{student.email || '-'}</span>
                                    </div>
                                    {student.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-brand-500"/> <span>{student.phone}</span>
                                        </div>
                                    )}
                                    {student.city && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-brand-500"/> <span>{student.city}, {student.state}</span>
                                        </div>
                                    )}
                                </div>

                                {student.goals && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Objetivos</p>
                                        <p className="text-xs text-slate-500 italic line-clamp-2">"{student.goals}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                                <button 
                                    onClick={() => handleToggleAccess(student)}
                                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                                        student.authUserId 
                                            ? 'text-red-600 hover:bg-red-50' 
                                            : 'text-green-600 hover:bg-green-50'
                                    }`}
                                >
                                    {student.authUserId ? <><Lock className="w-3 h-3"/> Bloquear</> : <><Unlock className="w-3 h-3"/> Liberar</>}
                                </button>
                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleViewDetails(student)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Ver Detalhes">
                                        <Eye className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => handleEdit(student)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                        <Pencil className="w-4 h-4"/>
                                    </button>
                                    {!isInstructor && (
                                        <button onClick={() => handleDelete(student.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
      )}

      {/* Modal para criar senha ao ativar acesso manual */}
      {accessModalOpen && accessStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ativar Acesso</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Defina uma senha para <strong>{accessStudent.name}</strong>.
            </p>
            
            <form onSubmit={handleCreateAccess} className="space-y-4">
              <Input 
                label={t('password_label')} 
                type="password" 
                value={accessPassword} 
                onChange={(e) => setAccessPassword(e.target.value)} 
                placeholder="Min 6 chars"
                autoFocus
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setAccessModalOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" isLoading={isCreatingAccess}>{t('save')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes (Visualização Rápida) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 overflow-y-auto animate-in slide-in-from-right">
           <div className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <div className="flex items-center gap-3">
                    {selectedStudent.photoUrl ? (
                        <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 flex items-center justify-center font-bold text-xl">
                            {selectedStudent.name.charAt(0)}
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h1>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="font-bold border-b pb-2">{t('contact_label')} & Pessoal</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-slate-500">Email:</p> <p>{selectedStudent.email}</p>
                      <p className="text-slate-500">Telefone:</p> <p>{selectedStudent.phone}</p>
                      <p className="text-slate-500">CPF:</p> <p>{selectedStudent.cpf || '-'}</p>
                      <p className="text-slate-500">Nascimento:</p> <p>{selectedStudent.birthDate ? new Date(selectedStudent.birthDate).toLocaleDateString() : '-'}</p>
                  </div>
                  
                  <h3 className="font-bold border-b pb-2 mt-4">Endereço</h3>
                  <p className="text-sm">{selectedStudent.address}</p>
                  <p className="text-sm">{selectedStudent.city} - {selectedStudent.state}</p>
                  <p className="text-sm">CEP: {selectedStudent.cep}</p>

                  {selectedStudent.emergencyContactName && (
                      <>
                        <h3 className="font-bold border-b pb-2 mt-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500"/> Emergência</h3>
                        <p className="text-sm"><strong>{selectedStudent.emergencyContactName}</strong></p>
                        <p className="text-sm">{selectedStudent.emergencyContactPhone}</p>
                      </>
                  )}
                </div>
                
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5"/> Dados Clínicos</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Objetivos</p>
                                <p className="text-sm">{selectedStudent.goals || 'Não informado.'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Observações</p>
                                <p className="text-sm italic">{selectedStudent.observations || 'Nenhuma observação registrada.'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold mb-4">Histórico de Aulas (Rehab)</h3>
                        {loadingHistory ? <p>{t('loading')}</p> : (
                            studentLessons.length > 0 ? (
                                <ul className="space-y-2 text-sm">
                                {studentLessons.map(l => (
                                    <li key={l.id} className="p-2 border rounded bg-slate-50 dark:bg-slate-800">
                                        <strong>{l.pathologyName}</strong> - {new Date(l.createdAt).toLocaleDateString()}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-slate-500 text-sm">Nenhum plano salvo.</p>
                        )}
                    </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
