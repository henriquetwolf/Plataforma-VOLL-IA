
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllProfiles, toggleUserStatus, adminResetPassword, upsertProfile } from '../services/storage';
import { fetchInstructors, toggleInstructorStatus } from '../services/instructorService';
import { fetchStudents, revokeStudentAccess } from '../services/studentService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldAlert, UserCheck, UserX, Search, Mail, Building2, AlertTriangle, Copy, CheckCircle, Ban, BookUser, GraduationCap, LayoutDashboard, Database, Loader2, Image, Key, Eye, ArrowLeft, Save } from 'lucide-react';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

interface AdminUserView {
  id: string; // Database ID
  targetId: string; // ID used for toggling/resetting (user_id for owners, id for others)
  name: string;
  email: string;
  role: 'owner' | 'instructor' | 'student';
  isActive: boolean;
  contextInfo?: string; // Studio name or Owner name
  maxStudents?: number; // Only for owners
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owner' | 'instructor' | 'student'>('all');
  
  // Controle de estado para ação de toggle (loading por item)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Password Reset Modal
  const [resetModalUser, setResetModalUser] = useState<AdminUserView | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Owner Drill Down View
  const [viewingOwner, setViewingOwner] = useState<AdminUserView | null>(null);
  const [ownerPlanLimit, setOwnerPlanLimit] = useState<number | undefined>(undefined);
  const [savingPlan, setSavingPlan] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setDbError(null);
    const usersList: AdminUserView[] = [];

    try {
      // 1. Fetch Owners (Studio Profiles)
      const { data: profiles, error: profileError } = await fetchAllProfiles();
      if (profileError) throw profileError;
      
      profiles.forEach(p => {
        usersList.push({
          id: p.id,
          targetId: p.userId, // Owners are toggled by auth user_id in studio_profiles
          name: p.ownerName || 'Sem nome',
          email: p.email || '-',
          role: 'owner',
          isActive: p.isActive,
          contextInfo: p.studioName,
          maxStudents: p.maxStudents
        });
      });

      // 2. Fetch Instructors
      const instructors = await fetchInstructors();
      instructors.forEach(i => {
        usersList.push({
          id: i.id,
          targetId: i.id, // Instructors are toggled by table row id
          name: i.name,
          email: i.email,
          role: 'instructor',
          isActive: i.active,
          contextInfo: i.studioUserId // Link to studio
        });
      });

      // 3. Fetch Students
      const students = await fetchStudents(); // Fetch all globally
      students.forEach(s => {
        usersList.push({
          id: s.id,
          targetId: s.id,
          name: s.name,
          email: s.email || '-',
          role: 'student',
          isActive: !!s.authUserId, // Students are "active" if they have login access
          contextInfo: s.userId // Link to studio
        });
      });

      setAllUsers(usersList);

    } catch (err: any) {
      console.error("Admin Load Error:", err);
      setDbError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (targetUser: AdminUserView) => {
    const action = targetUser.isActive ? 'DESATIVAR' : 'ATIVAR';
    const isStudent = targetUser.role === 'student';
    
    // Confirmação explícita
    if (!confirm(`Tem certeza que deseja ${action} o acesso de ${targetUser.name}? ${isStudent && targetUser.isActive ? '\n(Isso removerá o login do aluno, mas manterá os dados.)' : ''}`)) return;

    if (isStudent && !targetUser.isActive) {
      alert("Para reativar um aluno, é necessário recriar a senha pelo painel do estúdio.");
      return;
    }

    setTogglingId(targetUser.id); // Inicia loading no botão específico

    try {
      let result: { success: boolean; error?: string } = { success: false };

      if (targetUser.role === 'owner') {
        result = await toggleUserStatus(targetUser.targetId, !targetUser.isActive);
      } else if (targetUser.role === 'instructor') {
        result = await toggleInstructorStatus(targetUser.targetId, !targetUser.isActive);
      } else if (isStudent) {
        result = await revokeStudentAccess(targetUser.targetId);
      }

      if (result.success) {
        // Atualização otimista da UI para feedback imediato
        setAllUsers(prev => prev.map(u => 
          u.id === targetUser.id && u.role === targetUser.role 
            ? { ...u, isActive: isStudent ? false : !u.isActive } 
            : u
        ));
      } else {
        alert(`Falha ao atualizar status: ${result.error}\n\nDica: Verifique se você executou o SQL de permissões (RLS) no Supabase.`);
      }
    } catch (error: any) {
      alert(`Erro inesperado: ${error.message}`);
    } finally {
      setTogglingId(null); // Remove loading
    }
  };

  const handleResetPassword = async () => {
    if (!resetModalUser || !newPassword || newPassword.length < 6) {
      alert("Senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setResetting(true);
    // Para Donos, targetId é o userId (auth id), que é o que precisamos.
    // O RPC update_user_password espera o ID da tabela auth.users.
    let targetAuthId = resetModalUser.targetId;
    
    const result = await adminResetPassword(targetAuthId, newPassword);
    
    if (result.success) {
      alert(`Senha redefinida com sucesso para ${resetModalUser.name}.`);
      setResetModalUser(null);
      setNewPassword('');
    } else {
      alert("Erro ao redefinir senha: " + result.error);
    }
    setResetting(false);
  };

  const openViewDetails = (owner: AdminUserView) => {
    setViewingOwner(owner);
    setOwnerPlanLimit(owner.maxStudents);
  };

  const handleSavePlanLimit = async () => {
    if (!viewingOwner) return;
    setSavingPlan(true);
    
    const result = await upsertProfile(viewingOwner.targetId, {
      maxStudents: ownerPlanLimit
    });

    if (result.success) {
      alert("Plano atualizado com sucesso!");
      // Update local state
      setAllUsers(prev => prev.map(u => u.id === viewingOwner.id ? { ...u, maxStudents: ownerPlanLimit } : u));
    } else {
      alert("Erro ao salvar plano: " + result.error);
    }
    setSavingPlan(false);
  };

  const copySql = () => {
    const sql = `
-- GARANTIR COLUNA IS_ACTIVE E MAX_STUDENTS
ALTER TABLE studio_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_students INTEGER;

-- Função Helper para pegar ID por email (Segurança)
create or replace function get_user_id_by_email(email_input text)
returns uuid language plpgsql security definer as $$
begin
  return (select id from auth.users where email = email_input);
end;
$$;

-- Função para atualizar senha (ADMIN RPC)
create or replace function update_user_password(target_id uuid, new_password text)
returns void language plpgsql security definer set search_path = extensions, public, auth as $$
begin
  update auth.users set encrypted_password = crypt(new_password, gen_salt('bf')) where id = target_id;
end;
$$;
    `;
    navigator.clipboard.writeText(sql.trim());
    alert('SQL copiado! Cole no SQL Editor do Supabase para ativar as novas funções.');
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.contextInfo && u.contextInfo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && u.role === activeTab;
  });

  // Filter linked users for drill down
  const linkedInstructors = viewingOwner ? allUsers.filter(u => u.role === 'instructor' && u.contextInfo === viewingOwner.targetId) : [];
  const linkedStudents = viewingOwner ? allUsers.filter(u => u.role === 'student' && u.contextInfo === viewingOwner.targetId) : [];

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center text-red-600">
        <ShieldAlert className="h-16 w-16 mb-4" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p>Apenas o Super Admin pode ver esta página.</p>
      </div>
    );
  }

