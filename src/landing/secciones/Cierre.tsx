import Boronas from "../componentes/Boronas";
import Onda from "../componentes/Onda";
import PildoraCTA from "../componentes/PildoraCTA";
import Subrayado from "../componentes/Subrayado";
import TitularPartido from "../componentes/TitularPartido";
import { Correa } from "../componentes/Garabatos";
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

    {/* `desde` corre el sembrado dos recortes: las dos bandas van
        pegadas y con las mismas piezas en las mismas alturas se
        vería el patrón repetido al pasar de una a la otra. */}
    <Boronas desde={2} />

    <div
      data-par="52"
      data-par-x="-14"
      data-par-rot="-2.4"
      className="pointer-events-none absolute -top-10 -right-14 z-0 w-[62%] max-w-[440px] opacity-[0.13]"
    >
      <Correa diferido className="w-full" />
    </div>

    {/* La croqueta, arriba a la izquierda del bloque de texto.

        Va en `-34` contra el `52` de la correa: signos opuestos,
        así las dos piezas se separan al hacer scroll y aparece la
        profundidad. Con el mismo signo subirían en bloque y el
        parallax no se notaría.

        `top-24` la deja por debajo de la onda —que mide como
        mucho 88 px— y por encima del rótulo, que arranca en el
        `pt-44` de la banda.

        Desde `lg`: más abajo el texto ocupa el ancho entero de la
        pantalla y la croqueta le caería encima. */}
    {/* El giro va en el `<img>` y el parallax en la caja de afuera.

        Juntos no funcionan: Tailwind v4 emite `rotate-6` como la
        propiedad `rotate`, y GSAP —que escribe en `transform`— la pone
        en `none` al tomar el elemento para no aplicarla dos veces. El
        giro de reposo desaparecía. Y aunque sobreviviera, CSS aplica
        `rotate` ANTES que `transform`, así que el desplazamiento del
        parallax saldría inclinado por ese mismo giro. Separados, cada
        propiedad queda en su caja. */}
    <div
      data-par="-34"
      data-par-x="9"
      data-par-rot="4"
      className="pointer-events-none absolute top-24 left-[3%] z-0 hidden w-[clamp(110px,12vw,180px)] lg:block"
    >
      <img
        src="/img/croqueta.webp"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="w-full -rotate-12 select-none"
      />
    </div>

    {/* La mordida, abajo a la derecha. Cierra la diagonal que abre la
        entera: una arriba a la izquierda, la otra abajo a la derecha,
        y el texto pasa por el medio.

        ── Por qué NO lleva el mismo ancho que la entera ──
        La entera mide 1253 px de sujeto en su lámina y se dibuja a 180;
        la mordida mide 1118. Con el mismo `clamp` para las dos, la
        mordida saldría un 12 % MÁS grande que la entera, que es al
        revés de lo que cuenta: un mordisco saca material. Los 10.7vw
        de acá son los 12vw de la entera por 1118/1253, así que las dos
        comparten escala real y la mordida se ve apenas más chica.

        Gira al otro lado —+14° contra los −12° de la entera— para que
        el par no se lea como el mismo sello estampado dos veces.

        El parallax va parecido al de la entera pero no igual: mismo
        plano de fondo, deriva al revés, para que no se muevan
        calcadas. */}
    <div
      data-par="-30"
      data-par-x="-8"
      data-par-rot="-5"
      className="pointer-events-none absolute right-[4%] bottom-16 z-0 hidden w-[clamp(98px,10.7vw,161px)] lg:block"
    >
      <img
        src="/img/croqueta-mordida.webp"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="w-full rotate-[14deg] select-none"
      />
    </div>

    <div className="relative z-10 mx-auto max-w-2xl text-center">
      <span
        data-anim="linea-cierre"
        className="rotulo block"
        style={{ color: TINTA_SUAVE }}
      >
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
        Crear la cuenta toma un minuto y no cuesta nada. Registrás a tu mascota
        y ya podés pedir el primer paseo.
      </p>

      <div data-anim="linea-cierre" className="mt-10 flex justify-center">
        <PildoraCTA tono="hondo" onClick={() => onEntrar("registro")}>
          Crear cuenta gratis
        </PildoraCTA>
      </div>

      <p
        data-anim="linea-cierre"
        className="mt-6 text-[13px]"
        style={{ color: TINTA_SUAVE }}
      >
        Sin tarjeta. Cancelás cuando querás.
      </p>
    </div>
  </section>
);

export default Cierre;
