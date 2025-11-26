import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Student } from '../types';
import { fetchStudents, addStudent, deleteStudent } from '../services/studentService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Users, Plus, Trash2, Search, Phone, Mail } from 'lucide-react';

export const Students: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const loadStudents = async () => {
    setIsLoading(true);
    const data = await fetchStudents();
    setStudents(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.name) return;

    setIsSubmitting(true);
    const success = await addStudent(user.id, formData);
    
    if (success) {
      setFormData({ name: '', email: '', phone: '' });
      setShowForm(false);
      await loadStudents();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este aluno?')) {
      await deleteStudent(id);
      await loadStudents();
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alunos</h1>
          <p className="text-slate-500">Gerencie o cadastro dos seus alunos</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? 'Cancelar' : 'Novo Aluno'}
        </Button>
      </div>

      {/* Cadastro Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Cadastrar Aluno</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Nome Completo *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <Input
              label="Telefone / WhatsApp"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>
                Salvar Aluno
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search & List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-medium">Nenhum aluno encontrado</p>
            <p className="text-sm">
              {searchTerm ? 'Tente buscar com outro termo.' : 'Comece cadastrando seu primeiro aluno.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Contato</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-500">
                        {student.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" /> {student.email}
                          </div>
                        )}
                        {student.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" /> {student.phone}
                          </div>
                        )}
                        {!student.email && !student.phone && <span className="text-slate-400 italic">Sem contato</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                        title="Remover Aluno"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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