import type { ReactNode } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { esSticker, type CodigoSticker } from "./codigosSticker";

/* ─────────────────────────────────────────────────────────────
   LOS STICKERS DE TUANISCAN

   No son caricaturas: son avisos del paseo de un toque. Lo que de
   verdad se dice mientras se pasea —llegué, salimos, hizo sus
   necesidades, tomó agua, está feliz, jugando, de regreso, ¡pura
   vida!— dicho como lo diría una app seria de servicio: un ícono
   claro dentro de una medalla de color y el texto al lado.

   Los íconos siguen las reglas del resto de la app (`lib/iconos`):
   retícula de 24, trazo 2, puntas redondas, todo en `currentColor`.
   Encima llevan un relleno suave del mismo color —el duotono—, que
   es lo único que los distingue de un ícono de menú. Los colores
   salen de los tokens de la casa; cada aviso tiene el suyo para que
   el dueño lo reconozca sin leer.

   Los códigos son los mismos que acepta `enviar_mensaje` en la base;
   uno nuevo hay que agregarlo en los dos lados.
   ───────────────────────────────────────────────────────────── */

type Tono = "aqua" | "verde" | "oro" | "azul" | "rojo";

const TONOS: Record<Tono, string> = {
  aqua: "bg-accent-wash text-accent-dark",
  verde: "bg-ok-wash text-ok",
  oro: "bg-gold-wash text-gold",
  // No `bg-sunken`: es el fondo del selector y la medalla desaparecía.
  azul: "bg-rail/10 text-accent-deep",
  rojo: "bg-danger-wash text-danger",
};

/** El relleno suave del duotono. */
const R = { fill: "currentColor", fillOpacity: 0.18, stroke: "none" } as const;

const ICONOS: Record<CodigoSticker, { tono: Tono; dibujo: ReactNode }> = {
  /* El pin del mapa con la palomita: llegué a buscarlo. */
  "ya-llegue": {
    tono: "aqua",
    dibujo: (
      <>
        <path {...R} d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <path d="m9 10 2 2 4-4" />
      </>
    ),
  },
  /* La huella en marcha. */
  salimos: {
    tono: "verde",
    dibujo: (
      <>
        <g transform="translate(5 2.5) scale(0.8)" strokeWidth={2.5}>
          <path {...R} d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
          <circle cx="11" cy="4" r="2" />
          <circle cx="18" cy="8" r="2" />
          <circle cx="20" cy="16" r="2" />
          <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
        </g>
        <path d="M2 12h3.5" />
        <path d="M3 16h2" />
      </>
    ),
  },
  /* La bolsita, anudada y con la palomita: hecho y recogido. */
  "hizo-popo": {
    tono: "oro",
    dibujo: (
      <>
        <path {...R} d="M6.5 10h11l-1 9.4a1.8 1.8 0 0 1-1.8 1.6H9.3a1.8 1.8 0 0 1-1.8-1.6Z" />
        <path d="M6.5 10h11l-1 9.4a1.8 1.8 0 0 1-1.8 1.6H9.3a1.8 1.8 0 0 1-1.8-1.6Z" />
        <path d="M9.5 10c0-1.9 1.1-3 2.5-3s2.5 1.1 2.5 3" />
        <path d="M10.6 7.4 8.8 3.6" />
        <path d="m13.4 7.4 1.8-3.8" />
        <path d="m9.6 15.3 1.7 1.7 3.1-3.4" />
      </>
    ),
  },
  /* La gota sobre el plato. */
  "tomo-agua": {
    tono: "aqua",
    dibujo: (
      <>
        <path {...R} d="M3 14h18l-1.5 5.1A2.6 2.6 0 0 1 17 21H7a2.6 2.6 0 0 1-2.5-1.9Z" />
        <path d="M3 14h18l-1.5 5.1A2.6 2.6 0 0 1 17 21H7a2.6 2.6 0 0 1-2.5-1.9Z" />
        <path {...R} d="M12 2.8c1.9 2.3 3 4 3 5.6a3 3 0 0 1-6 0c0-1.6 1.1-3.3 3-5.6Z" />
        <path d="M12 2.8c1.9 2.3 3 4 3 5.6a3 3 0 0 1-6 0c0-1.6 1.1-3.3 3-5.6Z" />
      </>
    ),
  },
  /* El corazón que sonríe. */
  feliz: {
    tono: "rojo",
    dibujo: (
      <>
        <path {...R} d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M9 11.5c.8.9 1.8 1.4 3 1.4s2.2-.5 3-1.4" />
      </>
    ),
  },
  /* La pelota de tenis. */
  jugando: {
    tono: "oro",
    dibujo: (
      <>
        <circle {...R} cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6c3.3 3.3 3.3 9.5 0 12.8" />
        <path d="M18.4 5.6c-3.3 3.3-3.3 9.5 0 12.8" />
      </>
    ),
  },
  /* La casa con la flecha que vuelve. */
  "de-regreso": {
    tono: "azul",
    dibujo: (
      <>
        <path {...R} d="M5 9.4 12 3.6l7 5.8V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
        <path d="M3 10.6 12 3l9 7.6" />
        <path d="M5 9.4V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.4" />
        <path d="M15 17.5v-1a2.5 2.5 0 0 0-2.5-2.5H9" />
        <path d="m11 12-2 2 2 2" />
      </>
    ),
  },
  /* El pulgar arriba: todo bien. */
  "pura-vida": {
    tono: "verde",
    dibujo: (
      <>
        <path {...R} d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10h-.24a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
      </>
    ),
  },
};

/** La medalla del aviso: el círculo de color con su ícono. */
export const ArteSticker = ({ codigo, tamano = 44 }: { codigo: CodigoSticker; tamano?: number }) => {
  const { tono, dibujo } = ICONOS[codigo];
  return (
    <span
      aria-hidden
      style={{ width: tamano, height: tamano }}
      className={`grid shrink-0 place-items-center rounded-full ${TONOS[tono]}`}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(tamano * 0.5)}
        height={Math.round(tamano * 0.5)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dibujo}
      </svg>
    </span>
  );
};

/** Un aviso dentro de la conversación: la medalla, el texto y, debajo,
    lo que el globo quiera poner (la hora, los vistos). Un código que no
    existe —de una versión vieja, por ejemplo— se muestra como texto. */
export const Sticker = ({ codigo, mio, pie }: { codigo: string; mio: boolean; pie?: ReactNode }) => {
  const { t } = useTranslation();
  if (!esSticker(codigo)) return <span>{codigo}</span>;
  return (
    <span
      className={`inline-flex items-center gap-3 rounded-[22px] py-2 pr-4 pl-2 ${
        mio ? "bg-rail text-white" : "bg-surface text-ink shadow-sm"
      }`}
    >
      <ArteSticker codigo={codigo} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] leading-tight font-semibold">{t(`chat.stickers.${codigo}`)}</span>
        {pie}
      </span>
    </span>
  );
};
