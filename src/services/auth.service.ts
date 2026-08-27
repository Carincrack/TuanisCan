import type { AuthResponse, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type {
  NegocioProfile,
  PaseadorProfile,
  DocumentoPaseador,
  ProfileUpdate,
  RegistrationData,
  SessionProfile,
  UserProfile,
  Zona,
  ZonaInput,
  AdminUser,
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

export const getAdminUsuarios = async (): Promise<AdminUser[]> => {
  const [usuariosResult, rolesResult] = await Promise.all([
    supabase
    .from("usuarios")
    .select("id_usuario, nombre, telefono, foto_perfil, fecha_registro, activo, zona:zonas(nombre, canton, provincia)")
    .order("fecha_registro", { ascending: false }),
    supabase
      .from("usuario_roles")
      .select("id_usuario, rol:roles(nombre)"),
  ]);

  if (usuariosResult.error) throw usuariosResult.error;
  if (rolesResult.error) throw rolesResult.error;

  type UsuarioRolRow = {
    id_usuario: string;
    rol: { nombre: string } | { nombre: string }[] | null;
  };
  const rolesPorUsuario = new Map<string, AdminUser["roles"]>();
  for (const item of (rolesResult.data ?? []) as UsuarioRolRow[]) {
    const rol = Array.isArray(item.rol) ? item.rol[0]?.nombre : item.rol?.nombre;
    if (rol !== "dueno" && rol !== "paseador" && rol !== "negocio") continue;
    rolesPorUsuario.set(item.id_usuario, [...(rolesPorUsuario.get(item.id_usuario) ?? []), rol]);
  }

  return (usuariosResult.data ?? []).map((usuario) => {
    const roles = rolesPorUsuario.get(usuario.id_usuario) ?? [];
    return {
      ...usuario,
      roles,
      zona: Array.isArray(usuario.zona) ? usuario.zona[0] ?? null : usuario.zona,
    };
  }) as AdminUser[];
};

export const getNegocios = async (): Promise<NegocioProfile[]> => {
  const { data, error } = await supabase
    .from("negocios")
    .select("id_negocio, zona_id, nombre, tipo, direccion, latitud, longitud, telefono, horario, destacado")
    .order("destacado", { ascending: false })
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((negocio) => ({
    ...negocio,
    latitud: negocio.latitud === null ? null : Number(negocio.latitud),
    longitud: negocio.longitud === null ? null : Number(negocio.longitud),
  })) as NegocioProfile[];
};

export const createZona = async (zona: ZonaInput): Promise<Zona> => {
  const { data, error } = await supabase
    .from("zonas")
    .insert(zona)
    .select("id_zona, nombre, canton, provincia")
    .single();
  if (error) throw error;
  return data as Zona;
};

export const deleteZona = async (zoneId: string) => {
  const { error } = await supabase.from("zonas").delete().eq("id_zona", zoneId);
  if (error) throw error;
};

export const getUserProfile = async (
  userId: string,
  email = ""
): Promise<UserProfile | null> => {
  const { data, error } = await supabase.rpc("obtener_mi_perfil");
  if (error) throw error;
  const sessionProfile = data as SessionProfile | null;
  const usuario = sessionProfile?.usuario;
  if (!usuario) return null;
  const roles = sessionProfile?.roles ?? [];
  const isAdmin = Boolean(sessionProfile?.is_admin);

  const [zonaResult, paseadorResult, documentosResult, negocioResult] = await Promise.all([
    usuario.zona_id
      ? supabase.from("zonas").select("id_zona, nombre, canton, provincia").eq("id_zona", usuario.zona_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("paseadores").select("descripcion, tarifa_base, calificacion_promedio, estado_verificacion, disponible").eq("id_usuario", userId).maybeSingle(),
    roles.includes("paseador")
      ? supabase.from("documentos_paseador").select("id_documento, ruta_storage, fecha_subida").eq("id_usuario", userId).order("fecha_subida", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    roles.includes("negocio")
      ? supabase.from("negocios").select("id_negocio, zona_id, nombre, tipo, direccion, latitud, longitud, telefono, horario, destacado").eq("id_propietario", userId).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const relatedError = zonaResult.error || paseadorResult.error || documentosResult.error || negocioResult.error;
  if (relatedError) throw relatedError;

  return {
    ...usuario,
    email,
    roles,
    isAdmin,
    zona: zonaResult.data as Zona | null,
    paseador: paseadorResult.data
      ? {
          ...paseadorResult.data,
          documentos: (documentosResult.data ?? []) as DocumentoPaseador[],
        } as PaseadorProfile
      : null,
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

const PROFILE_PHOTOS_BUCKET = "perfiles";

export const uploadProfilePhoto = async (userId: string, file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from(PROFILE_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
};

export const deleteProfilePhoto = async (url: string | null) => {
  if (!url) return;
  const marker = `/storage/v1/object/public/${PROFILE_PHOTOS_BUCKET}/`;
  const path = url.includes(marker) ? decodeURIComponent(url.split(marker)[1] ?? "") : "";
  if (path) await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
};

export const addRoleToMyAccount = async (role: "dueno" | "paseador" | "negocio") => {
  const { error } = await supabase.rpc("agregar_rol_a_mi_cuenta", {
    p_rol: role,
  });
  if (error) throw error;
};

export const requestWalkerProfile = async (
  profile: Pick<PaseadorProfile, "descripcion" | "tarifa_base" | "disponible">
) => {
  const { error } = await supabase.rpc("solicitar_perfil_paseador", {
    p_descripcion: profile.descripcion,
    p_tarifa_base: profile.tarifa_base,
    p_disponible: profile.disponible,
  });
  if (error) throw error;
};

export const createBusinessProfile = async (
  negocio: Pick<
    NegocioProfile,
    "zona_id" | "nombre" | "tipo" | "direccion" | "latitud" | "longitud" | "telefono" | "horario"
  >
) => {
  const { error } = await supabase.rpc("activar_perfil_negocio", {
    p_nombre: negocio.nombre,
    p_tipo: negocio.tipo,
    p_zona_id: negocio.zona_id,
    p_direccion: negocio.direccion,
    p_latitud: negocio.latitud,
    p_longitud: negocio.longitud,
    p_telefono: negocio.telefono,
    p_horario: negocio.horario,
  });
  if (error) throw error;
};

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export const refreshAuthSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
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
