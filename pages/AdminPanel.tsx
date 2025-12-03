
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchAllProfiles, toggleUserStatus, adminResetPassword, upsertProfile, fetchSubscriptionPlans, updateSubscriptionPlan } from '../services/storage';
import { fetchInstructors, toggleInstructorStatus } from '../services/instructorService';
import { fetchStudents, revokeStudentAccess } from '../services/studentService';
import { uploadBannerImage, upsertBanner, fetchBannerByType, deleteBanner } from '../services/bannerService';
import { fetchAllSuggestions } from '../services/suggestionService';
import { generateSuggestionTrends } from '../services/geminiService';
import { fetchAdminDashboardStats, fetchAdminTimelineStats, fetchApiUsageStats, AdminStats, TimelineDataPoint, UserApiCost } from '../services/adminService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldAlert, UserCheck, UserX, Search, Mail, Building2, AlertTriangle, Copy, CheckCircle, Ban, BookUser, GraduationCap, LayoutDashboard, Database, Loader2, Image, Key, Eye, ArrowLeft, Save, Crown, Edit2, X, Upload, Trash2, MessageSquare, Sparkles, FileText, Download, BarChart3, PieChart as PieChartIcon, TrendingUp, Banknote } from 'lucide-react';
import { SubscriptionPlan, SystemBanner, Suggestion } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

interface AdminUserView {
  id: string; 
  targetId: string;
  name: string;
  email: string;
  role: 'owner' | 'instructor' | 'student';
  isActive: boolean;
  contextInfo?: string; 
  maxStudents?: number;
  planId?: string;
  planName?: string;
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [allUsers, setAllUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'owner' | 'instructor' | 'student' | 'suggestions' | 'costs'>('dashboard');
  
  // Dashboard Stats
  const [stats, setStats] = useState<AdminStats | null>(null);

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

  // Global Suggestions
  const [allSuggestions, setAllSuggestions] = useState<(Suggestion & { studioName?: string })[]>([]);
  const [suggestionStartDate, setSuggestionStartDate] = useState('');
  const [suggestionEndDate, setSuggestionEndDate] = useState('');
  const [isAnalyzingSuggestions, setIsAnalyzingSuggestions] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);

  // API Costs
  const [apiCosts, setApiCosts] = useState<{ total: number; byUser: UserApiCost[] } | null>(null);
  const [loadingCosts, setLoadingCosts] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setDbError(null);
    const usersList: AdminUserView[] = [];

    try {
      // 0. Fetch Stats & Plans
      const statsData = await fetchAdminDashboardStats();
      setStats(statsData);
      const plansData = await fetchSubscriptionPlans();
      setPlans(plansData);

      // 1. Fetch Owners
      const { data: profiles, error: profileError } = await fetchAllProfiles();
      if (profileError) throw profileError;
      
      profiles.forEach(p => {
        usersList.push({
          id: p.id,
          targetId: p.userId,
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
          targetId: i.id,
          name: i.name,
          email: i.email,
          role: 'instructor',
          isActive: i.active,
          contextInfo: i.studioUserId
        });
      });

      // 3. Fetch Students
      const students = await fetchStudents();
      students.forEach(s => {
        usersList.push({
          id: s.id,
          targetId: s.id,
          name: s.name,
          email: s.email || '-',
          role: 'student',
          isActive: !!s.authUserId,
          contextInfo: s.userId
        });
      });

      setAllUsers(usersList);

      // 4. Fetch All Suggestions
      const suggestionsData = await fetchAllSuggestions();
      const suggestionsWithNames = suggestionsData.map(s => {
          const owner = usersList.find(u => u.role === 'owner' && u.targetId === s.studioId);
          return {
              ...s,
              studioName: owner ? (owner.contextInfo || owner.name) : 'Studio Desconhecido'
          };
      });
      setAllSuggestions(suggestionsWithNames);

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

  useEffect(() => {
    if (activeTab === 'costs' && !apiCosts) {
        setLoadingCosts(true);
        fetchApiUsageStats().then(data => {
            setApiCosts(data);
            setLoadingCosts(false);
        });
    }
  }, [activeTab]);

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
    
    if (!confirm(`Tem certeza que deseja ${action} o acesso de ${targetUser.name}? ${isStudent && targetUser.isActive ? '\n(Isso removerá o login do aluno, mas manterá os dados.)' : ''}`)) return;

    setTogglingId(targetUser.id);

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
        setAllUsers(prev => prev.map(u => 
          u.id === targetUser.id && u.role === targetUser.role 
            ? { ...u, isActive: isStudent ? false : !u.isActive } 
            : u
        ));
      } else {
        alert(`Falha ao atualizar status: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Erro inesperado: ${error.message}`);
    } finally {
      setTogglingId(null);
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
    setOwnerPlanId(owner.planId);
  };

