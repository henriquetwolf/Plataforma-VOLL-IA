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
      // LÓGICA REFORÇADA:
      // 1. Verifica se é um INSTRUTOR primeiro (para evitar criar perfil de dono acidentalmente)
      // 2. Se não, verifica se é um DONO DE ESTÚDIO existente.
      
      // A ordem mudou para priorizar instrutores e evitar que eles "virem" donos se o sistema falhar.
      
      // --- VERIFICAÇÃO DE INSTRUTOR ---
      // Passa o email também para tentar o vínculo no primeiro acesso se necessário
      const instructor = await getInstructorProfile(sessionUser.id, sessionUser.email);
      
      if (instructor) {
        // --- É INSTRUTOR ---
        if (instructor.active === false) {
           await supabase.auth.signOut();
           return { error: 'Seu acesso foi desativado pelo estúdio.' };
        }

        console.log("Login de Instrutor Detectado. Vinculado ao Studio:", instructor.studio_user_id);

        setState({
          user: {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: instructor.name,
            password: '',
            isAdmin: false,
            isInstructor: true, 
            studioId: instructor.studio_user_id // ID do chefe para carregar dados
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return; // Encerra aqui se for instrutor
      }

      // --- VERIFICAÇÃO DE DONO ---
      const profile = await fetchProfile(sessionUser.id);
      
      // Validação extra: o perfil retornado é realmente deste usuário?
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
        // --- NEM DONO NEM INSTRUTOR (CADASTRO INCOMPLETO OU NOVO) ---
        // Isso acontece se o usuário acabou de se cadastrar na tela de registro e o perfil ainda não foi criado.
        
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
    // Check inicial de sessão ao carregar a página (F5)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUser(session.user);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Ouvinte para mudanças de estado (Logout, Expiração de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         // Opcional: poderíamos chamar loadUser aqui, mas o login manual já garante isso mais rápido
         if (session?.user && !state.user) {
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

      // CORREÇÃO CRÍTICA:
      // Aguarda o carregamento do perfil do usuário ANTES de retornar sucesso.
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
      
      // No registro também garantimos o load se houver sessão automática
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