import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "../lib/iconos";

/* ─────────────────────────────────────────────────────────────
   EL VISOR DE FOTO

   Una foto de perfil recortada en un círculo de 112 px no se ve:
   se adivina. Este es el gesto que todo el mundo ya conoce de las
   redes —tocar la foto y verla entera— y no existía: el único
   clic disponible sobre el avatar abría el selector de archivos,
   así que para *mirar* la foto había que estar dispuesto a
   cambiarla.

   Va en un portal a `body` y no donde está el avatar. Adentro, el
   visor heredaría el `overflow: hidden` del lienzo y el apilado de
   la tarjeta, y terminaría recortado dentro de la misma caja de la
   que quiere salir.

   La caja es un `dialog` a mano y no el `<dialog>` nativo porque el
   nativo pinta su propio `::backdrop`, que no acepta los tokens de
   la aplicación ni el desenfoque.
   ───────────────────────────────────────────────────────────── */

const Visor = ({
  src,
  alt,
  abierto,
  cerrar,
}: {
  src: string;
  alt: string;
  abierto: boolean;
  cerrar: () => void;
}) => {
  const boton = useRef<HTMLButtonElement>(null);
  /* A dónde vuelve el foco al cerrar. Sin esto el foco cae al
     principio del documento y quien navega con teclado tiene que
     recorrer el riel entero para volver adonde estaba. */
  const devolver = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) return;

    devolver.current = document.activeElement as HTMLElement | null;
    boton.current?.focus();

    const desbordeAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        cerrar();
      }
    };

    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = desbordeAntes;
      devolver.current?.focus?.();
    };
  }, [abierto, cerrar]);

  if (!abierto) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={cerrar}
      className="anim-fade fixed inset-0 z-[80] flex items-center justify-center bg-rail/85 p-4 backdrop-blur-sm sm:p-8"
    >
      <button
        ref={boton}
        type="button"
        onClick={cerrar}
        aria-label="Cerrar la foto"
        className="absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white/12 text-white transition-[background-color,transform] duration-200 ease-out hover:bg-white/22 focus:outline-2 focus:outline-offset-2 focus:outline-white active:scale-[0.94]"
      >
        <X size={20} strokeWidth={2.2} />
      </button>

      {/* El clic sobre la imagen no cierra: en un visor, el fondo es
          el botón de salir y la foto es lo que se vino a ver. */}
      <img
        src={src}
        alt={alt}
        onClick={(evento) => evento.stopPropagation()}
        /* El tope de ancho importa tanto como el de alto. Con
           `max-w-full` una foto apaisada en un monitor de 1920 se
           estiraba a 1800 px: eso ya no es "verla completa", es
           ocupar la pantalla. Con el tope queda una ventana centrada,
           que es lo que se vino a mirar. */
        className="anim-rise max-h-[86vh] max-w-[min(92vw,860px)] rounded-[26px] object-contain shadow-[0_40px_90px_rgb(0_0_0/0.45)]"
      />
    </div>,
    document.body,
  );
};

export default Visor;
