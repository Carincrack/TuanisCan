import { ArrowRight } from "../../lib/iconos";
import { CANVAS, HUESO, NAVY, TURQUESA } from "../tokens";

/* La píldora flotante de la referencia: fondo plano, texto en
   negrita y un botón circular de color con la flecha.

   El círculo es el turquesa del logo, y la flecha va navy encima:
   blanca sobre turquesa da 3.0:1 y se ensucia.

   Dos tonos, porque la portada tiene bandas claras y bandas de
   color:

     claro  sobre azul o celeste — píldora canvas, texto navy
     hondo  sobre blanco        — píldora navy, texto blanco

   El tono claro sobre blanco casi no se ve (canvas y blanco están
   a un paso), así que el cierre usa el hondo. De paso queda el
   control más fuerte de la página, que es justo lo que debe ser el
   último llamado.

   Es un solo control — el círculo no es un segundo botón — así que
   todo el conjunto es un `<button>` y el círculo va decorativo. */

interface PildoraCTAProps {
  children: string;
  onClick: () => void;
  className?: string;
  tono?: "claro" | "hondo";
}

const TONOS = {
  claro: { background: CANVAS, color: NAVY },
  hondo: { background: NAVY, color: HUESO },
} as const;

const PildoraCTA = ({ children, onClick, className = "", tono = "claro" }: PildoraCTAProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex items-center gap-4 rounded-full py-2 pr-2 pl-6 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-18px_rgba(26,66,87,0.55)] active:scale-[0.97] ${className}`}
    style={TONOS[tono]}
  >
    <span className="text-[15px] font-bold">{children}</span>
    <span
      aria-hidden
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform duration-200 ease-out group-hover:translate-x-0.5"
      style={{ background: TURQUESA }}
    >
      <ArrowRight size={19} strokeWidth={2.6} style={{ color: NAVY }} />
    </span>
  </button>
);

export default PildoraCTA;
