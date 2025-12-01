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

  const loadUser = async (sessionUser: any) => {
    try {
      // 1. Verifica ALUNO (Prioridade para evitar conflito com email de instrutor)
      const student = await getStudentProfile(sessionUser.id);
      if (student) {
        console.log("Login de Aluno Detectado:", student.name);
        setState({
          user: {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: student.name,
            password: '',
            isAdmin: false,
            isInstructor: false,
            isStudent: true, // Flag de Aluno
            studioId: student.user_id // ID do dono do estúdio
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      // 2. Verifica INSTRUTOR
      const instructor = await getInstructorProfile(sessionUser.id, sessionUser.email);
      if (instructor) {
        if (instructor.active === false) {
           await supabase.auth.signOut();
           return { error: 'Seu acesso foi desativado pelo estúdio.' };
        }
        setState({
          user: {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: instructor.name,
            password: '',
            isAdmin: false,
            isInstructor: true, 
            studioId: instructor.studio_user_id 
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      // 3. Verifica DONO
      const profile = await fetchProfile(sessionUser.id);
      let isOwner = false;
      if (profile && profile.userId === sessionUser.id) {
        isOwner = true;
      }

      if (isOwner && profile) {
        if (profile.isActive === false) {
          await supabase.auth.signOut();
          return { error: 'Conta desativada pelo administrador.' };
        }

        setState({
          user: {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: profile.ownerName || sessionUser.user_metadata?.name || 'Usuário',
            password: '',
            isAdmin: profile.isAdmin,
            isInstructor: false
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Nem Dono, Nem Instrutor, Nem Aluno
        setState({
          user: {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: sessionUser.user_metadata?.name || 'Visitante',
            password: '',
            isAdmin: false,
            isInstructor: false
          },
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (e) {
      console.error("Erro no loadUser:", e);
      setState(prev => ({ ...prev, isLoading: false }));
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
         if (session?.user && (!state.user || state.user.id !== session.user.id)) {
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
        await loadUser(data.session.user);
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
    try {
      return { success: false, error: "Feature indisponível." };
    } catch (err) {
      return { success: false, error: 'Erro.' };
    }
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