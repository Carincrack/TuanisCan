/* eslint-disable react-refresh/only-export-components -- GUILLOCHE, REPUJADO
   y el oro del chip son constantes compartidas, no componentes; ver carnet.tsx. */
import type { CardBrand } from "../lib/payment-card";
import { useTranslation } from "../hooks/useTranslation";

/* ─────────────────────────────────────────────────────────────
   LA TARJETA

   Vivía dentro de `pagos.tsx`, pero la usan dos pantallas que ya no
   comparten archivo: `pagos` (el sello chico en la tabla y en el
   selector de "con cuál cobramos") y `tarjetas` (la tarjeta grande,
   completa, de la gestión de métodos). Un componente que dibuja un
   objeto físico no es del historial de movimientos ni del formulario
   de alta: es suyo, y las dos pantallas lo importan de acá.

   Un rectángulo con degradado y esquinas redondas es lo que sale por
   defecto y se nota. Lo que hace que una tarjeta se lea como tarjeta
   son cuatro cosas que sí están en las de verdad:

     · El guilloché. El grabado de líneas finas que llevan las
       tarjetas y los billetes desde que existe la imprenta de
       seguridad. Acá son dos rosetones y una trama diagonal a muy
       poca opacidad: al cruzarse dan el moiré, que es exactamente lo
       que hace el torno de grabar.
     · La proporción. ID-1 de la norma ISO/IEC 7810 es 85,60 × 53,98
       mm, o sea 1,586.
     · El chip. Un chip EMV tiene seis contactos en dos columnas con
       un puente al centro, no una cruz.
     · El relieve. Los números van repujados: luz arriba, sombra
       abajo. Dos sombras de texto de un píxel.

   El turquesa de la casa aparece donde aparece siempre —un filete,
   nada más—, y el navy es el mismo `--color-rail` del riel.

   ── Un objeto, tres tamaños ──

   La misma tarjeta aparece completa en "Métodos de pago", en sello
   mediano al elegir con qué pagar, y en sello chico dentro de la
   tabla de movimientos. Es lo que ata las dos pantallas: quien ve el
   sello chico en una fila reconoce cuál de sus tarjetas cobró.
   ───────────────────────────────────────────────────────────── */

/** El grabado. Dos rosetones descentrados más una trama diagonal: al
    superponerse dan el moiré del torno de grabar. Va como valor y no
    como clase porque son tres capas con posiciones y pasos distintos,
    que es justo lo que una utilidad no puede expresar. */
export const GUILLOCHE = [
  "repeating-radial-gradient(circle at 82% 14%, rgba(255,255,255,0.07) 0 1px, transparent 1px 6px)",
  "repeating-radial-gradient(circle at 16% 88%, rgba(255,255,255,0.055) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(64deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 5px)",
].join(", ");

/** La luz. Antes era una banda diagonal marcada que se corría al
    pasar el puntero: se leía como plástico brillante de juguete.
    Las tarjetas buenas —las de metal, las de banco privado— no
    brillan en franja: tienen una luz suave que cae de un costado y
    el canto oscuro del otro. Son dos degradados radiales quietos. */
const LUZ =
  "radial-gradient(120% 85% at 0% 0%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 55%), radial-gradient(90% 75% at 100% 100%, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 60%)";

/** Un roce muy leve al pasar el puntero, en vez de la banda: dice que
    la tarjeta responde sin parecer una vitrina. */
const ROCE =
  "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.07) 48%, transparent 66%)";

interface TemaTarjeta {
  fondo: string;
  logo: React.ReactNode;
}

const temaDe = (marca: string): TemaTarjeta => {
  const nombre = (marca || "").trim().toLowerCase();

  if (nombre.includes("visa")) {
    return {
      fondo: "bg-[linear-gradient(140deg,#0b1f33_0%,#123552_48%,#1a4c72_100%)]",
      logo: (
        <span className="select-none text-[21px] leading-none font-black tracking-[0.02em] text-white italic">
          VISA
        </span>
      ),
    };
  }

  if (nombre.includes("mastercard")) {
    return {
      fondo: "bg-[linear-gradient(140deg,#141317_0%,#232026_50%,#302824_100%)]",
      logo: (
        <span className="flex select-none items-center -space-x-3" aria-label="Mastercard">
          <span className="h-7 w-7 rounded-full bg-[#eb001b]" />
          <span className="h-7 w-7 rounded-full bg-[#f79e1b] mix-blend-screen" />
        </span>
      ),
    };
  }

  /* La de la casa: el navy del riel. */
  return {
    fondo: "bg-[linear-gradient(140deg,#0e2737_0%,#1a4257_52%,#2a5f7d_100%)]",
    logo: null,
  };
};

/** El chip EMV. Seis contactos en dos columnas con un puente al
    centro, que es el trazado real de la norma ISO/IEC 7816. */
const ChipEmv = () => (
  <span
    className="relative block h-[25px] w-[33px] overflow-hidden rounded-[5px] bg-[linear-gradient(135deg,#f6e7b8_0%,#dcbd78_40%,#bf9447_70%,#8c6a2c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_1px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.35)]"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 34 26"
      className="absolute inset-0 h-full w-full text-[#6d5219]/50"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.9"
    >
      <path d="M0 8h11M23 8h11M0 18h11M23 18h11M11 0v26M23 0v26M11 13h12" />
    </svg>
  </span>
);

/** El número. Los grupos tapados se dibujan como puntos de verdad: el
    carácter "•" de la letra del sistema sale cuadrado y grueso a este
    tamaño, y cuatro cuadrados seguidos se leen "▪▪▪▪", no "••••".
    Lo que sí es dígito —los últimos cuatro, o lo que se va escribiendo
    en la vista previa— va en cifras de ancho fijo. */
