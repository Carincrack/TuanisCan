/* ─────────────────────────────────────────────────────────────
   «HOY» ES HOY EN COSTA RICA

   `new Date().toISOString().slice(0, 10)` da la fecha en UTC, seis
   horas adelante de Costa Rica: desde las 6 p. m. ya es «mañana». Con
   eso el formulario de paseo no dejaba elegir hoy, el recargo de mismo
   día caía en el día equivocado y «Paseo activo» no encontraba el paseo
   de hoy. La base usa lo mismo: `public.hoy_cr()`.
   ───────────────────────────────────────────────────────────────── */

const ZONA = "America/Costa_Rica";

/** «AAAA-MM-DD» de hoy en Costa Rica. `en-CA` escribe justo ese orden. */
export const hoyEnCostaRica = () => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());

/** «AAAA-MM-DD» de mañana en Costa Rica. */
export const mananaEnCostaRica = () => {
  const [a, m, d] = hoyEnCostaRica().split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
};
