import { useState } from "react";
import { MARCA } from "../../lib/nav";
import Barra from "./Barra";
import ConmutadorPublico from "../componentes/ConmutadorPublico";
import PildoraCTA from "../componentes/PildoraCTA";
import { Correa, Rayas } from "../componentes/Garabatos";
import { PUBLICOS, type ClavePublico } from "../datos";
import { AZUL, CIELO, NAVY, TINTA } from "../tokens";
import type { ConAcceso } from "../tipos";

/* ─────────────────────────────────────────────────────────────
   Hero a pantalla completa.

   Composición de la referencia (`src/resources`): el perro
   recortado, grande, pegado al fondo de la banda y cortado por el
   borde de abajo, con las píldoras flotando en las dos esquinas.

   El perro vive dentro del "escenario" —el bloque que se queda con
   el espacio que sobra— y no pegado a la sección. Eso es lo que
   garantiza que NUNCA pueda subirse encima del wordmark: por corta
   que sea la pantalla, el escenario empieza donde termina el texto
   y el perro no puede salirse de él. Un alto fijo en `dvh` sí se
   le montaría encima en pantallas bajas y anchas, donde el
   wordmark crece con el ancho y el alto disponible no.

   `object-contain object-bottom` hace el resto: la foto se acomoda
   al escenario sin deformarse y se apoya en el borde de abajo.

   Desde `lg` la caja crece un poco por debajo de ese borde, y con
   ella el perro. No es adorno: la onda que separa las dos bandas
   pinta el AZUL del hero POR DEBAJO del borde, y `#7EA3B4` contra
   blanco se lee como una franja gris. Sin el estirón las patas
   quedan a media franja, flotando, y el corte se ve como un hueco.

   El desborde tiene que PASARSE de la curva, no quedarse justo en
   ella. Quien decide dónde termina el perro es la `tapa` de la onda:
   el blanco de la banda de abajo se pinta encima y lo recorta. Así
   el corte lo da la curva —que se mueve con el scroll— y no el alto
   de la foto, que es fijo.

   El rango a cubrir: la curva baja entre el 29% y el 44.25% de su
   alto en el centro, que es por donde va el perro. Con la onda en
   `clamp(44px, 6vw, 88px)`, el punto más hondo va de 20 a 39 px.
   `clamp(30px, 4vw, 62px)` se pasa de eso en todo el rango y sigue
   quedando corto contra el alto de la onda, que es lo que marca el
   otro límite: si el desborde superara ese alto, el perro asomaría
   por debajo de la tapa.

   Va en el ALTO y no en un `bottom` negativo. Un `img` es elemento
   reemplazado: con `position: absolute`, `top` y `bottom` juntos no
   lo estiran como a un `div` —toma su tamaño intrínseco y descarta
   el `bottom`—, así que sin `h-full` la foto sale a 1129 × 1393
   pegada arriba a la izquierda. Con el alto en `100% + franja` y
   `top` en cero la caja crece hacia abajo, y `object-contain` mide
   contra la caja: el perro crece con ella sin mover su borde de
   arriba, que es lo que lo mantiene lejos del wordmark.

   Solo desde `lg`. Por debajo las píldoras van en flujo y el
   escenario termina encima de ellas, no en el borde de la banda:
   estirarlo ahí solo metería al perro detrás de las píldoras.

   Dos cosas lo sostienen y las dos son fáciles de romper:

   1. `overflow-x-clip` y no `overflow-hidden`. Hace falta recortar a
      lo ancho —el wordmark va `nowrap` y en pantallas angostas se
      sale—, pero `hidden` recorta también a lo alto y se comería el
      estirón. `clip` es el único valor que deja el otro eje en
      `visible` sin convertirlo en `auto`.
   2. El `z-10` de la banda. `container-type: inline-size` implica
      `contain: layout`, y eso convierte a la sección en un contexto
      de apilado: el `z-10` de la foto ya no sale de acá. Sin subir
      la banda entera, la sección siguiente —que va después en el
      documento— pintaría encima y taparía las patas.

   Va con `min-h-dvh` y no `h-dvh`: si el contenido no cupiera, la
   banda crece y se puede bajar. Con altura fija se cortarían las
   píldoras sin forma de llegar a ellas. Y `dvh` en vez de `vh`
   porque en móvil la barra del navegador aparece y desaparece.
   ───────────────────────────────────────────────────────────── */

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
          <span className="wordmark" aria-hidden style={{ color: NAVY }}>
            {MARCA.nombre.toUpperCase()}
            <span style={{ color: CIELO }}>{MARCA.acento.toUpperCase()}</span>
          </span>
          <span className="sr-only">
            {MARCA.completo} — paseos, veterinarias y mascotas perdidas en Costa Rica
          </span>
        </h1>

        <div className="mx-auto max-w-xl px-6 pt-4 text-center">
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
          className="anim-entra absolute inset-0 z-10 h-full w-full object-contain object-bottom lg:h-[calc(100%+clamp(30px,4vw,62px))]"
        />

        <Rayas className="absolute bottom-[34%] left-[6%] z-20 w-[6cqw] max-w-[130px] min-w-[48px] sm:left-[14%] lg:left-[20%]" />
        <Correa className="absolute bottom-[6%] left-[70%] z-20 w-[26cqw] max-w-[420px] min-w-[170px] -translate-x-2/7"/>
      </div>

      {/* ── Píldoras ──
          Desde `lg` se despegan y flotan en las esquinas de la banda,
          con el perro pasando por detrás. En móvil van en flujo y
          apiladas: superpuestas sobre una pantalla angosta taparían
          al perro entero. */}
      <div className="relative z-30 flex flex-col items-center gap-3 px-5 pt-4 pb-6 sm:px-8 sm:pb-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex-row lg:items-end lg:justify-between lg:pt-0">
        <PildoraCTA onClick={() => onEntrar("registro")}>{actual.cta}</PildoraCTA>
        <ConmutadorPublico valor={publico} onCambio={setPublico} />
      </div>
    </section>
  );
};

export default Hero;
