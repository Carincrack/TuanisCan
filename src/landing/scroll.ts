import type Lenis from "lenis";

/* ─────────────────────────────────────────────────────────────
   El mando del scroll suave.

   Lenis toma el control del scroll de la página, y eso rompe dos
   cosas que antes funcionaban solas:

   1. `body { overflow: hidden }` deja de frenar el fondo cuando se
      abre el menú. Lenis no lee esa propiedad: mueve la página por
      su cuenta. Hay que decirle que pare.
   2. `scrollIntoView({ behavior: "smooth" })` arranca el desplazamiento
      del navegador mientras Lenis sigue corriendo el suyo. Dos
      motores empujando la misma página se pelean y el salto queda a
      tirones.

   La instancia vive acá y no en un contexto de React porque quien
   la necesita no son componentes: es el hook del menú, que corre
   fuera del árbol.

   Todo lo de abajo funciona con la instancia en `null` — que es lo
   que pasa con `prefers-reduced-motion`, donde nunca se monta. En
   ese caso cae al comportamiento nativo, que es exactamente el que
   esa preferencia quiere.
   ───────────────────────────────────────────────────────────── */

let motor: Lenis | null = null;

export const registrarScroll = (instancia: Lenis | null) => {
  motor = instancia;
};

/** Congela el scroll de fondo mientras hay algo abierto encima. */
export const pausarScroll = (pausado: boolean) => {
  if (!motor) return;
  if (pausado) motor.stop();
  else motor.start();
};

/** Baja hasta una sección por su selector. */
export const irAScroll = (href: string) => {
  const destino = document.querySelector(href);
  if (!destino) return;

  /* `force`: el menú llama a esto en el mismo gesto con el que se
     cierra, y en ese instante el scroll todavía está congelado por
     el efecto que aún no se ha limpiado. Sin `force` la orden se
     descarta y el enlace no lleva a ninguna parte. */
  if (motor) motor.scrollTo(destino as HTMLElement, { offset: -12, force: true });
  else destino.scrollIntoView({ behavior: "smooth" });
};
