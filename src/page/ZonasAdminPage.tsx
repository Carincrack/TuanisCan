import { useContext, useEffect, useMemo, useState } from "react";
import { MapPin, Search, Trash2 } from "../lib/iconos";
import { deleteZona, getZonas } from "../services/auth.service";
import type { Zona } from "../types/auth.types";
import {
  Badge,
  Confirmar,
  EmptyState,
  NotificationButtonContext,
  Page,
  PageHeader,
  Paginacion,
  Section,
  Stat,
  Table,
  input,
} from "../components/ui";
import { Combo } from "../components/Combo";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";
import { distritoDe, normalizar } from "../lib/zonas";
import { useTranslation } from "../hooks/useTranslation";

const ZonasAdminPage = () => {
  const { t } = useTranslation();
  const botonNotificaciones = useContext(NotificationButtonContext);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [provinciaFiltro, setProvinciaFiltro] = useState("Todas");
  const [cantonFiltro, setCantonFiltro] = useState("Todos");
  const [distritoFiltro, setDistritoFiltro] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [porEliminar, setPorEliminar] = useState<Zona | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);

  const registrosPorPagina = 10;

  const cargar = async () => {
    const data = await getZonas();
    setZonas(data);
  };

  useEffect(() => {
    cargar()
      .catch(() => setError(t("zonas.loadError")))
      .finally(() => setLoading(false));
  }, []);

  const totalProvincias = useMemo(
    () => new Set(zonas.map((zona) => normalizar(zona.provincia))).size,
    [zonas],
  );

  const totalCantones = useMemo(
    () => new Set(zonas.map((zona) => normalizar(zona.canton))).size,
    [zonas],
  );

  const provinciasFiltro = useMemo(() => {
    const provincias = zonas
      .map((zona) => zona.provincia)
      .filter((item, index, items) => item && items.indexOf(item) === index)
      /* Con `localeCompare` en español: el `sort` por defecto ordena
         por código de carácter y manda "Ávila" o "Ñañez" al final de
         la lista, detrás de la Z. */
      .sort((a, b) => a.localeCompare(b, "es"));

    return ["Todas", ...provincias];
  }, [zonas]);

  /* Los tres filtros se encadenan: cada uno solo se abre cuando el de
     arriba ya eligió. Se busca una zona bajando por la jerarquía
     —provincia, cantón, distrito—, que es como está armada la división
     territorial y como la tiene en la cabeza quien busca. */
  const cantonesFiltro = useMemo(() => {
    if (provinciaFiltro === "Todas") return ["Todos"];

    const cantones = zonas
      .filter((zona) => normalizar(zona.provincia) === normalizar(provinciaFiltro))
      .map((zona) => zona.canton)
      .filter((item, index, items) => item && items.indexOf(item) === index)
      .sort((a, b) => a.localeCompare(b, "es"));

    return ["Todos", ...cantones];
  }, [zonas, provinciaFiltro]);

  const distritosFiltro = useMemo(() => {
    if (provinciaFiltro === "Todas" || cantonFiltro === "Todos") return ["Todos"];

    const distritos = zonas
      .filter(
        (zona) =>
          normalizar(zona.provincia) === normalizar(provinciaFiltro) &&
          normalizar(zona.canton) === normalizar(cantonFiltro),
      )
      .map(distritoDe)
      .filter((item, index, items) => item && items.indexOf(item) === index)
      .sort((a, b) => a.localeCompare(b, "es"));

    return ["Todos", ...distritos];
  }, [zonas, provinciaFiltro, cantonFiltro]);

  const visibles = zonas.filter((zona) => {
    const coincideProvincia =
      provinciaFiltro === "Todas" ||
      normalizar(zona.provincia) === normalizar(provinciaFiltro);
    const coincideCanton =
      cantonFiltro === "Todos" ||
      normalizar(zona.canton) === normalizar(cantonFiltro);
    const coincideDistrito =
      distritoFiltro === "Todos" ||
      normalizar(distritoDe(zona)) === normalizar(distritoFiltro);
    const contenidoZona = normalizar(
      `${zona.nombre} ${zona.canton} ${zona.provincia} ${zona.distrito || ""}`,
    );

    return (
      coincideProvincia &&
      coincideCanton &&
      coincideDistrito &&
      contenidoZona.includes(normalizar(busqueda))
    );
  });

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, provinciaFiltro, cantonFiltro, distritoFiltro]);

  const cambiarProvinciaFiltro = (nuevaProvincia: string) => {
    setProvinciaFiltro(nuevaProvincia);
    setCantonFiltro("Todos");
    setDistritoFiltro("Todos");
  };

  const cambiarCantonFiltro = (nuevoCanton: string) => {
    setCantonFiltro(nuevoCanton);
    setDistritoFiltro("Todos");
  };

  const totalPaginas = Math.ceil(visibles.length / registrosPorPagina);
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const zonasPaginadas = visibles.slice(inicio, fin);

  const eliminar = async () => {
    if (!porEliminar) return;

    setError(null);
    setMessage(null);
    setEliminando(true);

    try {
      await deleteZona(porEliminar.id_zona);
      setPorEliminar(null);
      await cargar();
      aviso.ok(t("zonas.delete.success"));
    } catch (cause) {
      setError(t("zonas.delete.inUseError"));
      aviso.error(cause, {
        respaldo: t("zonas.delete.inUseToast"),
      });
    } finally {
      setEliminando(false);
    }
  };

  const hayFiltros =
    busqueda.trim() !== "" ||
    provinciaFiltro !== "Todas" ||
    cantonFiltro !== "Todos" ||
    distritoFiltro !== "Todos";

  /* Borrar es la única acción de la fila, así que no necesita gritar:
     un disco callado, gris hasta que el cursor lo toca y entonces
     rojo. Sin borde —`border-border` apuntaba a un token que no
     existe y salía un píxel navy alrededor— y sin palabra, porque la
     papelera ya la dice y la confirmación la repite entera. */
  const btnEliminar =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-mute transition-[background-color,color,transform] duration-150 ease-out hover:bg-danger-wash hover:text-danger active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger";

  return (
    <Page wide>
      <PageHeader
        title={t("zonas.title")}
        subtitle={t("zonas.subtitle")}
        action={
          <div className="flex items-center gap-2.5">
            <Badge tono="accent">{zonas.length} {zonas.length === 1 ? t("zonas.countSingular") : t("zonas.countPlural")}</Badge>
            {botonNotificaciones}
          </div>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat etiqueta={t("zonas.stats.registered")} valor={String(zonas.length)} nota={t("zonas.stats.registeredHint")} />
        <Stat etiqueta={t("zonas.stats.provinces")} valor={String(totalProvincias)} nota={t("zonas.stats.provincesHint")} />
        <Stat etiqueta={t("zonas.stats.cantons")} valor={String(totalCantones)} nota={t("zonas.stats.cantonsHint")} />
      </div>

      <Section
        title={t("zonas.filters.title")}
        aside={
          <span className="inline-flex items-center rounded-full bg-sunken px-2.5 py-1 text-[12px] font-medium text-ink-soft">
            {visibles.length} {visibles.length === 1 ? t("zonas.resultSingular") : t("zonas.resultPlural")}
          </span>
        }
        bodyClass="px-4 py-4 sm:px-5"
      >
        {/* Filtros: la búsqueda crece con el ancho disponible y los tres
            desplegables encadenados van de dos en dos en tableta antes
            que apretarse a cuatro. */}
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.25fr)_repeat(3,minmax(180px,1fr))]">
          <div className="relative">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-mute"
            />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className={`${input} pl-9`}
              placeholder={t("zonas.filters.searchPlaceholder")}
              aria-label={t("zonas.filters.searchAria")}
            />
          </div>

          <Combo
            value={provinciaFiltro}
            onChange={cambiarProvinciaFiltro}
            aria-label={t("zonas.filters.provinceAria")}
            options={provinciasFiltro.map((item) => ({
              value: item,
              label: item === "Todas" ? t("zonas.filters.allProvinces") : item,
            }))}
          />

          <Combo
            value={cantonFiltro}
            onChange={cambiarCantonFiltro}
            aria-label={t("zonas.filters.cantonAria")}
            disabled={provinciaFiltro === "Todas"}
            textoInactivo={t("zonas.filters.selectProvince")}
            options={cantonesFiltro.map((item) => ({
              value: item,
              label: item === "Todos" ? t("zonas.filters.allCantons") : item,
            }))}
          />

          <Combo
            value={distritoFiltro}
            onChange={setDistritoFiltro}
            aria-label={t("zonas.filters.districtAria")}
            disabled={cantonFiltro === "Todos"}
            textoInactivo={t("zonas.filters.selectCanton")}
            options={distritosFiltro.map((item) => ({
              value: item,
              label: item === "Todos" ? t("zonas.filters.allDistricts") : item,
            }))}
          />
        </div>

        <div aria-live="polite" className="min-h-5 py-2.5 text-[13px]">
          {message && <p className="text-ok">{message}</p>}
          {error && <p className="text-danger">{error}</p>}
        </div>
      </Section>

      <Section bodyClass="">
        {loading ? (
          <Skeleton name="admin-tabla" loading>
            <div />
          </Skeleton>
        ) : visibles.length === 0 ? (
          <div className="px-4 py-4 sm:px-5">
            <EmptyState
              title={t("zonas.empty.title")}
              hint={
                hayFiltros
                  ? t("zonas.empty.withFilters")
                  : t("zonas.empty.withoutFilters")
              }
            />
          </div>
        ) : (
          <>
            {/* ── De lg para arriba: la tabla ──
                Reparto fijo, cuatro columnas de dato y una de acción.
                La fila ya no repite «Carrizal, Alajuela» debajo del
                nombre: cantón y distrito tienen su columna al lado y
                decirlo dos veces en la misma fila no es información,
                es ruido. */}
            <div className="hidden lg:block">
              <Table
                caption={t("zonas.table.caption")}
                min="min-w-[640px]"
                padX="px-4"
                columnas={[
                  { label: t("zonas.table.columns.zone"), ancho: "w-[32%]" },
                  { label: t("zonas.table.columns.province"), ancho: "w-[20%]" },
                  { label: t("zonas.table.columns.canton"), ancho: "w-[20%]" },
                  { label: t("zonas.table.columns.district"), ancho: "w-[20%]" },
                  { label: t("zonas.table.columns.actions"), ancho: "w-[8%]", align: "right", muda: true },
                ]}
              >
                {zonasPaginadas.map((zona) => (
                  <tr
                    key={zona.id_zona}
                    className="transition-colors duration-150 hover:bg-accent-wash/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep">
                          <MapPin size={15} />
                        </span>
                        <span className="block truncate text-[13.5px] font-semibold text-ink" title={zona.nombre}>
                          {zona.nombre}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge tono="neutral">{zona.provincia}</Badge>
                    </td>

                    <td className="truncate px-4 py-3 text-[12.5px] text-ink-soft" title={zona.canton}>
                      {zona.canton}
                    </td>

                    <td className="truncate px-4 py-3 text-[12.5px] text-ink-soft" title={distritoDe(zona)}>
                      {distritoDe(zona)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPorEliminar(zona)}
                        className={btnEliminar}
                        aria-label={t("zonas.table.deleteAction", { nombre: zona.nombre })}
                        title={t("zonas.table.deleteAction", { nombre: zona.nombre })}
                      >
                        <Trash2 size={15} strokeWidth={1.9} />
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>

            {/* ── Debajo de lg: fichas ──
                Nombre y, debajo, la jerarquía completa en una línea.
                Sin tabla de tres celdas repitiendo lo mismo. */}
            <ul className="grid gap-2.5 p-4 lg:hidden">
              {zonasPaginadas.map((zona) => (
                <li
                  key={zona.id_zona}
                  className="flex min-w-0 items-center gap-3 rounded-[14px] bg-sunken/60 p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep">
                    <MapPin size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">
                      {zona.nombre}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-soft">
                      {distritoDe(zona)} · {zona.canton} · {zona.provincia}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPorEliminar(zona)}
                    className={btnEliminar}
                    aria-label={t("zonas.table.deleteAction", { nombre: zona.nombre })}
                  >
                    <Trash2 size={15} strokeWidth={1.9} />
                  </button>
                </li>
              ))}
            </ul>

            <Paginacion
              etiqueta={t("zonas.pagination.label")}
              actual={paginaActual}
              total={totalPaginas}
              onCambiar={setPaginaActual}
              desde={inicio + 1}
              hasta={Math.min(fin, visibles.length)}
              cuantos={visibles.length}
              nombre={["zona", "zonas"]}
            />
          </>
        )}
      </Section>

      {/* Antes era un `window.confirm` con "Eliminar Carrizal,
          Alajuela?" y nada más. La consecuencia real —que puede haber
          gente y negocios apuntando a esa zona— no cabía ahí. */}
      {porEliminar && (
        <Confirmar
          tono="peligro"
          titulo={t("zonas.delete.title")}
          cuerpo={t("zonas.delete.body", {
            nombre: porEliminar.nombre,
            canton: porEliminar.canton,
          })}
          confirmar={t("zonas.delete.confirm")}
          ocupado={eliminando}
          onConfirmar={() => void eliminar()}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </Page>
  );
};

export default ZonasAdminPage;
