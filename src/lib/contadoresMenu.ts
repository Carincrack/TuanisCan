import { createContext } from "react";

/** Números en vivo junto a un ítem del menú, por ruta: «/p/solicitudes»
    → 2 solicitudes esperando respuesta. Los calcula `AppShell` y los
    lee cada enlace del riel; un cero no se muestra. */
export const ContadoresMenu = createContext<Record<string, number>>({});
