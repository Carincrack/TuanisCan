import { useEffect, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";

/* Pantalla de entrada después del login. La cortina aparece, la marca
   sube a su lugar, la línea se llena, y todo se va junto con un
   fundido. Debajo, la plataforma ya está armada y quieta: la cortina
   se levanta sobre algo terminado (ver la nota en `RootLayout`).

   Dura 1.3 s. Lo que manda es la línea: se llena durante lo que la
   marca está a la vista y la cortina se va apenas termina, así la
   espera se lee como progreso y no como adorno. */

const APARECE_MS = 500;
const SOSTIENE_MS = 400;
const SALE_MS = 400;

export const DURACION_SPLASH = APARECE_MS + SOSTIENE_MS + SALE_MS;

const Splash = ({ onFin }: { onFin: () => void }) => {
  const { t } = useTranslation();
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
        saliendo ? "anim-splash-out" : "anim-splash-in"
      }`}
    >
      <div className="anim-brand-in flex flex-col items-center gap-7">
        {/* El lockup ya trae el nombre: no se repite como texto. */}
        <img
          src="/logo-sistema.webp" /* el de `MARCA.logoSistema`, a 480 px: 43 KB y no 608 */
          alt=""
          aria-hidden
          className="h-28 w-auto object-contain md:h-40"
        />

        {/* La línea se llena en el tiempo exacto que la marca está a
            la vista (APARECE + SOSTIENE) y la cortina se va apenas
            termina. */}
        <span className="h-[2px] w-36 overflow-hidden rounded-full bg-white/10">
          <span className="anim-splash-bar block h-full rounded-full bg-accent" />
        </span>

        <span className="sr-only">{t("common.loadingPlatform")}</span>
      </div>
    </div>
  );
};

export default Splash;
