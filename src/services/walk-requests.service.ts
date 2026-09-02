import { supabase } from "../lib/supabase";

const PHOTO_BUCKET = "mascotas";

export interface WalkerRequest {
  id_paseo: string;
  id_dueno: string;
  dueno: string;
  dueno_foto: string | null;
  id_mascota: string;
  mascota: string;
  raza: string;
  especie: string;
  foto: string | null;
  fotoUrl: string | null;
  zona: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  direccion_encuentro: string;
  precio: number;
  estado: "solicitado" | "confirmado" | "en_curso" | "finalizado" | "cancelado";
  comentario_respuesta: string | null;
}

type WalkerRequestRow = Omit<WalkerRequest, "precio" | "fotoUrl"> & {
  precio: number | string;
};

const photoUrl = async (path: string | null) => {
  if (!path || path.startsWith("http") || path.startsWith("/")) return path;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
};

export const listWalkerRequests = async (): Promise<WalkerRequest[]> => {
  const { data, error } = await supabase.rpc("listar_solicitudes_paseador");
  if (error) throw error;

  return Promise.all(
    ((data ?? []) as WalkerRequestRow[]).map(async (request) => ({
      ...request,
      precio: Number(request.precio),
      fotoUrl: await photoUrl(request.foto),
    })),
  );
};

export const respondWalkRequest = async (
  id_paseo: string,
  aprobada: boolean,
  comentario: string,
) => {
  const { error } = await supabase.rpc("responder_solicitud_paseo", {
    p_id_paseo: id_paseo,
    p_aprobada: aprobada,
    p_comentario: comentario.trim() || null,
  });
  if (error) throw error;
};
