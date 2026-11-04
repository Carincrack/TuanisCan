import type { CSSProperties } from "react";
import { ArrowRight, MapPin, Maximize2, PawPrint, Search } from "../../lib/iconos";
import BotonAccion from "../componentes/BotonAccion";
import Boronas from "../componentes/Boronas";
import Onda from "../componentes/Onda";
import { AZUL, CANVAS, CIELO, HUESO, NAVY, TINTA_SUAVE, TURQUESA } from "../tokens";
import { Combo } from "../../components/Combo";
import { useTranslation } from "../../hooks/useTranslation";
import type { useZonasEncadenadas } from "../../hooks/useZonasEncadenadas";
import { distritoDe, normalizar } from "../../lib/zonas";
import type { PublicLostPet } from "../../types/lost-pet.types";
import { esEncontrada, type Estado } from "./estado";

/* ─────────────────────────────────────────────────────────────
   El tablero de /perdidas. Banda blanca cosida al hero con la onda,
   como las bandas de la portada, pero sin titulares ni texto: acá se
   viene a buscar.

   Arriba, una sola barra de búsqueda en píldora y, debajo, el
   separador por estado —todas, perdidas, encontradas— con cuántas hay
   de cada una. Después, las fichas.

   Las fichas son polaroids, el mismo recurso de la banda "Pasando
   ahora" de la portada: borde blanco grueso, la huella turquesa en la
   esquina y un giro propio. Acá el giro es la mitad —es una rejilla
   que se recorre buscando— y la ficha se endereza al pasar el mouse.
   La acción va detrás de un filete punteado, el borde de un volante.
   ───────────────────────────────────────────────────────────── */

type T = ReturnType<typeof useTranslation>["t"];
type Territorio = ReturnType<typeof useZonasEncadenadas>;

const ESTADOS: Estado[] = ["todas", "perdidas", "encontradas"];

/* La misma fórmula que ya usa la pantalla interna
   (`mascotasPerdidas.tsx`), copiada acá sin pasar por import: esa
   función vive dentro de la app autenticada, y esta vitrina se sirve
   sin sesión, con su propio paquete. */
const zonaLabel = (zona: PublicLostPet["zona"], t: T) => {
  if (!zona) return t("landingPerdidas.card.noZone");
  const partes = [distritoDe(zona), zona.canton, zona.provincia]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));
  return partes
    .filter((parte, i) => i === 0 || normalizar(parte) !== normalizar(partes[i - 1]))
    .join(", ");
};

/* "hace 3 horas" en vez de una fecha pelada es lo que hace que una
   ficha se lea como un reporte reciente y no como un registro de
   catálogo. La fecha exacta queda en el `title`. */
const haceTiempo = (valor: string, localeTag: string) => {
  const minutos = Math.round((Date.now() - new Date(valor).getTime()) / 60_000);
  const relativo = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto" });
  if (minutos < 60) return relativo.format(-Math.max(1, minutos), "minute");
  if (minutos < 48 * 60) return relativo.format(-Math.round(minutos / 60), "hour");
  return relativo.format(-Math.round(minutos / 1440), "day");
};

const fechaLarga = (valor: string, localeTag: string) =>
  new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(
    new Date(valor),
  );

/* Medio giro de los de la portada (allá van de 2 a 3.5 grados). Sin
   repetir signo dos veces seguidas, para que la fila no se incline
   entera hacia un lado. */
const GIROS = [-1.4, 1.1, -0.8, 1.3, -1.2, 0.9, -1.1, 1.4];
const giro = (indice: number) => ({ "--giro": `${GIROS[indice % GIROS.length]}deg` }) as CSSProperties;

interface FichaProps {
  mascota: PublicLostPet;
  indice: number;
  conSesion: boolean;
  onVerFoto: () => void;
  onGestionar: () => void;
}

/* Las fichas de "encontré esta mascota" no tienen nombre real (ver
   `estado.ts`): se titulan con la especie y dicen que alguien la
   encontró. */
