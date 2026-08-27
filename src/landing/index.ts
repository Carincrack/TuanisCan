/* Punto de entrada de la portada: el resto de la aplicación importa
   de `../landing` y nunca de un archivo interno. */

export { default } from "./Landing";
export { default as Landing } from "./Landing";
export type { LandingProps, ModoAcceso } from "./tipos";
