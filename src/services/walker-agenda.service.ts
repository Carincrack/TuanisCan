import { supabase } from "../lib/supabase";

export interface CitaAgendaPaseador {
  id_paseo: string;
  mascota: string;
  foto: string | null;
  dueno: string;
  zona: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  precio: number;
  estado: "confirmado" | "en_curso";
}

export const listarAgendaPaseador = async (): Promise<CitaAgendaPaseador[]> => {
  const { data, error } = await supabase.rpc("listar_agenda_paseador");
  if (error) throw error;
  return (data ?? []).map((cita: CitaAgendaPaseador) => ({
    ...cita,
    duracion_min: Number(cita.duracion_min),
    precio: Number(cita.precio),
  }));
};

/** El estado del pago de cada paseo de la agenda, por id. Con el pago
    confirmado por el dueño (`retenido`) el paseo se puede iniciar. */
export const listarEstadosDePago = async (idsPaseo: string[]): Promise<Record<string, string>> => {
  if (!idsPaseo.length) return {};
  const { data, error } = await supabase.from("pagos").select("id_paseo, estado_pago").in("id_paseo", idsPaseo);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((fila) => [fila.id_paseo as string, fila.estado_pago as string]));
};
