import EncabezadoSeccion from "../componentes/EncabezadoSeccion";
import Onda from "../componentes/Onda";
import { MODULOS } from "../datos";
import { AZUL, HUESO, TINTA, TINTA_SUAVE } from "../tokens";

/* ─────────────────────────────────────────────────────────────
   Los tres módulos del producto. Banda blanca.

   Abre con la onda azul del hero derramándose sobre el blanco: el
   hero no termina en una línea recta, se vacía en esta banda. Es
   el mismo borde que separa todas las bandas de la portada, y se
   mueve con el scroll.

   Sin íconos y sin marco. Los tres recortes se apoyan directamente
   sobre la banda —igual que el perro del hero— y se disuelven abajo
   con un degradado, en vez de vivir cada uno dentro de una tarjeta
   redondeada. Una foto recortada sobre el fondo pertenece a la
   página; la misma foto dentro de una caja con borde es una ficha
   pegada encima.

   Son tres cosas paralelas, no una secuencia: van sin numerar. El
   rótulo sobre cada titular las nombra —Paseos, Directorio,
   Alertas—, que es información real; un 01/02/03 les inventaría un
   orden que no tienen. Esa numeración sí existe en "Cómo funciona",
   donde el orden es el contenido.

   Suben en escalera y no en una fila pareja: tres columnas
   exactamente alineadas es la rejilla más vista que hay. El escalón
   es puro CSS —así ya sale bien sin JavaScript— y el paralaje de
   cada foto lo acentúa al hacer scroll.

   ── Por qué el contenido mide 1000 px y no 1320 ──

   Lo manda la fotografía. Las de `public/mock` miden 500 px de
   ancho, todas: en pantalla retina eso las topa en unos 300 px de
   caja —más allá se ven blandas—. Tres columnas de 300 más los
   huecos son 1000. Ese es el ancho real de esta banda.

   El tope va en el CONTENEDOR y no en la rejilla. Con el contenedor
   en 1320 y la rejilla en 1000 quedaban 320 px muertos a la derecha:
   el encabezado terminaba en un sitio, la rejilla en otro y la banda
   en un tercero, tres bordes distintos y ninguno intencional. Con el
   tope arriba, encabezado y rejilla comparten caja y el blanco pasa
   a ser margen simétrico de la banda, que es lo que parece a
   propósito.

   Sube antes de bajar: si algún día las fotos llegan a 900 px de
   ancho, este número puede crecer. Hasta entonces no.

   ── Las capas de cada foto ──

   Se ven como una sola imagen pero son cuatro cajas:

     figure   alto fijo y degradado de abajo (nadie lo anima)
     ficha    escala 0.9 → 1 con el scroll   (GSAP)
     par      sube y baja con el scroll      (GSAP)
     img      crece al pasar el mouse        (CSS)

   `ficha` y `par` tienen que ir separadas. Las dos las mueve GSAP y
   GSAP mete todo en la misma propiedad `transform`: en un mismo
   elemento, el segundo tween pisa al primero.

   El `hover` de la imagen es otra cosa y conviene no confundirlas.
   Tailwind v4 no escribe `transform` para `scale-*`: escribe la
   propiedad independiente `scale`, que el navegador aplica ANTES
   del `transform` y compone con él en vez de perder. O sea que el
   hover funcionaría igual sobre un elemento que GSAP ya esté
   animando. Está en la `img` porque es lo que tiene que crecer
   dentro de un marco quieto, no porque haga falta aislarlo.

   (`transition-transform` sí lo cubre: en v4 esa utilidad declara
   `transform, translate, scale, rotate`.)

   El degradado de abajo es una máscara sobre el `figure` —no sobre
   la imagen— para que la línea donde se desvanece no se mueva con
   el paralaje. Va con `no-repeat`: sin eso el degradado se repite
   fuera de la caja y lo que sobresale por el paralaje reaparece más
   abajo. Con `no-repeat`, fuera de la caja la máscara vale cero y
   recorta — que es justo lo que hace falta ahora que el `figure` ya
   no lleva `overflow-hidden`.

   Por eso el paralaje bajó a 10-18 px y el rótulo se separó a
   `mt-10`: sin marco que recorte, un viaje de 32 px se metía encima
   del texto.

   El alto es fijo y las tres van con `object-contain object-bottom`:
   los tres animales se apoyan en la misma línea aunque sus fotos
   tengan proporciones distintas. Sin eso cada uno flota a su altura
   y la fila se ve torcida.

   La caja `par` sangra por los cuatro lados, y eso tampoco es
   decoración: una imagen que llena su marco exacto deja franjas
   vacías en cuanto se la desplaza dentro de algo con
   `overflow: hidden`. La sangría vertical es `recorrido + 8` por
   lado —cubre el viaje completo y sobra—; la horizontal es fija
   porque ahí no hay viaje, solo tiene que aguantar el 0.9 de la
   escala inicial: 300 px encogidos a 0.9 son 270 y dejarían el
   marco asomando por los costados.

   Los recortes viven en `public/img` y miden 600 px de ancho: a los
   ~290 px que ocupan acá quedan a 2x. De dónde salen y qué se les
   hizo está en `datos.ts`, encima de `MODULOS`.

   ── Los dos juguetes ──

   Uno abajo a la izquierda, otro arriba a la derecha. Son decoración
   pura: `alt` vacío, `aria-hidden` y sin eventos de puntero.

   Van colgados de la BANDA y no del contenedor de 1000 px, y ahí está
   la gracia: la banda va a sangre, el contenido no, y en pantallas
   anchas sobran unos 200 px de blanco a cada lado. Los juguetes se
   meten en ese margen y se salen por el borde —el `overflow-hidden`
   de la sección los recorta—, así que ocupan sitio que hoy está
   vacío en vez de disputárselo al texto.

   Las dos posiciones caen en huecos reales, no aproximados:

     arriba-derecha  el titular se corta en 672 px dentro de 1000, y
                     a su derecha no hay nada. El juguete entra ahí,
                     por fuera del ancho del titular.
     abajo-izquierda la primera columna termina 112 px más arriba que
                     la tercera —eso es el escalón— y debajo van otros
                     128 px de respiro de la banda. Son 240 px de
                     hueco; el juguete mide menos de 200 de alto.

   Si cambia `ESCALON` o el respiro de abajo de la sección, ese
   segundo hueco cambia de tamaño y hay que volver a medir.

   Van ANTES del contenido en el documento y sin `z-index` propio: el
   contenedor ya es `z-10`, así que el texto pinta encima solo. Si
   alguna vez se rozan, gana el texto.

   Desde `lg` nada más. Por debajo la banda no tiene margen de sobra
   y las columnas se apilan: el hueco del escalón no existe.

   La inclinación va por clase y el giro del scroll por `data-par-rot`.
   No se pisan: Tailwind v4 escribe la propiedad `rotate` y GSAP el
   `transform`, y el navegador aplica la primera antes que el segundo,
   así que se suman.
   ───────────────────────────────────────────────────────────── */

