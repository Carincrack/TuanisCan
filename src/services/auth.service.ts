import type { AuthResponse, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const login = async (email: string, password: string): Promise<AuthResponse> =>
  supabase.auth.signInWithPassword({ email, password });

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const onAuthStateChange = supabase.auth.onAuthStateChange.bind(
  supabase.auth
);