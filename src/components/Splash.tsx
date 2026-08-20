import { useEffect, useState } from "react";
import { MARCA } from "../lib/nav";

/* Pantalla de entrada después del login. La marca aparece, se sostiene
   un instante y se acerca hasta salir de cuadro; debajo queda la
   plataforma ya montada. Dura 1.5 s en total: suficiente para que se
   lea, corto para que no estorbe en una demo. */

const APARECE_MS = 600;
const SOSTIENE_MS = 480;
const SALE_MS = 620;

export const DURACION_SPLASH = APARECE_MS + SOSTIENE_MS + SALE_MS;

const Splash = ({ onFin }: { onFin: () => void }) => {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const aSalir = setTimeout(() => setSaliendo(true), APARECE_MS + SOSTIENE_MS);
    const aFin = setTimeout(onFin, DURACION_SPLASH);
    return () => {
      clearTimeout(aSalir);
      clearTimeout(aFin);
    };
  }, [onFin]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`plano fixed inset-0 z-[200] flex items-center justify-center bg-rail ${
        saliendo ? "anim-splash-out" : ""
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 ${
          saliendo ? "anim-brand-out" : "anim-brand-in"
        }`}
      >
        {/* El lockup ya trae el nombre: no se repite como texto. */}
        <img
          src={MARCA.logoSistema}
          alt=""
          aria-hidden
          className="h-28 w-auto object-contain md:h-40"
        />

        <span className="h-0.5 w-40 overflow-hidden bg-rail-hover">
          <span className="anim-bar block h-full bg-accent [animation-duration:1080ms]" />
        </span>

        <span className="sr-only">Cargando la plataforma</span>
      </div>
    </div>
  );
};

export default Splash;
