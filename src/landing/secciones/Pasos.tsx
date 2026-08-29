import EncabezadoSeccion from "../componentes/EncabezadoSeccion";
import Boronas from "../componentes/Boronas";
import Onda from "../componentes/Onda";
import { PASOS } from "../datos";
import { AZUL_HONDO, CIELO, HUESO, TINTA, TINTA_SUAVE } from "../tokens";

/* ─────────────────────────────────────────────────────────────
   Cómo funciona. Banda celeste, entre dos bandas blancas.

   Tercera vuelta. Las dos anteriores vestían el paso de tarjeta con
   foto —primero con insignia circular, después alineada a la
   izquierda igual que "Qué resuelve"— y ahí estaba el problema real:
   "Qué resuelve" YA es fotografía. Si esta banda repite esa misma
   ropa, la página dice la misma frase dos veces con distinto disfraz
   en vez de dos ideas distintas.

   Acá no hay foto. El peso lo lleva la tipografía: un número grande
   y sobrio por fila, el titular al lado, un filete que cierra cada
   fila. Es una lista editorial —la que usan las agencias en su
   sección de servicios—, no una rejilla de tarjetas, y por eso el
   contenedor es angosto (`max-w-[720px]`) en vez de estirarse a lo
   ancho de la banda: una línea de texto de 1300 px es ilegible, y
   un número gigante necesita aire de sobra a los lados para leerse
   como número y no como fondo.

   Una sola columna. El contenido se topa en 1000 px, el mismo ancho
   que "Qué resuelve", para que las dos bandas compartan borde
   izquierdo y derecho: dos cajas distintas una encima de otra se
   notan al hacer scroll aunque nadie sepa decir por qué.

   Dentro de esa caja la lista se queda en 720 px y el encabezado en
   672. Los dos son angostos y por la misma razón —una línea de texto
   de 1000 px no se lee—, así que el blanco de la derecha es el mismo
   de arriba abajo y se lee como columna, no como hueco.

   ── El plato ──

   A la derecha, grande, en el blanco que deja la lista. Es
   decoración: `alt` vacío, `aria-hidden` y sin eventos de puntero.

   Cuelga de la BANDA y no del contenedor, igual que los juguetes de
   "Qué resuelve": la banda va a sangre y el contenido se topa en
   1000 px, así que en pantallas anchas hay margen de sobra donde
   meterlo sin quitarle sitio a nadie.

   El hueco es real y se mide: la lista se queda en 720 px de los
   1000 del contenedor, o sea que a su derecha quedan 280 px libres,
   más el margen de la banda. A 1280 px de ventana el plato empieza
   62 px después de donde termina la lista; más ancho, más aire.

   Desde `xl` y no desde `lg`. A 1024 el contenedor se queda en 912
   —lo recorta el respiro lateral de la banda— y el plato se le
   montaría a la lista por unos 40 px. A 1280 ya no.

   La altura busca el paso 02. Medido desde arriba de la banda: el
   respiro (160) + el encabezado (~167) + el `mt-16` de la lista (64)
   la ponen a arrancar cerca de 391 px; la primera fila mide ~130 y
   la segunda ~174, así que la cifra "02" cae alrededor de 564. Con
   `bottom-56` el plato ocupa de 544 a 772: el 02 queda en su tercio
   de arriba y el centro del plato, a la altura de esa fila.

   Va en píxeles y no en porcentaje a propósito. Un porcentaje se
   mide contra el alto TOTAL de la sección, así que cualquier texto
   que crezca una línea movería el plato solo, y justo lo que hay que
   sostener es su relación con una fila concreta.

   Ojo: esos números salen de medir cuerpos y renglones, no de una
   captura. Si en pantalla no coincide, el único valor a mover es
   `bottom-56` — cada paso de la escala son 4 px.

   Las filas no se mueven al pasar el mouse. Un `hover` promete
   que algo va a pasar al hacer clic, y acá no pasa nada: no son
   enlaces, son los tres pasos. La lista se lee, no se toca.

   El número va en `AZUL_HONDO`, el tono que `tokens.ts` documenta
   como "para la banda de pasos" desde el principio y que nadie
   había usado todavía. No es NAVY —el color que ya llevan la marca,
   los botones y el rótulo turquesa en todas las demás bandas—, así
   que esta sección se distingue por su propio acento y no solo por
   el layout.
   ───────────────────────────────────────────────────────────── */

const Pasos = () => (
  <section
    id="pasos"
    className="relative scroll-mt-6 overflow-hidden px-6 pt-32 pb-24 sm:px-10 lg:px-14 lg:pt-40 lg:pb-32"
    style={{ background: CIELO }}
  >
    <Onda color={HUESO} />

    <Boronas />

    <img
      src="/img/plato-comida.webp"
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      data-par="30"
      className="pointer-events-none absolute right-[9%] bottom-72 hidden w-[clamp(230px,24vw,360px)] select-none xl:block"
    />

    {/* La banda va a sangre; el contenido no. Sin tope, las líneas se
        vuelven ilegibles en pantallas anchas. */}
    <div className="relative z-10 mx-auto max-w-[1000px]">
      <EncabezadoSeccion
        antetitulo="Cómo funciona"
        lineas={["Tres pasos y tu perro", "ya anda"]}
        subrayada="paseando."
      />

      <ol data-anim="ruta" className="mt-16 max-w-[720px]">
        {PASOS.map(({ titulo, texto }, i) => (
          <li
            key={titulo}
            className="flex flex-col gap-2 border-b py-9 first:pt-0 sm:flex-row sm:items-baseline sm:gap-10 md:py-11"
            style={{ borderColor: "#1a425722" }}
          >
            <span
              data-anim="cifra"
              aria-hidden
              className="display text-[46px] leading-none sm:w-[108px] sm:shrink-0 sm:text-[54px]"
              style={{ color: AZUL_HONDO }}
            >
              0{i + 1}
            </span>

            <div data-anim="paso" className="min-w-0">
              <h3 className="display text-[20px] leading-tight sm:text-[22px]" style={{ color: TINTA }}>
                {titulo}
              </h3>
              <p
                className="mt-2.5 max-w-[50ch] text-[14.5px] leading-relaxed"
                style={{ color: TINTA_SUAVE }}
              >
                {texto}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default Pasos;
