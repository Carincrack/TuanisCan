import EncabezadoSeccion from "../componentes/EncabezadoSeccion";
import Onda from "../componentes/Onda";
import { PASEADORES_DESTACADOS, PASOS } from "../datos";
import { CIELO, HUESO, NAVY, TINTA, TINTA_SUAVE, TURQUESA } from "../tokens";

/* ─────────────────────────────────────────────────────────────
   Cómo funciona. Banda celeste, entre dos bandas blancas.

   Esto sí es una secuencia —no se puede pedir un paseo sin haber
   registrado la mascota— así que se dibuja como recorrido: un
   riel, un hito por paso y el texto colgando. Antes eran tres
   tarjetas blancas idénticas a las de la banda de arriba, y hacían
   leer dos cosas distintas como si fueran la misma.

   Detrás de cada paso va su cifra en grande, casi transparente, y
   cada una se mueve a distinta velocidad y con distinta deriva al
   hacer scroll. Es la única capa de profundidad de la banda: no
   hace falta una foto para que el bloque tenga fondo.

   El riel corre en horizontal desde `md` y en vertical en el
   teléfono; el mismo elemento cambia de eje con las utilidades del
   breakpoint. Se desvanece en la punta para que la línea no siga
   de largo después del último hito.

   Geometría: en vertical el riel va en x=21 con 2px de ancho —eje
   en 22— y el hito de 16px en x=14, o sea centro 22. En horizontal
   el riel va en y=7 y el hito en y=0: los dos con centro en 8.
   Si se toca un número hay que tocar el otro.
   ───────────────────────────────────────────────────────────── */

const RIEL =
  "pointer-events-none absolute top-1 bottom-1 left-[21px] w-[2px] origin-top " +
  "bg-[linear-gradient(180deg,#1a425733_0%,#1a425733_86%,#1a425700_100%)] " +
  "md:top-[7px] md:right-0 md:bottom-auto md:left-0 md:h-[2px] md:w-auto md:origin-left " +
  "md:bg-[linear-gradient(90deg,#1a425733_0%,#1a425733_72%,#1a425700_100%)]";

/* Distinta velocidad y distinta deriva por cifra: sin el desfase
   las tres se mueven en bloque y el efecto desaparece. */
const DESFASE = [
  { par: 30, x: -7, rot: -1.8 },
  { par: 48, x: 5, rot: 1.4 },
  { par: 66, x: -4, rot: 2.2 },
];

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

      <div data-anim="ruta" className="relative mt-16">
        <span data-anim="riel" aria-hidden className={RIEL} />

        <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
          {PASOS.map(({ titulo, texto }, i) => (
            <li key={titulo} className="relative overflow-hidden pl-14 md:pt-14 md:pl-0">
              <span
                data-anim="hito"
                aria-hidden
                className="absolute top-0 left-[14px] z-10 h-4 w-4 rounded-full border-[3px] md:left-0"
                style={{ background: TURQUESA, borderColor: CIELO }}
              />

              <span
                data-par={DESFASE[i].par}
                data-par-x={DESFASE[i].x}
                data-par-rot={DESFASE[i].rot}
                aria-hidden
                className="display pointer-events-none absolute -top-3 right-0 z-0 text-[104px] leading-none select-none md:top-9"
                style={{ color: "#1a42571a" }}
              >
                {i + 1}
              </span>

              <div data-anim="paso" className="relative z-10">
                <span className="rotulo block" style={{ color: NAVY }}>
                  Paso {i + 1}
                </span>
                <h3
                  className="display mt-3.5 text-[20px] leading-tight"
                  style={{ color: TINTA }}
                >
                  {titulo}
                </h3>
                <p
                  className="mt-3 max-w-[38ch] text-[14.5px] leading-relaxed"
                  style={{ color: TINTA_SUAVE }}
                >
                  {texto}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

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
