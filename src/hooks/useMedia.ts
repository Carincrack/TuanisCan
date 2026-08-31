import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Un `matchMedia` como estado de React.

   El riel necesita saber el ancho de la ventana en JavaScript y no
   solo en CSS: la decisión de si está anclado o si se abre al pasar
   el cursor cambia el marcado —qué recibe `title`, qué grupo se
   puede plegar—, no solo el estilo. Con variantes de Tailwind eso
   quedaría repartido entre clases condicionales imposibles de leer.

   Se lee una vez al montar en el inicializador para que el primer
   pintado ya salga con el ancho correcto y no haya un salto del
   riel al cargar la aplicación.
   ───────────────────────────────────────────────────────────── */

export const useMedia = (consulta: string) => {
  const [coincide, setCoincide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(consulta).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const alCambiar = () => setCoincide(mq.matches);

    // Puede haber cambiado entre el primer pintado y este efecto.
    alCambiar();
    mq.addEventListener("change", alCambiar);

    return () => mq.removeEventListener("change", alCambiar);
  }, [consulta]);

  return coincide;
};
