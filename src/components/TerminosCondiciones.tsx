import { MARCA } from "../lib/nav";
import { useTranslation } from "../hooks/useTranslation";

/* ─────────────────────────────────────────────────────────────
   Fecha en la que se redactó esta versión. Cambiarla es la señal de
   que el texto cambió de fondo — no hace falta un historial de
   versiones para esto, con la fecha alcanza para que alguien que ya
   había aceptado sepa si hay algo nuevo que leer. */
export const TERMINOS_VERSION = "2026-09-24";

interface Seccion {
  titulo: string;
  parrafos: string[];
}

const conMarca = (texto: string) => texto.replace(/\{\{marca\}\}/g, MARCA.completo);

/** El texto solo. Se usa dentro del modal de registro y, si hace
    falta en otro lado, se importa de acá en vez de copiarlo.

    Las secciones viven en `src/locales/<idioma>/terminos.json`: son
    contenido estructurado (título + párrafos), no un texto suelto,
    así que se leen con `tRaw` en vez de `t`. */
const TerminosCondiciones = () => {
  const { t, tRaw, localeTag } = useTranslation();
  const secciones = (tRaw("terminos.secciones") as Seccion[] | undefined) ?? [];

  return (
    <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
      <p className="text-[12px] text-ink-mute">
        {t("terminos.lastUpdated", {
          fecha: new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", year: "numeric" }).format(
            new Date(`${TERMINOS_VERSION}T00:00:00`),
          ),
        })}
      </p>
      {secciones.map((seccion) => (
        <section key={seccion.titulo}>
          <h3 className="text-[14px] font-semibold text-ink">{seccion.titulo}</h3>
          <div className="mt-1.5 flex flex-col gap-2">
            {seccion.parrafos.map((parrafo, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-ink-soft">
                {conMarca(parrafo)}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default TerminosCondiciones;
