
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllProfiles, toggleUserStatus } from '../services/storage';
import { fetchInstructors, toggleInstructorStatus } from '../services/instructorService';
import { fetchStudents, revokeStudentAccess } from '../services/studentService';
import { Button } from '../components/ui/Button';
import { ShieldAlert, UserCheck, UserX, Search, Mail, Building2, AlertTriangle, Copy, CheckCircle, Ban, BookUser, GraduationCap, LayoutDashboard, Database, Loader2, Image } from 'lucide-react';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

interface AdminUserView {
  id: string; // Database ID
  targetId: string; // ID used for toggling (user_id for owners, id for others)
  name: string;
  email: string;
  role: 'owner' | 'instructor' | 'student';
  isActive: boolean;
  contextInfo?: string; // Studio name or Owner name
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
          contextInfo: p.studioName
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
          contextInfo: 'Instrutor' // Could fetch studio name if needed
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
          contextInfo: 'Aluno'
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

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.contextInfo && u.contextInfo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && u.role === activeTab;
  });

  const copySql = () => {
    const sql = `
-- Permissões Totais para o Super Admin
CREATE POLICY "Admin All Profiles" ON studio_profiles 
  FOR ALL USING ( auth.jwt() ->> 'email' = '${ADMIN_EMAIL}' );

CREATE POLICY "Admin All Instructors" ON instructors 
  FOR ALL USING ( auth.jwt() ->> 'email' = '${ADMIN_EMAIL}' );

CREATE POLICY "Admin All Students" ON students 
  FOR ALL USING ( auth.jwt() ->> 'email' = '${ADMIN_EMAIL}' );

-- Permissões para Instrutores (Correção de Acesso)
-- 1. Ver seu próprio perfil
CREATE POLICY "Instructors can view own profile" ON instructors
  FOR SELECT TO authenticated USING ( auth.uid() = auth_user_id );

-- 2. Helper Function para verificar vinculo
create or replace function is_instructor_at_studio(target_studio_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from instructors
    where auth_user_id = auth.uid() and studio_user_id = target_studio_id
  );
$$;

-- 3. Ver Alunos do Studio
CREATE POLICY "Instructors can view studio students" ON students
  FOR SELECT TO authenticated USING ( is_instructor_at_studio(user_id) );

-- 4. Acessar Rehab (Lições e Exercícios)
CREATE POLICY "Instructors can view studio lessons" ON rehab_lessons
  FOR SELECT TO authenticated USING ( is_instructor_at_studio(user_id) );

CREATE POLICY "Instructors can create studio lessons" ON rehab_lessons
  FOR INSERT TO authenticated WITH CHECK ( is_instructor_at_studio(user_id) );

CREATE POLICY "Instructors can view exercises" ON studio_exercises
  FOR SELECT TO authenticated USING ( is_instructor_at_studio(studio_id) );

-- 5. Acessar Newsletters
CREATE POLICY "Instructors can view newsletters" ON newsletters
  FOR SELECT TO authenticated USING ( is_instructor_at_studio(studio_id) );
    `;
    navigator.clipboard.writeText(sql.trim());
    alert('SQL de Permissões Admin & Instrutor copiado! Cole no SQL Editor do Supabase para corrigir os acessos.');
  };

  const copyStorageSql = () => {
    const sql = `
-- 1. BUCKET DE IMAGENS DE EXERCÍCIOS
insert into storage.buckets (id, name, public) 
values ('exercise-images', 'exercise-images', true)
ON CONFLICT (id) DO NOTHING;

drop policy if exists "Public Access Exercises" on storage.objects;
create policy "Public Access Exercises" on storage.objects for select using ( bucket_id = 'exercise-images' );

drop policy if exists "Auth Upload Exercises" on storage.objects;
create policy "Auth Upload Exercises" on storage.objects for insert to authenticated with check ( bucket_id = 'exercise-images' );

drop policy if exists "Auth Update Exercises" on storage.objects;
create policy "Auth Update Exercises" on storage.objects for update to authenticated using ( bucket_id = 'exercise-images' );

drop policy if exists "Auth Delete Exercises" on storage.objects;
create policy "Auth Delete Exercises" on storage.objects for delete to authenticated using ( bucket_id = 'exercise-images' );

-- 2. BUCKET DE LOGOS
insert into storage.buckets (id, name, public) 
values ('studio-logos', 'studio-logos', true)
ON CONFLICT (id) DO NOTHING;

drop policy if exists "Public Access Logos" on storage.objects;
create policy "Public Access Logos" on storage.objects for select using ( bucket_id = 'studio-logos' );

drop policy if exists "Auth Upload Logos" on storage.objects;
create policy "Auth Upload Logos" on storage.objects for insert to authenticated with check ( bucket_id = 'studio-logos' );

drop policy if exists "Auth Update Logos" on storage.objects;
create policy "Auth Update Logos" on storage.objects for update to authenticated using ( bucket_id = 'studio-logos' );
    `;
    navigator.clipboard.writeText(sql.trim());
    alert('SQL Completo de Storage (Exercícios e Logos) copiado! Cole no SQL Editor do Supabase.');
  };

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center text-red-600">
        <ShieldAlert className="h-16 w-16 mb-4" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p>Apenas o Super Admin pode ver esta página.</p>
      </div>
    );
  }

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
             <Database className="h-3 w-3 mr-2" /> SQL Permissões (Correção)
           </Button>
           <Button size="sm" variant="outline" onClick={copyStorageSql} className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30">
             <Image className="h-3 w-3 mr-2" /> SQL Storage
           </Button>
           <Button onClick={loadData} disabled={loading}>
             {loading ? <Loader2 className="animate-spin h-4 w-4"/> : "Atualizar Lista"}
           </Button>
        </div>
      </div>

      {/* Alerta de Configuração Inicial */}
      {!loading && allUsers.length === 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-lg shadow-sm mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600 mt-1" />
            <div>
              <h3 className="font-bold text-orange-800 text-lg">Configuração Necessária</h3>
              <p className="text-orange-700 text-sm mt-1">
                A lista está vazia. Isso geralmente significa que o <strong>Supabase RLS</strong> está bloqueando sua visão ou a dos instrutores.
                <br/>
                Para corrigir o acesso dos instrutores aos alunos, execute o SQL de permissões.
              </p>
              <button 
                onClick={copySql}
                className="mt-3 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar SQL
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <Button 
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          isLoading={togglingId === u.id}
                          disabled={togglingId !== null && togglingId !== u.id}
                          className={`font-medium shadow-sm transition-all ${
                            u.isActive 
                              ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300' 
                              : 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                          }`}
                          title={u.role === 'student' && !u.isActive ? 'Alunos inativos devem ter o acesso recriado no painel do estúdio.' : ''}
                        >
                          {u.isActive 
                            ? <><UserX className="h-4 w-4 mr-2"/> {u.role === 'student' ? 'Remover Acesso' : 'Desativar'}</> 
                            : <><UserCheck className="h-4 w-4 mr-2"/> Ativar</>}
                        </Button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 bg-slate-50/50">
                      {allUsers.length === 0 ? 'Nenhum usuário encontrado. Verifique se o SQL foi aplicado.' : 'Nenhum usuário encontrado com este filtro.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
