

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllProfiles, toggleUserStatus, adminResetPassword, upsertProfile, fetchSubscriptionPlans, updateSubscriptionPlan } from '../services/storage';
import { fetchInstructors, toggleInstructorStatus } from '../services/instructorService';
import { fetchStudents, revokeStudentAccess } from '../services/studentService';
import { uploadBannerImage, upsertBanner, fetchBannerByType, deleteBanner } from '../services/bannerService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldAlert, UserCheck, UserX, Search, Mail, Building2, AlertTriangle, Copy, CheckCircle, Ban, BookUser, GraduationCap, LayoutDashboard, Database, Loader2, Image, Key, Eye, ArrowLeft, Save, Crown, Edit2, X, Upload, Trash2 } from 'lucide-react';
import { SubscriptionPlan, SystemBanner } from '../types';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

interface AdminUserView {
  id: string; // Database ID
  targetId: string; // ID used for toggling/resetting (user_id for owners, id for others)
  name: string;
  email: string;
  role: 'owner' | 'instructor' | 'student';
  isActive: boolean;
  contextInfo?: string; // Studio name or Owner name
  maxStudents?: number; // Only for owners (legacy)
  planId?: string; // ID do plano
  planName?: string; // Nome do plano
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
  const [ownerPlanId, setOwnerPlanId] = useState<string | undefined>(undefined);
  const [savingPlan, setSavingPlan] = useState(false);

