import { ArrowRight } from "../../lib/iconos";
import type { CSSProperties, ReactNode } from "react";
import { CANVAS, HUESO, NAVY, TINTA } from "../tokens";

/* ─────────────────────────────────────────────────────────────
   Botón de la portada. Todo es píldora: la referencia no tiene una
   sola esquina viva en sus acciones.

   La acción fuerte es navy con texto blanco (10.7:1). No es
   turquesa: el turquesa sobre el azul suave del fondo da 1.1:1 y
   desaparece, y como relleno de botón con texto blanco tampoco
   pasa AA. El turquesa vive en los círculos de las píldoras, sobre
   fondo claro, que es donde sí se ve.

   El `scale(0.97)` al presionar no es adorno: sin él la píldora no
   acusa recibo del clic y la interfaz se siente muerta.
   ───────────────────────────────────────────────────────────── */

type Variante = "navy" | "hueso" | "cielo" | "contorno" | "texto";
type Tamano = "sm" | "md" | "lg";

const TAMANOS: Record<Tamano, string> = {
  sm: "px-5 py-2.5 text-[13.5px]",
  md: "px-7 py-4 text-[15px]",
  lg: "px-6 py-4.5 text-[15.5px]",
};

/* Los colores van por `style` y no por utilidades porque son de la
   portada, no del `@theme` de la aplicación. */
const ESTILOS: Record<Variante, CSSProperties> = {
  navy: { background: NAVY, color: HUESO },
  hueso: { background: HUESO, color: NAVY },
  cielo: { background: CANVAS, color: NAVY },
  contorno: { border: `2px solid ${NAVY}40`, color: NAVY },
  texto: { color: TINTA },
};

const REALCE: Record<Variante, string> = {
  navy: "hover:brightness-125",
  hueso: "hover:brightness-[0.97]",
  cielo: "hover:brightness-[0.97]",
  contorno: "hover:bg-white/25",
  texto: "hover:opacity-60",
};

interface BotonAccionProps {
  children: ReactNode;
  onClick: () => void;
  variante?: Variante;
  tamano?: Tamano;
  flecha?: boolean;
  bloque?: boolean;
  className?: string;
}

const BotonAccion = ({
  children,
  onClick,
  variante = "navy",
  tamano = "md",
  flecha = false,
  bloque = false,
  className = "",
}: BotonAccionProps) => (
  <button
    type="button"
    onClick={onClick}
    style={ESTILOS[variante]}
    className={`group inline-flex items-center justify-center gap-2.5 rounded-full font-semibold transition-[transform,filter,background-color,opacity] duration-150 ease-out active:scale-[0.97] ${
      REALCE[variante]
    } ${TAMANOS[tamano]} ${bloque ? "w-full" : ""} ${className}`}
  >
    {children}
    {flecha && (
      <ArrowRight
        size={17}
        strokeWidth={2.6}
        aria-hidden
        className="transition-transform duration-200 ease-out group-hover:translate-x-1"
      />
    )}
  </button>
);

export default BotonAccion;
