import { useCallback, useEffect, useState } from "react";
import { obtenerTipoCambio, type TipoCambio } from "../services/tipo-cambio.service";

/** El tipo de cambio del día para una pantalla. `activo` en false no
    consulta nada: la ventana de pago lo pide recién cuando se abre. */
export const useTipoCambio = (activo = true) => {
  const [tipo, setTipo] = useState<TipoCambio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState(false);

  const consultar = useCallback(async (forzar = false) => {
    setCargando(true);
    setFallo(false);
    try {
      setTipo(await obtenerTipoCambio(forzar));
    } catch {
      /* Sin aviso flotante: no es algo que la persona hizo. Quien lo
         usa muestra `fallo` en su lugar y ofrece reintentar. */
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void consultar();
  }, [activo, consultar]);

  return { tipo, cargando, fallo, reintentar: () => consultar(true) };
};