const FichaPerdida = ({ mascota, indice, conSesion, onVerFoto, onGestionar }: FichaProps) => {
  const { t, localeTag } = useTranslation();
  const encontrada = esEncontrada(mascota);
  const titulo = encontrada ? mascota.especie : mascota.nombre;
  const detalle = encontrada
    ? t("landingPerdidas.card.someoneFound")
    : [mascota.especie, mascota.raza].filter(Boolean).join(" · ");

  return (
    <li className="anim-rise" style={{ animationDelay: `${Math.min(indice, 8) * 55}ms` }}>
      <article className="ficha-perdida relative rounded-[12px] bg-white p-3 pb-4" style={giro(indice)}>
        <button
          type="button"
          onClick={onVerFoto}
          aria-label={t("landingPerdidas.card.viewPhotoAria", { nombre: titulo })}
          className="group relative block w-full cursor-zoom-in rounded-[7px] text-left focus:outline-2 focus:outline-offset-2 focus:outline-[#14A3B8]"
        >
          <span className="block overflow-hidden rounded-[7px]">
            <img
              src={mascota.fotoUrl ?? "/mock/dog-nube.jpg"}
              alt={t("landingPerdidas.card.photoAlt", { nombre: titulo })}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              style={{ background: CANVAS }}
            />
          </span>
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center rounded-[7px] bg-[rgb(20_36_46/0%)] opacity-0 transition-[background-color,opacity] duration-200 ease-out group-hover:bg-[rgb(20_36_46/25%)] group-hover:opacity-100"
          >
            <Maximize2 size={20} strokeWidth={2.2} className="text-white" />
          </span>
          {/* El estado va escrito, no solo pintado: navy para perdida,
              celeste para encontrada. */}
          <span
            className="rotulo absolute top-3 left-3 rounded-full px-3 py-1.5 text-[10.5px]"
            style={encontrada ? { background: CIELO, color: NAVY } : { background: NAVY, color: HUESO }}
          >
            {encontrada ? t("landingPerdidas.card.found") : t("landingPerdidas.card.lost")}
          </span>
        </button>

        {/* La huella de la esquina, la misma de las polaroids de la
            portada. Cuelga del marco y no de la foto, así gira con él. */}
        <span
          aria-hidden
          className="absolute -top-3 -right-3 grid h-9 w-9 place-items-center rounded-full shadow-[0_4px_10px_rgba(20,36,46,0.3)]"
          style={{ background: TURQUESA }}
        >
          <PawPrint size={15} strokeWidth={2.2} style={{ color: NAVY }} />
        </span>

        <div className="px-1.5 pt-4">
          <time
            dateTime={mascota.fecha_reporte}
            title={fechaLarga(mascota.fecha_reporte, localeTag)}
            className="rotulo block text-[10.5px]"
            style={{ color: TINTA_SUAVE }}
          >
            {haceTiempo(mascota.fecha_reporte, localeTag)}
          </time>
          <h3 className="display mt-1.5 truncate text-[20px] leading-tight" style={{ color: NAVY }}>
            {titulo}
          </h3>
          <p className="mt-1 truncate text-[13px]" style={{ color: TINTA_SUAVE }}>
            {detalle}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[13px]" style={{ color: TINTA_SUAVE }}>
            <MapPin size={13} strokeWidth={2} aria-hidden className="shrink-0" />
            <span className="truncate">{zonaLabel(mascota.zona, t)}</span>
          </div>

          <div className="mt-4 border-t border-dashed pt-3.5" style={{ borderColor: "#1a425733" }}>
            <button
              type="button"
              onClick={onGestionar}
              className="group/accion flex w-full items-center justify-between gap-3 rounded-full text-left text-[14px] font-bold focus:outline-2 focus:outline-offset-4 focus:outline-[#14A3B8]"
              style={{ color: NAVY }}
            >
              <span>{conSesion ? t("landingPerdidas.card.report") : t("landingPerdidas.card.loginToReport")}</span>
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-200 ease-out group-hover/accion:translate-x-0.5"
                style={{ background: TURQUESA }}
              >
                <ArrowRight size={16} strokeWidth={2.6} style={{ color: NAVY }} />
              </span>
            </button>
          </div>
        </div>
      </article>
    </li>
  );
};

/* Mientras cargan: el mismo marco, vacío. Ocupa lo mismo que una
   ficha de verdad, así que la rejilla no salta cuando llegan. */
