/* ─────────────────────────────────────────────────────────────
   IDIOMAS SOPORTADOS

   Agregar un idioma nuevo es agregar una entrada acá (y sus JSON en
   `src/locales/<codigo>/`): nada más del sistema depende de que solo
   existan dos.
   ───────────────────────────────────────────────────────────── */

export const SUPPORTED_LANGUAGES = [
  { code: "es", nombreNativo: "Español" },
  { code: "en", nombreNativo: "English" },
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: Language = "es";

const isSupported = (value: string): value is Language =>
  SUPPORTED_LANGUAGES.some((lang) => lang.code === value);

/* Normaliza un código regional (`es-CR`, `en-US`, `EN_gb`...) al
   idioma general que de verdad tenemos traducido. Si no hay nada
   soportado, devuelve `null`: quien llama decide el repliegue. */
export const normalizeLanguage = (
  code: string | null | undefined,
): Language | null => {
  if (!code) return null;

  const base = code.trim().toLowerCase().split(/[-_]/)[0];
  return isSupported(base) ? base : null;
};

/* El idioma del dispositivo/navegador, ya resuelto a uno soportado.
   `navigator.languages` trae la lista completa de preferencias en
   orden; `navigator.language` es el respaldo en entornos que no la
   expongan. Si ninguna coincide, cae al idioma por defecto. */
export const detectDeviceLanguage = (): Language => {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;

  const candidatos = [
    ...(navigator.languages ?? []),
    navigator.language,
  ];

  for (const candidato of candidatos) {
    const normalizado = normalizeLanguage(candidato);
    if (normalizado) return normalizado;
  }

  return DEFAULT_LANGUAGE;
};

/* ─────────────────────────────────────────────────────────────
   PERSISTENCIA

   Solo se guarda el CÓDIGO del idioma, nunca texto traducido. Clave
   `app_language`, igual que pide la especificación. Envuelto en
   `try`: en navegación privada o con `localStorage` bloqueado, tocar
   el almacenamiento lanza, y sin la guarda el cambio de idioma
   tumbaría la aplicación entera por una preferencia de comodidad.
   ───────────────────────────────────────────────────────────── */

export const LANGUAGE_STORAGE_KEY = "app_language";

export const readStoredLanguage = (): Language | null => {
  try {
    return normalizeLanguage(
      window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
    );
  } catch {
    return null;
  }
};

export const writeStoredLanguage = (language: Language) => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* Sin almacenamiento la preferencia dura lo que la pestaña. */
  }
};

/* El idioma con el que arranca la aplicación, en el orden de
   prioridad pedido:

     1. Preferencia guardada (ahí vive tanto la elección manual como
        cualquier guardado previo: son la misma cosa una vez escrita).
     2. Idioma detectado del dispositivo.
     3. Idioma por defecto (ya es el repliegue de `detectDeviceLanguage`).

   Mientras no haya nada guardado, la detección corre en cada arranque
   —si el usuario nunca eligió, tiene sentido seguir al dispositivo—.
   En cuanto hay una preferencia guardada, esta función ya no vuelve a
   tocar `detectDeviceLanguage`: una elección manual no se pisa sola. */
export const resolveInitialLanguage = (): Language =>
  readStoredLanguage() ?? detectDeviceLanguage();

/* ─────────────────────────────────────────────────────────────
   FORMATOS DEPENDIENTES DEL IDIOMA

   El locale de `Intl` que corresponde a cada idioma soportado. No es
   el mismo string que el código de idioma: `es` sin región da nombres
   de mes genéricos; `es-CR` es el que ya usa el resto del sistema
   (notificaciones, tarifas) para fechas y moneda. Centralizarlo acá
   evita que cada pantalla nueva tenga que decidir el suyo.
   ───────────────────────────────────────────────────────────── */
const LOCALE_TAGS: Record<Language, string> = {
  es: "es-CR",
  en: "en-US",
};

export const localeTag = (language: Language): string => LOCALE_TAGS[language];

