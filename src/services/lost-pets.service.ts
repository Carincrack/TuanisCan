import { supabase } from "../lib/supabase";
import type { Zona } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import type { LostPetInput, LostPetReport, MatchStatus, PetMatch, Sighting, SightingInput } from "../types/lost-pet.types";

const PHOTO_BUCKET = "mascotas-perdidas";
const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type LostPetRow = Omit<LostPetReport, "fotoUrl" | "latitud" | "longitud" | "recompensa" | "zona" | "avistamientos"> & {
  latitud: string | number;
  longitud: string | number;
  recompensa: string | number | null;
  zona: Zona | null;
};

type SightingRow = Omit<Sighting, "latitud" | "longitud"> & {
  latitud: string | number;
  longitud: string | number;
};

type MatchRow = {
  id_match: string;
  id_reporte: string;
  especie: string;
  descripcion: string;
  foto: string | null;
  zona_id: string | null;
  latitud: string | number;
  longitud: string | number;
  recompensa: string | number | null;
  fecha_reporte: string;
  puntaje_coincidencia: string | number;
  estado_match: MatchStatus;
  estado_reporte: LostPetReport["estado"];
};

const photoUrl = async (path: string | null) => {
  if (!path || path.startsWith("http") || path.startsWith("/")) return path;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
};

const toReport = async (row: LostPetRow): Promise<LostPetReport> => ({
  ...row,
  latitud: Number(row.latitud),
  longitud: Number(row.longitud),
  recompensa: row.recompensa == null ? null : Number(row.recompensa),
  fotoUrl: await photoUrl(row.foto),
  avistamientos: [],
});

const toSighting = (row: SightingRow): Sighting => ({
  ...row,
  latitud: Number(row.latitud),
  longitud: Number(row.longitud),
});

export const listLostPetReports = async (filters: {
  zonaId?: string;
  provincia?: string;
  canton?: string;
  distrito?: string;
  estado?: LostPetReport["estado"];
} = {}): Promise<LostPetReport[]> => {
  const filtraTerritorio = Boolean(filters.provincia || filters.canton || filters.distrito);
  const zonaSelect = filtraTerritorio
    ? "zona:zonas!mascotas_perdidas_zona_id_fkey!inner(id_zona, nombre, canton, provincia, distrito)"
    : "zona:zonas!mascotas_perdidas_zona_id_fkey(id_zona, nombre, canton, provincia, distrito)";
  let query = supabase
    .from("mascotas_perdidas")
    .select(`
      id_mascota_perdida, id_mascota, id_usuario_reporta, zona_id, estado, nombre,
      especie, raza, contacto, descripcion, foto, latitud, longitud,
      recompensa, fecha_reporte, fecha_resuelto,
      ${zonaSelect}
    `)
    .order("fecha_reporte", { ascending: false });

  if (filters.zonaId) query = query.eq("zona_id", filters.zonaId);
  if (filters.provincia) query = query.eq("zona.provincia", filters.provincia);
  if (filters.canton) query = query.eq("zona.canton", filters.canton);
  if (filters.distrito) query = query.eq("zona.distrito", filters.distrito);
  if (filters.estado) query = query.eq("estado", filters.estado);

  const { data, error } = await query;
  if (error) throw error;
  const reports = await Promise.all(((data ?? []) as unknown as LostPetRow[]).map(toReport));
  const ids = reports.map((report) => report.id_mascota_perdida);
  if (!ids.length) return reports;

  const sightings = await listSightings(ids);
  const sightingsByReport = new Map<string, Sighting[]>();
  sightings.forEach((sighting) => {
    sightingsByReport.set(sighting.id_reporte, [
      ...(sightingsByReport.get(sighting.id_reporte) ?? []),
      sighting,
    ]);
  });

  return reports.map((report) => ({
    ...report,
    avistamientos: sightingsByReport.get(report.id_mascota_perdida) ?? [],
  }));
};

