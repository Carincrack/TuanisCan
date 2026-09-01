import { supabase } from "../lib/supabase";

export interface Notification {
  id_notificacion: string;
  tipo: "paseo" | "mascota_perdida" | "verificacion" | "pago" | "resena";
  mensaje: string;
  leido: boolean;
  referencia_id: string | null;
  fecha: string;
}

export const listNotifications = async (): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notificaciones")
    .select("id_notificacion, tipo, mensaje, leido, referencia_id, fecha")
    .order("fecha", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as Notification[];
};

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase
    .from("notificaciones")
    .update({ leido: true })
    .eq("id_notificacion", id);
  if (error) throw error;
};

export const markAllNotificationsRead = async () => {
  const { error } = await supabase
    .from("notificaciones")
    .update({ leido: true })
    .eq("leido", false);
  if (error) throw error;
};
