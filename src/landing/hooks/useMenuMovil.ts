import { useCallback, useEffect, useState } from "react";

import { irAScroll, pausarScroll } from "../scroll";

/* ─────────────────────────────────────────────────────────────
   Estado del menú de la portada en móvil.

   Mientras está abierto la página de atrás no debe correrse, y
   Escape tiene que cerrarlo igual que la X. Va aparte porque son
   efectos de documento, no maquetado.

   `overflow: hidden` en el `body` frena el scroll nativo pero no
   al scroll suave, que mueve la página por su cuenta: hay que
   frenar los dos. En el teléfono el suave ni se monta —Lenis deja
   el táctil en manos del sistema— así que ahí sobra; se hace igual
   porque el menú también se abre en una ventana angosta de
   escritorio, donde sí está corriendo.
   ───────────────────────────────────────────────────────────── */

export const useMenuMovil = () => {
  const [abierto, setAbierto] = useState(false);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    if (!abierto) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    pausarScroll(true);

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = previo;
      pausarScroll(false);
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  /** Cierra el menú y baja hasta la sección del enlace. */
  const irA = useCallback((href: string) => {
    setAbierto(false);
    irAScroll(href);
  }, []);

  return { abierto, abrir, cerrar, irA };
};
