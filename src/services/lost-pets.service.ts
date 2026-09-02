import { supabase } from "../lib/supabase";
import type { Zona } from "../types/auth.types";
import type { LostPetInput, LostPetReport, Sighting, SightingInput } from "../types/lost-pet.types";

const PHOTO_BUCKET = "mascotas-perdidas";

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

export const listLostPetReports = async (): Promise<LostPetReport[]> => {
  const { data, error } = await supabase
    .from("mascotas_perdidas")
    .select(`
      id_mascota_perdida, id_mascota, id_usuario_reporta, zona_id, estado, nombre,
      especie, raza, contacto, descripcion, foto, latitud, longitud,
      recompensa, fecha_reporte, fecha_resuelto,
      zona:zonas!mascotas_perdidas_zona_id_fkey(id_zona, nombre, canton, provincia, distrito)
    `)
    .order("fecha_reporte", { ascending: false });

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
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
};

export const reportLostPet = async (userId: string, values: LostPetInput, photo: File) => {
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

  const foto = await uploadLostPetPhoto(userId, photo);
  const { error } = await supabase.from("mascotas_perdidas").insert({
    id_mascota: values.id_mascota,
    id_usuario_reporta: userId,
    zona_id: values.zona_id,
    especie: values.especie,
    nombre: values.nombre,
    raza: values.raza || "Desconocida",
    contacto: values.contacto,
    descripcion: values.descripcion,
    foto,
    latitud: values.latitud,
    longitud: values.longitud,
    recompensa: values.recompensa,
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
