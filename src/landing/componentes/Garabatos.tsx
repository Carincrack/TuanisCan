import { NAVY } from "../tokens";

/* ─────────────────────────────────────────────────────────────
   Los garabatos de la referencia: rayas de velocidad y un trazo
   enrollado, dibujados a mano alzada y no con formas geométricas.

   Los de ella son blancos porque su fondo es un verde medio. Sobre
   nuestro azul suave el blanco da 2.7:1 y se desvanece, así que van
   en navy: se leen como tinta.

   El nuestro es una correa: el logotipo ya trae un cordón que sale
   en lazo, así que el garabato enrollado sale de ahí en vez de ser
   un rizo cualquiera. `pathLength={1}` normaliza el recorrido para
   que los tres trazos se dibujen a la misma velocidad.
   ───────────────────────────────────────────────────────────── */

const trazo = {
  stroke: NAVY,
  strokeWidth: 5,
  strokeLinecap: "round" as const,
  fill: "none" as const,
  pathLength: 1,
};

/** Rayas de velocidad, a la izquierda del perro. */
export const Rayas = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 120 130" fill="none" aria-hidden className={className}>
    <path d={"M8,118 C22,96 40,80 62,70"} {...trazo} className="garabato" style={{ animationDelay: "350ms" }} />
    <path d={"M34,124 C48,104 66,90 88,82"} {...trazo} className="garabato" style={{ animationDelay: "470ms" }} />
    <path d={"M66,126 C80,112 96,102 114,98"} {...trazo} className="garabato" style={{ animationDelay: "590ms" }} />
  </svg>
);

interface CorreaProps {
  className?: string;
  /** En el hero la correa se dibuja sola al cargar. Abajo del todo eso
      no sirve: para cuando alguien llega, la animación ya pasó. Con
      `diferido` el trazo queda quieto y lo dibuja GSAP al entrar en
      pantalla.

      Además le quita el `pathLength`: DrawSVG mide el recorrido real
      con `getTotalLength()`, y un `pathLength` declarado hace que el
      navegador reescale los guiones contra otra unidad. Las dos
      medidas no coinciden y el trazo sale cortado. */
  diferido?: boolean;
}

/** La correa enrollada. */
export const Correa = ({ className = "", diferido = false }: CorreaProps) => (
  <svg viewBox="0 0 360 110" fill="none" aria-hidden className={className}>
    <path
      d={
        "M14,96 C4,54 40,20 88,26 C118,30 126,58 106,68 C88,77 74,58 92,46 " +
        "C112,33 146,44 158,62 C168,77 156,92 142,86 C128,80 134,62 152,60 " +
        "C186,56 224,72 246,44"
      }
      {...trazo}
      strokeWidth={4.5}
      pathLength={diferido ? undefined : 1}
      data-anim={diferido ? "correa" : undefined}
      className={diferido ? undefined : "garabato"}
      style={diferido ? undefined : { animationDelay: "700ms", animationDuration: "1.6s" }}
    />
  </svg>
);

/* ── Los rabitos ──
   Adornos sueltos de la página: trazos abstractos y chicos, de la
   familia de la correa. Van en el gris suave de la correa del cierre
   —navy con muy poca opacidad—, y eso es a propósito: acompañan sin
   sumar peso. Cualquier cosa más marcada o con forma reconocible
   satura la portada, que ya trae fotos, juguetes y migas.

   Los dibuja el scroll: `animacion.ts` los traza mientras se baja. Así
   no hay nada corriendo con la página quieta, y sin JavaScript o con
   `prefers-reduced-motion` se ven enteros. */
const FORMAS = {
  lazo: {
    caja: "0 0 260 110",
    d:
      "M14,96 C4,54 40,20 88,26 C118,30 126,58 106,68 C88,77 74,58 92,46 " +
      "C112,33 146,44 158,62 C168,77 156,92 142,86 C128,80 134,62 152,60 " +
      "C186,56 224,72 246,44",
  },
  rizo: {
    caja: "0 0 340 180",
    d: "M152,92 C140,76 112,80 110,102 C108,128 150,136 170,112 C194,84 164,38 118,42 C66,46 44,100 68,136 C90,168 154,174 204,146 C246,122 282,112 332,138",
  },
};

export const Rabito = ({ forma, className = "" }: { forma: keyof typeof FORMAS; className?: string }) => (
  <svg viewBox={FORMAS[forma].caja} fill="none" aria-hidden className={`pointer-events-none opacity-[0.13] ${className}`}>
    <path d={FORMAS[forma].d} stroke={NAVY} strokeWidth={6.5} strokeLinecap="round" data-anim="rabito" />
  </svg>
);
