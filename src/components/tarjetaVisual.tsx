import { Star } from "../lib/iconos";
import type { CardBrand } from "../lib/payment-card";

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
const GUILLOCHE = [
  "repeating-radial-gradient(circle at 82% 14%, rgba(255,255,255,0.07) 0 1px, transparent 1px 6px)",
  "repeating-radial-gradient(circle at 16% 88%, rgba(255,255,255,0.055) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(64deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 5px)",
].join(", ");

/** El brillo del plástico. Una sola banda ancha en diagonal. Se
    desplaza al pasar el puntero, y eso no es adorno: en el diálogo de
    pago la tarjeta se elige, y el brillo es lo que dice que responde. */
const BRILLO =
  "linear-gradient(104deg, transparent 20%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0.03) 54%, transparent 72%)";

/** El repujado de los números. Luz arriba, sombra abajo: un píxel
    cada una, que es lo que hace la máquina de repujar. */
const REPUJADO = {
  textShadow: "0 1px 0 rgba(255,255,255,0.26), 0 -1px 1px rgba(0,0,0,0.5)",
};

interface TemaTarjeta {
  fondo: string;
  filete: string;
  logo: React.ReactNode;
}

const temaDe = (marca: string): TemaTarjeta => {
  const nombre = (marca || "").trim().toLowerCase();

  if (nombre.includes("visa")) {
    return {
      fondo: "bg-[linear-gradient(135deg,#0b2033_0%,#16405e_52%,#1f5e86_100%)]",
      filete: "ring-sky-300/25",
      logo: (
        <span className="select-none text-[19px] font-black italic tracking-wider text-white">
          VISA
        </span>
      ),
    };
  }

  if (nombre.includes("mastercard")) {
    return {
      fondo: "bg-[linear-gradient(135deg,#1a181c_0%,#2b262d_50%,#3d2e28_100%)]",
      filete: "ring-amber-300/25",
      logo: (
        <span className="flex select-none items-center -space-x-2.5" aria-label="Mastercard">
          <span className="h-6 w-6 rounded-full bg-[#eb001b] opacity-90" />
          <span className="h-6 w-6 rounded-full bg-[#f79e1b] opacity-90" />
        </span>
      ),
    };
  }

  /* La de la casa: el navy del riel abriendo al celeste del login. */
  return {
    fondo: "bg-[linear-gradient(135deg,#0f2a3a_0%,#1a4257_50%,#2e6584_100%)]",
    filete: "ring-accent/30",
    logo: (
      <span className="titular select-none text-[15px] font-bold tracking-tight text-white">
        TuanisCan
      </span>
    ),
  };
};

/** El chip EMV. Seis contactos en dos columnas con un puente al
    centro, que es el trazado real de la norma ISO/IEC 7816. */
const ChipEmv = () => (
  <span
    className="relative block h-[26px] w-[34px] overflow-hidden rounded-[5px] bg-[linear-gradient(135deg,#fbeec4_0%,#e4c780_38%,#c69a4a_68%,#8f6a2a_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-1px_1px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.4)]"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 34 26"
      className="absolute inset-0 h-full w-full text-[#6d5219]/55"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M0 8h11M23 8h11M0 18h11M23 18h11M11 0v26M23 0v26M11 13h12" />
    </svg>
  </span>
);

export const TarjetaVisual = ({
  marca,
  numero,
  titular,
  vencimiento,
  esPrincipal = false,
  className = "",
}: {
  marca: CardBrand | string;
  numero: string;
  titular: string;
  vencimiento: string;
  esPrincipal?: boolean;
  className?: string;
}) => {
  const tema = temaDe(marca);

  return (
    <div
      className={`group relative flex aspect-[1.586/1] w-full max-w-[360px] flex-col justify-between overflow-hidden rounded-[20px] p-5 text-white ring-1 ${tema.filete} ${tema.fondo} shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_14px_30px_rgba(15,35,55,0.28)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_26px_50px_rgba(15,35,55,0.34)] ${className}`}
    >
      {/* El filo del plástico: un realce muy sutil arriba, como si la
          luz de la mesa pegara en el canto de la tarjeta. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25"
        aria-hidden="true"
      />

      {/* El grabado */}
      <span
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{ backgroundImage: GUILLOCHE }}
        aria-hidden="true"
      />

      {/* El brillo, que se corre al pasar el puntero */}
      <span
        className="pointer-events-none absolute -inset-x-1/3 inset-y-0 transition-transform duration-700 ease-out group-hover:translate-x-[16%]"
        style={{ backgroundImage: BRILLO }}
        aria-hidden="true"
      />

      {/* Chip, contactless y marca */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ChipEmv />
          <svg
            className="h-5 w-5 text-white/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M8.5 16.5a5 5 0 0 1 0-7" />
            <path d="M12 19a8.5 8.5 0 0 1 0-14" />
            <path d="M15.5 21.5a12 12 0 0 1 0-19" />
          </svg>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {tema.logo}
          {esPrincipal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
              <Star size={9} className="fill-[#f2c14e] text-[#f2c14e]" />
              Principal
            </span>
          )}
        </div>
      </div>

      {/* El número, repujado */}
      <p
        className="nums relative my-auto pt-2 text-[18px] font-medium tracking-[0.14em] text-white/95 sm:text-[20px]"
        style={REPUJADO}
      >
        {numero || "•••• •••• •••• ••••"}
      </p>

      {/* Titular y vencimiento */}
      <div className="relative flex items-end justify-between gap-4">
        <div className="min-w-0 max-w-[70%]">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/55">
            Titular
          </p>
          <p
            className="mt-0.5 truncate text-[12px] font-semibold uppercase tracking-[0.06em] text-white"
            style={REPUJADO}
          >
            {titular || "Nombre del titular"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/55">
            Vence
          </p>
          <p
            className="nums mt-0.5 text-[12px] font-semibold tracking-wider text-white"
            style={REPUJADO}
          >
            {vencimiento || "MM/AA"}
          </p>
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
