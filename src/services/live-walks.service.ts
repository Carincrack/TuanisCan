import { supabase } from "../lib/supabase";
import { hoyEnCostaRica } from "../lib/fechas";
import type { WalkWithRelations } from "./walks.service";
import { listWalksWithRelations } from "./walks.service";

export interface UbicacionPaseo { id_ubicacion: string; id_paseo: string; latitud: number; longitud: number; timestamp: string; }

export const getPaseoActivo = async (userId: string) => {
  const walks = await listWalksWithRelations(userId, { estado: "en_curso" });
  return walks[0] ?? null;
};


/* Las dos consultas filtran por paseador. Sin eso, con una cuenta que
   es dueño y paseador a la vez, podían traer un paseo que la misma
   persona pidió como dueño. */
export const getPaseoActivoPaseador = async (idPaseador: string) => {
  const { data, error } = await supabase
    .from("paseos")
    .select("*")
    .eq("id_paseador", idPaseador)
    .eq("estado", "en_curso")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as WalkWithRelations | null;
};

export const getPaseoConfirmadoPaseador = async (idPaseador: string) => {
  const { data, error } = await supabase
    .from("paseos")
    .select("*")
    .eq("id_paseador", idPaseador)
    .eq("estado", "confirmado")
    .eq("fecha", hoyEnCostaRica())
    .order("hora_inicio")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as WalkWithRelations | null;
};

/** El pago de un paseo: si el dueño ya lo confirmó (`retenido`) el
    paseador puede iniciar. El paseador puede leer el pago de sus
    paseos; nada más. */
export const getPagoDelPaseo = async (idPaseo: string) => {
  const { data, error } = await supabase
    .from("pagos")
    .select("estado_pago, monto")
    .eq("id_paseo", idPaseo)
    .maybeSingle();
  if (error) throw error;
  return data ? { estado: data.estado_pago as string, monto: Number(data.monto) } : null;
};

export const listUbicacionesPaseo = async (walkId: string) => {
  const { data, error } = await supabase.from("ubicaciones_paseo").select("id_ubicacion, id_paseo, latitud, longitud, timestamp").eq("id_paseo", walkId).order("timestamp");
  if (error) throw error;
  return (data ?? []).map((item) => ({ ...item, latitud: Number(item.latitud), longitud: Number(item.longitud) })) as UbicacionPaseo[];
};

/** Devuelve el punto tal como quedó guardado: es el que ve el dueño, y
    el paseador lo pinta en su mapa sin esperar al tiempo real. */
export const guardarUbicacionPaseo = async (walkId: string, coords: GeolocationCoordinates) => {
  const { data, error } = await supabase
    .from("ubicaciones_paseo")
    .insert({ id_paseo: walkId, latitud: coords.latitude, longitud: coords.longitude })
    .select("id_ubicacion, id_paseo, latitud, longitud, timestamp")
    .single();
  if (error) throw error;
  return { ...data, latitud: Number(data.latitud), longitud: Number(data.longitud) } as UbicacionPaseo;
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
