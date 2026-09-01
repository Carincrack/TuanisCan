import { useId } from "react";

/* ─────────────────────────────────────────────────────────────
   EL SELLO DE VERIFICADO

   El de siempre: el disco azul de borde ondulado con el visto
   blanco encima. Se reconoce sin leer nada, que es justo lo que
   tiene que hacer un sello — aparece pegado a un avatar de 32 px,
   donde no cabe ni una palabra.

   Va en SVG y no en `clip-path` como estaba antes. Un `clip-path:
   polygon()` solo sabe hacer rectas, así que las ondas del borde
   salían facetadas: a 20 px se leen como un engranaje, no como un
   sello. Acá el contorno se muestrea de la curva polar

       r(θ) = R + amplitud · cos(lóbulos · θ)

   con suficientes puntos como para que el ojo no encuentre el
   vértice, y como es un `<path>` escala a cualquier tamaño sin
   volver a calcular nada.

   El aro blanco existe porque el sello se apoya sobre la foto de
   alguien, y una foto puede ser de cualquier color —incluida esta
   misma gama de azules—. Sin el aro, el sello se disuelve contra
   un cielo o una piscina. Se dibuja con `paint-order: stroke`, que
   pinta el trazo antes que el relleno y deja el borde por fuera de
   la figura en vez de comerse la mitad del azul.
   ───────────────────────────────────────────────────────────── */

const LOBULOS = 12;
const MUESTRAS = 168;
const RADIO = 42;
const AMPLITUD = 3.6;

const contorno = (() => {
  const partes: string[] = [];

  for (let i = 0; i < MUESTRAS; i++) {
    const angulo = (i / MUESTRAS) * Math.PI * 2;
    const radio = RADIO + AMPLITUD * Math.cos(LOBULOS * angulo);
    const x = (50 + radio * Math.cos(angulo)).toFixed(2);
    const y = (50 + radio * Math.sin(angulo)).toFixed(2);
    partes.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
  }

  return `${partes.join("")}Z`;
})();

const SelloVerificado = ({
  size = 18,
  aro = true,
  className = "",
  title = "Perfil verificado",
}: {
  size?: number;
  /** El anillo blanco que lo despega del fondo. Se apaga cuando el
      sello ya está sobre una superficie clara y plana. */
  aro?: boolean;
  className?: string;
  title?: string;
}) => {
  /* El degradado vive dentro del propio SVG, así que su identificador
     tiene que ser único: dos sellos en la misma pantalla con el mismo
     `id` hacen que el segundo tome el degradado del primero, y si el
     primero se desmonta el segundo se queda sin relleno. */
  const azul = `sello-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={`shrink-0 ${className}`}
    >
      <title>{title}</title>

      <defs>
        <linearGradient id={azul} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4EAEFF" />
          <stop offset="100%" stopColor="#0A7CE0" />
        </linearGradient>
      </defs>

      <path
        d={contorno}
        fill={`url(#${azul})`}
        stroke={aro ? "#ffffff" : "none"}
        strokeWidth={aro ? 6 : 0}
        strokeLinejoin="round"
        style={{ paintOrder: "stroke" }}
      />

      {/* El visto no está centrado en la caja sino en el peso óptico
          del disco: baja un pelo y se corre a la izquierda, porque el
          trazo largo pesa más que el corto. */}
      <path
        d="M32 50.5 L44 62 L68 36"
        fill="none"
        stroke="#ffffff"
        strokeWidth={9.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default SelloVerificado;
