import { useCallback, useEffect, useState } from "react";
import {
  activarUsuario,
  getAdminUsuarios,
  inactivarUsuario,
} from "../services/admin-users.service";
import { aviso } from "../lib/aviso";
import type { AdminUser } from "../types/auth.types";

const messageFrom = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "No se pudo completar la operacion.";
};

export const useAdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsuarios(await getAdminUsuarios());
    } catch (cause) {
      setError(messageFrom(cause));
      /* Sin aviso flotante. Un aviso cuenta el desenlace de algo que
         la persona HIZO (ver `aviso.ts`); que una lista no cargue no
         lo es, y la pantalla ya lo dice en su lugar con `error`. Con
         aviso, el panel general —que pide usuarios y paseadores solo
         para contar— soltaba dos errores rojos por cada montaje. */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarEstado = useCallback(async (usuario: AdminUser) => {
    setProcesandoId(usuario.id_usuario);
    setError(null);
    setMensaje(null);

    try {
      if (usuario.activo) await inactivarUsuario(usuario.id_usuario);
      else await activarUsuario(usuario.id_usuario);

      aviso.ok(
        usuario.activo
          ? `${usuario.nombre} quedó inactivo`
          : `${usuario.nombre} quedó activo`,
        {
          detalle: usuario.activo
            ? "Pierde acceso a las funciones protegidas."
            : "Recupera acceso a las funciones protegidas.",
        },
      );

      setUsuarios((actuales) =>
        actuales.map((item) =>
          item.id_usuario === usuario.id_usuario
            ? { ...item, activo: !usuario.activo }
            : item
        )
      );
      setMensaje(
        `${usuario.nombre} ${usuario.activo ? "quedo inactivo" : "quedo activo"}.`
      );
    } catch (cause) {
      setError(messageFrom(cause));
      aviso.error(cause, { respaldo: "No se pudo cambiar el estado de la cuenta." });
      throw cause;
    } finally {
      setProcesandoId(null);
    }
  }, []);

  return {
    usuarios,
    loading,
    procesandoId,
    error,
    mensaje,
    cargar,
    cambiarEstado,
    clearMessage: () => setMensaje(null),
  };
};
