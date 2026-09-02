import type { Zona } from "../types/auth.types";

/* ─────────────────────────────────────────────────────────────
   EL CATÁLOGO DE ZONAS

   La tabla trae una fila por distrito, con su cantón y su provincia
   repetidos al lado:

     { provincia: "Alajuela", canton: "Alajuela", nombre: "Carrizal",
       distrito: "Carrizal" }

   Son más de quinientas filas. Volcarlas en un solo desplegable no
   es filtrar: es la misma tabla otra vez, en vertical y sin
   contexto —hay un "San Isidro" en cuatro provincias, y en la lista
   plana salen cuatro filas idénticas—. Se busca bajando por la
   jerarquía, que es como está armada la división territorial y como
   la tiene en la cabeza quien busca.

   Acá viven las dos piezas que esa bajada necesita en todas las
   pantallas que la usan. El encadenado en sí está en
   `useZonasEncadenadas`.
   ───────────────────────────────────────────────────────────── */

/** Las etiquetas del escalón sin elegir. Son valores, no adornos:
    también se guardan en el estado de los filtros. */
export const TODAS = "Todas";
export const TODOS = "Todos";

/** El distrito de una fila.

    El nombre del distrito está en `nombre`, y la tabla tiene además
    una columna `distrito` que suele traer lo mismo. Se prefiere
    `distrito` cuando trae algo y se cae a `nombre` cuando llega
    vacía, que es como se comportaba parte del catálogo. Sin esta
    caída, el tercer filtro salía con una sola opción y la columna
    "Distrito" en blanco. */
export const distritoDe = (zona: Zona) => zona.distrito?.trim() || zona.nombre;

/** Compara sin acentos ni mayúsculas. "Pérez Zeledón" y "perez
    zeledon" son el mismo cantón, y el catálogo no es consistente. */
export const normalizar = (valor: string) =>
  valor
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");

/** Ordena en español. El `sort` por defecto ordena por código de
    carácter y manda "Ávila" o "Ñañez" detrás de la Z. */
export const enOrden = (a: string, b: string) => a.localeCompare(b, "es");

/** Los valores distintos de una columna, sin vacíos y en orden. */
export const unicos = (valores: string[]) =>
  [...new Set(valores.filter(Boolean))].sort(enOrden);
