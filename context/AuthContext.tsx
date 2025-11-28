import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, AppRoute } from '../types';
import { supabase } from '../services/supabase';
import { fetchProfile } from '../services/storage';
import { getInstructorProfile } from '../services/instructorService';

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
      // LÓGICA DE SEGURANÇA REFORÇADA:
      // A ordem de verificação é crítica para impedir que instrutores criem estúdios "sem querer".
      
      // 1. Tenta identificar se é INSTRUTOR (Prioridade Máxima)
      // Passamos o email para permitir a "cura" (vínculo tardio) do registro
      const instructor = await getInstructorProfile(sessionUser.id, sessionUser.email);
      
      if (instructor) {
        // --- É INSTRUTOR CONFIRMADO ---
        if (instructor.active === false) {
           await supabase.auth.signOut();
           return { error: 'Seu acesso foi desativado pelo estúdio.' };
        }

        console.log("Login de Instrutor Confirmado. Vinculado ao Studio ID:", instructor.studio_user_id);

        setState({
          user: {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: instructor.name,
            password: '',
            isAdmin: false,
            isInstructor: true, 
            studioId: instructor.studio_user_id // Vínculo com o chefe
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return; // Retorna imediatamente, impedindo qualquer outra lógica
      }

      // 2. Se não é instrutor, verifica se é DONO DE ESTÚDIO (Perfil existente)
      const profile = await fetchProfile(sessionUser.id);
      
      // Verifica se o perfil pertence mesmo ao usuário logado
      let isOwner = false;
      if (profile && profile.userId === sessionUser.id) {
        isOwner = true;
      }

      if (isOwner && profile) {
        // --- É DONO ---
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
        // --- NEM DONO NEM INSTRUTOR (CADASTRO NOVO) ---
        // Apenas usuários que se registraram explicitamente na tela de "Cadastro de Studio" devem cair aqui.
        
        console.warn("Usuário sem perfil e sem vínculo de instrutor detectado.");
        
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
      console.error("Erro crítico no loadUser:", e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    // Check inicial de sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUser(session.user);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Ouvinte de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         if (session?.user) {
            // Recarrega se o usuário mudou ou se o estado estava vazio
            if (!state.user || state.user.id !== session.user.id) {
                loadUser(session.user);
            }
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

      // Força o carregamento do perfil antes de devolver o controle para a UI
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