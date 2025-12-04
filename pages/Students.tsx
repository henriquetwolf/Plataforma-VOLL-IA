import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  fetchStudents, 
  createStudentWithAutoAuth, 
  updateStudent, 
  deleteStudent,
  uploadStudentPhoto
} from '../services/studentService';
import { fetchAssessmentsByStudent } from '../services/assessmentService';
import { fetchRehabLessonsByStudent } from '../services/rehabService';
import { fetchEvolutionsByStudent } from '../services/evolutionService';
import { fetchStudentEvaluations } from '../services/evaluationService';
import { 
  Student, 
  StudentAssessment, 
  SavedRehabLesson, 
  StudentEvolution, 
  ClassEvaluation,
  AppRoute 
} from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  User, ClipboardList, Activity, TrendingUp, Star, MapPin, AlertCircle, 
  Calendar, Eye, CheckCircle, Plus, Search, Mail, Phone, Trash2, 
  Pencil, X, ChevronRight, Loader2, Camera, Lock, Unlock, ArrowLeft, LayoutGrid, List
} from 'lucide-react';

export const Students: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Main List State
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Details View State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsTab, setDetailsTab] = useState<'profile' | 'assessments' | 'rehab' | 'evolution' | 'ratings'>('profile');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [studentAssessments, setStudentAssessments] = useState<StudentAssessment[]>([]);
  const [studentLessons, setStudentLessons] = useState<SavedRehabLesson[]>([]);
  const [studentEvolutions, setStudentEvolutions] = useState<StudentEvolution[]>([]);
  const [studentRatings, setStudentRatings] = useState<ClassEvaluation[]>([]);
  
  // Modal/Form State
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', cpf: '', address: '', 
    city: '', state: '', cep: '', birthDate: '', goals: '', 
    observations: '', emergencyContactName: '', emergencyContactPhone: '',
    password: '', photoUrl: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // View Assessment Detail Modal
  const [viewAssessmentDetail, setViewAssessmentDetail] = useState<StudentAssessment | null>(null);

  useEffect(() => {
    loadStudents();
  }, [user]);

  const loadStudents = async () => {
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    if (targetId) {
        const data = await fetchStudents(targetId);
        setStudents(data);
        setLoading(false);
    }
  };

  useEffect(() => {
    const loadDetails = async () => {
        if (!selectedStudent) return;
        setLoadingDetails(true);
        try {
            const [assessments, lessons, evolutions, ratings] = await Promise.all([
                fetchAssessmentsByStudent(selectedStudent.id),
                fetchRehabLessonsByStudent(selectedStudent.id),
                fetchEvolutionsByStudent(selectedStudent.id),
                fetchStudentEvaluations(selectedStudent.id)
            ]);
            setStudentAssessments(assessments);
            setStudentLessons(lessons);
            setStudentEvolutions(evolutions);
            setStudentRatings(ratings);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDetails(false);
        }
    };
    if (selectedStudent) {
        loadDetails();
    }
  }, [selectedStudent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setPhotoFile(file);
          setPhotoPreview(URL.createObjectURL(file));
      }
  };

  const resetForm = () => {
      setEditingStudent(null);
      setFormData({
        name: '', email: '', phone: '', cpf: '', address: '', 
        city: '', state: '', cep: '', birthDate: '', goals: '', 
        observations: '', emergencyContactName: '', emergencyContactPhone: '',
        password: '', photoUrl: ''
      });
      setPhotoPreview(null);
      setPhotoFile(null);
      setShowForm(false);
  };

  const openForm = (student?: Student) => {
      if (student) {
          setEditingStudent(student);
          setFormData({
            name: student.name, email: student.email, phone: student.phone, cpf: student.cpf || '', 
            address: student.address || '', city: student.city || '', state: student.state || '', 
            cep: student.cep || '', birthDate: student.birthDate || '', goals: student.goals || '', 
            observations: student.observations || '', 
            emergencyContactName: student.emergencyContactName || '', 
            emergencyContactPhone: student.emergencyContactPhone || '',
            password: '', photoUrl: student.photoUrl || ''
          });
          setPhotoPreview(student.photoUrl || null);
      } else {
          setEditingStudent(null);
          setFormData({
            name: '', email: '', phone: '', cpf: '', address: '', 
            city: '', state: '', cep: '', birthDate: '', goals: '', 
            observations: '', emergencyContactName: '', emergencyContactPhone: '',
            password: '', photoUrl: ''
          });
          setPhotoPreview(null);
      }
      setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const targetId = user?.isInstructor ? user.studioId : user?.id;
      if (!targetId) return;

      setIsSubmitting(true);
      try {
          let photoUrl = formData.photoUrl;
          if (photoFile) {
              const url = await uploadStudentPhoto(targetId, photoFile);
              if (url) photoUrl = url;
          }

          const payload = { ...formData, photoUrl };

          if (editingStudent) {
              const res = await updateStudent(editingStudent.id, payload, formData.password);
              if (res.success) {
                  alert("Aluno atualizado!");
                  loadStudents();
                  setShowForm(false);
                  // Update selected if needed
                  if (selectedStudent?.id === editingStudent.id) {
                      setSelectedStudent(prev => prev ? ({ ...prev, ...payload, photoUrl } as Student) : null);
                  }
              } else {
                  alert("Erro: " + res.error);
              }
          } else {
              const res = await createStudentWithAutoAuth(targetId, payload, formData.password);
              if (res.success) {
                  alert("Aluno cadastrado com sucesso!");
                  loadStudents();
                  setShowForm(false);
              } else {
                  alert("Erro: " + res.error);
              }
          }
      } catch (e) {
          console.error(e);
          alert("Erro inesperado.");
      }
      setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este aluno?")) {
          const res = await deleteStudent(id);
          if (res.success) {
              loadStudents();
              if (selectedStudent?.id === id) setSelectedStudent(null);
          } else {
              alert("Erro ao excluir: " + res.error);
          }
      }
  };

  const filteredStudents = students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDER ---

  if (selectedStudent) {
      return (
          <div className="max-w-6xl mx-auto animate-in fade-in h-full flex flex-col">
              {/* Header Details */}
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                      <Button variant="ghost" onClick={() => setSelectedStudent(null)} className="p-2">
                          <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <div className="flex items-center gap-4">
                          {selectedStudent.photoUrl ? (
                              <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">
                                  {selectedStudent.name.charAt(0)}
                              </div>
                          )}
                          <div>
                              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h1>
                              <p className="text-sm text-slate-500">{selectedStudent.email}</p>
                          </div>
                      </div>
                  </div>
                  <Button variant="outline" onClick={() => openForm(selectedStudent)}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                  </Button>
              </div>

              {/* Tabs Nav */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6 bg-white dark:bg-slate-900 overflow-x-auto rounded-t-xl">
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
                    <ClipboardList className="w-4 h-4"/> Avaliações Físicas
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
                    <TrendingUp className="w-4 h-4"/> Evolução Diária
                  </button>
                  <button 
                    onClick={() => setDetailsTab('ratings')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${detailsTab === 'ratings' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                  >
                    <Star className="w-4 h-4"/> Feedback das Aulas
                  </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 relative rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800">
                {loadingDetails ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mr-2" /> Carregando informações...
                    </div>
                ) : (
                    <>
                        {/* TAB 1: PERFIL */}
                        {detailsTab === 'profile' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 h-fit">
                                    <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-slate-800 dark:text-white flex items-center gap-2">
                                        <User className="w-4 h-4"/> Dados Pessoais
                                    </h3>
                                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                        <div className="flex justify-between"><span className="text-slate-500">CPF:</span> <span className="font-medium">{selectedStudent.cpf || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Telefone:</span> <span className="font-medium">{selectedStudent.phone || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Nascimento:</span> <span className="font-medium">{selectedStudent.birthDate ? new Date(selectedStudent.birthDate).toLocaleDateString() : '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="font-medium">{selectedStudent.email}</span></div>
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

                        {/* TAB 2: AVALIAÇÕES FÍSICAS */}
                        {detailsTab === 'assessments' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-start gap-3">
                                    <ClipboardList className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Histórico de Avaliações Físicas</h4>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                                            Aqui ficam registradas as anamneses, testes físicos e análises posturais realizadas pelo instrutor.
                                        </p>
                                    </div>
                                </div>

                                {studentAssessments.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                                        <p>Nenhuma avaliação física registrada.</p>
                                        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(AppRoute.STUDENT_ASSESSMENT)}>
                                            Ir para Avaliação Física
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {studentAssessments.map(assessment => (
                                            <div key={assessment.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 transition-all flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-800 dark:text-white">{assessment.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3"/> {new Date(assessment.createdAt).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                            <User className="w-3 h-3"/> {assessment.instructorName || 'Instrutor'}
                                                        </span>
                                                        <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                                                            {assessment.type === 'simple' ? 'Padrão' : 'Personalizada'}
                                                        </span>
                                                    </div>
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
                                        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50"/>
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
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{evo.stability}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                                    <span className="text-xs text-slate-400 block uppercase">Mobilidade</span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{evo.mobility}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                                    <span className="text-xs text-slate-400 block uppercase">Força</span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{evo.strength}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                                    <span className="text-xs text-slate-400 block uppercase">Coordenação</span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{evo.coordination}</span>
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

                        {/* TAB 5: AVALIAÇÕES DE AULA (FEEDBACK) */}
                        {detailsTab === 'ratings' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800 flex items-start gap-3">
                                    <Star className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-yellow-800 dark:text-yellow-300 text-sm">Feedback das Aulas (Pelo Aluno)</h4>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                            Notas, sensações e comentários enviados pelo aluno através do aplicativo após cada aula.
                                        </p>
                                    </div>
                                </div>

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
              
              {/* Detail Assessment Modal */}
              {viewAssessmentDetail && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
                      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-xl shadow-xl p-6 overflow-y-auto relative">
                          <button onClick={() => setViewAssessmentDetail(null)} className="absolute top-4 right-4 p-2"><X className="w-5 h-5"/></button>
                          <h2 className="text-xl font-bold mb-4">{viewAssessmentDetail.title}</h2>
                          
                          {/* Rendering logic similar to AssessmentPage */}
                          <div className="space-y-4">
                              {viewAssessmentDetail.type === 'simple' ? (
                                  <div className="text-sm space-y-2">
                                      {/* Simplified renderer */}
                                      <p><strong>Queixa:</strong> {viewAssessmentDetail.content.complaint}</p>
                                      <p><strong>Dor:</strong> {viewAssessmentDetail.content.hasPain ? `Sim (${viewAssessmentDetail.content.painIntensity}/10) - ${viewAssessmentDetail.content.painLocation}` : 'Não'}</p>
                                      <p><strong>Observações:</strong> {viewAssessmentDetail.content.postureObs}</p>
                                      <p><strong>Conclusão:</strong> {viewAssessmentDetail.content.instructorOpinion}</p>
                                  </div>
                              ) : (
                                  <div className="space-y-2">
                                      {viewAssessmentDetail.content.fields?.map((f: any) => (
                                          <div key={f.id} className="border-b pb-2">
                                              <p className="font-bold text-sm text-slate-600">{f.label}</p>
                                              <p className="text-slate-900 dark:text-white">{Array.isArray(f.value) ? f.value.join(', ') : f.value}</p>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in h-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-8 w-8 text-brand-600" /> {t('my_students_title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">{t('students_subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 outline-none w-64"
                    placeholder="Buscar aluno..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            
            {/* View Mode Toggle */}
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
                    <Plus className="w-4 h-4 mr-2" /> {t('new_student_btn')}
                </Button>
            )}
        </div>
      </div>

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
                    {/* GRID VIEW */}
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
                                            onClick={() => openForm(student)}
                                            className="px-4 py-3 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(student.id)}
                                            className="px-4 py-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LIST VIEW */}
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