const FichaEnBlanco = ({ indice }: { indice: number }) => (
  <li aria-hidden>
    <div className="ficha-perdida rounded-[12px] bg-white p-3 pb-4" style={giro(indice)}>
      <div className="aspect-square animate-pulse rounded-[7px] motion-reduce:animate-none" style={{ background: CANVAS }} />
      <div className="px-1.5 pt-4">
        <div className="h-2.5 w-20 rounded-full" style={{ background: CANVAS }} />
        <div className="mt-3 h-5 w-2/3 rounded-full" style={{ background: CANVAS }} />
        <div className="mt-3 h-3 w-1/2 rounded-full" style={{ background: CANVAS }} />
        <div className="mt-6 h-9 rounded-full" style={{ background: CANVAS }} />
      </div>
    </div>
  </li>
);

/* Vacío, sin resultados o con error: dicho con la letra de la
   portada, no con el estado vacío del sistema. */
const Aviso = ({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: { texto: string; onClick: () => void } }) => (
  <div className="flex flex-col items-center py-16 text-center">
    <span aria-hidden className="grid h-16 w-16 place-items-center rounded-full" style={{ background: CIELO }}>
      <PawPrint size={26} strokeWidth={2} style={{ color: NAVY }} />
    </span>
    <h2 className="display mt-6 text-[clamp(1.4rem,2.4vw,1.75rem)] leading-tight" style={{ color: NAVY }}>
      {titulo}
    </h2>
    {texto && (
      <p className="mt-3 max-w-[44ch] text-[15px] leading-relaxed" style={{ color: TINTA_SUAVE }}>
        {texto}
      </p>
    )}
    {accion && (
      <div className="mt-8">
        <BotonAccion tamano="sm" onClick={accion.onClick}>
          {accion.texto}
        </BotonAccion>
      </div>
    )}
  </div>
);

interface TableroPerdidasProps {
  /** Todas las que llegaron, sin filtrar. */
  total: number;
  visibles: PublicLostPet[];
  /** Cuántas hay de cada estado, ya filtradas por zona y búsqueda. */
  conteos: Record<Estado, number>;
  estado: Estado;
  onEstado: (estado: Estado) => void;
  busqueda: string;
  onBuscar: (texto: string) => void;
  territorio: Territorio;
  filtrando: boolean;
  onLimpiar: () => void;
  cargando: boolean;
  error: string;
  conSesion: boolean;
  onVerFoto: (mascota: PublicLostPet) => void;
  onGestionar: () => void;
}

