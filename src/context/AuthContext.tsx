import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSession, login as loginService, logout, onAuthStateChange } from "../services/auth.service";
import type { AuthState, User } from "../types/auth.types";
import type { Rol } from "../lib/nav";
import { AuthContext } from "./auth-context";

const roleFromUser = (user: User | null): Rol | null => {
  const role = user?.app_metadata?.app_role;
  return role === "dueno" || role === "paseador" || role === "admin" ? role : null;
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

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};