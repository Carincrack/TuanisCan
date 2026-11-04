import type { PublicLostPet } from "../../types/lost-pet.types";

/* Lo que separa el tablero de /perdidas en "todas", "perdidas" y
   "encontradas". Vive aparte porque lo usan el tablero, que dibuja el
   separador, y la página, que filtra y cuenta. */

export type Estado = "todas" | "perdidas" | "encontradas";

/** `id_mascota` nulo es un reporte de "encontré esta mascota, no sé
    de quién es": `nombre` ahí no es un nombre real, es el valor por
    defecto de `reportar_mascota_perdida`. Esas fichas se titulan con
    la especie y dicen que alguien la encontró. */
export const esEncontrada = (mascota: PublicLostPet) => !mascota.id_mascota;
