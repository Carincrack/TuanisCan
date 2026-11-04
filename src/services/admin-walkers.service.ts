import { supabase } from "../lib/supabase";
import type { AdminUser, AdminWalker } from "../types/auth.types";
import { getAdminUsuarios } from "./admin-users.service";
import { normalizarRecargos, type RecargosPaseador, type RecargosPaseadorRow } from "../lib/precios";

type AdminWalkerRow = Omit<AdminWalker, "paseos" | "rating" | "generado"> & {
  paseos: number | string;
  rating: number | string;
  generado: number | string;
};

const isWalkerStatus = (estado: string): estado is AdminWalker["estado"] =>
  estado === "activo" || estado === "inactivo" || estado === "suspendido";

export const listarPaseadoresAdmin = async (): Promise<AdminWalker[]> => {
  const { data, error } = await supabase.rpc("listar_paseadores_admin");
  if (error) throw error;

  return ((data ?? []) as AdminWalkerRow[]).map((walker) => ({
    ...walker,
    paseos: Number(walker.paseos),
    rating: Number(walker.rating),
    generado: Number(walker.generado),
    estado: isWalkerStatus(walker.estado) ? walker.estado : "inactivo",
  }));
};

/* ── La ficha completa ──
   `listar_paseadores_admin` solo trae lo que cabe en una fila: nombre,
   zona, paseos, calificación, lo generado y el estado. Para conocer al
   paseador —cómo contactarlo, qué cobra, qué dice de sí mismo— hacen
   falta otras tres fuentes que el admin ya puede leer:

   · `listar_usuarios_admin`: correo, teléfono, fecha de registro y la
     zona con cantón y provincia (la misma que usa Usuarios).
   · la tabla `paseadores`: descripción, tarifa, disponibilidad,
     recargos y el estado de su verificación.
   · `buscar_paseadores`: cuántas reseñas tiene cada uno. Las reseñas
     una por una no se pueden leer desde el admin; el conteo sí.

   Se piden juntas y se cruzan por `id_usuario`. Si alguna de las tres
   falla, la lista sale igual con lo que haya: la ficha muestra «sin
   dato» donde falte, en vez de dejar la pantalla vacía. */

export interface FichaPaseador {
  correo: string | null;
  telefono: string | null;
  fecha_registro: string | null;
  zona: AdminUser["zona"];
  descripcion: string | null;
  /** Lo que cobra por un paseo de 45 minutos, sin recargos. */
  tarifa_base: number | null;
  disponible: boolean | null;
  estado_verificacion: string | null;
  recargos: RecargosPaseador | null;
  total_resenas: number | null;
}

export type AdminWalkerConFicha = AdminWalker & { ficha: FichaPaseador };

type PerfilPaseadorRow = RecargosPaseadorRow & {
  id_usuario: string;
  descripcion: string | null;
  tarifa_base: number | string | null;
  disponible: boolean | null;
  estado_verificacion: string | null;
};

type DirectorioRow = { id_usuario: string; total_resenas: number | string };

export const listarPaseadoresAdminConFicha = async (): Promise<AdminWalkerConFicha[]> => {
  const [base, usuarios, perfiles, directorio] = await Promise.all([
    listarPaseadoresAdmin(),
    getAdminUsuarios().catch(() => [] as AdminUser[]),
    supabase
      .from("paseadores")
      .select(
        "id_usuario, descripcion, tarifa_base, disponible, estado_verificacion, recargo_nocturno, recargo_fin_semana, recargo_mismo_dia, nocturno_desde, nocturno_hasta",
      )
      .then(({ data }) => (data ?? []) as PerfilPaseadorRow[]),
    supabase
      .rpc("buscar_paseadores", { p_zona_id: null, p_solo_disponibles: false, p_calificacion_min: null })
      .then(({ data }) => (data ?? []) as DirectorioRow[]),
  ]);

  const usuarioDe = new Map(usuarios.map((u) => [u.id_usuario, u]));
  const perfilDe = new Map(perfiles.map((p) => [p.id_usuario, p]));
  const resenasDe = new Map(directorio.map((d) => [d.id_usuario, Number(d.total_resenas)]));

  return base.map((paseador) => {
    const usuario = usuarioDe.get(paseador.id_usuario);
    const perfil = perfilDe.get(paseador.id_usuario);
    return {
      ...paseador,
      ficha: {
        correo: usuario?.correo ?? null,
        telefono: usuario?.telefono ?? null,
        fecha_registro: usuario?.fecha_registro ?? null,
        zona: usuario?.zona ?? null,
        descripcion: perfil?.descripcion?.trim() || null,
        tarifa_base: perfil?.tarifa_base == null ? null : Number(perfil.tarifa_base),
        disponible: perfil?.disponible ?? null,
        estado_verificacion: perfil?.estado_verificacion ?? null,
        recargos: perfil ? normalizarRecargos(perfil) : null,
        total_resenas: resenasDe.get(paseador.id_usuario) ?? null,
      },
    };
  });
};