  // Plans Management
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanLimit, setEditPlanLimit] = useState<number>(0);
  const [editPlanDailyPosts, setEditPlanDailyPosts] = useState<number>(5);

  // Banner Management
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [studioBanner, setStudioBanner] = useState<SystemBanner | null>(null);
  const [instructorBanner, setInstructorBanner] = useState<SystemBanner | null>(null);
  const [studioBannerLink, setStudioBannerLink] = useState('');
  const [instructorBannerLink, setInstructorBannerLink] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setDbError(null);
    const usersList: AdminUserView[] = [];

    try {
      // 0. Fetch Plans
      const plansData = await fetchSubscriptionPlans();
      setPlans(plansData);

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
          maxStudents: p.maxStudents,
          planId: p.planId,
          planName: p.planName || (p.planId ? 'Plano ID ' + p.planId : 'Sem Plano')
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

  const loadBanners = async () => {
    const sBanner = await fetchBannerByType('studio');
    const iBanner = await fetchBannerByType('instructor');
    setStudioBanner(sBanner);
    setInstructorBanner(iBanner);
    if(sBanner) setStudioBannerLink(sBanner.linkUrl || '');
    if(iBanner) setInstructorBannerLink(iBanner.linkUrl || '');
  };

  useEffect(() => {
    if (showBannerModal) {
        loadBanners();
    }
  }, [showBannerModal]);

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
    // Use planId if available, otherwise undefined
    setOwnerPlanId(owner.planId);
  };

  const handleSavePlanAssignment = async () => {
    if (!viewingOwner) return;
    setSavingPlan(true);
    
    const result = await upsertProfile(viewingOwner.targetId, {
      planId: ownerPlanId
    });

    if (result.success) {
      alert("Plano atualizado com sucesso!");
      // Update local state
      const selectedPlan = plans.find(p => p.id === ownerPlanId);
      setAllUsers(prev => prev.map(u => 
        u.id === viewingOwner.id 
          ? { ...u, planId: ownerPlanId, planName: selectedPlan?.name } 
          : u
      ));
    } else {
      alert("Erro ao salvar plano: " + result.error);
    }
    setSavingPlan(false);
  };

  const handleUpdatePlan = async (planId: string) => {
    if (editPlanLimit <= 0) return;
    
    const result = await updateSubscriptionPlan(planId, {
        maxStudents: editPlanLimit,
        maxDailyPosts: editPlanDailyPosts
    });

    if (result.success) {
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, maxStudents: editPlanLimit, maxDailyPosts: editPlanDailyPosts } : p));
        setEditingPlanId(null);
    } else {
        alert("Erro ao atualizar plano: " + result.error);
    }
  };

  const handleBannerUpload = async (file: File, type: 'studio' | 'instructor') => {
    setIsUploadingBanner(true);
    const imageUrl = await uploadBannerImage(file);
    if (imageUrl) {
        // Save to DB immediately with current link input
        const link = type === 'studio' ? studioBannerLink : instructorBannerLink;
        const result = await upsertBanner(type, imageUrl, link);
        if (result.success) {
            await loadBanners();
        } else {
            alert("Erro ao salvar banner no banco: " + result.error);
        }
    } else {
        alert("Erro no upload da imagem. Verifique se o bucket 'system-assets' existe e é público.");
    }
    setIsUploadingBanner(false);
  };

  const handleBannerLinkUpdate = async (type: 'studio' | 'instructor') => {
    const banner = type === 'studio' ? studioBanner : instructorBanner;
    const link = type === 'studio' ? studioBannerLink : instructorBannerLink;
    
    if (!banner) {
        alert("Faça upload de uma imagem primeiro.");
        return;
    }
    
    setIsUploadingBanner(true);
    const result = await upsertBanner(type, banner.imageUrl, link);
    if (result.success) {
        alert("Link atualizado!");
        await loadBanners();
    } else {
        alert("Erro ao atualizar link: " + result.error);
    }
    setIsUploadingBanner(false);
  };

  const handleDeleteBanner = async (type: 'studio' | 'instructor') => {
    if (!confirm('Tem certeza que deseja remover este banner?')) return;
    
    const result = await deleteBanner(type);
    if (result.success) {
      // Clear local state
      if (type === 'studio') {
        setStudioBanner(null);
        setStudioBannerLink('');
      } else {
        setInstructorBanner(null);
        setInstructorBannerLink('');
      }
    } else {
      alert("Erro ao remover banner: " + result.error);
    }
  };

  const copySql = () => {
    const sql = `
-- GARANTIR TABELAS E COLUNAS
create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  max_students int not null,
  max_daily_posts int default 5,
  created_at timestamptz default now()
);

alter table studio_profiles 
add column if not exists is_active BOOLEAN DEFAULT TRUE,
add column if not exists plan_id uuid references subscription_plans(id);

-- Insert Default Plans if empty
insert into subscription_plans (name, max_students, max_daily_posts) 
select 'Plano 1', 50, 5 where not exists (select 1 from subscription_plans where name = 'Plano 1');
    `;
    navigator.clipboard.writeText(sql.trim());
    alert('SQL copiado!');
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
    const currentPlanDetails = plans.find(p => p.id === ownerPlanId);
    
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
            <Crown className="w-5 h-5 text-yellow-500"/> Assinatura e Limites
          </h3>
          <div className="flex items-end gap-4 max-w-lg">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plano Selecionado</label>
              <select 
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                value={ownerPlanId || ''}
                onChange={e => setOwnerPlanId(e.target.value || undefined)}
              >
                <option value="">-- Sem Plano Definido --</option>
                {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Max: {p.maxStudents} alunos | {p.maxDailyPosts} posts/dia)</option>
                ))}
              </select>
              {currentPlanDetails && (
                  <p className="text-xs text-green-600 mt-1 font-medium">Limites: {currentPlanDetails.maxStudents} alunos, {currentPlanDetails.maxDailyPosts} posts/dia</p>
              )}
            </div>
            <Button onClick={handleSavePlanAssignment} isLoading={savingPlan}>
              <Save className="w-4 h-4 mr-2"/> Salvar Plano
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
              {currentPlanDetails ? (
                  <span className={`text-xs px-2 py-1 rounded ${linkedStudents.length >= currentPlanDetails.maxStudents ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-100 text-green-700'}`}>
                    {linkedStudents.length} / {currentPlanDetails.maxStudents}
                  </span>
              ) : (
                  <span className="text-xs text-slate-400 font-normal">Sem limite definido</span>
              )}
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
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-purple-600" /> Painel Admin Global
          </h1>
          <p className="text-slate-500">Gestão completa de usuários e planos.</p>
        </div>
        
        <div className="flex gap-2">
           <Button size="sm" variant="outline" onClick={copySql}>
             <Database className="h-3 w-3 mr-2" /> SQL Check
           </Button>
           <Button size="sm" variant="secondary" onClick={() => setShowBannerModal(true)}>
             <Image className="h-3 w-3 mr-2" /> Banners
           </Button>
           <Button size="sm" variant="secondary" onClick={() => setShowPlansModal(true)}>
             <Crown className="h-3 w-3 mr-2" /> Planos
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
                  <th className="px-6 py-4">Info Extra</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <tr key={`${u.role}-${u.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white text-base">{u.name}</div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5"><Mail className="h-3 w-3"/> {u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'owner' && <span className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs font-bold"><Building2 className="w-3 h-3"/> Dono</span>}
                      {u.role === 'instructor' && <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold"><BookUser className="w-3 h-3"/> Instrutor</span>}
                      {u.role === 'student' && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold"><GraduationCap className="w-3 h-3"/> Aluno</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs">
                        {u.role === 'owner' ? (
                            <span className="flex items-center gap-1 font-medium bg-yellow-50 text-yellow-800 px-2 py-1 rounded w-fit">
                                <Crown className="w-3 h-3"/> {u.planName || 'Sem Plano'}
                            </span>
                        ) : (
                            <span className="opacity-70">{u.contextInfo}</span>
                        )}
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

      {/* Plans Management Modal */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Crown className="w-6 h-6 text-yellow-500"/> Gestão de Planos
                    </h3>
                    <button onClick={() => setShowPlansModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                </div>

                <div className="space-y-4">
                    {plans.map(plan => (
                        <div key={plan.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">{plan.name}</h4>
                                <div className="text-sm text-slate-500 mt-1">
                                    <span className="block">Max Alunos: <strong>{plan.maxStudents}</strong></span>
                                    <span className="block">Max Posts/Dia: <strong>{plan.maxDailyPosts}</strong></span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {editingPlanId === plan.id ? (
                                    <div className="flex flex-col gap-2 bg-white dark:bg-slate-900 p-3 rounded border shadow-sm">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Max Alunos</label>
                                            <input 
                                                type="number" 
                                                value={editPlanLimit} 
                                                onChange={e => setEditPlanLimit(parseInt(e.target.value))}
                                                className="w-24 p-1 text-sm rounded border border-brand-300 focus:ring-1 focus:ring-brand-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Posts/Dia</label>
                                            <input 
                                                type="number" 
                                                value={editPlanDailyPosts} 
                                                onChange={e => setEditPlanDailyPosts(parseInt(e.target.value))}
                                                className="w-24 p-1 text-sm rounded border border-brand-300 focus:ring-1 focus:ring-brand-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <Button size="sm" onClick={() => handleUpdatePlan(plan.id)}>Salvar</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingPlanId(null)}>Cancelar</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => { setEditingPlanId(plan.id); setEditPlanLimit(plan.maxStudents); setEditPlanDailyPosts(plan.maxDailyPosts); }} className="text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 text-sm border border-brand-100 px-3 py-1.5 rounded hover:bg-brand-50">
                                        <Edit2 className="w-4 h-4"/> Editar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 text-xs text-slate-400 text-center">
                    Nota: Para criar novos planos, insira diretamente no banco de dados via SQL.
                </div>
            </div>
        </div>
      )}

      {/* Banner Management Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Image className="w-6 h-6 text-brand-600"/> Banners Promocionais
                    </h3>
                    <button onClick={() => setShowBannerModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                </div>

                <div className="space-y-8">
                    {/* Area Studio Banner */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 dark:text-white border-b pb-2">Área do Studio (Donos)</h4>
                        
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative w-40 h-24">
                                <div className="w-full h-full bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden">
                                    {studioBanner?.imageUrl ? (
                                        <img src={studioBanner.imageUrl} className="w-full h-full object-cover" alt="Banner Studio" />
                                    ) : <span className="text-xs text-slate-400">Sem imagem</span>}
                                </div>
                                {studioBanner?.imageUrl && (
                                    <button 
                                        onClick={() => handleDeleteBanner('studio')}
                                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 shadow-md hover:bg-red-200 transition-colors"
                                        title="Remover Banner"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 space-y-3">
                                <input type="file" accept="image/*" onChange={(e) => e.target.files && handleBannerUpload(e.target.files[0], 'studio')} disabled={isUploadingBanner} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                                <div className="flex gap-2">
                                    <Input placeholder="Link de destino (https://...)" value={studioBannerLink} onChange={(e) => setStudioBannerLink(e.target.value)} className="mb-0 flex-1" />
                                    <Button size="sm" onClick={() => handleBannerLinkUpdate('studio')} disabled={isUploadingBanner}>Salvar Link</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Area Instructor Banner */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 dark:text-white border-b pb-2">Área do Instrutor</h4>
                        
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative w-40 h-24">
                                <div className="w-full h-full bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden">
                                    {instructorBanner?.imageUrl ? (
                                        <img src={instructorBanner.imageUrl} className="w-full h-full object-cover" alt="Banner Instrutor" />
                                    ) : <span className="text-xs text-slate-400">Sem imagem</span>}
                                </div>
                                {instructorBanner?.imageUrl && (
                                    <button 
                                        onClick={() => handleDeleteBanner('instructor')}
                                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 shadow-md hover:bg-red-200 transition-colors"
                                        title="Remover Banner"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 space-y-3">
                                <input type="file" accept="image/*" onChange={(e) => e.target.files && handleBannerUpload(e.target.files[0], 'instructor')} disabled={isUploadingBanner} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                <div className="flex gap-2">
                                    <Input placeholder="Link de destino (https://...)" value={instructorBannerLink} onChange={(e) => setInstructorBannerLink(e.target.value)} className="mb-0 flex-1" />
                                    <Button size="sm" onClick={() => handleBannerLinkUpdate('instructor')} disabled={isUploadingBanner}>Salvar Link</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};