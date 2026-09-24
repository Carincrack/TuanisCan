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