const Numero = ({ numero }: { numero: string }) => {
  const grupos = (numero || "•••• •••• •••• ••••").trim().split(/\s+/);

  return (
    <p className="nums relative flex items-center gap-[14px] text-[17px] font-medium tracking-[0.16em] text-white/95 sm:text-[18px]">
      {grupos.map((grupo, i) =>
        /^•+$/.test(grupo) ? (
          <span key={i} aria-hidden className="flex gap-[4px]">
            {Array.from({ length: grupo.length }, (_, j) => (
              <span key={j} className="h-[5px] w-[5px] rounded-full bg-white/55" />
            ))}
          </span>
        ) : (
          <span key={i}>{grupo}</span>
        ),
      )}
      <span className="sr-only">{numero}</span>
    </p>
  );
};

export const TarjetaVisual = ({
  marca,
  numero,
  titular,
  vencimiento,
  className = "",
}: {
  marca: CardBrand | string;
  numero: string;
  titular: string;
  vencimiento: string;
  className?: string;
}) => {
  const { t } = useTranslation();
  const tema = temaDe(marca);

  return (
    <div
      className={`group relative flex aspect-[1.586/1] w-full max-w-[360px] flex-col overflow-hidden rounded-[16px] px-6 pt-5 pb-5 text-white ${tema.fondo} shadow-[0_1px_2px_rgba(10,25,40,0.25),0_18px_36px_-16px_rgba(10,25,40,0.6)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(10,25,40,0.25),0_26px_44px_-18px_rgba(10,25,40,0.65)] ${className}`}
    >
      {/* La luz y el canto */}
      <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: LUZ }} aria-hidden="true" />

      {/* El grabado, más callado que antes: se descubre, no se ve. */}
      <span
        className="pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay"
        style={{ backgroundImage: GUILLOCHE }}
        aria-hidden="true"
      />

      {/* El roce al pasar el puntero */}
      <span
        className="pointer-events-none absolute -inset-x-1/2 inset-y-0 opacity-0 transition-[opacity,transform] duration-700 ease-out group-hover:translate-x-[18%] group-hover:opacity-100"
        style={{ backgroundImage: ROCE }}
        aria-hidden="true"
      />

      {/* El canto: un filo de luz alrededor, como el borde pulido. */}
      <span
        className="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-white/12 ring-inset"
        aria-hidden="true"
      />

      {/* Arriba: la casa, chiquita, y el contactless. */}
      <div className="relative flex items-center justify-between">
        <span className="titular text-[12px] tracking-[0.02em] text-white/75 select-none">
          Tuanis<span className="text-accent/90">Can</span>
        </span>
        <svg
          className="h-[18px] w-[18px] text-white/70"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M7 9a4.5 4.5 0 0 1 0 6" />
          <path d="M10.5 6.5a8 8 0 0 1 0 11" />
          <path d="M14 4a11.5 11.5 0 0 1 0 16" />
        </svg>
      </div>

      {/* El chip, a la altura donde lo pone la norma. */}
      <div className="relative mt-[13%]">
        <ChipEmv />
      </div>

      <div className="relative mt-auto">
        <Numero numero={numero} />

        {/* El orden de una tarjeta emitida: el vencimiento en su
            renglón, con el rótulo al costado ("VENCE 12/28"), y abajo el
            titular con TODO el ancho que deja la red. Compartiendo
            renglón con el vencimiento y el logo, un nombre de tres
            palabras se cortaba. */}
        <p className="mt-2.5 flex items-baseline gap-2">
          <span className="text-[7.5px] leading-none font-semibold tracking-[0.2em] text-white/50 uppercase">
            {t("tarjetaVisual.expires")}
          </span>
          <span className="nums text-[12px] leading-none font-medium tracking-[0.12em] text-white/90">
            {vencimiento || t("tarjetaVisual.expiresPlaceholder")}
          </span>
        </p>
        <div className="mt-2.5 flex items-end justify-between gap-4">
          <p className="min-w-0 truncate text-[12.5px] font-medium tracking-[0.1em] text-white/90 uppercase">
            {titular || t("tarjetaVisual.holderPlaceholder")}
          </p>
          <div className="shrink-0">{tema.logo}</div>
        </div>
      </div>
    </div>
  );
};

/** La misma tarjeta en chico. Lleva el chip porque a este tamaño es
    lo único que la hace reconocible como tarjeta y no como cuadrito. */
export const SelloTarjeta = ({
  marca,
  className = "h-6 w-9",
}: {
  marca: string;
  className?: string;
}) => {
  const nombre = (marca || "").trim().toLowerCase();

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-[4px] ring-1 ring-inset ring-white/15 ${temaDe(marca).fondo} ${className}`}
      aria-hidden="true"
    >
      <span className="absolute left-[10%] top-[24%] h-[32%] w-[20%] rounded-[1.5px] bg-[linear-gradient(135deg,#f6e3ac,#a8843c)]" />

      {/* La marca, a este tamaño reducida a su forma más reconocible:
          las dos monedas de Mastercard, o el rótulo VISA en itálica. */}
      {nombre.includes("mastercard") ? (
        <span className="absolute bottom-[16%] right-[10%] flex -space-x-1.5">
          <span className="h-[38%] w-[38%] rounded-full bg-[#eb001b] opacity-90" />
          <span className="h-[38%] w-[38%] rounded-full bg-[#f79e1b] opacity-90" />
        </span>
      ) : (
        <span className="absolute bottom-[10%] right-[10%] select-none text-[7px] font-black italic leading-none tracking-tight text-white/85">
          {nombre.includes("visa") ? "VISA" : ""}
        </span>
      )}
    </span>
  );
};
