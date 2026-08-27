/* ─────────────────────────────────────────────────────────────
   Paleta y tipografía de la portada.

   La composición viene de la referencia en `src/resources`
   (voldogfood.com): banda a sangre, wordmark gigante cruzando la
   pantalla, perro grande, garabatos a mano y píldoras en las
   esquinas.

   Los colores NO. Salen enteros del `@theme` de `index.css`, que
   es el sistema de la aplicación — azules suaves alrededor del
   turquesa del logo. Ni un verde salvia ni un lima ácido: eso era
   de la referencia, no nuestro.

   Cada valor de acá abajo existe ya en el sistema. Se repiten como
   constantes y no se leen con `var()` porque varias van dentro de
   atributos `style` y de SVG, donde una utilidad de Tailwind no
   llega.
   ───────────────────────────────────────────────────────────── */

/** `--color-rail-mute`. El azul suave: fondo de la banda del hero. */
export const AZUL = "#7EA3B4";
/** `--color-rail-hover`. Un paso más hondo, para la banda de pasos. */
export const AZUL_HONDO = "#245B74";
/** `--color-rail`. El azul del logo: wordmark, botones y fondo de página. */
export const NAVY = "#1A4257";

/** `--color-ink` y su versión rebajada, para las bandas claras. */
export const TINTA = "#14242E";
export const TINTA_SUAVE = "#526670";

/** `--color-accent-wash`. El pálido que hace de acento sobre el azul. */
export const CIELO = "#DDF0F3";
/** `--color-canvas` y `--color-surface`. */
export const CANVAS = "#EEF2F4";
export const HUESO = "#FFFFFF";

/** `--color-accent`. El turquesa del logo. */
export const TURQUESA = "#14A3B8";

/* ── Contraste ─────────────────────────────────────────────────
   Comprobado contra WCAG AA:

     NAVY   sobre AZUL         4.0:1  ← wordmark; es texto grande (3:1)
     CIELO  sobre AZUL         2.3:1  ← solo relleno gigante, nunca texto
     TINTA  sobre AZUL         6.0:1  ← navegación y texto corrido
     HUESO  sobre AZUL_HONDO   7.4:1
     HUESO  sobre NAVY        10.7:1
     TINTA  sobre CANVAS      12.5:1
     TINTA  sobre CIELO       13.6:1  ← banda de pasos
     NAVY   sobre CIELO        9.1:1
     TINTA_SUAVE sobre CIELO   5.1:1
     TURQUESA sobre HUESO      3.0:1  ← justo el mínimo; solo iconos
     TURQUESA sobre CIELO      2.6:1  ← nunca texto; hitos y filetes

   El turquesa sobre AZUL da 1.1:1 — desaparece. Por eso el acento
   sobre el azul suave es el pálido CIELO y no el turquesa, y el
   turquesa queda para formas sobre fondo claro (los círculos de
   las píldoras), donde sí se ve.

   Blanco sobre AZUL da 2.7:1: no se usa en ningún texto. */
