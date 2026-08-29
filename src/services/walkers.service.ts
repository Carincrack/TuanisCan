import { supabase } from "../lib/supabase";
import type { PublicWalker, WalkRequestInput } from "../types/auth.types";

type PublicWalkerRow = Omit<
  PublicWalker,
  "tarifa_base" | "calificacion_promedio" | "total_resenas" | "total_paseos"
> & {
  tarifa_base: number | string | null;
  calificacion_promedio: number | string;
  total_resenas: number | string;
  total_paseos: number | string;
};

export const listActiveWalkers = async (): Promise<PublicWalker[]> => {
  const { data, error } = await supabase.rpc("buscar_paseadores", {
    p_zona_id: null,
    p_solo_disponibles: true,
    p_calificacion_min: null,
  });
  if (error) throw error;

  return ((data ?? []) as PublicWalkerRow[]).map((walker) => ({
    ...walker,
    tarifa_base:
      walker.tarifa_base === null ? null : Number(walker.tarifa_base),
    calificacion_promedio: Number(walker.calificacion_promedio),
    total_resenas: Number(walker.total_resenas),
    total_paseos: Number(walker.total_paseos),
  }));
};

export const requestWalk = async (input: WalkRequestInput) => {
  const { data, error } = await supabase.rpc("solicitar_paseo", {
    p_id_mascota: input.id_mascota,
    p_id_paseador: input.id_paseador,
    p_fecha: input.fecha,
    p_hora_inicio: input.hora_inicio,
    p_duracion_min: input.duracion_min,
    p_direccion_encuentro: input.direccion_encuentro,
  });
  if (error) throw error;
  return data as string;
};
