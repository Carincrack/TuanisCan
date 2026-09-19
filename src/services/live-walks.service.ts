import { supabase } from "../lib/supabase";
import type { WalkWithRelations } from "./walks.service";
import { listWalksWithRelations } from "./walks.service";

export interface UbicacionPaseo { id_ubicacion: string; id_paseo: string; latitud: number; longitud: number; timestamp: string; }

export const getPaseoActivo = async (userId: string) => {
  const walks = await listWalksWithRelations(userId, { estado: "en_curso" });
  return walks[0] ?? null;
};

export const getPaseoActivoPaseador = async () => {
  const { data, error } = await supabase.from("paseos").select("*").eq("estado", "en_curso").limit(1).maybeSingle();
  if (error) throw error;
  return data as WalkWithRelations | null;
};

export const getPaseoConfirmadoPaseador = async () => {
  const { data, error } = await supabase.from("paseos").select("*").eq("estado", "confirmado").eq("fecha", new Date().toISOString().slice(0, 10)).order("hora_inicio").limit(1).maybeSingle();
  if (error) throw error;
  return data as WalkWithRelations | null;
};

export const listUbicacionesPaseo = async (walkId: string) => {
  const { data, error } = await supabase.from("ubicaciones_paseo").select("id_ubicacion, id_paseo, latitud, longitud, timestamp").eq("id_paseo", walkId).order("timestamp");
  if (error) throw error;
  return (data ?? []).map((item) => ({ ...item, latitud: Number(item.latitud), longitud: Number(item.longitud) })) as UbicacionPaseo[];
};

export const guardarUbicacionPaseo = async (walkId: string, coords: GeolocationCoordinates) => {
  const { error } = await supabase.from("ubicaciones_paseo").insert({ id_paseo: walkId, latitud: coords.latitude, longitud: coords.longitude });
  if (error) throw error;
};

export const finalizarPaseo = async (walkId: string) => {
  const { error } = await supabase.rpc("finalizar_mi_paseo", { p_id_paseo: walkId });
  if (error) throw error;
};

export const iniciarPaseo = async (walkId: string) => {
  const { error } = await supabase.rpc("iniciar_mi_paseo", { p_id_paseo: walkId });
  if (error) throw error;
};

export const escucharUbicaciones = (walkId: string, onInsert: (ubicacion: UbicacionPaseo) => void) => {
  const channel = supabase.channel(`paseo-${walkId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "ubicaciones_paseo", filter: `id_paseo=eq.${walkId}` }, ({ new: item }) => onInsert({ ...item, latitud: Number(item.latitud), longitud: Number(item.longitud) } as UbicacionPaseo)).subscribe();
  return () => { void supabase.removeChannel(channel); };
};
