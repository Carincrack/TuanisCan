import { useCallback, useEffect, useState } from "react";
import { Interruptor } from "./ui";
import { useTranslation } from "../hooks/useTranslation";

/* ─────────────────────────────────────────────────────────────
   Pantalla completa del navegador. El estado no se guarda en
   ningún lado a propósito: es del navegador, no de la cuenta, y
   cada pestaña/recarga empieza normal — lo mismo que YouTube o
   cualquier reproductor de video.

   `document.fullscreenElement` es la fuente de verdad: el navegador
   también puede salir de pantalla completa por su cuenta (Esc, F11),
   así que el interruptor escucha `fullscreenchange` en vez de
   confiar solo en lo que él mismo pidió.
   ───────────────────────────────────────────────────────────── */

const soportado = () => typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen);

export const FullscreenToggle = () => {
  const { t } = useTranslation();
  const [completa, setCompleta] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const actualizar = () => setCompleta(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", actualizar);
    return () => document.removeEventListener("fullscreenchange", actualizar);
  }, []);

  const alternar = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  if (!soportado()) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-black/[0.055] bg-sunken/50 p-4">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
          {t("settings.fullscreen.title")}
        </p>
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          {t("settings.fullscreen.description")}
        </p>
      </div>

      <Interruptor
        activo={completa}
        etiqueta={completa ? t("settings.fullscreen.on") : t("settings.fullscreen.off")}
        onCambio={alternar}
      />
    </div>
  );
};
