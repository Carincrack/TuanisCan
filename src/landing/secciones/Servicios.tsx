import EncabezadoSeccion from "../componentes/EncabezadoSeccion";
import Onda from "../componentes/Onda";
import { MODULOS } from "../datos";
import { AZUL, HUESO, TINTA, TINTA_SUAVE } from "../tokens";

/* ─────────────────────────────────────────────────────────────
   Los tres módulos del producto. Banda blanca.

   Abre con la onda azul del hero derramándose sobre el blanco:
   el hero no termina en una línea recta, se vacía en esta banda.
   Es el mismo borde que separa todas las bandas de la portada, y
   se mueve con el scroll.

   Antes eran filas de ícono + texto, con un clúster de fotos
   decorativas aparte que solo aparecía desde `xl` — por debajo de
   eso la columna quedaba con el encabezado y nada más. La
   referencia (era-residence.com) no lleva ni un ícono en su bloque
   de tres: la elegancia sale de una foto real por punto y de aire
   alrededor, no de un cuadrito de color. Acá cada módulo lleva su
   propia foto, siempre visible, así que nunca hay una banda a medio
   llenar.

   Son tres cosas paralelas, no una secuencia: van sin numerar. El
   rótulo sobre cada titular las nombra —Paseos, Directorio,
   Alertas—, que es información real; un 01/02/03 les inventaría un
   orden que no tienen.

   Suben en escalera (`md:mt-*` creciente) en vez de alinearse en
   una fila perfecta: tres columnas exactamente parejas es la rejilla
   más vista que hay. El escalón es puro CSS —así ya sale bien sin
   JavaScript— y el `data-par` de cada foto lo acentúa un poco más
   al hacer scroll.

   Las fotos de `public/mock` miden 500 px de ancho (ver el comentario
   de cabecera en `datos.ts`): por eso la ficha no estira a lo ancho
   de su columna, se queda en 280 px como máximo. Pasado eso se ven
   blandas en pantalla retina — la disciplina es la misma que ya usa
   el resto de la portada. */

const ESCALON = ["", "md:mt-10", "md:mt-20"];

const Servicios = () => (
  <section
    id="servicios"
    className="relative scroll-mt-6 overflow-hidden px-6 pt-32 pb-24 sm:px-10 lg:px-14 lg:pt-40 lg:pb-32"
    style={{ background: HUESO }}
  >
    <Onda color={AZUL} tapa={HUESO} />

    <div className="relative z-10 mx-auto max-w-[1320px]">
      <EncabezadoSeccion
        antetitulo="Qué resuelve"
        lineas={["Tres cosas que hoy", "hacés en tres"]}
        subrayada="lugares distintos."
      />

      <p
        data-anim="apoyo"
        className="mt-7 max-w-[42ch] text-[15px] leading-relaxed"
        style={{ color: TINTA_SUAVE }}
      >
        Un grupo de WhatsApp para el paseador, otro de Facebook para buscar
        veterinaria y la recomendación de un vecino. Acá es una sola cuenta.
      </p>

      <ul data-anim="modulos" className="mt-20 grid gap-16 md:grid-cols-3 md:gap-10">
        {MODULOS.map(({ foto, etiqueta, titulo, texto }, i) => (
          <li key={titulo} data-anim="modulo" className={`group ${ESCALON[i]}`}>
            <figure
              data-cursor=""
              className="aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-[24px] ring-1 ring-[#1a42571f]"
            >
              <div data-anim="ficha" className="h-full w-full">
                <img
                  data-par={30 + i * 12}
                  data-par-x={i % 2 === 0 ? -8 : 8}
                  data-par-rot={i % 2 === 0 ? -1.8 : 1.8}
                  src={foto.src}
                  alt={foto.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                />
              </div>
            </figure>

            <span
              className="rotulo mt-6 block max-w-[280px]"
              style={{ color: TINTA_SUAVE }}
            >
              {etiqueta}
            </span>
            <h3
              className="display mt-2 max-w-[280px] text-[20px] leading-tight"
              style={{ color: TINTA }}
            >
              {titulo}
            </h3>
            <p
              className="mt-2.5 max-w-[280px] text-[14.5px] leading-relaxed"
              style={{ color: TINTA_SUAVE }}
            >
              {texto}
            </p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default Servicios;
