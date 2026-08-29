import { supabase } from "../lib/supabase";
import type { AdminWalker } from "../types/auth.types";

type AdminWalkerRow = Omit<AdminWalker, "paseos" | "rating" | "generado"> & {
  paseos: number | string;
  rating: number | string;
  generado: number | string;
};

const isWalkerStatus = (estado: string): estado is AdminWalker["estado"] =>
  estado === "activo" || estado === "inactivo" || estado === "suspendido";

export const listarPaseadoresAdmin = async (): Promise<AdminWalker[]> => {
  const { data, error } = await supabase.rpc("listar_paseadores_admin");
  if (error) throw error;

  return ((data ?? []) as AdminWalkerRow[]).map((walker) => ({
    ...walker,
    paseos: Number(walker.paseos),
    rating: Number(walker.rating),
    generado: Number(walker.generado),
    estado: isWalkerStatus(walker.estado) ? walker.estado : "inactivo",
  }));
};
