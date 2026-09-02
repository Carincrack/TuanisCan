import { supabase } from "../lib/supabase";
import type { Walk } from "../types/walk.types";

const MASCOTA_BUCKET = "mascotas";
const PERFIL_BUCKET = "perfiles";

type WalkRow = Omit<Walk, "precio"> & {
  precio: string | number;
};

const photoUrl = async (bucket: string, path: string | null) => {
  if (!path || path.startsWith("http") || path.startsWith("/")) return path;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
};

const formatWalk = async (row: WalkRow) => {
  const precio = typeof row.precio === "string" ? parseFloat(row.precio) : row.precio;
  return { ...row, precio } as Walk;
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

  const [
    walksResult,
    mascotasResult,
    paseadoresResult,
    zonasResult,
  ] = await Promise.all([
    query,
    supabase.from("mascotas").select("id_mascota, nombre, foto"),
    supabase.from("paseadores").select("id_usuario"),
    supabase.from("zonas").select("id_zona, nombre, canton, provincia, distrito"),
  ]);

  if (walksResult.error) throw walksResult.error;

  const mascotasMap = new Map<string, MascotaRow>();
  (mascotasResult.data ?? []).forEach((m: MascotaRow) => mascotasMap.set(m.id_mascota, m));

  const paseadoresMap = new Map<string, PaseadorRow>();
  (paseadoresResult.data ?? []).forEach((p: PaseadorRow) => paseadoresMap.set(p.id_usuario, p));

  const zonasMap = new Map<string, ZonaRow>();
  (zonasResult.data ?? []).forEach((z: ZonaRow) => zonasMap.set(z.id_zona, z));

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
        direccion_encuentro: row.direccion_encuentro,
        mascota: mascota
          ? {
              id_mascota: mascota.id_mascota,
              nombre: mascota.nombre,
              foto: mascota.foto,
              fotoUrl: await photoUrl(MASCOTA_BUCKET, mascota.foto),
            }
          : null,
        paseador: paseadorRaw
          ? {
              id_usuario: paseadorRaw.id_usuario,
              nombre: perfil?.nombre ?? null,
              foto: perfil?.foto_perfil ?? null,
              fotoUrl: await photoUrl(PERFIL_BUCKET, perfil?.foto_perfil ?? null),
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

export const isUpcoming = (walk: { estado: string }): boolean => {
  const status = walk.estado;
  return status === "solicitado" || status === "confirmado" || status === "en_curso";
};

export const isPast = (walk: { estado: string }): boolean => {
  return walk.estado === "finalizado" || walk.estado === "cancelado";
};

export const getWalkStats = (walks: { estado: string; precio: number }[]) => {
  const total = walks.length;
  const completed = walks.filter((w) => w.estado === "finalizado").length;
  const upcoming = walks.filter((w) => isUpcoming(w)).length;
  const totalSpent = walks
    .filter((w) => w.estado === "finalizado")
    .reduce((sum, w) => sum + w.precio, 0);
  return { total, completed, upcoming, totalSpent };
};