/** Cuánto sube y baja cada foto con el scroll, en píxeles.
    Tiene que quedar por debajo del `mt-10` del rótulo: sin marco que
    recorte, lo que viaja de más se le mete encima al texto. */
const PARALAJE = [10, 14, 18];

/** El escalón de cada columna. Crece para que se lea como escalera. */
const ESCALON = ["", "md:mt-14", "md:mt-28"];

const Servicios = () => (
  <section
    id="servicios"
    className="relative scroll-mt-6 overflow-hidden px-6 pt-32 pb-24 sm:px-10 lg:px-14 lg:pt-40 lg:pb-32"
    style={{ background: HUESO }}
  >
    <Onda color={AZUL} tapa={HUESO} />

    {/* El giro va en el `<img>` y el parallax en la caja de afuera.

        Juntos no funcionan: Tailwind v4 emite `rotate-6` como la
        propiedad `rotate`, y GSAP —que escribe en `transform`— la pone
        en `none` al tomar el elemento para no aplicarla dos veces. El
        giro de reposo desaparecía. Y aunque sobreviviera, CSS aplica
        `rotate` ANTES que `transform`, así que el desplazamiento del
        parallax saldría inclinado por ese mismo giro. Separados, cada
        propiedad queda en su caja. */}
    <div
      data-par="-38"
      data-par-rot="3.5"
      className="pointer-events-none absolute top-64 right-[2%] hidden w-[clamp(170px,19vw,290px)] lg:block"
    >
      <img
        src="/img/juguete-plumas.webp"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="w-full rotate-6 select-none"
      />
    </div>

    <div
      data-par="32"
      data-par-rot="-3"
      className="pointer-events-none absolute bottom-10 left-[-2%] hidden w-[clamp(170px,19vw,290px)] lg:block"
    >
      <img
        src="/img/juguete-cuerda.webp"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="w-full -rotate-6 select-none"
      />
    </div>

    <div className="relative z-10 mx-auto max-w-[1000px]">
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

      <ul
        data-anim="modulos"
        className="mt-20 grid gap-14 md:grid-cols-3 md:gap-8 lg:gap-12"
      >
        {MODULOS.map(({ foto, etiqueta, titulo, texto }, i) => (
          <li key={titulo} data-anim="modulo" className={`group ${ESCALON[i]}`}>
            <figure
              data-cursor=""
              className="recorte relative h-[clamp(230px,30vw,380px)] w-full"
            >
              <div data-anim="ficha" className="h-full w-full">
                <div data-par={PARALAJE[i]} className="h-full w-full">
                  <img
                    src={foto.src}
                    alt={foto.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full origin-bottom object-contain object-bottom transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </div>
              </div>
            </figure>

            <span className="rotulo mt-10 block" style={{ color: TINTA_SUAVE }}>
              {etiqueta}
            </span>
            <h3
              className="display mt-2 text-[20px] leading-tight"
              style={{ color: TINTA }}
            >
              {titulo}
            </h3>
            <p
              className="mt-2.5 text-[14.5px] leading-relaxed"
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
