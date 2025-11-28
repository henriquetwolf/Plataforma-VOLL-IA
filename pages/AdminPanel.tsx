import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllProfiles, toggleUserStatus } from '../services/storage';
import { StudioProfile } from '../types';
import { Button } from '../components/ui/Button';
import { ShieldAlert, UserCheck, UserX, Search, Mail, Building2, AlertTriangle, Copy, Users, CheckCircle, Ban } from 'lucide-react';

const ADMIN_EMAIL = 'henriquetwolf@gmail.com';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<StudioProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await fetchAllProfiles();
    
    if (error) {
      setDbError(error);
    } else {
      setUsers(data);
      setDbError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (targetUserId: string, currentStatus: boolean, userName: string) => {
    const action = currentStatus ? 'DESATIVAR' : 'ATIVAR';
    
    if (confirm(`Tem certeza que deseja ${action} o acesso de ${userName}?`)) {
      // Inverte o status atual
      const newStatus = !currentStatus;
      
      const success = await toggleUserStatus(targetUserId, newStatus);
      
      if (success) {
        // Atualiza o estado local para refletir a mudança imediatamente
        setUsers(prev => prev.map(u => u.userId === targetUserId ? { ...u, isActive: newStatus } : u));
      } else {
        alert('Erro ao atualizar status. Verifique se o SQL de permissão "Super Admin Update All" foi rodado no Supabase.');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.studioName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = users.length - activeCount;

  const copySql = () => {
    const sql = `
DROP POLICY IF EXISTS "Admins can view all profiles" ON studio_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON studio_profiles;
CREATE POLICY "Super Admin View All" ON studio_profiles FOR SELECT USING ( auth.jwt() ->> 'email' = 'henriquetwolf@gmail.com' );
CREATE POLICY "Super Admin Update All" ON studio_profiles FOR UPDATE USING ( auth.jwt() ->> 'email' = 'henriquetwolf@gmail.com' );
    `;
    navigator.clipboard.writeText(sql.trim());
    alert('SQL copiado!');
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
            <ShieldAlert className="h-8 w-8 text-purple-600" /> Gestão de Usuários
          </h1>
          <p className="text-slate-500">Controle de acesso à plataforma.</p>
        </div>
        
        {/* Stats Badges */}
        <div className="flex gap-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><Users className="h-4 w-4"/></div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{users.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
            <div className="p-1.5 bg-green-100 text-green-600 rounded-md"><CheckCircle className="h-4 w-4"/></div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Ativos</p>
              <p className="text-lg font-bold text-green-600">{activeCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
            <div className="p-1.5 bg-red-100 text-red-600 rounded-md"><Ban className="h-4 w-4"/></div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Bloqueados</p>
              <p className="text-lg font-bold text-red-600">{inactiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {(dbError || (users.length === 0 && !loading)) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
            <div>
              <h3 className="font-bold text-red-800 text-lg">Atenção: Acesso ao Banco Bloqueado</h3>
              <p className="text-red-700 text-sm mb-2">
                O Supabase está impedindo a visualização. Rode o SQL abaixo.
                {dbError && <span className="block mt-1 font-mono bg-red-100 p-1 rounded text-xs">{JSON.stringify(dbError.message || dbError)}</span>}
              </p>
              <Button size="sm" onClick={copySql} className="bg-slate-800 hover:bg-slate-700 text-white mt-2">
                <Copy className="h-3 w-3 mr-2" /> Copiar SQL de Correção
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Buscar por nome, email ou studio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={loadUsers}>Atualizar Lista</Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Carregando lista...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nome / Studio</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length > 0 ? filteredUsers.map(profile => (
                  <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white text-base">{profile.ownerName || 'Sem nome'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3"/> {profile.studioName || 'Sem studio'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400"/> {profile.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {profile.isActive ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold border border-green-200">
                          <CheckCircle className="w-3 h-3" /> ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold border border-red-200">
                          <Ban className="w-3 h-3" /> BLOQUEADO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {profile.userId !== user?.id && (
                        <Button 
                          size="sm"
                          onClick={() => handleToggleStatus(profile.userId, profile.isActive, profile.ownerName)}
                          className={`font-medium shadow-sm transition-all ${
                            profile.isActive 
                              ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300' 
                              : 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                          }`}
                        >
                          {profile.isActive ? <><UserX className="h-4 w-4 mr-2"/> Desativar Acesso</> : <><UserCheck className="h-4 w-4 mr-2"/> Ativar Acesso</>}
                        </Button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-500 bg-slate-50/50">
                      Nenhum usuário encontrado na lista.
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