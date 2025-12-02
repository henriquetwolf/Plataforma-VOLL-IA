
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from '../services/studentService';
import { saveEvolution, fetchEvolutionsByStudent, deleteEvolution } from '../services/evolutionService';
import { Student, StudentEvolution } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TrendingUp, User, Save, Calendar, CheckCircle2, AlertTriangle, History, ChevronRight, Search, Trash2 } from 'lucide-react';

export const StudentEvolutionPage: React.FC = () => {
  const { user } = useAuth();
  
  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [evolutions, setEvolutions] = useState<StudentEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    stability: 'Boa',
    mobility: 'Boa',
    strength: 'Adequada',
    coordination: 'Boa',
    pain: false,
    painLocation: '',
    limitation: false,
    limitationDetails: '',
    contraindication: false,
    contraindicationDetails: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Constants
  const STABILITY_OPTS = ['Excelente', 'Boa', 'Regular', 'Comprometida'];
  const MOBILITY_OPTS = ['Excelente', 'Boa', 'Regular', 'Restrita'];
  const STRENGTH_OPTS = ['Acima da média', 'Adequada', 'Em desenvolvimento', 'Baixa'];
  const COORDINATION_OPTS = ['Excelente', 'Boa', 'Regular', 'Insuficiente'];

  useEffect(() => {
    const loadStudents = async () => {
      const targetId = user?.isInstructor ? user.studioId : user?.id;
      if (targetId) {
        const data = await fetchStudents(targetId);
        setStudents(data);
      }
      setLoading(false);
    };
    loadStudents();
  }, [user]);

  useEffect(() => {
    const loadHistory = async () => {
      if (selectedStudent) {
        const history = await fetchEvolutionsByStudent(selectedStudent.id);
        setEvolutions(history);
      }
    };
    if (selectedStudent) loadHistory();
  }, [selectedStudent]);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudent) return;

    // Determine IDs
    const studioId = user.isInstructor ? user.studioId : user.id;
    const instructorId = user.dbId || null; // Might be null if owner
    const instructorName = user.name;

    if (!studioId) return;

    setIsSubmitting(true);
    const result = await saveEvolution({
      studioId,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      instructorId: instructorId || undefined,
      instructorName,
      ...formData
    });

    if (result.success) {
      alert("Avaliação salva com sucesso!");
      // Reset form (keep date)
      setFormData(prev => ({
        ...prev,
        pain: false, painLocation: '', limitation: false, limitationDetails: '', contraindication: false, contraindicationDetails: ''
      }));
      // Refresh history
      const history = await fetchEvolutionsByStudent(selectedStudent.id);
      setEvolutions(history);
    } else {
      alert("Erro ao salvar: " + result.error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta avaliação permanentemente?")) {
      const result = await deleteEvolution(id);
      
      if (result.success) {
        setEvolutions(prev => prev.filter(e => e.id !== id));
      } else {
        alert(`Erro ao excluir: ${result.error}\n\nVerifique se o SQL de permissões foi rodado no Supabase.`);
      }
    }
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Render Student Selection List
  if (!selectedStudent) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-brand-600 w-8 h-8" /> Evolução do Aluno
            </h1>
            <p className="text-slate-500">Selecione um aluno para realizar a avaliação da aula.</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando alunos...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <button 
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-400 hover:shadow-md transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                    <p className="text-xs text-slate-500">Selecionar</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500" />
              </button>
            ))}
            {filteredStudents.length === 0 && (
                <div className="col-span-3 text-center py-8 text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    Nenhum aluno encontrado.
                </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render Evaluation Form
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Button variant="outline" onClick={() => setSelectedStudent(null)}>
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="text-brand-600 w-6 h-6" /> {selectedStudent.name}
          </h1>
          <p className="text-slate-500 text-sm">Nova Avaliação de Aula</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORM COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
            
            <div className="flex justify-between items-center">
               <h2 className="text-lg font-bold text-slate-800 dark:text-white">Avaliação da Aula de Hoje</h2>
               <div className="w-40">
                 <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mb-0" />
               </div>
            </div>

            {/* 1. EXECUÇÃO */}
            <div className="space-y-6">
              <h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide">1. Execução dos Exercícios</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1.1 Estabilidade</label>
                  <div className="space-y-1">
                    {STABILITY_OPTS.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input type="radio" name="stability" value={opt} checked={formData.stability === opt} onChange={e => setFormData({...formData, stability: e.target.value})} className="text-brand-600 focus:ring-brand-500"/>
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1.2 Mobilidade</label>
                  <div className="space-y-1">
                    {MOBILITY_OPTS.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input type="radio" name="mobility" value={opt} checked={formData.mobility === opt} onChange={e => setFormData({...formData, mobility: e.target.value})} className="text-brand-600 focus:ring-brand-500"/>
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1.3 Força</label>
                  <div className="space-y-1">
                    {STRENGTH_OPTS.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input type="radio" name="strength" value={opt} checked={formData.strength === opt} onChange={e => setFormData({...formData, strength: e.target.value})} className="text-brand-600 focus:ring-brand-500"/>
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1.4 Coordenação</label>
                  <div className="space-y-1">
                    {COORDINATION_OPTS.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input type="radio" name="coordination" value={opt} checked={formData.coordination === opt} onChange={e => setFormData({...formData, coordination: e.target.value})} className="text-brand-600 focus:ring-brand-500"/>
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. QUEIXAS */}
            <div className="space-y-6">
              <h3 className="font-bold text-brand-700 dark:text-brand-400 border-b pb-2 text-sm uppercase tracking-wide">2. Queixas, Limitações e Cuidados</h3>
              
              {/* DOR */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                <label className="block font-medium text-slate-800 dark:text-white mb-2">O aluno apresentou dor?</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="pain" checked={!formData.pain} onChange={() => setFormData({...formData, pain: false, painLocation: ''})} /> Não</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="pain" checked={formData.pain} onChange={() => setFormData({...formData, pain: true})} /> Sim</label>
                </div>
                {formData.pain && (
                  <input 
                    placeholder="Onde? Descreva..." 
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    value={formData.painLocation}
                    onChange={e => setFormData({...formData, painLocation: e.target.value})}
                    autoFocus
                  />
                )}
              </div>

              {/* LIMITAÇÃO */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                <label className="block font-medium text-slate-800 dark:text-white mb-2">Houve limitação funcional na aula?</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="limitation" checked={!formData.limitation} onChange={() => setFormData({...formData, limitation: false, limitationDetails: ''})} /> Não</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="limitation" checked={formData.limitation} onChange={() => setFormData({...formData, limitation: true})} /> Sim</label>
                </div>
                {formData.limitation && (
                  <input 
                    placeholder="Qual? Descreva..." 
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    value={formData.limitationDetails}
                    onChange={e => setFormData({...formData, limitationDetails: e.target.value})}
                    autoFocus
                  />
                )}
              </div>

              {/* CONTRAINDICAÇÃO */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-orange-100 dark:border-orange-900/30">
                <label className="block font-medium text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                   <AlertTriangle className="w-4 h-4 text-orange-500" /> Contraindicação/Atenção para próxima aula?
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="contraindication" checked={!formData.contraindication} onChange={() => setFormData({...formData, contraindication: false, contraindicationDetails: ''})} /> Não</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="contraindication" checked={formData.contraindication} onChange={() => setFormData({...formData, contraindication: true})} /> Sim</label>
                </div>
                {formData.contraindication && (
                  <input 
                    placeholder="Descreva o cuidado necessário..." 
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-800 focus:ring-orange-500"
                    value={formData.contraindicationDetails}
                    onChange={e => setFormData({...formData, contraindicationDetails: e.target.value})}
                    autoFocus
                  />
                )}
              </div>
            </div>

            <Button type="submit" isLoading={isSubmitting} className="w-full h-12 text-lg shadow-lg bg-brand-600 hover:bg-brand-700">
              <Save className="w-5 h-5 mr-2" /> Salvar Avaliação
            </Button>
          </form>
        </div>

        {/* HISTORY COLUMN */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" /> Histórico Recente
            </h3>
            
            {evolutions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma avaliação anterior.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {evolutions.map(evo => (
                  <div key={evo.id} className="text-sm border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1 relative group">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full border-2 border-white dark:border-slate-900"></div>
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-700 dark:text-slate-300">{new Date(evo.date).toLocaleDateString()}</p>
                        <button onClick={() => handleDelete(evo.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3"/></button>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Instrutor: {evo.instructorName}</p>
                    
                    {/* Compact View of Important Flags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                        {evo.pain && <span className="bg-red-50 text-red-700 text-[10px] px-1.5 rounded border border-red-100">Dor: {evo.painLocation}</span>}
                        {evo.limitation && <span className="bg-orange-50 text-orange-700 text-[10px] px-1.5 rounded border border-orange-100">Limit: {evo.limitationDetails}</span>}
                        {evo.contraindication && <span className="bg-yellow-50 text-yellow-700 text-[10px] px-1.5 rounded border border-yellow-100">⚠️ {evo.contraindicationDetails}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                        <span>Estab: <strong>{evo.stability}</strong></span>
                        <span>Mobil: <strong>{evo.mobility}</strong></span>
                        <span>Força: <strong>{evo.strength}</strong></span>
                        <span>Coord: <strong>{evo.coordination}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
