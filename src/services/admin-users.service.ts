import { supabase } from "../lib/supabase";
import type { AdminUser } from "../types/auth.types";

type AdminUserRow = Omit<AdminUser, "zona" | "roles"> & {
  zona_nombre: string | null;
  zona_canton: string | null;
  zona_provincia: string | null;
  roles: string[] | null;
};

const isPublicRole = (rol: string): rol is AdminUser["roles"][number] =>
  rol === "dueno" || rol === "paseador" || rol === "negocio";

export const getAdminUsuarios = async (): Promise<AdminUser[]> => {
  const { data, error } = await supabase.rpc("listar_usuarios_admin");
  if (error) throw error;

  return ((data ?? []) as AdminUserRow[]).map((usuario) => ({
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
    telefono: usuario.telefono,
    foto_perfil: usuario.foto_perfil,
    fecha_registro: usuario.fecha_registro,
    activo: usuario.activo,
    roles: (usuario.roles ?? []).filter(isPublicRole),
    zona: usuario.zona_nombre
      ? {
          nombre: usuario.zona_nombre,
          canton: usuario.zona_canton ?? "",
          provincia: usuario.zona_provincia ?? "",
        }
      : null,
  }));
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
