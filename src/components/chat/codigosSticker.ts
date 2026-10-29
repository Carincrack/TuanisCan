/* Los códigos de los stickers de TuanisCan. Son los mismos que acepta
   `enviar_mensaje` en la base: uno nuevo hay que agregarlo en los dos
   lados (y su dibujo en `stickers.tsx`). */
export const CODIGOS_STICKER = [
  "ya-llegue",
  "salimos",
  "hizo-popo",
  "tomo-agua",
  "feliz",
  "jugando",
  "de-regreso",
  "pura-vida",
] as const;

export type CodigoSticker = (typeof CODIGOS_STICKER)[number];

export const esSticker = (codigo: string): codigo is CodigoSticker =>
  (CODIGOS_STICKER as readonly string[]).includes(codigo);
