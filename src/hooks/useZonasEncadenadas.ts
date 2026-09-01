import { useMemo, useState } from "react";
import type { Zona } from "../types/auth.types";
import { TODAS, TODOS, distritoDe, normalizar, unicos } from "../lib/zonas";

/* ─────────────────────────────────────────────────────────────
   FILTRAR POR PROVINCIA, CANTÓN Y DISTRITO

   Tres escalones encadenados: cada uno solo se abre cuando el de
   arriba ya eligió, y solo ofrece lo que hay dentro de esa
   elección. Elegir arriba borra lo de abajo, porque un cantón de
   otra provincia deja de ser una respuesta válida en cuanto la
   provincia cambia.

   Está acá y no copiado en cada pantalla porque ya son tres las que
   lo necesitan —el catálogo de zonas, el directorio de negocios y
   el registro—, y las tres tienen que ordenar y comparar igual: sin
   acentos, sin mayúsculas y en español. Cuando eso se copia, se
   desincroniza.

   `cubre` es la otra mitad. Las pantallas no filtran zonas: filtran
   negocios, paseadores o lo que sea que TENGA una zona. Así que el
   gancho devuelve la pregunta ya hecha —¿esta zona pasa los
   filtros?— en vez de obligar a cada pantalla a rehacer las tres
   comparaciones.
   ───────────────────────────────────────────────────────────── */

export const useZonasEncadenadas = (zonas: Zona[]) => {
  const [provincia, setProvincia] = useState<string>(TODAS);
  const [canton, setCanton] = useState<string>(TODOS);
  const [distrito, setDistrito] = useState<string>(TODOS);

  const provincias = useMemo(
    () => [TODAS, ...unicos(zonas.map((zona) => zona.provincia))],
    [zonas],
  );

  const cantones = useMemo(() => {
    if (provincia === TODAS) return [TODOS];

    return [
      TODOS,
      ...unicos(
        zonas
          .filter((zona) => normalizar(zona.provincia) === normalizar(provincia))
          .map((zona) => zona.canton),
      ),
    ];
  }, [zonas, provincia]);

  const distritos = useMemo(() => {
    if (provincia === TODAS || canton === TODOS) return [TODOS];

    return [
      TODOS,
      ...unicos(
        zonas
          .filter(
            (zona) =>
              normalizar(zona.provincia) === normalizar(provincia) &&
              normalizar(zona.canton) === normalizar(canton),
          )
          .map(distritoDe),
      ),
    ];
  }, [zonas, provincia, canton]);

  const elegirProvincia = (valor: string) => {
    setProvincia(valor);
    setCanton(TODOS);
    setDistrito(TODOS);
  };

  const elegirCanton = (valor: string) => {
    setCanton(valor);
    setDistrito(TODOS);
  };

  const limpiar = () => {
    setProvincia(TODAS);
    setCanton(TODOS);
    setDistrito(TODOS);
  };

  const filtrando = provincia !== TODAS;

  /* Sin provincia elegida pasa todo, incluido lo que no tiene zona.
     Con provincia elegida, lo que no tiene zona ya no puede pasar:
     no es que esté en otra parte, es que no se sabe dónde está, y
     colarlo en el resultado de "Alajuela" sería mentir. */
  const cubre = (zona: Zona | null | undefined) => {
    if (!filtrando) return true;
    if (!zona) return false;

    if (normalizar(zona.provincia) !== normalizar(provincia)) return false;
    if (canton !== TODOS && normalizar(zona.canton) !== normalizar(canton))
      return false;
    if (
      distrito !== TODOS &&
      normalizar(distritoDe(zona)) !== normalizar(distrito)
    )
      return false;

    return true;
  };

  return {
    provincia,
    canton,
    distrito,
    provincias,
    cantones,
    distritos,
    elegirProvincia,
    elegirCanton,
    elegirDistrito: setDistrito,
    limpiar,
    filtrando,
    cubre,
  };
};
