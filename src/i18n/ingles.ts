import { construirDiccionario, type JsonObject } from "./translations";

/* Todos los textos en inglés, juntos en un solo trozo. `translations.ts`
   lo importa con `import()` la primera vez que alguien elige inglés (o
   entra con el inglés ya elegido), así que no viaja en el paquete
   principal. Agregar un dominio sigue siendo solo crear el JSON. */
const modulos = import.meta.glob("../locales/en/*.json", { eager: true }) as Record<
  string,
  { default: JsonObject }
>;

export default construirDiccionario(modulos);
