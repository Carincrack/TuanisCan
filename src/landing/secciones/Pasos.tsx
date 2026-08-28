import EncabezadoSeccion from "../componentes/EncabezadoSeccion";
import Onda from "../componentes/Onda";
import { PASEADORES_DESTACADOS, PASOS } from "../datos";
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

    {/* La banda va a sangre; el contenido no. Sin tope, las líneas se
        vuelven ilegibles en pantallas anchas. */}
    <div className="relative z-10 mx-auto max-w-[1320px]">
      <EncabezadoSeccion
        antetitulo="Cómo funciona"
        lineas={["Tres pasos y tu perro", "ya anda"]}
        subrayada="paseando."
      />

      <ol data-anim="ruta" className="mt-16 max-w-[720px]">
        {PASOS.map(({ titulo, texto }, i) => (
          <li
            key={titulo}
            className="group flex flex-col gap-2 border-b py-9 transition-transform duration-300 ease-out first:pt-0 hover:translate-x-1.5 sm:flex-row sm:items-baseline sm:gap-10 md:py-11"
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

      <div data-anim="prueba" className="mt-16 flex items-center gap-3.5">
        <div className="flex -space-x-3">
          {PASEADORES_DESTACADOS.map((w) => (
            <img
              key={w}
              data-anim="cara"
              src={`/mock/${w}.jpg`}
              alt=""
              aria-hidden
              loading="lazy"
              className="h-11 w-11 rounded-full border-[3px] object-cover transition-transform duration-200 ease-out hover:-translate-y-1"
              style={{ borderColor: CIELO }}
            />
          ))}
        </div>
        <p
          data-anim="nota"
          className="text-[13.5px] leading-tight font-medium"
          style={{ color: TINTA }}
        >
          Paseadores verificados
          <br />
          en el Gran Área Metropolitana
        </p>
      </div>
    </div>
  </section>
);

export default Pasos;
