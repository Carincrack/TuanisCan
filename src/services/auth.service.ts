import type { AuthResponse, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { RegistrationData, UserProfile } from "../types/auth.types";

export const login = async (email: string, password: string): Promise<AuthResponse> =>
  supabase.auth.signInWithPassword({ email, password });

export const register = async (
  email: string,
  password: string,
  profile: RegistrationData
): Promise<AuthResponse> =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      data: profile,
    },
  });

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/actualizar-contrasena`,
  });
  if (error) throw error;
};

export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id_usuario, nombre, telefono, foto_perfil, zona_id, tipo_usuario")
    .eq("id_usuario", userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
};

export const updateUserProfile = async (
  userId: string,
  profile: Pick<UserProfile, "nombre" | "telefono" | "foto_perfil" | "zona_id">
) => {
  const { error } = await supabase
    .from("usuarios")
    .update(profile)
    .eq("id_usuario", userId);
  if (error) throw error;
};

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