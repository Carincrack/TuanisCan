import { SUPPORTED_LANGUAGES } from "../../i18n/languages";
import { useTranslation } from "../../hooks/useTranslation";
import { CANVAS, NAVY, TURQUESA } from "../tokens";

/* Conmutador de idioma de la portada. Es el hermano de
   `ConmutadorPublico`, el de abajo a la derecha del hero: la misma
   pista clara, el mismo disco turquesa sobre el elegido y el mismo
   apagado del otro. Así la portada tiene UN solo lenguaje para
   "elegí una de estas", y no un globo con un menú desplegable para
   escoger entre dos opciones que caben a la vista.

   Dice ES y EN, el código y no el nombre: el nombre completo
   ("Español", "English") va en el `aria-label` y en el `title`, que
   es donde se lee entero sin ocupar ancho en la barra.

   Dos tamaños, para alinear con los botones de al lado:
     barra   44 px de alto, como "Crear cuenta" en la barra del hero
     menu    48 px, como el botón de cerrar del menú en celular */

interface ConmutadorIdiomaProps {
  tamano?: "barra" | "menu";
  className?: string;
}

const DISCO = {
  barra: "h-9 w-9 text-[12px]",
  menu: "h-10 w-10 text-[12.5px]",
} as const;

const ConmutadorIdioma = ({ tamano = "barra", className = "" }: ConmutadorIdiomaProps) => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("settings.language.title")}
      className={`flex items-center gap-0.5 rounded-full p-1 ${className}`}
      style={{ background: CANVAS }}
    >
      {SUPPORTED_LANGUAGES.map(({ code, nombreNativo }) => {
        const activo = code === language;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            onClick={() => setLanguage(code)}
            aria-pressed={activo}
            aria-label={nombreNativo}
            title={nombreNativo}
            className={`grid place-items-center rounded-full font-bold tracking-[0.04em] uppercase transition-[background-color,opacity,transform] duration-150 ease-out active:scale-[0.94] ${DISCO[tamano]}`}
            style={{
              background: activo ? TURQUESA : "transparent",
              color: NAVY,
              opacity: activo ? 1 : 0.5,
            }}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
};

export default ConmutadorIdioma;
