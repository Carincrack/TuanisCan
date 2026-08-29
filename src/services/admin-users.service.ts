import { supabase } from "../lib/supabase";
import type { AdminUser } from "../types/auth.types";

type UsuarioRolRow = {
  id_usuario: string;
  rol: { nombre: string } | { nombre: string }[] | null;
};

const isPublicRole = (rol: string): rol is AdminUser["roles"][number] =>
  rol === "dueno" || rol === "paseador" || rol === "negocio";

export const getAdminUsuarios = async (): Promise<AdminUser[]> => {
  const [usuariosResult, rolesResult] = await Promise.all([
    supabase
      .from("usuarios")
      .select(
        "id_usuario, nombre, correo, telefono, foto_perfil, fecha_registro, activo, zona:zonas(nombre, canton, provincia)"
      )
      .order("fecha_registro", { ascending: false }),
    supabase.from("usuario_rol").select("id_usuario, rol:rol(nombre)"),
  ]);

  if (usuariosResult.error) throw usuariosResult.error;
  if (rolesResult.error) throw rolesResult.error;

  const rolesPorUsuario = new Map<string, AdminUser["roles"]>();
  for (const item of (rolesResult.data ?? []) as UsuarioRolRow[]) {
    const rol = Array.isArray(item.rol) ? item.rol[0]?.nombre : item.rol?.nombre;
    if (!rol || !isPublicRole(rol)) continue;
    rolesPorUsuario.set(item.id_usuario, [
      ...(rolesPorUsuario.get(item.id_usuario) ?? []),
      rol,
    ]);
  }

  return (usuariosResult.data ?? []).map((usuario) => ({
    ...usuario,
    roles: rolesPorUsuario.get(usuario.id_usuario) ?? [],
    zona: Array.isArray(usuario.zona) ? usuario.zona[0] ?? null : usuario.zona,
  })) as AdminUser[];
};

const cambiarEstadoUsuario = async (idUsuario: string, activo: boolean) => {
  const { error } = await supabase.rpc("cambiar_estado_usuario", {
    p_id_usuario: idUsuario,
    p_activo: activo,
  });
  if (error) throw error;
};

export const activarUsuario = (idUsuario: string) =>
  cambiarEstadoUsuario(idUsuario, true);

export const inactivarUsuario = (idUsuario: string) =>
  cambiarEstadoUsuario(idUsuario, false);
