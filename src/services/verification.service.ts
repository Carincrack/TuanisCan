import { supabase } from "../lib/supabase";
import type {
  AdminVerificationRequest,
  VerificationDocument,
  VerificationDocumentType,
} from "../types/auth.types";

const BUCKET = "usuarios-verificacion";

const throwVerificationError = (error: { code?: string; message?: string }) => {
  if (error.code === "42P01" || error.code === "PGRST205" || /bucket not found/i.test(error.message ?? "")) {
    throw new Error("Falta aplicar la migración de verificación en Supabase antes de cargar documentos.");
  }
  throw new Error(error.message || "No se pudo completar la operación de verificación.");
};

export const uploadVerificationDocument = async (
  userId: string,
  type: VerificationDocumentType,
  file: File,
) => {
  const previous = await supabase
    .from("documentos_verificacion_usuario")
    .select("ruta_storage")
    .eq("id_usuario", userId)
    .eq("tipo_documento", type)
    .maybeSingle();
  if (previous.error) throwVerificationError(previous.error);

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${type}-${crypto.randomUUID()}.${extension}`;
  const uploaded = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throwVerificationError(uploaded.error);

  const saved = await supabase
    .from("documentos_verificacion_usuario")
    .upsert(
      {
        id_usuario: userId,
        tipo_documento: type,
        nombre_archivo: file.name,
        ruta_storage: path,
        fecha_subida: new Date().toISOString(),
      },
      { onConflict: "id_usuario,tipo_documento" },
    );

  if (saved.error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throwVerificationError(saved.error);
  }

  if (previous.data?.ruta_storage) {
    await supabase.storage.from(BUCKET).remove([previous.data.ruta_storage]);
  }
};

export const submitVerificationRequest = async () => {
  const { error } = await supabase.rpc("enviar_solicitud_verificacion");
  if (error) throwVerificationError(error);
};

export const listVerificationRequests = async (): Promise<AdminVerificationRequest[]> => {
  const { data, error } = await supabase.rpc("listar_verificaciones_admin");
  if (error) throw error;
  return (data ?? []) as AdminVerificationRequest[];
};

export const reviewVerificationRequest = async (
  userId: string,
  status: "aprobado" | "rechazado",
  observation?: string,
) => {
  const { error } = await supabase.rpc("revisar_verificacion_usuario", {
    p_id_usuario: userId,
    p_estado: status,
    p_observacion: observation ?? null,
  });
  if (error) throw error;
};

export const getVerificationDocumentUrl = async (document: VerificationDocument) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(document.ruta_storage, 5 * 60);
  if (error) throwVerificationError(error);
  return data.signedUrl;
};

export const downloadVerificationDocument = async (document: VerificationDocument) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(document.ruta_storage);
  if (error) throwVerificationError(error);

  const url = URL.createObjectURL(data);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.nombre_archivo;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
