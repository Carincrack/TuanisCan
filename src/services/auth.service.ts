import type { AuthResponse, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type {
  NegocioProfile,
  PaseadorProfile,
  ProfileUpdate,
  RegistrationData,
  UserProfile,
  Zona,
} from "../types/auth.types";

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

export const getZonas = async (): Promise<Zona[]> => {
  const { data, error } = await supabase
    .from("zonas")
    .select("id_zona, nombre, canton, provincia")
    .order("provincia")
    .order("canton")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as Zona[];
};

export const getUserProfile = async (
  userId: string,
  email = ""
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id_usuario, nombre, telefono, foto_perfil, zona_id, tipo_usuario, fecha_registro, activo")
    .eq("id_usuario", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [zonaResult, paseadorResult, negocioResult] = await Promise.all([
    data.zona_id
      ? supabase.from("zonas").select("id_zona, nombre, canton, provincia").eq("id_zona", data.zona_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data.tipo_usuario === "paseador"
      ? supabase.from("paseadores").select("descripcion, tarifa_base, calificacion_promedio, estado_verificacion, disponible, documentos_verificacion").eq("id_usuario", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data.tipo_usuario === "negocio"
      ? supabase.from("negocios").select("id_negocio, zona_id, nombre, tipo, direccion, latitud, longitud, telefono, horario, destacado").eq("id_propietario", userId).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const relatedError = zonaResult.error || paseadorResult.error || negocioResult.error;
  if (relatedError) throw relatedError;

  return {
    ...data,
    email,
    zona: zonaResult.data as Zona | null,
    paseador: paseadorResult.data as PaseadorProfile | null,
    negocio: negocioResult.data as NegocioProfile | null,
  } as UserProfile;
};

export const updateUserProfile = async (
  userId: string,
  profile: ProfileUpdate
) => {
  const { paseador, negocio, ...usuario } = profile;
  const updates = [
    supabase.from("usuarios").update(usuario).eq("id_usuario", userId),
  ];
  if (paseador) updates.push(supabase.from("paseadores").update(paseador).eq("id_usuario", userId));
  if (negocio) updates.push(supabase.from("negocios").update(negocio).eq("id_propietario", userId));

  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;
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
