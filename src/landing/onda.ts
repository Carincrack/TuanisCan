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

/** Hasta dónde bajan al recorrer la sección: de `REPOSO` a esto. */
export const RECORRIDO = 0.85;

/** Panza de la curva. Más alto, más redonda. */
const PANZA = 0.7;

/* El `viewBox` es 100 × 100 con `preserveAspectRatio="none"`: el
   path se estira al ancho y al alto reales de la caja, así que
   estos números son porcentajes, no píxeles.

   `y` es dónde arrancan los dos extremos. El control de la curva
   va al lado contrario, así que cuando los extremos bajan el
   centro sube. De ahí el balanceo. */
const curva = (y: number) => ({
  extremo: y * 100,
  control: (1 - y) * 100 * PANZA,
});

/** El color de la banda de ARRIBA: rellena por encima de la curva. */
export const trazarOnda = (y: number): string => {
  const { extremo, control } = curva(y);

  return `M0,0 L0,${extremo} C25,${control} 75,${control} 100,${extremo} L100,0 Z`;
};

/* El complementario: misma curva, cerrada contra el borde de abajo
   en vez del de arriba.

   Existe porque el perro del hero se desborda sobre esta banda. Sin
   esta capa el desborde tapa el corte y el perro queda montado
   encima del blanco; con ella el blanco se pinta ENCIMA del perro y
   la curva lo recorta. Deja de importar cuánto se desborde: pase lo
   que pase con el scroll, nunca asoma franja azul bajo las patas ni
   sobra perro sobre el blanco. */
/** El color de la banda de ABAJO: rellena por debajo de la curva. */
export const trazarOndaBajo = (y: number): string => {
  const { extremo, control } = curva(y);

  return `M0,100 L0,${extremo} C25,${control} 75,${control} 100,${extremo} L100,100 Z`;
};
