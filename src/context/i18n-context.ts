import { createContext } from "react";
import type { Language } from "../i18n/languages";
import type { JsonValue } from "../i18n/translations";

export interface I18nContextValue {
  language: Language;
  /* Cambia el idioma activo, lo persiste y actualiza `<html lang>`.
     Una elección hecha acá es la que manda a partir de ahora: no la
     vuelve a pisar la detección del dispositivo. */
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Para contenido estructurado —listas, objetos anidados— que no es
      un texto suelto: las secciones de un documento legal, por
      ejemplo. Devuelve el nodo JSON tal cual, sin interpolar. */
  tRaw: (key: string) => JsonValue | undefined;
  /** Locale de `Intl` del idioma activo —`"es-CR"`, `"en-US"`—, para
      pasarle directo a `Intl.DateTimeFormat`/`Intl.NumberFormat` sin
      que cada pantalla decida el suyo. */
  localeTag: string;
}

export const I18nContext = createContext<I18nContextValue | undefined>(
  undefined,
);
