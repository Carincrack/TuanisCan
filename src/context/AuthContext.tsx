import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  getSession,
  login as loginService,
  logout,
  onAuthStateChange,
  register as registerService,
  resetPassword as resetPasswordService,
  updatePassword as updatePasswordService,
  getUserProfile,
  updateUserProfile,
} from "../services/auth.service";
import type { AuthState, ProfileUpdate, RegistrationData, User, UserProfile } from "../types/auth.types";
import type { Rol } from "../lib/nav";
import { AuthContext } from "./auth-context";

const roleFromUser = (user: User | null): Rol | null => {
  const role = user?.app_metadata?.app_role;
  return role === "dueno" || role === "paseador" || role === "negocio" || role === "admin" ? role : null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((session) => {
        if (mounted) {
          setState({
            session,
            user: session?.user ?? null,
            role: roleFromUser(session?.user ?? null),
            loading: false,
          });
        }
      })
      .catch(() => {
        if (mounted) setState((current) => ({ ...current, loading: false }));
      });

    const { data } = onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (mounted) {
        setState({
          session,
          user: session?.user ?? null,
          role: roleFromUser(session?.user ?? null),
          loading: false,
        });
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await loginService(email, password);
    if (error) throw error;
  };

  const register = async (
    email: string,
    password: string,
    profile: RegistrationData
  ) => {
    const { data, error } = await registerService(email, password, profile);
    if (error) throw error;
    return Boolean(data.session);
  };

  const resetPassword = (email: string) => resetPasswordService(email);
  const updatePassword = (password: string) => updatePasswordService(password);
  const getProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!state.user) return null;
    return getUserProfile(state.user.id, state.user.email ?? "");
  }, [state.user]);
  const updateProfile = useCallback(async (
    profile: ProfileUpdate
  ) => {
    if (!state.user) throw new Error("No hay una sesión activa");
    await updateUserProfile(state.user.id, profile);
  }, [state.user]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, getProfile, updateProfile, resetPassword, updatePassword, logout: handleLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