  const handleSavePlanAssignment = async () => {
    if (!viewingOwner) return;
    setSavingPlan(true);
    const result = await upsertProfile(viewingOwner.targetId, { planId: ownerPlanId });
    if (result.success) {
      alert("Plano atualizado com sucesso!");
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
    const result = await updateSubscriptionPlan(planId, { maxStudents: editPlanLimit, maxDailyPosts: editPlanDailyPosts });
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
        const link = type === 'studio' ? studioBannerLink : instructorBannerLink;
        const result = await upsertBanner(type, imageUrl, link);
        if (result.success) {
            await loadBanners();
        } else {
            alert("Erro ao salvar banner no banco: " + result.error);
        }
    } else {
        alert("Erro no upload da imagem.");
    }
    setIsUploadingBanner(false);
  };

  const handleBannerLinkUpdate = async (type: 'studio' | 'instructor') => {
    const banner = type === 'studio' ? studioBanner : instructorBanner;
    const link = type === 'studio' ? studioBannerLink : instructorBannerLink;
    if (!banner) { alert("Faça upload de uma imagem primeiro."); return; }
    setIsUploadingBanner(true);
    const result = await upsertBanner(type, banner.imageUrl, link);
    if (result.success) { alert("Link atualizado!"); await loadBanners(); } else { alert("Erro ao atualizar link: " + result.error); }
    setIsUploadingBanner(false);
  };

  const handleDeleteBanner = async (type: 'studio' | 'instructor') => {
    if (!confirm('Tem certeza?')) return;
    const result = await deleteBanner(type);
    if (result.success) {
      if (type === 'studio') { setStudioBanner(null); setStudioBannerLink(''); } 
      else { setInstructorBanner(null); setInstructorBannerLink(''); }
    } else {
      alert("Erro ao remover banner: " + result.error);
    }
  };

  const getFilteredSuggestions = () => {
    return allSuggestions.filter(s => {
        if (suggestionStartDate) {
            const start = new Date(suggestionStartDate);
            start.setHours(0,0,0,0);
            if (new Date(s.createdAt) < start) return false;
        }
        if (suggestionEndDate) {
            const end = new Date(suggestionEndDate);
            end.setHours(23,59,59,999);
            if (new Date(s.createdAt) > end) return false;
        }
        return true;
    });
  };

  const handleAnalyzeGlobalSuggestions = async () => {
    const filtered = getFilteredSuggestions();
    if (filtered.length === 0) { alert("Nenhuma sugestão encontrada."); return; }
    setIsAnalyzingSuggestions(true);
    setAnalysisReport(null);
    try {
        const report = await generateSuggestionTrends(filtered);
        setAnalysisReport(report);
    } catch (e) {
        alert("Erro ao gerar análise.");
    } finally {
        setIsAnalyzingSuggestions(false);
    }
  };

