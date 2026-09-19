import { supabase } from "../lib/supabase";
import { listWalksWithRelations } from "./walks.service";

export interface Resena {
  id_resena: string;
  id_paseo: string;
  calificacion: number;
  comentario: string | null;
  fecha: string;
}

export const listResenasDelDueno = async (userId: string) => {
  const [walks, result] = await Promise.all([
    listWalksWithRelations(userId),
    supabase.from("resenas").select("id_resena, id_paseo, calificacion, comentario, fecha").eq("id_autor", userId).order("fecha", { ascending: false }),
  ]);
  if (result.error) throw result.error;
  const escritas = result.data as Resena[];
  const escritasPorPaseo = new Map(escritas.map((resena) => [resena.id_paseo, resena]));
  return {
    escritas: escritas.map((resena) => ({ ...resena, paseo: walks.find((paseo) => paseo.id_paseo === resena.id_paseo) ?? null })),
    pendientes: walks.filter((paseo) => paseo.estado === "finalizado" && paseo.id_paseador && !escritasPorPaseo.has(paseo.id_paseo)),
  };
};

export const guardarResena = async (input: { id_resena?: string; id_paseo: string; id_autor: string; id_receptor: string; calificacion: number; comentario: string }) => {
  const values = { calificacion: input.calificacion, comentario: input.comentario.trim() || null };
  const result = input.id_resena
    ? await supabase.from("resenas").update(values).eq("id_resena", input.id_resena)
    : await supabase.from("resenas").insert({ ...values, id_paseo: input.id_paseo, id_autor: input.id_autor, id_receptor: input.id_receptor });
  if (result.error) throw result.error;
};