const TableroPerdidas = ({
  total,
  visibles,
  conteos,
  estado,
  onEstado,
  busqueda,
  onBuscar,
  territorio,
  filtrando,
  onLimpiar,
  cargando,
  error,
  conSesion,
  onVerFoto,
  onGestionar,
}: TableroPerdidasProps) => {
  const { t } = useTranslation();
  const hayFichas = !cargando && !error && total > 0;

  return (
    <section
      id="tablero"
      className="relative overflow-hidden px-6 pt-20 pb-24 sm:px-10 sm:pt-28 sm:pb-28 lg:px-14 lg:pt-32 lg:pb-32"
      style={{ background: HUESO }}
    >
      {/* `tapa`: los animales del hero bajan por detrás de esta onda,
          igual que el perro de la portada sobre "Qué resuelve". */}
      <Onda color={AZUL} tapa={HUESO} />
      {/* Las migas de las orillas, como en las bandas de la portada.
          Allá van delante de todo porque el contenido deja margen a los
          lados; acá la rejilla llega casi al borde y les caían encima
          a las fichas de las puntas. Por eso el contenido va un plano
          más arriba (`z-30` contra el `z-20` de las migas): se ven en
          los márgenes y entre las fichas, y nunca tapan una. */}
      <Boronas desde={4} />

      <div className="relative z-30 mx-auto max-w-[1400px]">
        {hayFichas && (
          <>
            {/* ── Búsqueda ──
                Desde `xl`, todo en un renglón; entre `lg` y `xl` no cabe
                ("Todas las provin…") y va de a dos. En el teléfono la
                búsqueda y la provincia van a lo ancho, y cantón y
                distrito aparecen recién cuando se pueden usar: apagados,
                de a dos en 390 px, solo se leía «Todos los ca…». Sin
                rótulos visibles: cada control dice lo que filtra con su
                propio valor ("Todas las provincias") y lleva su nombre
                en `aria-label`. */}
            <div className="rounded-[28px] p-2 xl:rounded-full" style={{ background: CANVAS }}>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))]">
                <div className="relative col-span-2 lg:col-span-1">
                  <Search
                    size={17}
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2"
                    style={{ color: TURQUESA }}
                  />
                  {/* 16 px en el teléfono: con menos, iOS acerca la
                      pantalla al enfocar el campo. */}
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => onBuscar(e.target.value)}
                    aria-label={t("landingPerdidas.filters.search")}
                    placeholder={t("landingPerdidas.filters.searchPlaceholder")}
                    className="w-full rounded-full bg-white py-3.5 pr-5 pl-12 text-[16px] font-medium outline-none placeholder:text-[#526670] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#14A3B8] sm:text-[14.5px]"
                    style={{ color: NAVY }}
                  />
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <Combo
                    tono="portada"
                    aria-label={t("landingPerdidas.filters.province")}
                    value={territorio.provincia}
                    onChange={territorio.elegirProvincia}
                    options={territorio.provincias.map((item) => ({
                      value: item,
                      label: item === "Todas" ? t("landingPerdidas.filters.allProvinces") : item,
                    }))}
                  />
                </div>
                <div className={`col-span-2 sm:col-span-1 ${territorio.filtrando ? "" : "max-sm:hidden"}`}>
                  <Combo
                    tono="portada"
                    aria-label={t("landingPerdidas.filters.canton")}
                    value={territorio.canton}
                    onChange={territorio.elegirCanton}
                    disabled={!territorio.filtrando}
                    options={territorio.cantones.map((item) => ({
                      value: item,
                      label: item === "Todos" ? t("landingPerdidas.filters.allCantons") : item,
                    }))}
                  />
                </div>
                <div className={`col-span-2 sm:col-span-1 ${territorio.canton === "Todos" ? "max-sm:hidden" : ""}`}>
                  <Combo
                    tono="portada"
                    aria-label={t("landingPerdidas.filters.district")}
                    value={territorio.distrito}
                    onChange={territorio.elegirDistrito}
                    disabled={territorio.canton === "Todos"}
                    options={territorio.distritos.map((item) => ({
                      value: item,
                      label: item === "Todos" ? t("landingPerdidas.filters.allDistricts") : item,
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* ── Estado ── */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              <div
                role="group"
                aria-label={t("landingPerdidas.filters.estadoAria")}
                className="flex items-center gap-1 rounded-full p-1"
                style={{ background: CANVAS }}
              >
                {ESTADOS.map((opcion) => {
                  const activo = opcion === estado;
                  return (
                    <button
                      key={opcion}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => onEstado(opcion)}
                      className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-bold transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] sm:px-4"
                      style={activo ? { background: NAVY, color: HUESO } : { color: NAVY }}
                    >
                      {t(`landingPerdidas.filters.${opcion}`)}
                      <span className="text-[12px] tabular-nums" style={{ opacity: activo ? 0.7 : 0.5 }}>
                        {conteos[opcion]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filtrando && (
                <div className="flex items-center gap-4" aria-live="polite">
                  <span className="rotulo" style={{ color: TINTA_SUAVE }}>
                    {t("landingPerdidas.filters.showing", { n: visibles.length, total })}
                  </span>
                  <button
                    type="button"
                    onClick={onLimpiar}
                    className="text-[13.5px] font-bold underline decoration-2 underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                    style={{ color: NAVY, textDecorationColor: TURQUESA }}
                  >
                    {t("landingPerdidas.filters.clear")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {cargando ? (
          <>
            <p className="sr-only" role="status">
              {t("landingPerdidas.loading")}
            </p>
            <ul className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <FichaEnBlanco key={i} indice={i} />
              ))}
            </ul>
          </>
        ) : error ? (
          <div role="alert">
            <Aviso titulo={error} />
          </div>
        ) : visibles.length === 0 ? (
          total === 0 ? (
            <Aviso titulo={t("landingPerdidas.empty.title")} texto={t("landingPerdidas.empty.hint")} />
          ) : (
            <Aviso
              titulo={t("landingPerdidas.empty.filteredTitle")}
              texto={t("landingPerdidas.empty.filteredHint")}
              accion={{ texto: t("landingPerdidas.filters.clear"), onClick: onLimpiar }}
            />
          )
        ) : (
          <ul className="mt-12 grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibles.map((mascota, i) => (
              <FichaPerdida
                key={mascota.id_mascota_perdida}
                mascota={mascota}
                indice={i}
                conSesion={conSesion}
                onVerFoto={() => onVerFoto(mascota)}
                onGestionar={onGestionar}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default TableroPerdidas;