  // --- DRILL DOWN VIEW (DETALHES DO DONO) ---
  if (viewingOwner) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
        <div className="flex items-center gap-4 border-b pb-4 mb-4">
          <Button variant="outline" onClick={() => setViewingOwner(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{viewingOwner.contextInfo || viewingOwner.name}</h1>
            <p className="text-slate-500 text-sm">Gerenciando Studio de {viewingOwner.name} ({viewingOwner.email})</p>
          </div>
        </div>

        {/* Plan Settings */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-600"/> Plano do Studio
          </h3>
          <div className="flex items-end gap-4 max-w-md">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limite de Alunos</label>
              <Input 
                type="number" 
                value={ownerPlanLimit || ''} 
                onChange={e => setOwnerPlanLimit(e.target.value ? parseInt(e.target.value) : undefined)} 
                placeholder="Ilimitado"
                className="mb-0"
              />
              <p className="text-xs text-slate-500 mt-1">Deixe em branco para ilimitado.</p>
            </div>
            <Button onClick={handleSavePlanLimit} isLoading={savingPlan}>
              <Save className="w-4 h-4 mr-2"/> Salvar Limite
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Instructors List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 font-bold flex justify-between">
              <span>Instrutores ({linkedInstructors.length})</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {linkedInstructors.length === 0 ? <p className="p-4 text-slate-500 text-sm">Nenhum instrutor.</p> : linkedInstructors.map(u => (
                <div key={u.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-slate-800 dark:text-white">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 font-bold flex justify-between">
              <span>Alunos ({linkedStudents.length})</span>
              <span className={`text-xs px-2 py-1 rounded ${linkedStudents.length >= (ownerPlanLimit || 9999) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {linkedStudents.length} / {ownerPlanLimit || '∞'}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {linkedStudents.length === 0 ? <p className="p-4 text-slate-500 text-sm">Nenhum aluno.</p> : linkedStudents.map(u => (
                <div key={u.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-slate-800 dark:text-white">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.isActive ? 'Com Acesso' : 'Sem Acesso'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-purple-600" /> Painel Admin Global
          </h1>
          <p className="text-slate-500">Gestão completa de usuários da plataforma.</p>
        </div>
        
        <div className="flex gap-2">
           <Button size="sm" variant="outline" onClick={copySql}>
             <Database className="h-3 w-3 mr-2" /> SQL Plans
           </Button>
           <Button onClick={loadData} disabled={loading}>
             {loading ? <Loader2 className="animate-spin h-4 w-4"/> : "Atualizar Lista"}
           </Button>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
            <div>
              <h3 className="font-bold text-red-800 text-lg">Erro de Banco de Dados</h3>
              <p className="text-red-700 text-sm">{dbError.message || JSON.stringify(dbError)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit overflow-x-auto">
        <button 
          onClick={() => setActiveTab('all')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'all' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}
        >
          <LayoutDashboard className="h-4 w-4"/> Todos ({allUsers.length})
        </button>
        <button 
          onClick={() => setActiveTab('owner')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'owner' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}
        >
          <Building2 className="h-4 w-4"/> Donos ({allUsers.filter(u => u.role === 'owner').length})
        </button>
        <button 
          onClick={() => setActiveTab('instructor')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'instructor' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
        >
          <BookUser className="h-4 w-4"/> Instrutores ({allUsers.filter(u => u.role === 'instructor').length})
        </button>
        <button 
          onClick={() => setActiveTab('student')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'student' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}
        >
          <GraduationCap className="h-4 w-4"/> Alunos ({allUsers.filter(u => u.role === 'student').length})
        </button>
      </div>

      {/* Filters & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Buscar por nome, email ou contexto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
            Carregando dados...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <tr key={`${u.role}-${u.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white text-base">{u.name}</div>
                      {u.contextInfo && (
                        <div className="text-xs text-slate-500 mt-0.5">{u.contextInfo}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'owner' && <span className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs font-bold"><Building2 className="w-3 h-3"/> Dono</span>}
                      {u.role === 'instructor' && <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold"><BookUser className="w-3 h-3"/> Instrutor</span>}
                      {u.role === 'student' && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold"><GraduationCap className="w-3 h-3"/> Aluno</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400"/> {u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold border border-green-200">
                          <CheckCircle className="w-3 h-3" /> ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold border border-red-200">
                          <Ban className="w-3 h-3" /> {u.role === 'student' ? 'SEM ACESSO' : 'BLOQUEADO'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== user?.id && (
                        <div className="flex justify-end gap-2">
                          {/* Owner Actions */}
                          {u.role === 'owner' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ver Detalhes (Instrutores/Alunos/Plano)" onClick={() => openViewDetails(u)}>
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Redefinir Senha Provisória" onClick={() => { setResetModalUser(u); setNewPassword(''); }}>
                                <Key className="w-4 h-4 text-blue-500" />
                              </Button>
                            </>
                          )}
                          
                          {/* Toggle Status */}
                          <Button 
                            size="sm"
                            onClick={() => handleToggleStatus(u)}
                            isLoading={togglingId === u.id}
                            disabled={togglingId !== null && togglingId !== u.id}
                            className={`font-medium shadow-sm transition-all h-8 px-3 ${
                              u.isActive 
                                ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300' 
                                : 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                            }`}
                            title={u.role === 'student' && !u.isActive ? 'Alunos inativos devem ter o acesso recriado no painel do estúdio.' : ''}
                          >
                            {u.isActive 
                              ? <><UserX className="h-4 w-4"/></> 
                              : <><UserCheck className="h-4 w-4"/></>}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 bg-slate-50/50">
                      {allUsers.length === 0 ? 'Nenhum usuário encontrado.' : 'Nenhum usuário encontrado com este filtro.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Redefinir Senha Provisória</h3>
            <p className="text-sm text-slate-500 mb-4">
              Defina uma nova senha para o dono <strong>{resetModalUser.name}</strong>.
            </p>
            <Input 
              label="Nova Senha" 
              type="text" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setResetModalUser(null)}>Cancelar</Button>
              <Button onClick={handleResetPassword} isLoading={resetting}>Salvar Senha</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
