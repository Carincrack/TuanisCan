import type { Language } from "./languages";

/* ─────────────────────────────────────────────────────────────
   Carga automática de dominios.

   Agregar un dominio de traducción nuevo es solo crear
   `src/locales/es/<dominio>.json` y `src/locales/en/<dominio>.json`:
   `import.meta.glob` (Vite) los levanta a los dos en build, nadie
   tiene que volver a este archivo a registrarlos a mano.
   ───────────────────────────────────────────────────────────── */

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const modulosEs = import.meta.glob("../locales/es/*.json", { eager: true }) as Record<
  string,
  { default: JsonObject }
>;
const modulosEn = import.meta.glob("../locales/en/*.json", { eager: true }) as Record<
  string,
  { default: JsonObject }
>;

const dominioDe = (ruta: string) => ruta.split("/").pop()!.replace(/\.json$/, "");

const construirDiccionario = (modulos: Record<string, { default: JsonObject }>) => {
  const diccionario: Record<string, JsonObject> = {};
  for (const [ruta, modulo] of Object.entries(modulos)) {
    diccionario[dominioDe(ruta)] = modulo.default;
  }
  return diccionario;
};

const dictionaries: Record<Language, Record<string, JsonObject>> = {
  es: construirDiccionario(modulosEs),
  en: construirDiccionario(modulosEn),
};

const digRaw = (object: JsonValue | undefined, path: string[]): JsonValue | undefined => {
  let current: JsonValue | undefined = object;

  for (const segment of path) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return undefined;
    current = (current as JsonObject)[segment];
  }

  return current;
};

const dig = (object: JsonValue | undefined, path: string[]): string | undefined => {
  const value = digRaw(object, path);
  return typeof value === "string" ? value : undefined;
};

/* Sustituye `{{variable}}` dentro del texto encontrado. Es lo único
   que estos textos necesitan: no hay pluralización ni formatos
   complejos en el contenido migrado hasta ahora. */
const interpolate = (text: string, vars?: Record<string, string | number>) => {
  if (!vars) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
};

/* `key` viaja como "dominio.ruta.a.el.texto", p. ej. "common.save" o
   "nav.role.admin.titulo". Si no se encuentra en el idioma activo se
   intenta en español antes de rendirse y devolver la clave misma: es
   preferible una clave visible a una pantalla en blanco. */
export const translate = (
  language: Language,
  key: string,
  vars?: Record<string, string | number>,
): string => {
  const [domain, ...path] = key.split(".");
  if (!domain || path.length === 0) return key;

  const own = dig(dictionaries[language]?.[domain], path);
  if (own !== undefined) return interpolate(own, vars);

  const fallback = dig(dictionaries.es?.[domain], path);
  if (fallback !== undefined) return interpolate(fallback, vars);

  return key;
};

/* Para el contenido que no es un texto suelto sino una lista
   estructurada —las secciones de un documento legal, por ejemplo—.
   Devuelve el nodo JSON tal cual, sin pasar por `t()`: quien lo use
   es responsable de tipar el resultado según lo que sabe que hay en
   ese JSON. */
export const translateRaw = (language: Language, key: string): JsonValue | undefined => {
  const [domain, ...path] = key.split(".");
  if (!domain || path.length === 0) return undefined;

  const own = digRaw(dictionaries[language]?.[domain], path);
  if (own !== undefined) return own;

  return digRaw(dictionaries.es?.[domain], path);
};

export type { JsonValue };
