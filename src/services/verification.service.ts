import { supabase } from "../lib/supabase";
import type {
  AdminVerificationRequest,
  VerificationDocument,
  VerificationDocumentType,
} from "../types/auth.types";
import type { I18nContextValue } from "../context/i18n-context";

const BUCKET = "usuarios-verificacion";

/* Declarada como `function` y con retorno `never` a propósito.

   Siempre lanza, pero escrita como `const` flecha TypeScript no lo
   deduce, y entonces tampoco estrecha nada después de llamarla: en
   `getVerificationDocumentUrl` seguía viendo `data` como
   posiblemente nulo, y en `downloadVerificationDocument` pasaba
   `Blob | null` a `URL.createObjectURL`. Dos errores de compilación
   que venían de arrastre —y el segundo no era un tipo mal puesto: si
   la descarga fallaba, reventaba justo acá. */
function throwVerificationError(
  error: { code?: string; message?: string },
  t: I18nContextValue["t"],
): never {
  if (error.code === "42P01" || error.code === "PGRST205" || /bucket not found/i.test(error.message ?? "")) {
    throw new Error(t("profile.errors.verificationMigrationMissing"));
  }
  throw new Error(error.message || t("profile.errors.generic"));
};

export const uploadVerificationDocument = async (
  userId: string,
  type: VerificationDocumentType,
  file: File,
  t: I18nContextValue["t"],
) => {
  const previous = await supabase
    .from("documentos_verificacion_usuario")
    .select("ruta_storage")
    .eq("id_usuario", userId)
    .eq("tipo_documento", type)
    .maybeSingle();
  if (previous.error) throwVerificationError(previous.error, t);

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${type}-${crypto.randomUUID()}.${extension}`;
  const uploaded = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throwVerificationError(uploaded.error, t);

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
    throwVerificationError(saved.error, t);
  }

  if (previous.data?.ruta_storage) {
    await supabase.storage.from(BUCKET).remove([previous.data.ruta_storage]);
  }
};

export const submitVerificationRequest = async (t: I18nContextValue["t"]) => {
  const { error } = await supabase.rpc("enviar_solicitud_verificacion");
  if (error) throwVerificationError(error, t);
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

export const getVerificationDocumentUrl = async (
  document: VerificationDocument,
  t: I18nContextValue["t"],
) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(document.ruta_storage, 5 * 60);
  if (error) throwVerificationError(error, t);
  return data.signedUrl;
};

export const downloadVerificationDocument = async (
  document: VerificationDocument,
  t: I18nContextValue["t"],
) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(document.ruta_storage);
  if (error) throwVerificationError(error, t);

  const url = URL.createObjectURL(data);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.nombre_archivo;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
