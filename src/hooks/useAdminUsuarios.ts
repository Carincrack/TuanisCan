import { useCallback, useEffect, useState } from "react";
import {
  activarUsuario,
  getAdminUsuarios,
  inactivarUsuario,
} from "../services/admin-users.service";
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
