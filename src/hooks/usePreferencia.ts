import { useCallback, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Preferencia de interfaz guardada en el navegador.

   Es para decisiones de comodidad —el riel anclado o plegado, qué
   grupos del menú quedan abiertos—, no para datos: vive por
   dispositivo y por navegador, y si se pierde no pasa nada.

   Todo va envuelto en `try`. En navegación privada, con las cookies
   de sitio bloqueadas o desde un `iframe` sin permisos, el solo
   hecho de tocar `localStorage` lanza; sin la guarda, una
   preferencia de barra lateral tumbaría la aplicación entera.
   ───────────────────────────────────────────────────────────── */

const leer = <T,>(clave: string, porDefecto: T): T => {
  try {
    const crudo = window.localStorage.getItem(clave);
    return crudo === null ? porDefecto : (JSON.parse(crudo) as T);
  } catch {
    return porDefecto;
  }
};

const guardar = (clave: string, valor: unknown) => {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* Sin almacenamiento la preferencia dura lo que la pestaña. */
  }
};

export const usePreferencia = <T,>(clave: string, porDefecto: T) => {
  const [valor, setValor] = useState<T>(() => leer(clave, porDefecto));

  const cambiar = useCallback(
    (siguiente: T | ((previo: T) => T)) => {
      setValor((previo) => {
        const resuelto =
          typeof siguiente === "function"
            ? (siguiente as (p: T) => T)(previo)
            : siguiente;
        guardar(clave, resuelto);
        return resuelto;
      });
    },
    [clave],
  );

  return [valor, cambiar] as const;
};
