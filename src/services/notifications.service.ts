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
  const { error } = await supabase.rpc("marcar_notificacion_leida", {
    p_id_notificacion: id,
  });
  if (error) throw error;
};

export const markAllNotificationsRead = async () => {
  const { error } = await supabase.rpc("marcar_notificaciones_leidas");
  if (error) throw error;
};

export const deleteNotification = async (id: string) => {
  const { error } = await supabase.rpc("eliminar_notificacion", {
    p_id_notificacion: id,
  });
  if (error) throw error;
};

export const deleteAllNotifications = async () => {
  const { error } = await supabase.rpc("eliminar_notificaciones");
  if (error) throw error;
};

/** Escucha en tiempo real las notificaciones nuevas del usuario. La
    base solo le entrega las suyas (RLS), y el filtro por `id_usuario`
    evita que el servidor tenga que evaluar las de todos los demás.
    Devuelve la función para dejar de escuchar. */
export const escucharNotificaciones = (
  idUsuario: string,
  alLlegar: (notificacion: Notification) => void,
) => {
  const canal = supabase
    .channel(`notificaciones-${idUsuario}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notificaciones", filter: `id_usuario=eq.${idUsuario}` },
      ({ new: fila }) => alLlegar(fila as Notification),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(canal);
  };
};
