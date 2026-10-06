import { supabase } from "../lib/supabase";
import type { Walk } from "../types/walk.types";

const MASCOTA_BUCKET = "mascotas";
const PERFIL_BUCKET = "perfiles";

type WalkRow = Omit<Walk, "precio" | "precio_tarifa"> & {
  precio: string | number;
  precio_tarifa: string | number;
};

const photoUrl = async (bucket: string, path: string | null) => {
  if (!path || path.startsWith("http") || path.startsWith("/")) return path;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
};

const formatWalk = async (row: WalkRow) => {
  return { ...row, precio: Number(row.precio), precio_tarifa: Number(row.precio_tarifa) } as Walk;
};

export const listWalksForOwner = async (userId: string): Promise<Walk[]> => {
  const { data, error } = await supabase
    .from("paseos")
    .select("*")
    .eq("id_dueno", userId)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false });

  if (error) throw error;
  return Promise.all(((data ?? []) as WalkRow[]).map(formatWalk));
};

export const listWalksForPet = async (petId: string): Promise<Walk[]> => {
  const { data, error } = await supabase
    .from("paseos")
    .select("*")
    .eq("id_mascota", petId)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false });

  if (error) throw error;
  return Promise.all(((data ?? []) as WalkRow[]).map(formatWalk));
};

export interface WalkWithRelations extends Walk {
  mascota: {
    id_mascota: string;
    nombre: string;
    foto: string | null;
    fotoUrl: string | null;
  } | null;
  paseador: {
    id_usuario: string;
    nombre: string | null;
    foto: string | null;
    fotoUrl: string | null;
  } | null;
  zona: {
    id_zona: string;
    nombre: string;
    canton: string;
    provincia: string;
    distrito: string | null;
  } | null;
}

interface RawWalk {
  id_paseo: string;
  id_mascota: string;
  id_dueno: string;
  id_paseador: string | null;
  zona_id: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  duracion_min: number;
  estado: string;
  precio: string | number;
  precio_tarifa: string | number;
  direccion_encuentro: string;
}

interface MascotaRow {
  id_mascota: string;
  nombre: string;
  foto: string | null;
}

interface PaseadorRow {
  id_usuario: string;
}

interface ZonaRow {
  id_zona: string;
  nombre: string;
  canton: string;
  provincia: string;
  distrito: string | null;
}

interface PerfilRow {
  id_usuario: string;
  nombre: string | null;
  foto_perfil: string | null;
}

/** Lo que el directorio público dice de cada paseador. */
interface PaseadorPublicoRow {
  id_usuario: string;
  nombre: string | null;
  foto_perfil: string | null;
}

export interface ListWalksFilters {
  zonaId?: string | null;
  estado?: string | null;
}

export const listWalksWithRelations = async (
  userId: string,
  filters?: ListWalksFilters
): Promise<WalkWithRelations[]> => {
  let query = supabase
    .from("paseos")
    .select("*")
    .eq("id_dueno", userId)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false });

  if (filters?.zonaId) {
    query = query.eq("zona_id", filters.zonaId);
  }

  if (filters?.estado) {
    query = query.eq("estado", filters.estado);
  }

  /* El nombre y la foto del paseador. `perfil_usuario` solo deja leer
     la fila propia —y todas al admin—, así que para el dueño cualquier
     otro paseador llegaba sin nombre: «Sin nombre» en cada fila. El
     directorio público (`buscar_paseadores`) sí los da, que es de
     donde el dueño los conoció al agendar. Se piden todos, no solo los
     disponibles: el que hoy no está disponible igual paseó ayer. */
  const [
    walksResult,
    mascotasResult,
    paseadoresResult,
    zonasResult,
    directorioResult,
  ] = await Promise.all([
    query,
    supabase.from("mascotas").select("id_mascota, nombre, foto"),
    supabase.from("paseadores").select("id_usuario"),
    supabase.from("zonas").select("id_zona, nombre, canton, provincia, distrito"),
    supabase.rpc("buscar_paseadores", {
      p_zona_id: null,
      p_solo_disponibles: false,
      p_calificacion_min: null,
    }),
  ]);

  if (walksResult.error) throw walksResult.error;

  const mascotasMap = new Map<string, MascotaRow>();
  (mascotasResult.data ?? []).forEach((m: MascotaRow) => mascotasMap.set(m.id_mascota, m));

  const paseadoresMap = new Map<string, PaseadorRow>();
  (paseadoresResult.data ?? []).forEach((p: PaseadorRow) => paseadoresMap.set(p.id_usuario, p));

  const zonasMap = new Map<string, ZonaRow>();
  (zonasResult.data ?? []).forEach((z: ZonaRow) => zonasMap.set(z.id_zona, z));

  const directorioMap = new Map<string, PaseadorPublicoRow>();
  ((directorioResult.data ?? []) as PaseadorPublicoRow[]).forEach((p) => directorioMap.set(p.id_usuario, p));

  /* Una firma por foto, no una por fila: la misma mascota en veinte
     paseos pedía veinte URLs firmadas de la misma imagen. */
  const firmas = new Map<string, Promise<string | null>>();
  const firmar = (bucket: string, path: string | null) => {
    if (!path) return Promise.resolve(null);
    const clave = `${bucket}/${path}`;
    if (!firmas.has(clave)) firmas.set(clave, photoUrl(bucket, path));
    return firmas.get(clave)!;
  };

  const paseadorIds = [...paseadoresMap.keys()];
  const perfilUsuarioMap = new Map<string, PerfilRow>();

  if (paseadorIds.length > 0) {
    const { data: perfiles } = await supabase
      .from("perfil_usuario")
      .select("id_usuario, nombre, foto_perfil")
      .in("id_usuario", paseadorIds);
    (perfiles ?? []).forEach((p: PerfilRow) => {
      perfilUsuarioMap.set(p.id_usuario, p);
    });
  }

  const rows = walksResult.data as RawWalk[];

  return Promise.all(
    rows.map(async (row) => {
      const precio = typeof row.precio === "string" ? parseFloat(row.precio) : row.precio;

      const mascota = mascotasMap.get(row.id_mascota);
      const paseadorRaw = row.id_paseador ? paseadoresMap.get(row.id_paseador) : null;
      const perfil = row.id_paseador ? perfilUsuarioMap.get(row.id_paseador) : null;
      const publico = row.id_paseador ? directorioMap.get(row.id_paseador) : null;
      const fotoPaseador = perfil?.foto_perfil ?? publico?.foto_perfil ?? null;

      return {
        id_paseo: row.id_paseo,
        id_mascota: row.id_mascota,
        id_dueno: row.id_dueno,
        id_paseador: row.id_paseador,
        zona_id: row.zona_id,
        fecha: row.fecha,
        hora_inicio: row.hora_inicio,
        hora_fin: row.hora_fin,
        duracion_min: row.duracion_min,
        estado: row.estado as Walk["estado"],
        precio,
        precio_tarifa: Number(row.precio_tarifa),
        direccion_encuentro: row.direccion_encuentro,
        mascota: mascota
          ? {
              id_mascota: mascota.id_mascota,
              nombre: mascota.nombre,
              foto: mascota.foto,
              fotoUrl: await firmar(MASCOTA_BUCKET, mascota.foto),
            }
          : null,
        paseador: paseadorRaw
          ? {
              id_usuario: paseadorRaw.id_usuario,
              nombre: perfil?.nombre ?? publico?.nombre ?? null,
              foto: fotoPaseador,
              fotoUrl: await firmar(PERFIL_BUCKET, fotoPaseador),
            }
          : null,
        zona: row.zona_id ? zonasMap.get(row.zona_id) ?? null : null,
      };
    })
  );
};

