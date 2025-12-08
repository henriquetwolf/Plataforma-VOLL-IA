import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, AppRoute } from '../types';
import { supabase } from '../services/supabase';
import { fetchProfile } from '../services/storage';
import { getInstructorProfile } from '../services/instructorService';
import { getStudentProfile } from '../services/studentService';

interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
  user?: User | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, name: string, password: string) => Promise<AuthResult>;
  createInstructorLogin: (email: string, password: string, instructorId: string) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const loadUser = async (sessionUser: any): Promise<User | null> => {
    try {
      const metaRole = sessionUser.user_metadata?.role;

      // 1. Verifica ALUNO (Prioridade)
      const student = await getStudentProfile(sessionUser.id);
      if (student) {
        // --- SEGURANÇA EM CASCATA: ALUNO ---
        // Se o Studio dono da conta estiver desativado, o aluno não entra.
        if (student.user_id) {
            const studioProfile = await fetchProfile(student.user_id);
            if (studioProfile && studioProfile.isActive === false) {
                console.warn(`Bloqueio de Segurança: O Studio deste aluno (${student.user_id}) está desativado.`);
                await supabase.auth.signOut(); // KILL SESSION
                setState({ user: null, isAuthenticated: false, isLoading: false });
                return null;
            }
        }
        // ------------------------------------

        const userObj: User = {
          id: sessionUser.id,
          dbId: student.id, 
          email: sessionUser.email || '',
          name: student.name,
          password: '',
          isAdmin: false,
          isInstructor: false,
          isStudent: true, 
          isOwner: false,
          studioId: student.user_id 
        };
        setState({ user: userObj, isAuthenticated: true, isLoading: false });
        return userObj;
      }

      if (metaRole === 'student') {
          console.warn("Acesso negado: Aluno desativado ou sem vínculo.");
          await supabase.auth.signOut();
          setState({ user: null, isAuthenticated: false, isLoading: false });
          return null;
      }

      // 2. Verifica INSTRUTOR
      const isInstructorMeta = metaRole === 'instructor';
      const instructor = await getInstructorProfile(sessionUser.id, sessionUser.email);
      
      if (instructor || isInstructorMeta) {
        // Verifica se o instrutor está ativo individualmente
        const active = instructor ? instructor.active : true;
        if (active === false) {
           console.warn("Acesso negado: Instrutor inativo.");
           await supabase.auth.signOut();
           setState({ user: null, isAuthenticated: false, isLoading: false });
           return null;
        }

        if (!instructor && isInstructorMeta) {
           console.warn("Acesso negado: Instrutor sem perfil vinculado.");
           await supabase.auth.signOut();
           setState({ user: null, isAuthenticated: false, isLoading: false });
           return null;
        }

        // --- SEGURANÇA EM CASCATA: INSTRUTOR ---
        // Se o Studio contratante estiver desativado, o instrutor não entra.
        const parentStudioId = instructor?.studioUserId || sessionUser.user_metadata?.studio_id;
        if (parentStudioId) {
            const studioProfile = await fetchProfile(parentStudioId);
            if (studioProfile && studioProfile.isActive === false) {
                console.warn(`Bloqueio de Segurança: O Studio deste instrutor (${parentStudioId}) está desativado.`);
                await supabase.auth.signOut(); // KILL SESSION
                setState({ user: null, isAuthenticated: false, isLoading: false });
                return null;
            }
        }
        // ------------------------------------

        const userObj: User = {
          id: sessionUser.id,
          dbId: instructor?.id, 
          email: sessionUser.email || '',
          name: instructor?.name || sessionUser.user_metadata?.name || 'Instrutor',
          password: '',
          isAdmin: false,
          isInstructor: true, 
          isOwner: false,
          isStudent: false,
          studioId: parentStudioId
        };
        setState({ user: userObj, isAuthenticated: true, isLoading: false });
        return userObj;
      }

      // 3. Verifica DONO (STUDIO)
      const profile = await fetchProfile(sessionUser.id);
      
      // SEGURANÇA CRÍTICA: Bloqueio explícito se isActive for falso
      // Isso impede que um dono bloqueado consiga acessar mesmo que tente via login de instrutor (se falhar verificação acima)
      if (profile && profile.isActive === false) {
          console.warn("Acesso negado: Studio (Dono) desativado pelo Administrador.");
          await supabase.auth.signOut(); // KILL SESSION
          setState({ user: null, isAuthenticated: false, isLoading: false });
          return null;
      }

      // Verifica se é um usuário "orfão" com role errada
      if (!profile && (metaRole === 'student' || metaRole === 'instructor')) {
          console.warn(`Acesso negado: Usuário orfão com role '${metaRole}'.`);
          await supabase.auth.signOut();
          setState({ user: null, isAuthenticated: false, isLoading: false });
          return null;
      }

      const userObj: User = {
          id: sessionUser.id,
          dbId: profile?.id, 
          email: sessionUser.email || '',
          name: profile?.ownerName || sessionUser.user_metadata?.name || 'Dono do Studio',
          password: '',
          isAdmin: profile?.isAdmin || false,
          isInstructor: false,
          isStudent: false,
          isOwner: true,
          studioId: sessionUser.id // Dono é o próprio studio
      };
      setState({ user: userObj, isAuthenticated: true, isLoading: false });
      return userObj;

    } catch (e) {
      console.error("Erro no loadUser:", e);
      // Em caso de erro, desloga por segurança
      await supabase.auth.signOut();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUser(session.user);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         if (session?.user) {
            loadUser(session.user);
         }
      } else if (event === 'SIGNED_OUT') {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };

      if (data.session?.user) {
        // Força recarregamento do perfil para garantir status atualizado
        const loadedUser = await loadUser(data.session.user);
        
        if (!loadedUser) {
            // CRÍTICO: Se loadUser retornou null, significa que foi barrado pela segurança.
            // Precisamos garantir que a sessão criada pelo signInWithPassword seja DESTRUÍDA IMEDIATAMENTE.
            console.warn("Login bem sucedido no Auth, mas rejeitado pela política de segurança (bloqueio). Deslogando...");
            await supabase.auth.signOut();
            return { success: false, error: 'Acesso suspenso ou não autorizado. Entre em contato com o suporte.' };
        }
        
        return { success: true, user: loadedUser };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Erro inesperado ao conectar.' };
    }
  };

  const register = async (email: string, name: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name },
        },
      });

      if (error) return { success: false, error: error.message };
      
      if (data.session?.user) {
         await loadUser(data.session.user);
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: 'Erro inesperado ao tentar registrar.' };
    }
  };

  const createInstructorLogin = async (email: string, password: string, instructorId: string): Promise<AuthResult> => {
    return { success: false, error: "Feature indisponível." };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, createInstructorLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};