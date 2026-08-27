import Onda from "../componentes/Onda";
import PildoraCTA from "../componentes/PildoraCTA";
import Subrayado from "../componentes/Subrayado";
import TitularPartido from "../componentes/TitularPartido";
import { Correa } from "../componentes/Garabatos";
import { FICHA_CIERRE } from "../datos";
import { CIELO, HUESO, NAVY, TINTA_SUAVE } from "../tokens";
import type { ConAcceso } from "../tipos";

/* ─────────────────────────────────────────────────────────────
   Última llamada. Banda blanca, la misma con la que abrió el
   cuerpo de la portada: el bloque de color queda en el medio y
   este cierre respira. La onda celeste de arriba lo cose con la
   banda anterior.

   La correa va `diferido`: en el hero se dibuja sola al cargar,
   pero acá abajo eso significaría que la animación ya terminó
   antes de que nadie llegue a verla. La dibuja GSAP al entrar en
   pantalla y, además, va más lenta que el scroll.

   La ficha de foto aparece recién en `xl`. A 1280 px el texto
   ocupa 672 px centrados y sobran 304 px por lado: la ficha de
   194 px entra sin tocar el texto. Por debajo de eso no cabe, y
   una foto encima del titular no es una foto, es un estorbo.

   Las manijas de acá se llaman `linea-cierre` y no `linea`: esa
   ya es la ventana de una línea de titular, y las dos cosas se
   mueven distinto.
   ───────────────────────────────────────────────────────────── */

const Cierre = ({ onEntrar }: ConAcceso) => (
  <section
    data-anim="cierre"
    className="relative overflow-hidden px-6 pt-32 pb-28 sm:px-10 lg:pt-44 lg:pb-36"
    style={{ background: HUESO }}
  >
    <Onda color={CIELO} />

    <div
      data-par="52"
      data-par-x="-14"
      data-par-rot="-2.4"
      className="pointer-events-none absolute -top-10 -right-14 z-0 w-[62%] max-w-[440px] opacity-[0.13]"
    >
      <Correa diferido className="w-full" />
    </div>

    <figure
      data-cursor=""
      className="absolute bottom-16 left-10 z-10 hidden h-[142px] w-[194px] overflow-hidden rounded-[22px] ring-1 ring-[#1a42571f] transition-transform duration-300 ease-out hover:scale-[1.04] xl:block"
    >
      <div data-anim="ficha" className="h-full w-full">
        <img
          data-par="-40"
          data-par-x="10"
          data-par-rot="1.8"
          src={FICHA_CIERRE.src}
          alt={FICHA_CIERRE.alt}
          loading="lazy"
          decoding="async"
          className="-mt-[48px] -ml-[20px] h-[calc(100%+96px)] w-[calc(100%+40px)] max-w-none object-cover"
        />
      </div>
    </figure>

    <div className="relative z-10 mx-auto max-w-2xl text-center">
      <span data-anim="linea-cierre" className="rotulo block" style={{ color: TINTA_SUAVE }}>
        Empezá hoy
      </span>

      <TitularPartido
        lineas={["Tu mascota merece", "a alguien"]}
        subrayado={<Subrayado>de confianza.</Subrayado>}
        color={NAVY}
        className="display mt-5 text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.02]"
      />

      <p
        data-anim="linea-cierre"
        className="mx-auto mt-7 max-w-[44ch] text-[15.5px] leading-relaxed"
        style={{ color: TINTA_SUAVE }}
      >
        Crear la cuenta toma un minuto y no cuesta nada. Registrás a tu mascota y
        ya podés pedir el primer paseo.
      </p>

      <div data-anim="linea-cierre" className="mt-10 flex justify-center">
        <PildoraCTA tono="hondo" onClick={() => onEntrar("registro")}>
          Crear cuenta gratis
        </PildoraCTA>
      </div>

      <p data-anim="linea-cierre" className="mt-6 text-[13px]" style={{ color: TINTA_SUAVE }}>
        Sin tarjeta. Cancelás cuando querás.
      </p>
    </div>
  </section>
);

export default Cierre;
