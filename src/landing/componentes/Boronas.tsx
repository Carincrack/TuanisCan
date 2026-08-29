/* ─────────────────────────────────────────────────────────────
   Las boronas: la capa que va DELANTE de todo.

   Todo lo demás en la portada se mueve más lento que el scroll o
   igual de rápido. Estas van más rápido, y ese es el truco: en el
   mundo real lo que está pegado al ojo barre el campo de visión
   antes que el fondo. Por eso también van desenfocadas — a esa
   distancia el ojo no las puede enfocar— y por eso se salen del
   borde de la banda en vez de quedar acomodadas adentro.

   Las tres cosas van juntas y en el mismo orden: la borona más
   grande es la más borrosa Y la que más recorre. Si una fuera
   grande y nítida, o chica y muy movida, el ojo lee el error
   aunque no sepa nombrarlo.

   ── Por qué dos elementos y no uno ──
   El giro de reposo va en el `<img>` y el parallax en el `<div>`
   de afuera. No es capricho: CSS aplica primero las propiedades
   `translate`/`rotate`/`scale` y DESPUÉS `transform`. Si el giro
   viviera en la misma caja que mueve GSAP —que escribe en
   `transform`—, el desplazamiento vertical saldría inclinado por
   ese giro, y una borona a 60° se iría de costado en vez de subir.
   Separadas, cada una hace lo suyo.

   ── Por qué el desenfoque va en CSS y no horneado ──
   Difuminar un PNG con alfa sin premultiplicar deja un borde
   oscuro: el negro de los píxeles transparentes se derrama sobre
   el sujeto. `filter: blur()` premultiplica por su cuenta y no
   tiene ese problema. Además se afina sin reexportar nada.

   ── Por qué solo desde `xl` ──
   Las boronas viven en el margen que le queda a la banda por
   fuera del contenido. En `xl` ese margen son unos 140 px y las
   piezas llegan hasta 136: lo llenan sin tocar el texto. Más
   angosto que eso el contenido ocupa la pantalla entera y no hay
   margen donde ponerlas — se irían encima de la lectura.
   ───────────────────────────────────────────────────────────── */

interface Borona {
  /** Cuál de los seis recortes de `boronas.png`. */
  pieza: number;
  /** Altura dentro de la banda. */
  y: string;
  /** Distancia al borde en px. Negativa = se sale y la banda la recorta.

      En px y no en porcentaje: el ancho lo fija un `clamp` que casi no
      crece, así que un `-3%` que en `xl` recorta un tercio de la pieza,
      en una pantalla de 2560 se come el 70% de ella. En px el mordisco
      mide lo mismo en toda pantalla. */
  x: number;
  /** Lado del que cuelga. */
  lado: "izq" | "der";
  /** Ancho de referencia en px; el `clamp` lo estira con la pantalla. */
  ancho: number;
  /** Giro de reposo. */
  giro: number;
  /** Radio del desenfoque en px de pantalla. */
  borron: number;
  alfa: number;
  /** Recorrido del parallax. Ver el bloque de arriba. */
  par: number;
  derivaX: number;
  giroPar: number;
}

/* Ocho piezas: cuatro por lado, sin repetir altura entre lados para
   que no se lean como pares. Tabular a propósito — se afina leyendo
   una columna, no ocho objetos. */
// prettier-ignore
const SEMBRADO: Borona[] = [
  { pieza: 3, lado: "izq", y: "9%"  , x: -22, ancho:  74, giro: -18, borron: 5.5, alfa:  0.9, par: 104, derivaX: -11, giroPar:  5 },
  { pieza: 5, lado: "izq", y: "28%" , x:  26, ancho:  44, giro:  34, borron:   3, alfa: 0.72, par:  68, derivaX:   7, giroPar: -6 },
  { pieza: 1, lado: "izq", y: "53%" , x: -38, ancho: 104, giro:   8, borron: 7.5, alfa: 0.85, par: 122, derivaX: -15, giroPar: -4 },
  { pieza: 6, lado: "izq", y: "79%" , x:  14, ancho:  42, giro: -52, borron: 2.5, alfa:  0.7, par:  62, derivaX:   9, giroPar:  7 },
  { pieza: 2, lado: "der", y: "15%" , x:  12, ancho:  60, giro:  24, borron: 4.5, alfa: 0.85, par:  90, derivaX:  11, giroPar: -5 },
  { pieza: 4, lado: "der", y: "39%" , x: -20, ancho:  58, giro: -37, borron: 6.5, alfa:  0.8, par: 112, derivaX:  -9, giroPar:  6 },
  { pieza: 6, lado: "der", y: "64%" , x:  30, ancho:  40, giro:  61, borron: 2.5, alfa:  0.7, par:  64, derivaX:   8, giroPar: -8 },
  { pieza: 3, lado: "der", y: "87%" , x: -14, ancho:  70, giro: -14, borron:   5, alfa: 0.82, par: 100, derivaX: -12, giroPar:  4 },
];

/** El ancho crece con la pantalla, pero nunca menos de 3/4 ni más de 1,4×. */
const medida = (px: number) =>
  `clamp(${Math.round(px * 0.75)}px, ${(px / 14).toFixed(2)}vw, ${Math.round(px * 1.4)}px)`;

/** Cuántas boronas dibujar; `0` las apaga sin tocar el JSX de la banda. */
interface BoronasProps {
  /** Recorta el sembrado a las primeras N. Sin esto van las ocho. */
  cuantas?: number;
  /** Desfase del sembrado, para que dos bandas seguidas no se repitan. */
  desde?: number;
}

const Boronas = ({ cuantas = SEMBRADO.length, desde = 0 }: BoronasProps) => (
  <>
    {SEMBRADO.slice(0, cuantas).map((b, i) => {
      const pieza = ((b.pieza - 1 + desde) % 6) + 1;

      return (
        <div
          key={`${b.lado}-${b.y}-${i}`}
          data-par={b.par}
          data-par-x={b.derivaX}
          data-par-rot={b.giroPar}
          className="pointer-events-none absolute z-20 hidden xl:block"
          style={{
            top: b.y,
            width: medida(b.ancho),
            /* La caja de afuera es la única que se mueve. Prometiéndolo,
               el navegador rasteriza el desenfoque UNA vez en su propia
               capa y después solo la desliza; sin esto vuelve a
               difuminar en cada cuadro del scroll, que es la parte cara. */
            willChange: "transform",
            /* Número pelado: React le pone `px` solo. */
            ...(b.lado === "izq" ? { left: b.x } : { right: b.x }),
          }}
        >
          <img
            src={`/img/borona-${pieza}.webp`}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="w-full select-none"
            style={{
              rotate: `${b.giro}deg`,
              filter: `blur(${b.borron}px)`,
              opacity: b.alfa,
            }}
          />
        </div>
      );
    })}
  </>
);

export default Boronas;
