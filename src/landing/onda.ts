/* ─────────────────────────────────────────────────────────────
   Geometría del borde entre bandas.

   Vive fuera del componente porque la comparten dos: el SVG que
   pinta el estado en reposo y el motor de `animacion.ts`, que
   reescribe el `path` en cada frame del scroll. Los dos tienen
   que dibujar exactamente la misma curva o el primer repintado da
   un salto.
   ───────────────────────────────────────────────────────────── */

/** Cuánto bajan los dos extremos, en reposo. 0 = pegados al techo. */
export const REPOSO = 0.3;

/** Hasta dónde bajan al recorrer la sección: de 0 a esto. */
export const RECORRIDO = 0.62;

/** Panza de la curva. Más alto, más redonda. */
const PANZA = 0.7;

/* El `viewBox` es 100 × 100 con `preserveAspectRatio="none"`: el
   path se estira al ancho y al alto reales de la caja, así que
   estos números son porcentajes, no píxeles.

   `y` es dónde arrancan los dos extremos. El control de la curva
   va al lado contrario, así que cuando los extremos bajan el
   centro sube. De ahí el balanceo. */
export const trazarOnda = (y: number): string => {
  const extremo = y * 100;
  const control = (1 - y) * 100 * PANZA;

  return `M0,0 L0,${extremo} C25,${control} 75,${control} 100,${extremo} L100,0 Z`;
};
