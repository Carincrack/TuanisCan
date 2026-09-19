import { supabase } from "../lib/supabase";

export interface PaseoHistorialPaseador {
  id_paseo: string;
  mascota: string;
  foto: string | null;
  dueno: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  duracion_min: number;
  precio: number;
  zona: string;
}

export const listarHistorialPaseador = async () => {
  const { data, error } = await supabase.rpc("listar_historial_paseador");
  if (error) throw error;
  return (data ?? []).map((paseo: PaseoHistorialPaseador) => ({
    ...paseo,
    duracion_min: Number(paseo.duracion_min),
    precio: Number(paseo.precio),
  }));
};
