import { useState } from "react";
import { MARCA } from "../../lib/nav";
import Barra from "./Barra";
import ConmutadorPublico from "../componentes/ConmutadorPublico";
import PildoraCTA from "../componentes/PildoraCTA";
import { Correa, Rayas } from "../componentes/Garabatos";
import { PUBLICOS, type ClavePublico } from "../datos";
import { AZUL, CIELO, NAVY, TINTA } from "../tokens";
import type { ConAcceso } from "../tipos";

const LETRAS = [
  ...MARCA.nombre.toUpperCase().split("").map((letra) => ({ letra, color: NAVY })),
  ...MARCA.acento.toUpperCase().split("").map((letra) => ({ letra, color: CIELO })),
];

interface HeroProps extends ConAcceso {
  onAbrirMenu: () => void;
}

const Hero = ({ onEntrar, onAbrirMenu }: HeroProps) => {
  const [publico, setPublico] = useState<ClavePublico>("dueno");
  const actual = PUBLICOS.find((p) => p.clave === publico) ?? PUBLICOS[0];

  return (
    <section
      className="banda-hero relative z-10 flex min-h-dvh flex-col overflow-x-clip"
      style={{ background: AZUL }}
    >
      <Barra onEntrar={onEntrar} onAbrirMenu={onAbrirMenu} />

      {/* ── Marca y entrada ──
          El texto sube acá, encima del perro, y no queda flotando
          sobre su pecho donde no se leería. */}
      <div className="relative z-20 shrink-0">
        {/* `aria-hidden` porque la marca ya la anuncia el símbolo de la
            barra: repetirla haría que un lector de pantalla la lea dos
            veces seguidas. */}
        <h1 className="flex justify-center px-4">
          <span data-anim="marca" className="wordmark marca-mascara" aria-hidden>
            {LETRAS.map(({ letra, color }, indice) => (
              <span key={`${letra}-${indice}`} className="letra" style={{ color }}>
                {letra}
              </span>
            
            ))}
          </span>
          <span className="sr-only">
            {MARCA.completo} — paseos, veterinarias y mascotas perdidas en Costa Rica
          </span>
        </h1>

        <div data-entra="entrada" className="mx-auto max-w-xl px-6 pt-4 text-center">
          <p
            className="min-h-[4.5rem] text-[15.5px] leading-relaxed font-medium sm:min-h-[3.5rem]"
            style={{ color: TINTA }}
          >
            {actual.entrada}
          </p>
        </div>
      </div>

      {/* ── Escenario del perro ── */}
      <div className="relative min-h-0 flex-1">
        {/* Es el elemento más grande de la primera pantalla, así que es
            el que decide el LCP: se pide con prioridad alta para que el
            navegador no lo deje detrás de las fuentes. */}
        <img
          src="/mock/dog-hero.png"
          alt="Border collie atento, listo para salir a pasear"
          fetchPriority="high"
          decoding="async"
          data-entra="perro"
          className="absolute inset-0 z-10 h-full w-full object-contain object-bottom lg:h-[calc(100%+clamp(30px,4vw,62px))]"
        />

        <Rayas className="absolute bottom-[34%] left-[6%] z-20 w-[6cqw] max-w-[130px] min-w-[48px] sm:left-[14%] lg:left-[20%]" />
        <Correa className="absolute bottom-[6%] left-[70%] z-20 w-[26cqw] max-w-[420px] min-w-[170px] -translate-x-2/7"/>
      </div>

      {/* ── Píldoras ──
          Desde `lg` se despegan y flotan en las esquinas de la banda,
          con el perro pasando por detrás. En móvil van en flujo y
          apiladas: superpuestas sobre una pantalla angosta taparían
          al perro entero. */}
      <div
        data-entra="pildoras"
        className="relative z-30 flex flex-col items-center gap-3 px-5 pt-4 pb-6 sm:px-8 sm:pb-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex-row lg:items-end lg:justify-between lg:pt-0"
      >
        <PildoraCTA onClick={() => onEntrar("registro")}>{actual.cta}</PildoraCTA>
        <ConmutadorPublico valor={publico} onCambio={setPublico} />
      </div>
    </section>
  );
};

export default Hero;
