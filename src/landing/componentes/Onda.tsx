import { REPOSO, trazarOnda } from "../onda";

/* ─────────────────────────────────────────────────────────────
   El borde entre dos bandas.

   Un corte recto entre blanco y celeste dice "acá termina un
   bloque y empieza otro". Una curva que se mueve dice que la
   página es una sola cosa. La referencia (voldogfood.com) lo
   resuelve con un canvas repintado a mano; acá es un `path` de
   SVG: escala solo, no necesita medir el contenedor ni volver a
   dibujarse al cambiar de tamaño, y se lee en el inspector.

   La curva no está quieta. Al hacer scroll pasa de colgante a
   cóncava, atada al progreso de la banda: se balancea en vez de
   solo desplazarse.

   En reposo —sin JavaScript, o con `prefers-reduced-motion`— se
   queda en `REPOSO`, que ya es una curva terminada. Nunca se ve
   un borde a medio armar.

   Va dentro de la banda de abajo, pintada del color de la de
   arriba: así el color de arriba se derrama sobre la de abajo sin
   que nada sobresalga de una caja con `overflow: hidden`.
   ───────────────────────────────────────────────────────────── */

interface OndaProps {
  /** El color de la banda de la que la onda se derrama. */
  color: string;
  className?: string;
}

const Onda = ({ color, className }: OndaProps) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden
    className={
      "pointer-events-none absolute inset-x-0 top-0 z-0 h-[clamp(44px,6vw,88px)] w-full " +
      (className ?? "")
    }
  >
    <path data-anim="onda" d={trazarOnda(REPOSO)} fill={color} />
  </svg>
);

export default Onda;
