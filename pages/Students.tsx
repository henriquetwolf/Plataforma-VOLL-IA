
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Student, AppRoute, StudentEvolution, ClassEvaluation, SavedRehabLesson, StudentAssessment } from '../types';
import { fetchStudents, createStudentWithAutoAuth, updateStudent, deleteStudent, createStudentWithAuth, revokeStudentAccess, uploadStudentPhoto } from '../services/studentService';
import { fetchRehabLessonsByStudent } from '../services/rehabService'; 
import { fetchEvolutionsByStudent } from '../services/evolutionService';
import { fetchStudentEvaluations } from '../services/evaluationService';
import { fetchAssessmentsByStudent } from '../services/assessmentService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Users, Plus, Trash2, Search, Pencil, Activity, X, Lock, Unlock, CheckCircle, Home, AlertCircle, Ban, MapPin, Phone, User, Camera, Filter, Mail, Eye, Calendar, TrendingUp, Star, ClipboardList, ChevronRight, FileText, LayoutGrid, List, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const Students: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Filtros e Visualização
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados de Detalhes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsTab, setDetailsTab] = useState<'profile' | 'assessments' | 'rehab' | 'evolution' | 'ratings'>('profile');
  
  // Dados Carregados para Detalhes
  const [studentLessons, setStudentLessons] = useState<SavedRehabLesson[]>([]);
  const [studentEvolutions, setStudentEvolutions] = useState<StudentEvolution[]>([]);
  const [studentRatings, setStudentRatings] = useState<ClassEvaluation[]>([]);
  const [studentAssessments, setStudentAssessments] = useState<StudentAssessment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewAssessmentDetail, setViewAssessmentDetail] = useState<StudentAssessment | null>(null);
  
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
    setDetailsTab('profile'); // Reset to profile tab
    setLoadingDetails(true);
    
    // Fetch all related data in parallel
    const [lessons, evolutions, ratings, assessments] = await Promise.all([
        fetchRehabLessonsByStudent(student.id),
        fetchEvolutionsByStudent(student.id),
        fetchStudentEvaluations(student.id),
        fetchAssessmentsByStudent(student.id)
    ]);

    setStudentLessons(lessons);
    setStudentEvolutions(evolutions);
    setStudentRatings(ratings);
    setStudentAssessments(assessments);
    setLoadingDetails(false);
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

  const handlePrintAssessment = () => {
    const input = document.getElementById('printable-assessment-detail');
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        pdf.save('avaliacao_aluno.pdf');
      });
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
      {/* ... (Existing render of list/form/header remains unchanged) ... */}
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
                <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
            ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p>{t('no_students_found')}</p>
                </div>
            ) : (
                <>
                    {/* VIEW GRID (CARDS) */}
                    {viewMode === 'grid' && (
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

                    {/* VIEW LIST (TABLE) */}
                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Aluno</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4">Localização</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10">
                                                        {student.photoUrl ? (
                                                            <img src={student.photoUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 flex items-center justify-center font-bold">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                                                        {student.birthDate && <div className="text-xs text-slate-500">Nasc: {new Date(student.birthDate).toLocaleDateString()}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]" title={student.email}>{student.email || '-'}</div>
                                                {student.phone && <div className="text-xs text-slate-500">{student.phone}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.city ? (
                                                    <div className="text-slate-600 dark:text-slate-300">
                                                        {student.city}, {student.state}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {student.authUserId ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        <CheckCircle className="w-3 h-3"/> {t('active')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        <Ban className="w-3 h-3"/> {t('inactive')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleViewDetails(student)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Ver Detalhes">
                                                        <Eye className="w-4 h-4"/>
                                                    </button>
                                                    <button onClick={() => handleEdit(student)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Editar">
                                                        <Pencil className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleAccess(student)} 
                                                        className={`p-1.5 rounded transition-colors ${student.authUserId ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                        title={student.authUserId ? "Bloquear Acesso" : "Liberar Acesso"}
                                                    >
                                                        {student.authUserId ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}
                                                    </button>
                                                    {!isInstructor && (
                                                        <button onClick={() => handleDelete(student.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    )}
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

      {/* DETALHES DO ALUNO (MODAL ORGANIZADO) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {selectedStudent.photoUrl ? (
                            <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 flex items-center justify-center font-bold text-2xl border-4 border-white dark:border-slate-800 shadow-md">
                                {selectedStudent.name.charAt(0)}
                            </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${selectedStudent.authUserId ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                        <p className="text-sm text-slate-500">{selectedStudent.email}</p>
                    </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-500"/>
                </button>
              </div>

              {/* Tabs Nav */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6 bg-white dark:bg-slate-900 overflow-x-auto">
                  <button 
                    onClick={() => setDetailsTab('profile')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${detailsTab === 'profile' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                  >
                    <User className="w-4 h-4"/> Perfil & Clínico
                  </button>
                  <button 
                    onClick={() => setDetailsTab('assessments')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${detailsTab === 'assessments' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                  >
                    <ClipboardList className="w-4 h-4"/> Avaliações
                  </button>
                  <button 
                    onClick={() => setDetailsTab('rehab')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${detailsTab === 'rehab' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                  >
                    <Activity className="w-4 h-4"/> Histórico Aulas
                  </button>
                  <button 
                    onClick={() => setDetailsTab('evolution')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${detailsTab === 'evolution' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                  >
                    <TrendingUp className="w-4 h-4"/> Evolução
                  </button>
                  <button 
                    onClick={() => setDetailsTab('ratings')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${detailsTab === 'ratings' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                  >
                    <Star className="w-4 h-4"/> Avaliações
                  </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 relative">
                {loadingDetails ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                        Carregando informações...
                    </div>
                ) : (
                    <>
                        {/* TAB 1: PERFIL */}
                        {detailsTab === 'profile' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 h-fit">
                                    <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-slate-800 dark:text-white flex items-center gap-2">
                                        <Users className="w-4 h-4"/> Dados Pessoais
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between"><span className="text-slate-500">CPF:</span> <span className="font-medium">{selectedStudent.cpf || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Telefone:</span> <span className="font-medium">{selectedStudent.phone || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Nascimento:</span> <span className="font-medium">{selectedStudent.birthDate ? new Date(selectedStudent.birthDate).toLocaleDateString() : '-'}</span></div>
                                    </div>

                                    <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 mt-6 text-slate-800 dark:text-white flex items-center gap-2">
                                        <MapPin className="w-4 h-4"/> Endereço
                                    </h3>
                                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                        <p>{selectedStudent.address || 'Endereço não informado'}</p>
                                        {selectedStudent.city && <p>{selectedStudent.city} - {selectedStudent.state}</p>}
                                        {selectedStudent.cep && <p>CEP: {selectedStudent.cep}</p>}
                                    </div>

                                    {selectedStudent.emergencyContactName && (
                                        <>
                                            <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 mt-6 text-red-600 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4"/> Emergência
                                            </h3>
                                            <div className="text-sm">
                                                <p className="font-bold text-slate-800 dark:text-white">{selectedStudent.emergencyContactName}</p>
                                                <p className="text-slate-500">{selectedStudent.emergencyContactPhone}</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 h-fit">
                                    <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-slate-800 dark:text-white flex items-center gap-2">
                                        <Activity className="w-4 h-4"/> Ficha Clínica
                                    </h3>
                                    
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Objetivos</p>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                                            {selectedStudent.goals || 'Não informado.'}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observações / Patologias</p>
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                                            {selectedStudent.observations || 'Nenhuma observação registrada.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: AVALIAÇÕES (NEW) */}
                        {detailsTab === 'assessments' && (
                            <div className="space-y-4 animate-in fade-in">
                                {studentAssessments.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                                        <p>Nenhuma avaliação física registrada.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {studentAssessments.map(assessment => (
                                            <div key={assessment.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 transition-all flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-800 dark:text-white">{assessment.title}</h4>
                                                    <p className="text-xs text-slate-500 flex items-center gap-2">
                                                        <Calendar className="w-3 h-3"/> {new Date(assessment.createdAt).toLocaleDateString()}
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                        <User className="w-3 h-3"/> {assessment.instructorName || 'Instrutor'}
                                                    </p>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => setViewAssessmentDetail(assessment)}>
                                                    <Eye className="w-4 h-4 mr-2"/> Visualizar
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: REHAB */}
                        {detailsTab === 'rehab' && (
                            <div className="space-y-4 animate-in fade-in">
                                {studentLessons.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                                        <p>Nenhum plano de aula (Rehab) gerado ainda.</p>
                                    </div>
                                ) : (
                                    studentLessons.map(lesson => (
                                        <div key={lesson.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-lg text-brand-700 dark:text-brand-400">{lesson.pathologyName}</h4>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3"/> {new Date(lesson.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 font-medium">
                                                        {lesson.exercises?.length || 0} exercícios
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {lesson.exercises?.slice(0, 3).map((ex, idx) => (
                                                    <div key={idx} className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold shrink-0">{idx+1}</span>
                                                        <span className="truncate">{ex.name}</span>
                                                        <span className="text-xs text-slate-400 ml-auto">{ex.apparatus}</span>
                                                    </div>
                                                ))}
                                                {lesson.exercises?.length > 3 && (
                                                    <p className="text-xs text-brand-600 font-medium pl-7">+ {lesson.exercises.length - 3} outros...</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 4: EVOLUÇÃO */}
                        {detailsTab === 'evolution' && (
                            <div className="space-y-4 animate-in fade-in">
                                {studentEvolutions.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                                        <p>Nenhum registro de evolução encontrado.</p>
                                    </div>
                                ) : (
                                    studentEvolutions.map(evo => (
                                        <div key={evo.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
                                            <div className="md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-2 md:pb-0 md:pr-4 flex flex-col justify-center">
                                                <span className="text-lg font-bold text-slate-800 dark:text-white block">{new Date(evo.date).toLocaleDateString()}</span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3"/> {evo.instructorName}</span>
                                            </div>
                                            
                                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                                    <span className="text-xs text-slate-400 block uppercase">Estabilidade</span>
                                                    <span className="font-medium">{evo.stability}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                                    <span className="text-xs text-slate-400 block uppercase">Mobilidade</span>
                                                    <span className="font-medium">{evo.mobility}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                                    <span className="text-xs text-slate-400 block uppercase">Força</span>
                                                    <span className="font-medium">{evo.strength}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                                    <span className="text-xs text-slate-400 block uppercase">Coordenação</span>
                                                    <span className="font-medium">{evo.coordination}</span>
                                                </div>
                                            </div>

                                            <div className="md:w-48 shrink-0 flex flex-col gap-1 justify-center">
                                                {evo.pain && (
                                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex items-center gap-1 font-medium">
                                                        <AlertCircle className="w-3 h-3"/> Dor: {evo.painLocation}
                                                    </span>
                                                )}
                                                {evo.limitation && (
                                                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                                                        Limitação: {evo.limitationDetails}
                                                    </span>
                                                )}
                                                {!evo.pain && !evo.limitation && (
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1 font-medium w-fit">
                                                        <CheckCircle className="w-3 h-3"/> Tudo bem
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 5: AVALIAÇÕES DE AULA */}
                        {detailsTab === 'ratings' && (
                            <div className="space-y-4 animate-in fade-in">
                                {studentRatings.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <Star className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                                        <p>Nenhuma avaliação de aula enviada pelo aluno.</p>
                                    </div>
                                ) : (
                                    studentRatings.map(rating => (
                                        <div key={rating.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} className={`w-4 h-4 ${star <= rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-slate-500">{new Date(rating.classDate).toLocaleDateString()}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                                                <div><span className="text-slate-400 text-xs">Sensação:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{rating.feeling}</span></div>
                                                <div><span className="text-slate-400 text-xs">Ritmo:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{rating.pace}</span></div>
                                            </div>

                                            {rating.discomfort && (
                                                <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded text-xs text-red-700 dark:text-red-300 mb-2 border border-red-100 dark:border-red-900/30">
                                                    <strong>Desconforto:</strong> {rating.discomfort}
                                                </div>
                                            )}

                                            {rating.suggestions && (
                                                <div className="text-xs text-slate-500 italic border-t border-slate-100 dark:border-slate-800 pt-2">
                                                    "{rating.suggestions}"
                                                </div>
                                            )}
                                            
                                            <div className="mt-2 text-xs text-slate-400 text-right">
                                                Instrutor: {rating.instructorName}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
              </div>
           </div>
        </div>
      )}

      {/* ASSESSMENT DETAIL MODAL (NESTED) */}
      {viewAssessmentDetail && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex justify-center overflow-y-auto py-10 animate-in fade-in">
            <div className="bg-white w-full max-w-4xl min-h-[297mm] shadow-2xl relative p-8 md:p-16">
                <button onClick={() => setViewAssessmentDetail(null)} className="absolute top-4 right-4 bg-slate-100 p-2 rounded-full hover:bg-slate-200 print:hidden"><X className="w-6 h-6"/></button>
                
                <div className="print:hidden flex justify-end mb-8">
                    <Button onClick={() => {
                        const input = document.getElementById('printable-assessment-detail');
                        if (input) {
                            html2canvas(input, { scale: 2 }).then((canvas) => {
                                const imgData = canvas.toDataURL('image/png');
                                const pdf = new jsPDF('p', 'mm', 'a4');
                                const pdfWidth = pdf.internal.pageSize.getWidth();
                                const pdfHeight = pdf.internal.pageSize.getHeight();
                                const imgWidth = pdfWidth;
                                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                                let heightLeft = imgHeight;
                                let position = 0;
                                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                                heightLeft -= pdfHeight;
                                while (heightLeft >= 0) {
                                    position = heightLeft - imgHeight;
                                    pdf.addPage();
                                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                                    heightLeft -= pdfHeight;
                                }
                                pdf.save('avaliacao.pdf');
                            });
                        }
                    }}><Printer className="w-4 h-4 mr-2"/> Imprimir / PDF</Button>
                </div>

                <div id="printable-assessment-detail">
                    <div className="text-center border-b-2 border-slate-800 pb-4 mb-8">
                        <h1 className="text-3xl font-bold uppercase tracking-widest">{viewAssessmentDetail.title}</h1>
                        <p className="text-slate-500">Avaliação Física & Anamnese</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 border rounded">
                        <p><strong>Aluno:</strong> {viewAssessmentDetail.content.studentName}</p>
                        <p><strong>Data:</strong> {new Date(viewAssessmentDetail.createdAt).toLocaleDateString()}</p>
                        <p><strong>Idade:</strong> {viewAssessmentDetail.content.studentAge}</p>
                        <p><strong>Avaliador:</strong> {viewAssessmentDetail.content.evaluatorName}</p>
                    </div>

                    {viewAssessmentDetail.type === 'simple' ? (
                        <div className="space-y-6 text-sm">
                            <section>
                                <h3 className="font-bold bg-slate-200 p-1 mb-2">1. Queixa Principal</h3>
                                <p>{viewAssessmentDetail.content.complaint}</p>
                                {viewAssessmentDetail.content.hasPain && (
                                    <div className="ml-4 mt-2">
                                        <p><strong>Dor:</strong> Sim - {viewAssessmentDetail.content.painLocation}</p>
                                        <p><strong>Intensidade:</strong> {viewAssessmentDetail.content.painIntensity}/10</p>
                                        <p><strong>Piora:</strong> {viewAssessmentDetail.content.worsensWith} | <strong>Melhora:</strong> {viewAssessmentDetail.content.improvesWith}</p>
                                    </div>
                                )}
                            </section>
                            <section>
                                <h3 className="font-bold bg-slate-200 p-1 mb-2">2. Histórico & Clínico</h3>
                                <ul className="list-disc pl-5">
                                    {viewAssessmentDetail.content.historyInjuries && <li>Lesões: {viewAssessmentDetail.content.historyInjuriesDesc}</li>}
                                    {viewAssessmentDetail.content.historySurgeries && <li>Cirurgias: {viewAssessmentDetail.content.historySurgeriesDesc}</li>}
                                    {viewAssessmentDetail.content.clinicalConditions?.map((c:string) => <li key={c}>{c}</li>)}
                                    {viewAssessmentDetail.content.clinicalOther && <li>Outros: {viewAssessmentDetail.content.clinicalOther}</li>}
                                </ul>
                            </section>
                            <section>
                                <h3 className="font-bold bg-slate-200 p-1 mb-2">3. Análise Física</h3>
                                <p><strong>Postura:</strong> {viewAssessmentDetail.content.postureObs}</p>
                                <p><strong>Mobilidade:</strong> {viewAssessmentDetail.content.mobilityFlexibility} - {viewAssessmentDetail.content.mobilityObs}</p>
                                <p><strong>Força:</strong> {viewAssessmentDetail.content.strengthGlobal}/5 - {viewAssessmentDetail.content.strengthObs}</p>
                            </section>
                            <section>
                                <h3 className="font-bold bg-slate-200 p-1 mb-2">4. Conclusão</h3>
                                <p><strong>Objetivos Aluno:</strong> {viewAssessmentDetail.content.studentGoals}</p>
                                <p><strong>Parecer Instrutor:</strong> {viewAssessmentDetail.content.instructorOpinion}</p>
                                <p><strong>Info Adicional:</strong> {viewAssessmentDetail.content.additionalInfo}</p>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {viewAssessmentDetail.content.fields?.map((field: any) => (
                                <div key={field.id} className="border-b pb-2">
                                    <p className="font-bold text-sm text-slate-600 mb-1">{field.label}</p>
                                    <p className="text-slate-900">
                                        {Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between text-xs text-slate-400">
                        <p>Gerado por Plataforma VOLL IA</p>
                        <p>Confidencial</p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