export const listWalksByPet = async (
  userId: string,
  filters?: ListWalksFilters
): Promise<Record<string, WalkWithRelations[]>> => {
  const walks = await listWalksWithRelations(userId, filters);
  const byPet: Record<string, WalkWithRelations[]> = {};
  for (const walk of walks) {
    const petId = walk.id_mascota;
    if (!byPet[petId]) byPet[petId] = [];
    byPet[petId].push(walk);
  }
  return byPet;
};

/** Solo mientras el paseador no la haya respondido. */
export const cancelWalkRequest = async (id_paseo: string) => {
  const { error } = await supabase.rpc("cancelar_solicitud_paseo", {
    p_id_paseo: id_paseo,
  });
  if (error) throw error;
};

export type EstadoPaseo = "solicitado" | "confirmado" | "en_curso" | "finalizado" | "cancelado";

export interface AdminWalkMovement {
  id_paseo: string;
  mascota: string;
  dueno: string;
  paseador: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  estado: EstadoPaseo;
  precio: number;
}

export const listAdminWalks = async (): Promise<AdminWalkMovement[]> => {
  const { data, error } = await supabase.rpc("listar_paseos_admin");
  if (error) throw error;

  return ((data ?? []) as Array<Omit<AdminWalkMovement, "precio"> & { precio: number | string }>).map((walk) => ({
    ...walk,
    precio: Number(walk.precio),
  }));
};

/** Lo mínimo para ubicar un paseo en el tiempo. Los campos de fecha
    son opcionales para que lo use quien solo tiene el estado. */
interface PaseoEnElTiempo {
  estado: string;
  fecha?: string;
  hora_inicio?: string;
  duracion_min?: number;
}

/** Cuándo debía terminar: inicio más duración. */
export const finPrevisto = (walk: Required<Pick<PaseoEnElTiempo, "fecha" | "hora_inicio" | "duracion_min">>) => {
  const inicio = new Date(`${walk.fecha}T${walk.hora_inicio.slice(0, 5)}:00`);
  return new Date(inicio.getTime() + walk.duracion_min * 60_000);
};

/** Pasó la hora en que debía terminar y nunca arrancó: una solicitud
    que nadie respondió o un paseo confirmado que no se inició. La base
    no lo marca —el estado se queda donde quedó—, así que sin esto un
    paseo de hace un mes seguía saliendo como «próximo». */
export const isOverdue = (walk: PaseoEnElTiempo): boolean => {
  if (walk.estado !== "solicitado" && walk.estado !== "confirmado") return false;
  if (!walk.fecha || !walk.hora_inicio || walk.duracion_min === undefined) return false;
  return finPrevisto({ fecha: walk.fecha, hora_inicio: walk.hora_inicio, duracion_min: walk.duracion_min }) < new Date();
};

export const isUpcoming = (walk: PaseoEnElTiempo): boolean => {
  const status = walk.estado;
  if (status === "en_curso") return true;
  return (status === "solicitado" || status === "confirmado") && !isOverdue(walk);
};

export const isPast = (walk: { estado: string }): boolean => {
  return walk.estado === "finalizado" || walk.estado === "cancelado";
};

export const getWalkStats = (walks: (PaseoEnElTiempo & { precio: number })[]) => {
  const total = walks.length;
  const completed = walks.filter((w) => w.estado === "finalizado").length;
  const upcoming = walks.filter((w) => isUpcoming(w)).length;
  const totalSpent = walks
    .filter((w) => w.estado === "finalizado")
    .reduce((sum, w) => sum + w.precio, 0);
  return { total, completed, upcoming, totalSpent };
};
