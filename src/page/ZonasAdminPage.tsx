import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Search, Trash2 } from "../lib/iconos";
import { deleteZona, getZonas } from "../services/auth.service";
import type { Zona } from "../types/auth.types";
import {
  Confirmar,
  EmptyState,
  Page,
  PageHeader,
  Section,
  Table,
  input,
} from "../components/ui";
import { Combo } from "../components/Combo";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";
import { distritoDe, normalizar } from "../lib/zonas";

const ZonasAdminPage = () => {
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
      .catch(() => setError("No se pudo cargar el catálogo de zonas"))
      .finally(() => setLoading(false));
  }, []);

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
      aviso.ok("Zona eliminada");
    } catch (cause) {
      setError("No se puede eliminar porque la zona está en uso");
      aviso.error(cause, {
        respaldo: "No se puede eliminar: hay cuentas o negocios en esa zona.",
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

  const btnPaso =
    "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
  const btnEliminar =
    "inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-danger-wash hover:text-danger";

  return (
    <Page>
      <PageHeader
        title="Zonas"
        subtitle="Catálogo de zonas disponibles para perfiles y servicios."
        action={
          <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-wash text-accent-dark">
              <MapPin size={13} />
            </span>
            <span className="nums">{zonas.length}</span>
            <span className="font-medium text-ink-mute">
              {zonas.length === 1 ? "zona registrada" : "zonas registradas"}
            </span>
          </span>
        }
      />

      <Section
        title="Zonas registradas"
        aside={
          <span className="inline-flex items-center rounded-full bg-sunken px-2.5 py-1 text-[12px] font-medium text-ink-soft">
            {visibles.length} {visibles.length === 1 ? "resultado" : "resultados"}
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
              placeholder="Buscar zona, cantón o provincia"
              aria-label="Buscar zonas"
            />
          </div>

          <Combo
            value={provinciaFiltro}
            onChange={cambiarProvinciaFiltro}
            aria-label="Filtrar por provincia"
            options={provinciasFiltro.map((item) => ({
              value: item,
              label: item === "Todas" ? "Todas las provincias" : item,
            }))}
          />

          <Combo
            value={cantonFiltro}
            onChange={cambiarCantonFiltro}
            aria-label="Filtrar por cantón"
            disabled={provinciaFiltro === "Todas"}
            textoInactivo="Elegí una provincia"
            options={cantonesFiltro.map((item) => ({
              value: item,
              label: item === "Todos" ? "Todos los cantones" : item,
            }))}
          />

          <Combo
            value={distritoFiltro}
            onChange={setDistritoFiltro}
            aria-label="Filtrar por distrito"
            disabled={cantonFiltro === "Todos"}
            textoInactivo="Elegí un cantón"
            options={distritosFiltro.map((item) => ({
              value: item,
              label: item === "Todos" ? "Todos los distritos" : item,
            }))}
          />
        </div>

        <div aria-live="polite" className="min-h-5 py-2.5 text-[13px]">
          {message && <p className="text-ok">{message}</p>}
          {error && <p className="text-danger">{error}</p>}
        </div>

        {loading ? (
          <Skeleton name="admin-tabla" loading>
            <div />
          </Skeleton>
        ) : visibles.length === 0 ? (
          <EmptyState
            title="No hay coincidencias"
            hint={
              hayFiltros
                ? "Ajustá la búsqueda o cambiá los filtros."
                : "Todavía no hay zonas en el catálogo."
            }
          />
        ) : (
          <>
            {/* Escritorio: tabla completa. */}
            <div className="hidden overflow-x-auto md:block">
              <Table
                caption="Zonas registradas"
                columnas={[
                  { label: "Zona" },
                  { label: "Provincia" },
                  { label: "Cantón" },
                  { label: "Distrito" },
                  { label: "", align: "right" },
                ]}
              >
                {zonasPaginadas.map((zona) => (
                  <tr
                    key={zona.id_zona}
                    className="transition-colors hover:bg-sunken"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-wash text-accent-dark">
                          <MapPin size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">
                            {zona.nombre}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-ink-mute">
                            {distritoDe(zona)}, {zona.canton}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-sunken px-2.5 py-1 text-[12px] font-medium text-ink-soft">
                        {zona.provincia}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-[13px] text-ink-soft">
                      {zona.canton}
                    </td>

                    <td className="px-5 py-3.5 text-[13px] text-ink-soft">
                      {distritoDe(zona)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setPorEliminar(zona)}
                        className={btnEliminar}
                        aria-label={`Eliminar ${zona.nombre}`}
                      >
                        <Trash2 size={13} />
                        <span className="hidden lg:inline">Eliminar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>

            {/* Móvil: una tarjeta por zona en vez de forzar el scroll
                horizontal de la tabla. */}
            <ul className="grid gap-2.5 md:hidden">
              {zonasPaginadas.map((zona) => (
                <li
                  key={zona.id_zona}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-wash text-accent-dark">
                      <MapPin size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">
                        {zona.nombre}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-mute">
                        {distritoDe(zona)}, {zona.canton}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPorEliminar(zona)}
                      className={btnEliminar}
                      aria-label={`Eliminar ${zona.nombre}`}
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[12px]">
                    <div>
                      <dt className="text-ink-mute">Provincia</dt>
                      <dd className="mt-0.5 font-medium text-ink-soft">
                        {zona.provincia}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-mute">Cantón</dt>
                      <dd className="mt-0.5 font-medium text-ink-soft">
                        {zona.canton}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-mute">Distrito</dt>
                      <dd className="mt-0.5 font-medium text-ink-soft">
                        {distritoDe(zona)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-3 border-t border-border px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-ink-mute">
                Mostrando{" "}
                <span className="font-medium text-ink-soft">{inicio + 1}</span>–
                <span className="font-medium text-ink-soft">
                  {Math.min(fin, visibles.length)}
                </span>{" "}
                de{" "}
                <span className="font-medium text-ink-soft">
                  {visibles.length}
                </span>{" "}
                zonas
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() =>
                    setPaginaActual((pagina) => Math.max(1, pagina - 1))
                  }
                  className={btnPaso}
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>

                <span className="px-2 text-[12.5px] text-ink-mute">
                  Página{" "}
                  <span className="font-medium text-ink-soft">
                    {paginaActual}
                  </span>{" "}
                  de {Math.max(totalPaginas, 1)}
                </span>

                <button
                  type="button"
                  disabled={paginaActual >= totalPaginas || totalPaginas === 0}
                  onClick={() =>
                    setPaginaActual((pagina) =>
                      Math.min(totalPaginas, pagina + 1),
                    )
                  }
                  className={btnPaso}
                >
                  Siguiente
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* Antes era un `window.confirm` con "Eliminar Carrizal,
          Alajuela?" y nada más. La consecuencia real —que puede haber
          gente y negocios apuntando a esa zona— no cabía ahí. */}
      {porEliminar && (
        <Confirmar
          tono="peligro"
          titulo="Eliminar zona"
          cuerpo={
            <>
              Se quita <strong className="font-semibold text-ink">{porEliminar.nombre}</strong>, {porEliminar.canton} del
              catálogo. Si hay personas o negocios registrados en esa zona, la
              base no va a permitir borrarla.
            </>
          }
          confirmar="Eliminar zona"
          ocupado={eliminando}
          onConfirmar={() => void eliminar()}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </Page>
  );
};

export default ZonasAdminPage;