export const listSightings = async (reportIds: string[]): Promise<Sighting[]> => {
  const { data, error } = await supabase
    .from("avistamientos")
    .select(`
      id_avistamiento, id_reporte, id_usuario, latitud, longitud, comentario,
      fecha, zona_id, direccion, contacto,
      zona:zonas!avistamientos_zona_id_fkey(id_zona, nombre, canton, provincia, distrito)
    `)
    .in("id_reporte", reportIds)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as SightingRow[]).map(toSighting);
};

export const uploadLostPetPhoto = async (userId: string, file: File) => {
  const extension = PHOTO_EXTENSIONS[file.type];
  if (!extension || file.size > MAX_PHOTO_BYTES) {
    throw new Error("La imagen debe ser JPG, PNG o WebP y pesar menos de 5 MB.");
  }
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
};

export const reportLostPet = async (userId: string, values: LostPetInput, photo: File) => {
  if (values.id_mascota) {
    const activeReport = await supabase
      .from("mascotas_perdidas")
      .select("id_mascota_perdida")
      .eq("id_mascota", values.id_mascota)
      .eq("estado", "perdida")
      .maybeSingle();
    if (activeReport.error) throw activeReport.error;
    if (activeReport.data) {
      throw new Error("Esta mascota ya tiene un reporte activo como perdida.");
    }
  }

  const foto = await uploadLostPetPhoto(userId, photo);
  const { error } = await supabase.rpc("reportar_mascota_perdida", {
    p_id_mascota: values.id_mascota || null,
    p_especie: values.especie,
    p_nombre: values.nombre?.trim() || "Mascota encontrada",
    p_raza: values.raza || "Desconocida",
    p_zona_id: values.zona_id,
    p_descripcion: values.descripcion,
    p_foto: foto,
    p_latitud: values.latitud,
    p_longitud: values.longitud,
    p_contacto: values.contacto,
    p_recompensa: values.recompensa,
  });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([foto]);
    if (error.code === "23505") {
      throw new Error("Esta mascota ya tiene un reporte activo como perdida.");
    }
    throw error;
  }
};

export const registerSighting = async (values: SightingInput) => {
  const { error } = await supabase.rpc("registrar_avistamiento", {
    p_id_reporte: values.id_mascota_perdida,
    p_latitud: values.latitud,
    p_longitud: values.longitud,
    p_comentario: values.comentario,
    p_zona_id: values.zona_id,
    p_direccion: values.direccion,
    p_contacto: values.contacto,
  });
  if (error) throw error;
};

export const markLostPetFound = async (reportId: string) => {
  const { error } = await supabase.rpc("marcar_mascota_encontrada", {
    p_id_reporte: reportId,
  });
  if (error) throw error;
};

const toMatch = async (pet: Pet, row: MatchRow): Promise<PetMatch> => ({
  id_match: row.id_match,
  id_reporte: row.id_reporte,
  id_mascota: pet.id_mascota,
  mascotaNombre: pet.nombre,
  especie: row.especie,
  descripcion: row.descripcion,
  fotoUrl: await photoUrl(row.foto),
  zona_id: row.zona_id,
  latitud: Number(row.latitud),
  longitud: Number(row.longitud),
  recompensa: row.recompensa == null ? null : Number(row.recompensa),
  fecha_reporte: row.fecha_reporte,
  puntaje_coincidencia: Number(row.puntaje_coincidencia),
  estado_match: row.estado_match,
  estado_reporte: row.estado_reporte,
});

/** Las coincidencias que el sistema encontró entre reportes de
    mascotas encontradas (sin dueño identificado) y las mascotas
    registradas de quien consulta. */
export const listMyPetMatches = async (pets: Pet[]): Promise<PetMatch[]> => {
  if (!pets.length) return [];
  const porMascota = await Promise.all(
    pets.map(async (pet) => {
      const { data, error } = await supabase.rpc("obtener_matches_mascota", {
        p_id_mascota: pet.id_mascota,
      });
      if (error) throw error;
      return Promise.all(((data ?? []) as MatchRow[]).map((row) => toMatch(pet, row)));
    })
  );
  return porMascota.flat();
};

export const resolveMatch = async (idMatch: string, estado: "confirmado" | "descartado") => {
  const { error } = await supabase.rpc("resolver_match", {
    p_id_match: idMatch,
    p_estado: estado,
  });
  if (error) throw error;
};
