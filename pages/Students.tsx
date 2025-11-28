import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Student } from '../types';
import { fetchStudents, addStudent, updateStudent, deleteStudent, createStudentWithAuth } from '../services/studentService';
import { fetchRehabLessonsByStudent } from '../services/rehabService'; 
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Users, Plus, Trash2, Search, Phone, Mail, Pencil, Activity, X, Key, CheckCircle } from 'lucide-react';

export const Students: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados para Modal de Acesso (Aluno)
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessStudent, setAccessStudent] = useState<Student | null>(null);
  const [accessPassword, setAccessPassword] = useState('');
  const [isCreatingAccess, setIsCreatingAccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    observations: ''
  });

  const isInstructor = user?.isInstructor;

  const loadStudents = async () => {
    setIsLoading(true);
    const data = await fetchStudents();
    setStudents(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (student: Student) => {
    if (isInstructor) return; 
    setFormData({
      name: student.name,
      email: student.email || '',
      phone: student.phone || '',
      observations: student.observations || ''
    });
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
    setFormData({ name: '', email: '', phone: '', observations: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ownerId = user?.isInstructor ? user.studioId : user?.id;
    
    if (!ownerId || !formData.name) return;

    setIsSubmitting(true);
    
    let result;
    if (editingId) {
      result = await updateStudent(editingId, formData);
    } else {
      result = await addStudent(ownerId, formData);
    }
    
    if (result.success) {
      handleCancel();
      await loadStudents();
    } else {
      alert(`Erro ao salvar: ${result.error}`);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (isInstructor) return;
    if (window.confirm('Tem certeza que deseja remover este aluno?')) {
      const result = await deleteStudent(id);
      if (result.success) {
        await loadStudents();
      } else {
        alert(`Erro ao deletar: ${result.error}`);
      }
    }
  };

  const openAccessModal = (student: Student) => {
    setAccessStudent(student);
    setAccessPassword('');
    setAccessModalOpen(true);
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessStudent || !accessStudent.email) return;

    if (accessPassword.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsCreatingAccess(true);
    const result = await createStudentWithAuth(accessStudent.id, accessStudent.email, accessPassword);
    setIsCreatingAccess(false);

    if (result.success) {
      alert(`Acesso criado com sucesso para ${accessStudent.name}!\n\nLogin: ${accessStudent.email}\nSenha: ${accessPassword}\n\nEnvie esses dados para o aluno.`);
      setAccessModalOpen(false);
      loadStudents();
    } else {
      alert(`Erro ao criar acesso: ${result.error}`);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modal de Detalhes (mantido, mas com botão de acesso dentro também)
  if (selectedStudent) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedStudent(null)}>Voltar</Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Dados Pessoais</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-2"><strong>Email:</strong> {selectedStudent.email || '-'}</p>
            <p className="text-slate-600 dark:text-slate-400 mb-2"><strong>Telefone:</strong> {selectedStudent.phone || '-'}</p>
            <p className="text-slate-600 dark:text-slate-400"><strong>Obs:</strong> {selectedStudent.observations || '-'}</p>
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
               <p className="text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">Status do Acesso:</p>
               {selectedStudent.authUserId ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4"/> Acesso Ativo
                  </span>
               ) : (
                  <button 
                    onClick={() => openAccessModal(selectedStudent)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2 hover:underline"
                    disabled={!selectedStudent.email}
                  >
                    <Key className="w-4 h-4"/> {selectedStudent.email ? 'Criar Acesso ao Portal' : 'Adicione um email para criar acesso'}
                  </button>
               )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-600"/> Histórico Clínico (Rehab)
            </h3>
            {loadingHistory ? (
              <p>Carregando...</p>
            ) : studentLessons.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum plano de reabilitação salvo.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {studentLessons.map(lesson => (
                  <div key={lesson.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                    <p className="font-bold text-sm text-brand-700 dark:text-brand-400">{lesson.pathologyName}</p>
                    <p className="text-xs text-slate-500">{new Date(lesson.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alunos</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie o cadastro e histórico dos seus alunos</p>
        </div>
        
        {!showForm && !isInstructor && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Aluno
          </Button>
        )}
      </div>

      {showForm && !isInstructor && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingId ? 'Editar Aluno' : 'Cadastrar Aluno'}
            </h3>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome Completo *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!!editingId && !!formData.email} 
            />
            <Input
              label="Telefone / WhatsApp"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Observações</label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>Cancelar</Button>
              <Button type="submit" isLoading={isSubmitting}>{editingId ? 'Salvar Alterações' : 'Cadastrar Aluno'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Criação de Acesso */}
      {accessModalOpen && accessStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Criar Acesso do Aluno</h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm mb-4 border border-blue-100 dark:border-blue-800">
              Defina uma senha para que o aluno <strong>{accessStudent.name}</strong> possa acessar o portal de receitas e treinos.
            </div>
            <form onSubmit={handleCreateAccess} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Login (Email)</label>
                <input disabled value={accessStudent.email} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400" />
              </div>
              <Input 
                label="Senha Provisória *" 
                type="password" 
                value={accessPassword} 
                onChange={e => setAccessPassword(e.target.value)} 
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setAccessModalOpen(false)}>Cancelar</Button>
                <Button type="submit" isLoading={isCreatingAccess}>Criar Acesso</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-medium">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Contato</th>
                  <th className="px-6 py-3">Acesso</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => handleViewDetails(student)}>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{student.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{student.email || '-'}</td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      {student.authUserId ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                           Ativo
                        </span>
                      ) : (
                        student.email ? (
                          <button onClick={() => openAccessModal(student)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
                            <Key className="w-3 h-3"/> Criar Acesso
                          </button>
                        ) : <span className="text-xs text-slate-400">Sem email</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {!isInstructor && (
                          <>
                            <button onClick={() => handleEdit(student)} className="p-2 text-slate-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(student.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
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