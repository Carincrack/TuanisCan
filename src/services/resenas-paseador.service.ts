import { supabase } from "../lib/supabase";

export interface ResenaRecibida {
  id_resena: string;
  id_paseo: string;
  dueno: string;
  mascota: string;
  calificacion: number;
  comentario: string | null;
  fecha: string;
}

export const listarResenasPaseador = async () => {
  const { data, error } = await supabase.rpc("listar_resenas_paseador");
  if (error) throw error;
  return (data ?? []).map((item: ResenaRecibida) => ({ ...item, calificacion: Number(item.calificacion) }));
};
