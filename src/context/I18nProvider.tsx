import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  localeTag,
  resolveInitialLanguage,
  writeStoredLanguage,
  type Language,
} from "../i18n/languages";
import { translate, translateRaw } from "../i18n/translations";
import { I18nContext } from "./i18n-context";

/* ─────────────────────────────────────────────────────────────
   Fuente única de verdad del idioma de la aplicación.

   El idioma inicial se resuelve DENTRO del inicializador de
   `useState`: corre antes del primer render, así que no hay un
   primer paint en el idioma equivocado seguido de un reemplazo —no
   hay parpadeo porque nunca hubo nada que reemplazar. El mismo
   inicializador deja `<html lang>` ya puesto antes de que React
   pinte nada.
   ───────────────────────────────────────────────────────────── */

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const inicial = resolveInitialLanguage();

    if (typeof document !== "undefined") {
      document.documentElement.lang = inicial;
    }

    return inicial;
  });

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writeStoredLanguage(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(language, key, vars),
    [language],
  );

  const tRaw = useCallback(
    (key: string) => translateRaw(language, key),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, tRaw, localeTag: localeTag(language) }),
    [language, setLanguage, t, tRaw],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
