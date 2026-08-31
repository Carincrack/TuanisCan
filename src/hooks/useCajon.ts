import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/* ─────────────────────────────────────────────────────────────
   El cajón de navegación en móvil.

   Un panel que tapa la pantalla es un diálogo, y un diálogo tiene
   obligaciones que el marcado no da solo:

     · Escape lo cierra, igual que la X.
     · La página de atrás no se corre mientras está abierto.
     · El tabulador da vueltas dentro del panel. Sin esto el foco
       se va a los enlaces de abajo, que el usuario no ve, y queda
       navegando a ciegas una pantalla tapada.
     · Al cerrar, el foco vuelve al botón que lo abrió. Si no,
       vuelve al principio del documento y se pierde el lugar.

   `montado` sobrevive a `abierto` el tiempo de la animación de
   salida: sin eso React desmonta el panel en el mismo cuadro en que
   se pulsa cerrar y el cajón desaparece de golpe en vez de irse.
   ───────────────────────────────────────────────────────────── */

const FOCALIZABLES =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const useCajon = (
  abierto: boolean,
  cerrar: () => void,
  panel: RefObject<HTMLElement | null>,
  msSalida: number,
) => {
  const [montado, setMontado] = useState(abierto);
  const disparador = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (abierto) {
      /* Quién abrió el cajón, anotado antes de montar nada: un cuadro
         más tarde el foco ya está adentro del panel y el botón
         original se habría perdido. */
      disparador.current ??= document.activeElement as HTMLElement | null;
      setMontado(true);
      return;
    }

    const id = window.setTimeout(() => setMontado(false), msSalida);
    return () => window.clearTimeout(id);
  }, [abierto, msSalida]);

  /* `montado` va en las dependencias a propósito. En el cuadro en que
     `abierto` pasa a true el panel todavía no existe —lo monta el
     efecto de arriba, un cuadro después—, así que `panel.current` sale
     null y este efecto se iba sin bloquear el scroll ni atrapar el
     foco, y sin volver a intentarlo nunca. */
  useEffect(() => {
    if (!abierto || !montado) return;

    const caja = panel.current;
    if (!caja) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focalizables = () =>
      Array.from(caja.querySelectorAll<HTMLElement>(FOCALIZABLES));

    focalizables()[0]?.focus();

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        cerrar();
        return;
      }

      if (evento.key !== "Tab") return;

      /* La lista se vuelve a leer en cada Tab: los grupos del menú se
         pliegan y despliegan con el cajón abierto, así que lo que era
         el último enlace deja de serlo sin que el panel se desmonte. */
      const items = focalizables();
      if (items.length === 0) return;

      const primero = items[0];
      const ultimo = items[items.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
      disparador.current?.focus?.();
      disparador.current = null;
    };
  }, [abierto, montado, cerrar, panel]);

  return montado;
};
