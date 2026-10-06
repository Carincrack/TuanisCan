import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, Globe } from "../lib/iconos";
import { SUPPORTED_LANGUAGES } from "../i18n/languages";
import { useTranslation } from "../hooks/useTranslation";

/* ─────────────────────────────────────────────────────────────
   Botón suelto para cambiar de idioma desde cualquier cabecera
   —landing, riel de la aplicación— sin tener que entrar a
   Perfil → Configuración, que sigue usando `LanguageSwitcher`
   (el combo completo, con rótulo y descripción).

   El aspecto del disparador no lo pone este archivo: cada sitio
   donde vive tiene su propia cabecera y su propia piel de botón
   redondo, así que `className`/`style` llegan completos desde
   quien lo usa, igual que el resto de los botones de esa cabecera.

   El panel sí es siempre el mismo y siempre va por portal al
   `body`, posicionado a mano contra el rectángulo del botón —el
   mismo truco que el panel de notificaciones de `AppShell`—: así
   no lo recorta ningún `overflow-hidden` de en medio, sin
   importar en qué cabecera se monte. */

interface QuickLanguageSwitcherProps {
  className: string;
  style?: CSSProperties;
  /** Si además del ícono se lee el código del idioma activo
      ("ES"/"EN"). En botones muy chicos o ya apretados de espacio
      conviene dejarlo en `false` y que el ícono y el `aria-label`
      hablen solos. */
  showCode?: boolean;
}

export const QuickLanguageSwitcher = ({
  className,
  style,
  showCode = false,
}: QuickLanguageSwitcherProps) => {
  const { language, setLanguage, t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<{ top: number; right: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);

  const medir = useCallback(() => {
    const rect = boton.current?.getBoundingClientRect();
    if (!rect) return;
    setPosicion({ top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right) });
  }, []);

  const alternar = () => {
    const seAbre = !abierto;
    if (seAbre) medir();
    setAbierto(seAbre);
  };

  useEffect(() => {
    if (!abierto) return;

    const afuera = (evento: PointerEvent) => {
      const objetivo = evento.target as Node;
      if (!boton.current?.contains(objetivo) && !panel.current?.contains(objetivo)) {
        setAbierto(false);
      }
    };
    const conEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };

    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", conEscape);
    window.addEventListener("resize", medir);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      document.removeEventListener("keydown", conEscape);
      window.removeEventListener("resize", medir);
    };
  }, [abierto, medir]);

  const etiqueta = t("settings.language.title");

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={alternar}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={etiqueta}
        title={etiqueta}
        className={className}
        style={style}
      >
        <Globe size={17} strokeWidth={1.9} aria-hidden />
        {showCode && <span className="uppercase">{language}</span>}
      </button>

      {abierto && createPortal(
        <ul
          ref={panel}
          role="listbox"
          aria-label={etiqueta}
          className="flota fixed z-[120] min-w-[168px] overflow-hidden rounded-[16px] bg-surface p-1.5 shadow-xl"
          style={{ top: posicion?.top ?? 60, right: posicion?.right ?? 16 }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const elegido = lang.code === language;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={elegido}
                  onClick={() => {
                    setLanguage(lang.code);
                    setAbierto(false);
                    boton.current?.focus();
                  }}
                  className={`flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13.5px] transition-colors duration-150 ${
                    elegido
                      ? "bg-accent-wash font-semibold text-accent-deep"
                      : "text-ink-soft hover:bg-sunken hover:text-ink"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{lang.nombreNativo}</span>
                  {elegido && (
                    <Check size={14} strokeWidth={2.6} aria-hidden className="shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </>
  );
};

export default QuickLanguageSwitcher;
