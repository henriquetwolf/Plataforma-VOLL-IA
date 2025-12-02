
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

      // SEGURANÇA: Se tem role de aluno mas não achou perfil (foi desativado), BLOQUEIA
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
        const active = instructor ? instructor.active : true;
        
        if (active === false) {
           console.warn("Acesso negado: Instrutor inativo.");
           await supabase.auth.signOut();
           setState({ user: null, isAuthenticated: false, isLoading: false });
           return null;
        }

        // Se não achou perfil de instrutor mas tem a role, bloqueia por segurança
        if (!instructor && isInstructorMeta) {
           console.warn("Acesso negado: Instrutor sem perfil vinculado.");
           await supabase.auth.signOut();
           setState({ user: null, isAuthenticated: false, isLoading: false });
           return null;
        }

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
          studioId: instructor?.studio_user_id || sessionUser.user_metadata?.studio_id
        };
        setState({ user: userObj, isAuthenticated: true, isLoading: false });
        return userObj;
      }

      // 3. Verifica DONO
      const profile = await fetchProfile(sessionUser.id);
      
      // SEGURANÇA CRÍTICA: Se não achou perfil de dono, mas o usuário tem role de 'student' ou 'instructor'
      // SIGNIFICA QUE É UM USUÁRIO REMOVIDO/DESATIVADO. NÃO PERMITIR FALLBACK PARA DONO.
      if (!profile && (metaRole === 'student' || metaRole === 'instructor')) {
          console.warn(`Acesso negado: Usuário orfão com role '${metaRole}'.`);
          await supabase.auth.signOut();
          setState({ user: null, isAuthenticated: false, isLoading: false });
          return null;
      }

      if (profile && profile.isActive === false) {
          console.warn("Acesso negado: Studio inativo.");
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
          isOwner: true 
      };
      setState({ user: userObj, isAuthenticated: true, isLoading: false });
      return userObj;

    } catch (e) {
      console.error("Erro no loadUser:", e);
      setState(prev => ({ ...prev, isLoading: false }));
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
        const loadedUser = await loadUser(data.session.user);
        if (!loadedUser) {
            // Se loadUser retornou null, significa que foi bloqueado por segurança
            return { success: false, error: 'Acesso negado. Conta desativada ou perfil não encontrado.' };
        }
        return { success: true, user: loadedUser };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Erro inesperado ao tentar fazer login.' };
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
