import { ArrowUpRight } from "lucide-react";

import EncabezadoSeccion from "../componentes/EncabezadoSeccion";
import Onda from "../componentes/Onda";
import { FICHAS_SERVICIOS, MODULOS } from "../datos";
import { AZUL, HUESO, NAVY, TINTA, TINTA_SUAVE } from "../tokens";

/* ─────────────────────────────────────────────────────────────
   Los tres módulos del producto. Banda blanca.

   Abre con la onda azul del hero derramándose sobre el blanco:
   el hero no termina en una línea recta, se vacía en esta banda.
   Es el mismo borde que separa todas las bandas de la portada, y
   se mueve con el scroll.

   No son tarjetas: son filas de una lista. Tres tarjetas iguales
   en fila es la forma más gastada que existe, y además repetía la
   misma caja que usa la banda de abajo — dos cosas distintas se
   leían igual. Como lista, el ojo baja por una columna y cada fila
   tiene su propio momento al pasar el mouse.

   Son tres cosas paralelas, no una secuencia: van sin numerar y
   las tres se pintan igual. El rótulo del pie de cada fila las
   nombra —Paseos, Directorio, Alertas—, que es información real;
   un 01/02/03 sería inventarles un orden que no tienen.

   Las dos fichas de foto van desfasadas y en sentidos contrarios:
   se separan al hacer scroll y arman la profundidad del bloque sin
   robarle la atención al texto.

   Aparecen recién en `xl`. El clúster mide 402 px de ancho y la
   columna izquierda no llega a eso hasta 1280 px de ventana: a
   1024 mide 353 y la segunda foto salía cortada.
   ───────────────────────────────────────────────────────────── */

const [FICHA_ALTA, FICHA_BAJA] = FICHAS_SERVICIOS;

const Servicios = () => (
  <section
    id="servicios"
    className="relative scroll-mt-6 overflow-hidden px-6 pt-32 pb-24 sm:px-10 lg:px-14 lg:pt-40 lg:pb-32"
    style={{ background: HUESO }}
  >
    <Onda color={AZUL} />

    <div className="relative z-10 mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[5fr_7fr] lg:gap-16">
      <div>
        <EncabezadoSeccion
          antetitulo="Qué resuelve"
          lineas={["Tres cosas que hoy", "hacés en tres"]}
          subrayada="lugares distintos."
        />

        <p
          data-anim="apoyo"
          className="mt-7 max-w-[38ch] text-[15px] leading-relaxed"
          style={{ color: TINTA_SUAVE }}
        >
          Un grupo de WhatsApp para el paseador, otro de Facebook para buscar
          veterinaria y la recomendación de un vecino. Acá es una sola cuenta.
        </p>

        {/* Clúster de fichas. Alturas fijas: sin ellas el bloque
            colapsa a cero y las fotos se salen de la banda. */}
        <div className="relative mt-14 hidden h-[318px] xl:block">
          <figure
            data-cursor=""
            className="absolute top-0 left-0 h-[248px] w-[194px] overflow-hidden rounded-[22px] ring-1 ring-[#1a42571f] transition-transform duration-300 ease-out hover:scale-[1.03]"
          >
            <div data-anim="ficha" className="h-full w-full">
              <img
                data-par="34"
                data-par-x="-9"
                data-par-rot="-1.6"
                src={FICHA_ALTA.src}
                alt={FICHA_ALTA.alt}
                loading="lazy"
                decoding="async"
                className="-mt-[42px] -ml-[20px] h-[calc(100%+84px)] w-[calc(100%+40px)] max-w-none object-cover"
              />
            </div>
          </figure>

          <figure
            data-cursor=""
            className="absolute top-[150px] left-[176px] h-[152px] w-[226px] overflow-hidden rounded-[22px] ring-1 ring-[#1a42571f] transition-transform duration-300 ease-out hover:scale-[1.03]"
          >
            <div data-anim="ficha" className="h-full w-full">
              <img
                data-par="-46"
                data-par-x="12"
                data-par-rot="2.1"
                src={FICHA_BAJA.src}
                alt={FICHA_BAJA.alt}
                loading="lazy"
                decoding="async"
                className="-mt-[54px] -ml-[20px] h-[calc(100%+108px)] w-[calc(100%+40px)] max-w-none object-cover"
              />
            </div>
          </figure>
        </div>
      </div>

      <ul data-anim="modulos">
        {MODULOS.map(({ Icon, etiqueta, titulo, texto }, i) => (
          <li key={titulo} data-anim="modulo" data-cursor="" className="group relative">
            {i > 0 && (
              <span
                data-anim="filete"
                aria-hidden
                className="block h-px w-full origin-left bg-[#1a425714]"
              />
            )}

            <div className="flex gap-5 rounded-[22px] px-5 py-8 transition-[background-color,transform] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:bg-[#ddf0f380] sm:gap-7 sm:px-7">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#ddf0f3] transition-colors duration-200 group-hover:bg-white">
                <Icon size={24} strokeWidth={1.9} aria-hidden style={{ color: NAVY }} />
              </span>

              <div className="min-w-0">
                <h3 className="display text-[20px] leading-tight" style={{ color: TINTA }}>
                  {titulo}
                </h3>
                <p
                  className="mt-2.5 max-w-[46ch] text-[14.5px] leading-relaxed"
                  style={{ color: TINTA_SUAVE }}
                >
                  {texto}
                </p>
                <span
                  className="rotulo mt-5 inline-flex items-center gap-1.5"
                  style={{ color: TINTA_SUAVE }}
                >
                  {etiqueta}
                  <ArrowUpRight
                    size={14}
                    strokeWidth={2.4}
                    aria-hidden
                    className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default Servicios;
