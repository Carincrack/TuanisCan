import { supabase } from "../lib/supabase";
import { vaccineStatus } from "../lib/pets";
import type { Pet, PetInput, Vaccine, VaccineInput } from "../types/pet.types";

const PHOTO_BUCKET = "mascotas";

type PetRow = Omit<Pet, "fotoUrl" | "vacunas"> & {
  historial_vacunas: Vaccine[] | null;
};

const photoUrl = async (path: string | null) => {
  if (!path || path.startsWith("http") || path.startsWith("/")) return path;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
};

export const listPets = async (): Promise<Pet[]> => {
  const { data, error } = await supabase
    .from("mascotas")
    .select(`
      id_mascota, id_dueno, nombre, especie, raza, sexo, fecha_nacimiento,
      peso, color, esterilizado, microchip, foto, alergias, veterinaria, notas,
      historial_vacunas (
        id_vacuna, id_mascota, nombre_vacuna, fecha_aplicacion,
        fecha_vencimiento, estado, veterinaria, lote, notas
      )
    `)
    .order("nombre");

  if (error) throw error;
  return Promise.all(
    ((data ?? []) as unknown as PetRow[]).map(async (pet) => ({
      ...pet,
      peso: Number(pet.peso),
      fotoUrl: await photoUrl(pet.foto),
      vacunas: (pet.historial_vacunas ?? [])
        .map((vaccine) => ({
          ...vaccine,
          estado: vaccineStatus(vaccine.fecha_vencimiento),
        }))
        .sort((a, b) => b.fecha_aplicacion.localeCompare(a.fecha_aplicacion)),
    }))
  );
};

const uploadPhoto = async (userId: string, file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
};

const removePhoto = async (path: string | null) => {
  if (!path || path.startsWith("http") || path.startsWith("/")) return;
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
};

export const savePet = async (
  userId: string,
  values: PetInput,
  current?: Pet,
  file?: File | null
) => {
  const newPhoto = file ? await uploadPhoto(userId, file) : current?.foto ?? null;
  const payload = { ...values, foto: newPhoto };
  const query = current
    ? supabase.from("mascotas").update(payload).eq("id_mascota", current.id_mascota)
    : supabase.from("mascotas").insert({ ...payload, id_dueno: userId });
  const { error } = await query;
  if (error) {
    if (file) await removePhoto(newPhoto);
    throw error;
  }
  if (file && current?.foto) await removePhoto(current.foto);
};

export const deletePet = async (pet: Pet) => {
  const { error } = await supabase
    .from("mascotas")
    .delete()
    .eq("id_mascota", pet.id_mascota);
  if (error) throw error;
  await removePhoto(pet.foto);
};

export const saveVaccine = async (
  petId: string,
  values: VaccineInput,
  current?: Vaccine
) => {
  const payload = {
    ...values,
    estado: vaccineStatus(values.fecha_vencimiento),
  };
  const query = current
    ? supabase.from("historial_vacunas").update(payload).eq("id_vacuna", current.id_vacuna)
    : supabase.from("historial_vacunas").insert({
        ...payload,
        id_mascota: petId,
        id_negocio: null,
      });
  const { error } = await query;
  if (error) throw error;
};

export const deleteVaccine = async (vaccineId: string) => {
  const { error } = await supabase
    .from("historial_vacunas")
    .delete()
    .eq("id_vacuna", vaccineId);
  if (error) throw error;
};
