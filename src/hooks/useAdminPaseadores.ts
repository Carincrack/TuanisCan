import { useCallback, useEffect, useState } from "react";
import {
  listarPaseadoresAdmin,
  listarPaseadoresAdminConFicha,
  type AdminWalkerConFicha,
} from "../services/admin-walkers.service";
import type { AdminWalker } from "../types/auth.types";

const messageFrom = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "No se pudieron cargar los paseadores.";
};

export const useAdminPaseadores = () => {
  const [paseadores, setPaseadores] = useState<AdminWalker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPaseadores(await listarPaseadoresAdmin());
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

  return { paseadores, loading, error, cargar };
};

/** Lo mismo con la ficha completa de cada paseador —contacto, tarifa,
    descripción, reseñas—. Solo la pide el directorio de paseadores: el
    panel general usa la lista para contar y no necesita cuatro
    consultas donde le alcanza una. */
export const useAdminPaseadoresConFicha = () => {
  const [paseadores, setPaseadores] = useState<AdminWalkerConFicha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPaseadores(await listarPaseadoresAdminConFicha());
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { paseadores, loading, error, cargar };
};
