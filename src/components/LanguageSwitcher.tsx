import { Combo } from "./Combo";
import { Globe } from "../lib/iconos";
import { SUPPORTED_LANGUAGES } from "../i18n/languages";
import { useTranslation } from "../hooks/useTranslation";

/* ─────────────────────────────────────────────────────────────
   Selector de idioma. Agregar un idioma nuevo no toca este
   archivo: basta con sumarlo a `SUPPORTED_LANGUAGES` y traer sus
   JSON en `src/i18n/translations.ts` — la lista de opciones de
   acá abajo sale sola de esa misma constante.
   ───────────────────────────────────────────────────────────── */

export const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className={"rounded-xl border border-black/[0.055] bg-sunken/50 p-4"}>
      <p className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
        {t("settings.language.title")}
      </p>

      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">
        {t("settings.language.description")}
      </p>

      <Combo
        Icon={Globe}
        value={language}
        onChange={(value) => setLanguage(value as typeof language)}
        options={SUPPORTED_LANGUAGES.map((lang) => ({
          value: lang.code,
          label: lang.nombreNativo,
        }))}
      />
    </div>
  );
};
