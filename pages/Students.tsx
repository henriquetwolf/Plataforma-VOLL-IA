
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Student, AppRoute } from '../types';
import { fetchStudents, createStudentWithAutoAuth, updateStudent, deleteStudent, createStudentWithAuth, revokeStudentAccess } from '../services/studentService';
import { fetchRehabLessonsByStudent } from '../services/rehabService'; 
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Users, Plus, Trash2, Search, Pencil, Activity, X, Key, CheckCircle, Home, Building2, ArrowLeft, AlertCircle, Ban } from 'lucide-react';

export const Students: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    address: '',
    phone: '',
    observations: '',
    password: '' // Obrigatório no cadastro, opcional na edição
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

  const handleEdit = (student: Student) => {
    setFormData({
      name: student.name,
      email: student.email || '',
      cpf: student.cpf || '',
      address: student.address || '',
      phone: student.phone || '',
      observations: student.observations || '',
      password: '' // Reset password field for edit
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
    setFormData({ name: '', email: '', cpf: '', address: '', phone: '', observations: '', password: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ownerId = user?.isInstructor ? user.studioId : user?.id;
    
    if (!ownerId || !formData.name) return;

    // Se for novo cadastro, senha e email são obrigatórios para o acesso automático
    if (!editingId) {
        if (!formData.email) {
            alert("O email é obrigatório para novos cadastros (será o login do aluno).");
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            alert("Uma senha de acesso (mínimo 6 caracteres) é obrigatória para cadastrar e liberar o acesso do aluno.");
            return;
        }
    }

    // Se for edição e tiver senha, valida
    if (editingId && formData.password && formData.password.length < 6) {
        alert("A nova senha deve ter no mínimo 6 caracteres.");
        return;
    }

    setIsSubmitting(true);
    
    let result;
    if (editingId) {
      result = await updateStudent(editingId, formData, formData.password);
    } else {
      // Usar a nova função que cria banco + auth simultaneamente
      result = await createStudentWithAutoAuth(ownerId, formData, formData.password);
    }
    
    if (result.success) {
      handleCancel();
      await loadStudents();
      if (!editingId) {
          alert(`Aluno cadastrado e acesso liberado com sucesso!\n\nLogin: ${formData.email}\nSenha: ${formData.password}`);
      } else {
          alert("Dados do aluno atualizados com sucesso!");
      }
    } else {
      alert(`Erro ao salvar: ${result.error}`);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (isInstructor) {
        alert("Apenas o proprietário pode excluir alunos permanentemente.");
        return;
    }
    if (window.confirm('Tem certeza que deseja remover este aluno? Todos os dados serão perdidos.')) {
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
        // Fluxo de Desativar
        if (window.confirm(`Tem certeza que deseja REVOGAR o acesso de ${student.name}? O aluno não conseguirá mais logar.`)) {
            const result = await revokeStudentAccess(student.id);
            if (result.success) {
                await loadStudents();
            } else {
                alert("Erro ao desativar acesso: " + result.error);
            }
        }
    } else {
        // Fluxo de Ativar (Abre modal)
        if (!student.email) {
            alert("Edite o aluno e adicione um email antes de ativar o acesso.");
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
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsCreatingAccess(true);
    // Chama a função de criação manual (que lida com reativação se o email já existir)
    const result = await createStudentWithAuth(accessStudent.id, accessStudent.email, accessPassword);
    setIsCreatingAccess(false);

    if (result.success) {
      if (result.message) {
          alert(result.message); // Mensagem customizada de reativação
      } else {
          alert(`Acesso criado com sucesso!\nLogin: ${accessStudent.email}\nSenha: ${accessPassword}`);
      }
      setAccessModalOpen(false);
      loadStudents();
    } else {
      alert(`Erro ao ativar acesso: ${result.error}`);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.cpf?.includes(searchTerm)
  );

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
              {isInstructor ? 'Alunos do Studio' : 'Meus Alunos'} 
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Gerencie o cadastro e acesso ao portal.</p>
          </div>
        </div>
        
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Aluno
          </Button>
        )}
      </div>

      {permissionError && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          Erro de permissão. Seu usuário instrutor não está vinculado corretamente ao studio.
        </div>
      )}

      {showForm && (
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
              label="Email (Login) *"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={!!editingId} // Email é chave de login, melhor não editar diretamente
            />
            
            <Input
                label={editingId ? "Alterar Senha (Opcional)" : "Senha de Acesso *"}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={editingId ? "Deixe em branco para manter a atual" : "Mínimo 6 caracteres"}
                required={!editingId}
            />

            <Input
              label="CPF"
              name="cpf"
              value={formData.cpf}
              onChange={handleInputChange}
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
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Observações Clínicas
              </label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>Cancelar</Button>
              <Button type="submit" isLoading={isSubmitting}>{editingId ? 'Salvar Alterações' : 'Cadastrar e Liberar Acesso'}</Button>
            </div>
          </form>
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
            <p>Nenhum aluno encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Contato</th>
                  <th className="px-6 py-3 text-center">Acesso</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{student.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{student.email || student.phone || '-'}</td>
                    <td className="px-6 py-4 text-center">
                       <button 
                          onClick={() => handleToggleAccess(student)}
                          title={student.authUserId ? "Clique para BLOQUEAR" : "Clique para LIBERAR acesso"}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all min-w-[90px] justify-center ${
                            student.authUserId
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-100 hover:text-red-700 hover:border-red-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-200'
                          }`}
                       >
                         {student.authUserId ? (
                            <><CheckCircle className="w-3 h-3"/> ATIVO</>
                         ) : (
                            <><Ban className="w-3 h-3"/> INATIVO</>
                         )}
                       </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleViewDetails(student)} className="text-brand-600 hover:text-brand-800 font-medium text-xs border border-brand-200 px-3 py-1 rounded hover:bg-brand-50 transition-colors">
                          Ver Detalhes
                        </button>
                        
                        <button onClick={() => handleEdit(student)} className="text-slate-400 hover:text-brand-600 p-1" title="Editar">
                            <Pencil className="h-4 w-4" />
                        </button>
                        
                        {!isInstructor && (
                            <button onClick={() => handleDelete(student.id)} className="text-slate-400 hover:text-red-600 p-1" title="Excluir">
                                <Trash2 className="h-4 w-4" />
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
      </div>

      {/* Modal para criar senha ao ativar acesso manual */}
      {accessModalOpen && accessStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ativar Acesso do Aluno</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Defina uma senha para <strong>{accessStudent.name}</strong> ({accessStudent.email}).
            </p>
            
            <form onSubmit={handleCreateAccess} className="space-y-4">
              <Input 
                label="Senha de Acesso" 
                type="password" 
                value={accessPassword} 
                onChange={(e) => setAccessPassword(e.target.value)} 
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setAccessModalOpen(false)}>Cancelar</Button>
                <Button type="submit" isLoading={isCreatingAccess}>Ativar Login</Button>
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold mb-4">Dados Pessoais</h3>
                  <p><strong>Email:</strong> {selectedStudent.email}</p>
                  <p><strong>Telefone:</strong> {selectedStudent.phone}</p>
                  <p><strong>Endereço:</strong> {selectedStudent.address}</p>
                  <p><strong>Obs:</strong> {selectedStudent.observations}</p>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                   <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5"/> Histórico Clínico</h3>
                   {loadingHistory ? <p>Carregando...</p> : (
                      studentLessons.length > 0 ? (
                        <ul className="space-y-2">
                           {studentLessons.map(l => (
                             <li key={l.id} className="p-2 border rounded bg-slate-50 dark:bg-slate-800">
                                <strong>{l.pathologyName}</strong> - {new Date(l.createdAt).toLocaleDateString()}
                             </li>
                           ))}
                        </ul>
                      ) : <p className="text-slate-500">Nenhum plano salvo.</p>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
