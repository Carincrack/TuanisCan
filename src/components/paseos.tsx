import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronDown, Search, X } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { listPets } from "../services/pets.service";
import { cancelWalkRequest, listWalksWithRelations, getWalkStats, isUpcoming } from "../services/walks.service";
import { aviso } from "../lib/aviso";
import { getZonas } from "../services/auth.service";
import type { WalkWithRelations } from "../services/walks.service";
import type { Pet } from "../types/pet.types";
import type { Zona } from "../types/auth.types";
import {
  Avatar,
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
  btnDangerCompacto,
  btnPrimary,
  btnSecondary,
  btnSecondaryCompacto,
  colones,
  input,
} from "./ui";
import { Combo } from "./Combo";
import { Skeleton } from "boneyard-js/react";

/* Misma casa que el directorio de Usuarios: métricas con `Stat`, una
   sección de filtros con buscador y combos, la tabla de reparto fijo
   de `lg` para arriba y fichas apiladas debajo, con paginación. Las
   filas que ya no van a pasar —canceladas— se atenúan en vez de
   necesitar la palabra. */

type Vista = "proximos" | "historial" | "todos";

const PAGE_SIZE = 8;

const formatoFecha = (fecha: string) =>
  new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${fecha}T00:00:00`));

const chipEstado =
  "inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-[10px] font-semibold uppercase leading-none tracking-wide";

const estados: Record<string, { label: string; className: string }> = {
  solicitado: { label: "Solicitado", className: "bg-warn-wash text-warn" },
  confirmado: { label: "Confirmado", className: "bg-ok-wash text-ok" },
  en_curso: { label: "En curso", className: "bg-accent-wash text-accent-dark" },
  finalizado: { label: "Completado", className: "bg-neutral-wash text-ink-soft" },
  cancelado: { label: "Cancelado", className: "bg-danger-wash text-danger" },
};

const ChipEstado = ({ estado }: { estado: string }) => {
  const config = estados[estado] ?? { label: estado, className: "bg-sunken text-ink-mute" };
  return <span className={`${chipEstado} ${config.className}`}>{config.label}</span>;
};

const zonaLabel = (zona: WalkWithRelations["zona"] | Zona | null) =>
  zona
    ? [zona.provincia, zona.canton, zona.distrito ?? zona.nombre].filter(Boolean).join(", ")
    : "";

const messageFrom = (cause: unknown) =>
  cause instanceof Error
    ? cause.message
    : typeof cause === "object" && cause && "message" in cause
      ? String((cause as { message: string }).message)
      : "No se pudieron cargar los paseos.";

const FotoMascota = ({ paseo, size }: { paseo: WalkWithRelations; size: number }) =>
  paseo.mascota?.fotoUrl ? (
    <img
      src={paseo.mascota.fotoUrl}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-sunken object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <Avatar nombre={paseo.mascota?.nombre ?? "M"} size={size} />
  );

const Paseador = ({ paseo }: { paseo: WalkWithRelations }) =>
  paseo.paseador ? (
    <span className="flex min-w-0 items-center gap-2">
      {paseo.paseador.fotoUrl ? (
        <img src={paseo.paseador.fotoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
      ) : (
        <Avatar nombre={paseo.paseador.nombre ?? "P"} size={28} />
      )}
      <span className="truncate text-[12.5px] font-medium text-ink" title={paseo.paseador.nombre ?? undefined}>
        {paseo.paseador.nombre ?? "Sin nombre"}
      </span>
    </span>
  ) : (
    <span className="text-[12.5px] text-ink-mute italic">Sin asignar</span>
  );

/** El precio, y si fue una oferta, la marca y la tarifa de referencia. */
const PrecioPaseo = ({ paseo, alinear = "derecha" }: { paseo: WalkWithRelations; alinear?: "derecha" | "izquierda" }) => {
  const esOferta = paseo.precio !== paseo.precio_tarifa;
  return (
    <span className={`flex flex-col ${alinear === "derecha" ? "items-end" : "items-start"}`}>
      <span className="text-[13px] font-semibold text-ink">{colones(paseo.precio)}</span>
      {esOferta && (
        <span className="mt-0.5 text-[11px] text-accent-dark" title={`Tarifa del paseador: ${colones(paseo.precio_tarifa)}`}>
          Tu oferta · tarifa {colones(paseo.precio_tarifa)}
        </span>
      )}
    </span>
  );
};

/** Lo que no cabe en la fila: dónde se encuentran, cuándo terminó y
    el código para soporte. Igual en la tabla y en la ficha. */
const DetallePaseo = ({ paseo }: { paseo: WalkWithRelations }) => (
  <dl className="grid gap-x-6 gap-y-3 text-[12.5px] sm:grid-cols-3">
    <div className="min-w-0">
      <dt className="rotulo text-ink-mute">Punto de encuentro</dt>
      <dd className="mt-1 break-words text-ink">{paseo.direccion_encuentro}</dd>
    </div>
    <div>
      <dt className="rotulo text-ink-mute">Hora de fin</dt>
      <dd className="nums mt-1 text-ink">{paseo.hora_fin ? paseo.hora_fin.slice(0, 5) : "Aún no finaliza"}</dd>
    </div>
    <div className="min-w-0">
      <dt className="rotulo text-ink-mute">Código de paseo</dt>
      <dd className="nums mt-1 break-all text-ink">{paseo.id_paseo}</dd>
    </div>
  </dl>
);

const Paseos = () => {
  const { user } = useAuth();
  const [walks, setWalks] = useState<WalkWithRelations[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedZonaId, setSelectedZonaId] = useState("");
  const [vista, setVista] = useState<Vista>("proximos");
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [porCancelar, setPorCancelar] = useState<WalkWithRelations | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const botonNotificaciones = useContext(NotificationButtonContext);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      const [walksData, petsData, zonasData] = await Promise.all([
        listWalksWithRelations(user.id, { zonaId: selectedZonaId || null }),
        listPets(),
        getZonas(),
      ]);
      setWalks(walksData);
      setPets(petsData);
      setZonas(zonasData);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, [user, selectedZonaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelarSolicitud = async () => {
    if (!porCancelar) return;
    setCancelando(true);
    try {
      await cancelWalkRequest(porCancelar.id_paseo);
      setWalks((actuales) =>
        actuales.map((w) =>
          w.id_paseo === porCancelar.id_paseo ? { ...w, estado: "cancelado" } : w,
        ),
      );
      aviso.dato(`Solicitud de ${porCancelar.mascota?.nombre ?? "tu mascota"} cancelada`, {
        detalle: "Le avisamos al paseador.",
      });
      setPorCancelar(null);
    } catch (cause) {
      aviso.error(cause, { respaldo: "No se pudo cancelar la solicitud." });
      setPorCancelar(null);
      void load();
    } finally {
      setCancelando(false);
    }
  };

  const petOptions = useMemo(
    () => [
      { value: "", label: "Todas mis mascotas" },
      ...pets.map((p) => ({ value: p.id_mascota, label: p.nombre })),
    ],
    [pets],
  );

  const zonaOptions = useMemo(
    () => [
      { value: "", label: "Todas las zonas" },
      ...zonas.map((z) => ({ value: z.id_zona, label: zonaLabel(z) })),
    ],
    [zonas],
  );

  const dePaseos = useMemo(
    () => (selectedPetId ? walks.filter((w) => w.mascota?.id_mascota === selectedPetId) : walks),
    [selectedPetId, walks],
  );

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return dePaseos.filter((w) => {
      if (vista === "proximos" && !isUpcoming(w)) return false;
      if (vista === "historial" && isUpcoming(w)) return false;
      if (!texto) return true;
      return `${w.mascota?.nombre ?? ""} ${w.paseador?.nombre ?? ""} ${zonaLabel(w.zona)} ${w.direccion_encuentro} ${w.id_paseo}`
        .toLowerCase()
        .includes(texto);
    });
  }, [busqueda, dePaseos, vista]);

  const stats = useMemo(() => getWalkStats(dePaseos), [dePaseos]);
  const parte = (n: number) => (stats.total ? n / stats.total : 0);
  const porcentaje = (n: number) => Math.round(parte(n) * 100);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaActual - 1) * PAGE_SIZE;
  const finPagina = Math.min(inicioPagina + PAGE_SIZE, visibles.length);
  const paginaPaseos = visibles.slice(inicioPagina, inicioPagina + PAGE_SIZE);

  const hayFiltros = Boolean(busqueda || selectedPetId || selectedZonaId || vista !== "proximos");
  const conFiltro = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(1); };
  const limpiar = () => {
    setBusqueda("");
    setSelectedPetId("");
    setSelectedZonaId("");
    setVista("proximos");
    setPagina(1);
  };
  const alternarDetalle = (id: string) => setDetalleId((actual) => (actual === id ? null : id));

  /** Las acciones de un paseo. Cancelar solo existe mientras el
      paseador no respondió; en curso se sigue en vivo. */
  const accionesDe = (p: WalkWithRelations) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      {p.estado === "solicitado" && (
        <button type="button" className={btnDangerCompacto} onClick={() => setPorCancelar(p)}>
          <X size={13} strokeWidth={2.2} />
          Cancelar
        </button>
      )}
      {p.estado === "en_curso" ? (
        <Link to="/paseo-en-vivo" className={btnSecondaryCompacto}>
          Ver en vivo
        </Link>
      ) : (
        <button
          type="button"
          className={btnSecondaryCompacto}
          aria-expanded={detalleId === p.id_paseo}
          onClick={() => alternarDetalle(p.id_paseo)}
        >
          Detalle
          <ChevronDown
            size={13}
            strokeWidth={2.2}
            aria-hidden
            className={`transition-transform duration-200 ${detalleId === p.id_paseo ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );

  return (
    <Page wide>
      <PageHeader
        title="Paseos"
        subtitle="Agenda, seguimiento e historial de los paseos de tus mascotas."
        action={
          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <Link to="/paseadores" className={`${btnPrimary} flex-1 sm:flex-none`}>
              <CalendarDays size={15} strokeWidth={2} />
              Agendar paseo
            </Link>
            {botonNotificaciones}
          </div>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat etiqueta="Total de paseos" valor={String(stats.total)} nota="Todos los que agendaste" />
        <Stat
          etiqueta="Próximos"
          valor={String(stats.upcoming)}
          nota={`${porcentaje(stats.upcoming)} % del total`}
          parte={parte(stats.upcoming)}
        />
        <Stat
          etiqueta="Completados"
          valor={String(stats.completed)}
          nota={`${porcentaje(stats.completed)} % del total`}
          parte={parte(stats.completed)}
        />
        <Stat etiqueta="Total gastado" valor={colones(stats.totalSpent)} nota="En paseos completados" />
      </div>

      <div className="min-w-0">
        <Section
          title="Filtros"
          aside={<Badge tono="accent">{visibles.length} {visibles.length === 1 ? "resultado" : "resultados"}</Badge>}
          bodyClass="px-4 py-4 sm:px-6"
        >
          <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
            <label className="relative block sm:col-span-2 lg:col-span-1">
              <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-mute" aria-hidden />
              <span className="sr-only">Buscar paseos</span>
              <input
                value={busqueda}
                onChange={(event) => conFiltro(setBusqueda)(event.target.value)}
                className={`${input} pl-10`}
                placeholder="Buscar por mascota, paseador o lugar"
              />
            </label>
            <Combo value={selectedPetId} onChange={conFiltro(setSelectedPetId)} aria-label="Filtrar por mascota" options={petOptions} />
            <Combo value={selectedZonaId} onChange={conFiltro(setSelectedZonaId)} aria-label="Filtrar por zona" options={zonaOptions} />
            <Combo
              value={vista}
              onChange={(v) => conFiltro(setVista)(v as Vista)}
              aria-label="Filtrar por estado"
              options={[
                { value: "proximos", label: "Próximos" },
                { value: "historial", label: "Historial" },
                { value: "todos", label: "Todos los paseos" },
              ]}
            />
            {hayFiltros && (
              <button type="button" className={`${btnSecondary} sm:col-span-2 lg:col-span-1`} onClick={limpiar}>
                Limpiar
              </button>
            )}
          </div>
        </Section>
      </div>

      {error && (
        <div role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <div className="min-w-0">
        <Section bodyClass="">
          {loading ? (
            <Skeleton name="paseos-lista" loading><div /></Skeleton>
          ) : visibles.length === 0 ? (
            <div className="px-4 py-4 sm:px-6">
              <EmptyState
                title="No hay paseos en esta vista"
                hint={hayFiltros ? "Prueba con otra búsqueda o limpia los filtros." : "Agenda el primer paseo de tu mascota."}
                action={
                  hayFiltros ? (
                    <button type="button" className={btnSecondary} onClick={limpiar}>Limpiar filtros</button>
                  ) : (
                    <Link to="/paseadores" className={btnPrimary}>Agendar paseo</Link>
                  )
                }
              />
            </div>
          ) : (
            <>
              {/* ── De lg para arriba: la tabla ── */}
              <div className="hidden lg:block">
                <Table
                  caption="Paseos de tus mascotas"
                  min="min-w-[900px]"
                  padX="px-4"
                  columnas={[
                    { label: "Mascota", ancho: "w-[20%]" },
                    { label: "Paseador", ancho: "w-[17%]" },
                    { label: "Cuándo", ancho: "w-[14%]" },
                    { label: "Zona", ancho: "w-[16%]" },
                    { label: "Estado", ancho: "w-[11%]" },
                    { label: "Precio", ancho: "w-[9%]", align: "right" },
                    { label: "Acciones", ancho: "w-[13%]", align: "right", muda: true },
                  ]}
                >
                  {paginaPaseos.map((p) => (
                    <Fragment key={p.id_paseo}>
                      <tr className="transition-colors duration-150 hover:bg-accent-wash/25">
                        <td className="px-4 py-3">
                          <div className={`flex min-w-0 items-center gap-3 transition-opacity duration-200 ${p.estado === "cancelado" ? "opacity-55" : ""}`}>
                            <FotoMascota paseo={p} size={36} />
                            <span className="min-w-0">
                              <span className="block truncate text-[13.5px] font-semibold text-ink" title={p.mascota?.nombre}>
                                {p.mascota?.nombre ?? "Sin nombre"}
                              </span>
                              <span className="nums mt-0.5 block text-[11px] text-ink-mute">ID {p.id_paseo.slice(0, 8)}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Paseador paseo={p} />
                        </td>
                        <td className="nums px-4 py-3 whitespace-nowrap">
                          <span className="block text-[12.5px] font-medium text-ink first-letter:uppercase">{formatoFecha(p.fecha)}</span>
                          <span className="mt-0.5 block text-[11.5px] text-ink-mute">
                            {p.hora_inicio.slice(0, 5)} · {p.duracion_min} min
                          </span>
                        </td>
                        <td className={`truncate px-4 py-3 text-[12.5px] ${p.zona ? "text-ink-soft" : "text-ink-mute italic"}`} title={zonaLabel(p.zona)}>
                          {zonaLabel(p.zona) || "Sin zona"}
                        </td>
                        <td className="px-4 py-3">
                          <ChipEstado estado={p.estado} />
                        </td>
                        <td className="nums px-4 py-3 text-right">
                          <PrecioPaseo paseo={p} />
                        </td>
                        <td className="px-4 py-3 text-right">{accionesDe(p)}</td>
                      </tr>
                      {detalleId === p.id_paseo && (
                        <tr>
                          <td colSpan={7} className="bg-sunken/60 px-4 py-4">
                            <DetallePaseo paseo={p} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Table>
              </div>

              {/* ── Debajo de lg: fichas ── */}
              <ul className="grid gap-2.5 p-4 lg:hidden">
                {paginaPaseos.map((p) => (
                  <li key={p.id_paseo} className="rounded-[14px] bg-sunken/60 p-4">
                    <div className={`flex items-start gap-3 transition-opacity duration-200 ${p.estado === "cancelado" ? "opacity-55" : ""}`}>
                      <FotoMascota paseo={p} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">{p.mascota?.nombre ?? "Sin nombre"}</p>
                        <p className="nums mt-0.5 text-[11px] text-ink-mute">ID {p.id_paseo.slice(0, 8)}</p>
                      </div>
                      <ChipEstado estado={p.estado} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px]">
                      <div className="col-span-2">
                        <dt className="rotulo text-ink-mute">Paseador</dt>
                        <dd className="mt-1"><Paseador paseo={p} /></dd>
                      </div>
                      <div>
                        <dt className="rotulo text-ink-mute">Cuándo</dt>
                        <dd className="nums mt-1 text-ink first-letter:uppercase">{formatoFecha(p.fecha)}</dd>
                        <dd className="nums mt-0.5 text-ink-mute">{p.hora_inicio.slice(0, 5)} · {p.duracion_min} min</dd>
                      </div>
                      <div>
                        <dt className="rotulo text-ink-mute">Precio</dt>
                        <dd className="nums mt-1"><PrecioPaseo paseo={p} alinear="izquierda" /></dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="rotulo text-ink-mute">Zona</dt>
                        <dd className={`mt-1 break-words ${p.zona ? "text-ink-soft" : "text-ink-mute italic"}`}>{zonaLabel(p.zona) || "Sin zona"}</dd>
                      </div>
                    </dl>

                    {detalleId === p.id_paseo && (
                      <div className="mt-3 rounded-[12px] bg-surface p-3.5">
                        <DetallePaseo paseo={p} />
                      </div>
                    )}

                    <div className="mt-3.5">{accionesDe(p)}</div>
                  </li>
                ))}
              </ul>

              <Paginacion
                etiqueta="Paginación de paseos"
                actual={paginaActual}
                total={totalPaginas}
                onCambiar={setPagina}
                desde={inicioPagina + 1}
                hasta={finPagina}
                cuantos={visibles.length}
                nombre={["paseo", "paseos"]}
              />
            </>
          )}
        </Section>
      </div>

      {porCancelar && (
        <Confirmar
          titulo="¿Cancelar la solicitud?"
          cuerpo={`${porCancelar.paseador?.nombre ?? "El paseador"} todavía no respondió. Si la cancelás, se le avisa y el paseo de ${porCancelar.mascota?.nombre ?? "tu mascota"} no se agenda.`}
          confirmar="Cancelar solicitud"
          cancelar="Volver"
          tono="peligro"
          ocupado={cancelando}
          onConfirmar={() => void cancelarSolicitud()}
          onCancelar={() => setPorCancelar(null)}
        />
      )}
    </Page>
  );
};

export default Paseos;
