import { supabase } from "../lib/supabase";
import type { Zona } from "../types/auth.types";
import type { LostPetInput, LostPetReport, SightingInput } from "../types/lost-pet.types";

const PHOTO_BUCKET = "mascotas-perdidas";

type LostPetRow = Omit<LostPetReport, "fotoUrl" | "latitud" | "longitud" | "recompensa" | "zona"> & {
  latitud: string | number;
  longitud: string | number;
  recompensa: string | number | null;
  zona: Zona | null;
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
});

export const listLostPetReports = async (): Promise<LostPetReport[]> => {
  const { data, error } = await supabase
    .from("mascotas_perdidas")
    .select(`
      id_mascota_perdida, id_mascota, id_usuario_reporta, zona_id, estado, nombre,
      especie, raza, contacto, descripcion, foto, latitud, longitud,
      recompensa, fecha_reporte, fecha_resuelto,
      zona:zonas!mascotas_perdidas_zona_id_fkey(id_zona, nombre, canton, provincia)
    `)
    .order("fecha_reporte", { ascending: false });

  if (error) throw error;
  return Promise.all(((data ?? []) as unknown as LostPetRow[]).map(toReport));
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
  const foto = await uploadLostPetPhoto(userId, photo);
  const { error } = await supabase.rpc("reportar_mascota_perdida", {
    p_id_mascota: values.id_mascota,
    p_especie: values.especie,
    p_zona_id: values.zona_id,
    p_descripcion: values.descripcion,
    p_foto: foto,
    p_latitud: values.latitud,
    p_longitud: values.longitud,
    p_recompensa: values.recompensa,
    p_nombre: values.nombre,
    p_raza: values.raza,
    p_contacto: values.contacto,
  });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([foto]);
    throw error;
  }
};

export const registerSighting = async (values: SightingInput) => {
  const { error } = await supabase.rpc("registrar_avistamiento", {
    p_id_reporte: values.id_mascota_perdida,
    p_latitud: values.latitud,
    p_longitud: values.longitud,
    p_comentario: values.comentario,
  });
  if (error) throw error;
};

export const markLostPetFound = async (reportId: string) => {
  const { error } = await supabase.rpc("marcar_mascota_encontrada", {
    p_id_reporte: reportId,
  });
  if (error) throw error;
};