  const downloadReportPDF = async () => {
    const element = document.getElementById('admin-analysis-report');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
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
      pdf.save('Relatorio_Global_Sugestoes.pdf');
    } catch (error) {
      alert('Erro ao gerar PDF.');
    }
  };

  const copySql = () => {
    const sql = `
-- GRANT ACCESS FOR ADMIN DASHBOARD
alter table content_posts enable row level security;
alter table class_evaluations enable row level security;
alter table rehab_lessons enable row level security;
alter table suggestions enable row level security;

-- Admin needs global read access for dashboard stats
drop policy if exists "Admin view all posts" on content_posts;
create policy "Admin view all posts" on content_posts for select to authenticated using (auth.jwt() ->> 'email' = '${ADMIN_EMAIL}');

drop policy if exists "Admin view all evaluations" on class_evaluations;
create policy "Admin view all evaluations" on class_evaluations for select to authenticated using (auth.jwt() ->> 'email' = '${ADMIN_EMAIL}');

drop policy if exists "Admin view all lessons" on rehab_lessons;
create policy "Admin view all lessons" on rehab_lessons for select to authenticated using (auth.jwt() ->> 'email' = '${ADMIN_EMAIL}');

drop policy if exists "Admin view all suggestions" on suggestions;
create policy "Admin view all suggestions" on suggestions for select to authenticated using (auth.jwt() ->> 'email' = '${ADMIN_EMAIL}');
    `;
    navigator.clipboard.writeText(sql.trim());
    alert('SQL copiado! Execute no Supabase SQL Editor para liberar as métricas e sugestões globais.');
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.contextInfo && u.contextInfo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && u.role === activeTab;
  });

  const linkedInstructors = viewingOwner ? allUsers.filter(u => u.role === 'instructor' && u.contextInfo === viewingOwner.targetId) : [];
  const linkedStudents = viewingOwner ? allUsers.filter(u => u.role === 'student' && u.contextInfo === viewingOwner.targetId) : [];

  if (user?.email !== ADMIN_EMAIL) {
    return <div className="p-12 text-center text-red-600">Acesso Restrito</div>;
  }

  // --- DASHBOARD COMPONENT ---
  const DashboardView = () => {
    const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(true);
    const [timelineStartDate, setTimelineStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [timelineEndDate, setTimelineEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchTimeline = async () => {
            setTimelineLoading(true);
            const data = await fetchAdminTimelineStats(timelineStartDate, timelineEndDate);
            setTimelineData(data);
            setTimelineLoading(false);
        };
        fetchTimeline();
    }, [timelineStartDate, timelineEndDate]);

    if (!stats) return <div className="text-center p-8">Carregando estatísticas...</div>;

    const COLORS = ['#8884d8', '#00C49F', '#FFBB28', '#FF8042'];
    const activeData = [
        { name: t('admin_tab_owners'), value: stats.studios.active },
        { name: t('admin_tab_instructors'), value: stats.instructors.active },
        { name: t('admin_tab_students'), value: stats.students.active }
    ];

    const volumeData = [
        { name: 'Posts IA', value: stats.content.posts },
        { name: t('class_ratings'), value: stats.engagement.evaluations },
        { name: t('suggestions'), value: stats.engagement.suggestions },
        { name: 'Aulas Criadas', value: stats.rehab.lessons }
    ];

    const activeStudios = stats.studios.active || 1; // Avoid division by zero
    const activeStudents = stats.students.active || 1;

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase">{t('admin_kpi_studios')}</h3>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.studios.total}</span>
                        <span className="text-sm text-green-600 font-medium mb-1">({stats.studios.active} ativos)</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase">{t('admin_kpi_students')}</h3>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.students.total}</span>
                        <span className="text-sm text-green-600 font-medium mb-1">({stats.students.active} ativos)</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase">{t('admin_kpi_content')}</h3>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.content.posts}</span>
                        <span className="text-sm text-slate-400 mb-1">posts IA</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase">{t('admin_kpi_engagement')}</h3>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.engagement.evaluations}</span>
                        <span className="text-sm text-slate-400 mb-1">avaliações</span>
                    </div>
                </div>
            </div>

            {/* Timeline Chart (New) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-600"/> {t('admin_timeline_title')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm"
                            value={timelineStartDate}
                            onChange={e => setTimelineStartDate(e.target.value)}
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="date" 
                            className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm"
                            value={timelineEndDate}
                            onChange={e => setTimelineEndDate(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="h-80 w-full">
                    {timelineLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorContent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorStudios" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{fontSize: 12}} />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="content" name={t('admin_kpi_content')} stroke="#14b8a6" fillOpacity={1} fill="url(#colorContent)" />
                                <Area type="monotone" dataKey="engagement" name={t('admin_kpi_engagement')} stroke="#8884d8" fillOpacity={1} fill="url(#colorEval)" />
                                <Area type="monotone" dataKey="studios" name={t('admin_kpi_studios')} stroke="#3b82f6" fillOpacity={1} fill="url(#colorStudios)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-brand-600"/> {t('admin_dist_users')}
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={activeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                {activeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-brand-600"/> {t('admin_vol_prod')}
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Averages & Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{t('admin_avg_instructors')}</h4>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{(stats.instructors.active / activeStudios).toFixed(1)}</p>
                    <p className="text-xs text-blue-700/70">por studio ativo</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-800">
                    <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">{t('admin_avg_students')}</h4>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">{(stats.students.active / activeStudios).toFixed(1)}</p>
                    <p className="text-xs text-green-700/70">por studio ativo</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-xl border border-purple-100 dark:border-purple-800">
                    <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">{t('admin_avg_posts')}</h4>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-200 mt-1">{(stats.content.posts / activeStudios).toFixed(1)}</p>
                    <p className="text-xs text-purple-700/70">por studio ativo</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-xl border border-orange-100 dark:border-orange-800">
                    <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">{t('admin_avg_engagement')}</h4>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-200 mt-1">{(stats.engagement.evaluations / activeStudents).toFixed(1)}</p>
                    <p className="text-xs text-orange-700/70">avaliações por aluno</p>
                </div>
            </div>
        </div>
    );
  };

  // --- API COSTS VIEW ---
  const ApiCostView = () => {
    if (loadingCosts) {
        return <div className="text-center p-12 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-600" /> Calculando custos...</div>;
    }

    if (!apiCosts) return null;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 p-8 rounded-2xl shadow-lg text-white">
                <h3 className="text-lg font-bold opacity-80 uppercase tracking-wide mb-1">{t('admin_cost_total')}</h3>
                <p className="text-5xl font-extrabold flex items-center gap-2">
                    <span className="text-3xl opacity-60">$</span> {apiCosts.total.toFixed(2)}
                </p>
                <p className="text-sm opacity-60 mt-2">Valor estimado com base no volume de uso da API Gemini.</p>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">{t('admin_cost_per_user')}</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Studio / Dono</th>
                                <th className="px-6 py-4 text-center">Posts (Img/Vid)</th>
                                <th className="px-6 py-4 text-center">Planos Rehab</th>
                                <th className="px-6 py-4 text-center">Análises IA</th>
                                <th className="px-6 py-4 text-right">Custo Est. (USD)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {apiCosts.byUser.map(item => (
                                <tr key={item.studioId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900 dark:text-white">{item.studioName}</p>
                                        <p className="text-xs text-slate-500">{item.ownerName}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono">{item.postCount}</td>
                                    <td className="px-6 py-4 text-center font-mono">{item.lessonCount}</td>
                                    <td className="px-6 py-4 text-center font-mono">{item.analysisCount}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        $ {item.totalCost.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {apiCosts.byUser.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Sem dados de uso.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  // --- MAIN VIEW ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-purple-600" /> {t('admin_title')}
          </h1>
          <p className="text-slate-500">{t('admin_subtitle')}</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
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
             {loading ? <Loader2 className="animate-spin h-4 w-4"/> : "Atualizar"}
           </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit overflow-x-auto">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}
        >
          <BarChart3 className="h-4 w-4"/> {t('admin_tab_dashboard')}
        </button>
        <button 
          onClick={() => setActiveTab('costs')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'costs' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
        >
          <Banknote className="h-4 w-4"/> {t('admin_tab_costs')}
        </button>
        <button 
          onClick={() => setActiveTab('all')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
        >
          <LayoutDashboard className="h-4 w-4"/> {t('admin_tab_list')}
        </button>
        <button 
          onClick={() => setActiveTab('owner')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'owner' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}
        >
          <Building2 className="h-4 w-4"/> {t('admin_tab_owners')}
        </button>
        <button 
          onClick={() => setActiveTab('instructor')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'instructor' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
        >
          <BookUser className="h-4 w-4"/> {t('admin_tab_instructors')}
        </button>
        <button 
          onClick={() => setActiveTab('student')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'student' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}
        >
          <GraduationCap className="h-4 w-4"/> {t('admin_tab_students')}
        </button>
        <button 
          onClick={() => setActiveTab('suggestions')} 
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'suggestions' ? 'bg-white shadow text-yellow-600' : 'text-slate-500'}`}
        >
          <MessageSquare className="h-4 w-4"/> {t('admin_tab_suggestions')}
        </button>
      </div>

      {activeTab === 'dashboard' && <DashboardView />}
      
      {activeTab === 'costs' && <ApiCostView />}

      {activeTab === 'suggestions' && (
        <div className="space-y-6 animate-in fade-in">
            {/* Suggestions Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 w-full">
                    <span className="text-sm font-bold text-slate-500">Filtrar Data:</span>
                    <input type="date" value={suggestionStartDate} onChange={e => setSuggestionStartDate(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm"/>
                    <span className="text-slate-400">-</span>
                    <input type="date" value={suggestionEndDate} onChange={e => setSuggestionEndDate(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm"/>
                    <Button size="sm" variant="outline" onClick={() => { setSuggestionStartDate(''); setSuggestionEndDate(''); }}>Limpar</Button>
                </div>
                <Button onClick={handleAnalyzeGlobalSuggestions} isLoading={isAnalyzingSuggestions} disabled={getFilteredSuggestions().length === 0} className="bg-purple-600 hover:bg-purple-700">
                    <Sparkles className="w-4 h-4 mr-2"/> Analisar Tendências ({getFilteredSuggestions().length})
                </Button>
            </div>

            {/* Analysis Result */}
            {analysisReport && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg relative animate-in slide-in-from-top-4">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <Button size="sm" variant="outline" onClick={downloadReportPDF}><Download className="w-4 h-4 mr-2"/> PDF</Button>
                        <button onClick={() => setAnalysisReport(null)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    </div>
                    <div id="admin-analysis-report" className="prose prose-slate dark:prose-invert max-w-none">
                        <div className="border-b pb-4 mb-4">
                            <h2 className="text-2xl font-bold text-purple-700">Relatório de Feedback Global</h2>
                            <p className="text-sm text-slate-500">Análise gerada por IA baseada em {getFilteredSuggestions().length} sugestões.</p>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: analysisReport }} />
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {getFilteredSuggestions().length === 0 ? (
                        <p className="p-12 text-center text-slate-500">Nenhuma sugestão encontrada.</p>
                    ) : (
                        getFilteredSuggestions().map(s => (
                            <div key={s.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{s.studioName || 'Studio Desconhecido'}</h4>
                                    <span className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{s.content}"</p>
                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><GraduationCap className="w-3 h-3"/> {s.studentName}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Users Table */}
      {activeTab !== 'dashboard' && activeTab !== 'suggestions' && activeTab !== 'costs' && (
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
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ver Detalhes" onClick={() => openViewDetails(u)}>
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Redefinir Senha" onClick={() => { setResetModalUser(u); setNewPassword(''); }}>
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
      )}

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

      {/* Drill Down View */}
      {viewingOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-800 overflow-y-auto">
                <div className="flex items-center gap-4 border-b pb-4 mb-4">
                    <Button variant="outline" onClick={() => setViewingOwner(null)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{viewingOwner.contextInfo || viewingOwner.name}</h1>
                        <p className="text-slate-500 text-sm">Gerenciando Studio de {viewingOwner.name} ({viewingOwner.email})</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
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
        </div>
      )}
    </div>
  );
};
