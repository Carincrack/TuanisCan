import { useCallback, useEffect, useState } from "react";
import { listarPaseadoresAdmin } from "../services/admin-walkers.service";
import type { AdminWalker } from "../types/auth.types";
import { aviso } from "../lib/aviso";

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
      aviso.error(cause, { respaldo: "No se pudo cargar la lista de paseadores." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { paseadores, loading, error, cargar };
};
