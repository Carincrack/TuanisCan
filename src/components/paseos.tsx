import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Footprints,
  Search,
  Wallet,
  X,
} from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import type { I18nContextValue } from "../context/i18n-context";
import { listPets } from "../services/pets.service";
import {
  cancelWalkRequest,
  finPrevisto,
  isOverdue,
  isUpcoming,
  listWalksWithRelations,
} from "../services/walks.service";
import { listUbicacionesPaseo } from "../services/live-walks.service";
import type { UbicacionPaseo } from "../services/live-walks.service";
import { aviso } from "../lib/aviso";
import type { WalkWithRelations } from "../services/walks.service";
import type { Pet } from "../types/pet.types";
import {
  Avatar,
  Badge,
  Confirmar,
  Dialog,
  EmptyState,
  FilterTabs,
  NotificationButtonContext,
  Page,
  PageHeader,
  Paginacion,
  Section,
  Table,
  btnDangerCompacto,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  btnSecondaryCompacto,
  colones,
} from "./ui";
import { Combo } from "./Combo";
import { Skeleton } from "boneyard-js/react";

type T = I18nContextValue["t"];

const pinInicio = divIcon({
  className: "tsc-map-marker",
  html: '<span class="tsc-map-marker__pin"><span></span></span>',
  iconSize: [44, 48],
  iconAnchor: [22, 44],
});
const pinFin = divIcon({
  className: "tsc-map-marker",
  html: '<span class="tsc-map-marker__pin is-active"><span></span></span>',
  iconSize: [44, 48],
  iconAnchor: [22, 44],
});

/* ─────────────────────────────────────────────────────────────
   PASEOS DEL DUEÑO

   La misma casa que Gestión de pagos: tres cifras blancas, una tira
   con las pestañas y el buscador, la tabla de reparto fijo de `lg`
   para arriba y la lista de mano debajo. El detalle de un paseo se
   abre en la ventana compartida, como el comprobante de un pago: se
   desplegaba como una fila extra dentro de la tabla, y esa fila
   corría la cebra de todas las de abajo.
   ───────────────────────────────────────────────────────────── */

type Vista = "proximos" | "historial" | "todos";

/** El estado que se MUESTRA. «vencido» no existe en la base: es un
    paseo solicitado o confirmado cuya hora ya pasó sin que arrancara. */
type EstadoVisible = WalkWithRelations["estado"] | "vencido";

type Tono = "ok" | "warn" | "danger" | "accent" | "neutral";

const PAGE_SIZE = 8;

const estadoConfig: Record<EstadoVisible, { clave: string; tono: Tono; icon: typeof Clock }> = {
  solicitado: { clave: "paseos.status.requested", tono: "warn", icon: Clock },
  confirmado: { clave: "paseos.status.confirmed", tono: "ok", icon: CalendarCheck },
  en_curso: { clave: "paseos.status.inCourse", tono: "accent", icon: Footprints },
  finalizado: { clave: "paseos.status.completed", tono: "neutral", icon: CheckCircle2 },
  cancelado: { clave: "paseos.status.cancelled", tono: "danger", icon: X },
  vencido: { clave: "paseos.status.overdue", tono: "neutral", icon: AlertCircle },
};

const estadoDe = (paseo: WalkWithRelations): EstadoVisible =>
  isOverdue(paseo) ? "vencido" : paseo.estado;

/** Lo que ya no va a pasar se atenúa en vez de necesitar la palabra. */
const apagado = (paseo: WalkWithRelations) => {
  const estado = estadoDe(paseo);
  return estado === "cancelado" || estado === "vencido";
};

const EstadoInsignia = ({ paseo }: { paseo: WalkWithRelations }) => {
  const { t } = useTranslation();
  const config = estadoConfig[estadoDe(paseo)];
  const Icono = config.icon;

  return (
    <Badge tono={config.tono}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Icono size={12} className="shrink-0" />
        {t(config.clave)}
      </span>
    </Badge>
  );
};

/** «Guanacaste, Santa Cruz, Tamarindo» no cabe en una columna y se
    cortaba en «Guanacaste, Santa Cruz,…»: justo se perdía lo único que
    distingue un lugar de otro. Se parte en dos renglones: el distrito
    arriba, que es lo específico, y cantón y provincia debajo. */
const lugarDe = (zona: WalkWithRelations["zona"]) => {
  if (!zona) return null;
  const principal = zona.distrito ?? zona.nombre;
  const resto = [zona.canton, zona.provincia].filter((parte) => parte && parte !== principal).join(", ");
  return { principal, resto, completo: [zona.provincia, zona.canton, principal].filter(Boolean).join(", ") };
};

const messageFrom = (cause: unknown, t: T) =>
  cause instanceof Error
    ? cause.message
    : typeof cause === "object" && cause && "message" in cause
      ? String((cause as { message: string }).message)
      : t("paseos.loadError");

/** La foto de la mascota. Si la URL firmada falla —venció, se borró el
    archivo— quedaba un círculo vacío con el borde de la imagen rota;
    ahora cae a las iniciales, como cuando no hay foto. */
const FotoMascota = ({ paseo, size }: { paseo: WalkWithRelations; size: number }) => {
  const [rota, setRota] = useState(false);
  const url = paseo.mascota?.fotoUrl;

  return url && !rota ? (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      onError={() => setRota(true)}
      className="shrink-0 rounded-full bg-sunken object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <Avatar nombre={paseo.mascota?.nombre ?? "M"} size={size} />
  );
};

const Paseador = ({ paseo }: { paseo: WalkWithRelations }) => {
  const { t } = useTranslation();
  const [rota, setRota] = useState(false);

  if (!paseo.paseador) {
    return <span className="text-[12.5px] text-ink-mute italic">{t("paseos.unassigned")}</span>;
  }

  const nombre = paseo.paseador.nombre ?? t("paseos.walkerFallback");

  return (
    <span className="flex min-w-0 items-center gap-2">
      {paseo.paseador.fotoUrl && !rota ? (
        <img
          src={paseo.paseador.fotoUrl}
          alt=""
          onError={() => setRota(true)}
          className="h-7 w-7 shrink-0 rounded-full bg-sunken object-cover"
        />
      ) : (
        <Avatar nombre={nombre} size={28} />
      )}
      <span className="truncate text-[12.5px] font-medium text-ink" title={nombre}>
        {nombre}
      </span>
    </span>
  );
};

/** El precio. Si fue una oferta lo dice en dos palabras; la tarifa de
    referencia queda en el tooltip y en el detalle, porque en la
    columna «Tu oferta · tarifa ₡10 000» no entraba sin partirse. */
const PrecioPaseo = ({ paseo, alinear = "derecha" }: { paseo: WalkWithRelations; alinear?: "derecha" | "izquierda" }) => {
  const { t } = useTranslation();
  const esOferta = paseo.precio !== paseo.precio_tarifa;

  return (
    <span className={`flex flex-col ${alinear === "derecha" ? "items-end" : "items-start"}`}>
      <span className="nums text-[13.5px] font-semibold text-ink">{colones(paseo.precio)}</span>
      {esOferta && (
        <span
          className="mt-0.5 text-[11px] font-medium text-accent-deep"
          title={t("paseos.walkerRateTitle", { tarifa: colones(paseo.precio_tarifa) })}
        >
          {t("paseos.yourOfferShort")}
        </span>
      )}
    </span>
  );
};

/** Una cifra de arriba. Las mismas de Gestión de pagos: blancas, el
    ícono en un disco gris y el monto en tinta.

    En el teléfono van las tres en una fila, sin disco ni nota: apiladas
    a lo ancho ocupaban casi una pantalla entera antes del primer paseo.
    El rótulo puede partirse en dos renglones; la cifra se ancla abajo
    para que las tres queden a la misma altura igual. */
const Cifra = ({
  etiqueta,
  valor,
  nota,
  Icono,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  Icono: typeof Clock;
}) => (
  <div className="flex min-w-0 flex-col rounded-[18px] bg-surface px-3.5 py-3.5 sm:px-5 sm:py-4">
    <div className="flex items-center justify-between gap-2">
      <p className="rotulo leading-snug text-ink-mute">{etiqueta}</p>
      <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken text-ink-soft sm:grid">
        <Icono size={15} />
      </span>
    </div>
    <p className="nums mt-auto pt-2 text-[18px] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap text-ink sm:text-[24px]">
      {valor}
    </p>
    <p className="mt-1.5 hidden truncate text-[12px] text-ink-soft first-letter:uppercase sm:block">{nota}</p>
  </div>
);

const Paseos = () => {
  const { user } = useAuth();
  const { t, localeTag } = useTranslation();
  const [walks, setWalks] = useState<WalkWithRelations[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
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
  const [rutaDe, setRutaDe] = useState<WalkWithRelations | null>(null);
  const [ruta, setRuta] = useState<UbicacionPaseo[] | null>(null);
  const [rutaCargando, setRutaCargando] = useState(false);
  const [rutaError, setRutaError] = useState("");
  const botonNotificaciones = useContext(NotificationButtonContext);

  const verRuta = async (paseo: WalkWithRelations) => {
    setRutaDe(paseo);
    setRuta(null);
    setRutaError("");
    setRutaCargando(true);
    try {
      setRuta(await listUbicacionesPaseo(paseo.id_paseo));
    } catch (cause) {
      setRutaError(messageFrom(cause, t));
    } finally {
      setRutaCargando(false);
    }
  };

  const fechaCorta = (fecha: string) =>
    new Intl.DateTimeFormat(localeTag, { weekday: "short", day: "numeric", month: "short" }).format(
      new Date(`${fecha}T00:00:00`),
    );
  const fechaLarga = (fecha: string) =>
    new Intl.DateTimeFormat(localeTag, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
      new Date(`${fecha}T00:00:00`),
    );
  const hora = (valor: string) => valor.slice(0, 5);
  /** La hora en que termina: inicio más duración. No se usa `hora_fin`
      aunque exista: `finalizar_paseo` la guarda con `localtime` del
      servidor, que corre en UTC, y un paseo de 08:00 salía «08:00 –
      03:56». Hasta que la base la guarde en hora de Costa Rica, el
      horario agendado es el dato confiable. */
  const horaFin = (paseo: WalkWithRelations) => {
    const fin = finPrevisto(paseo);
    return `${String(fin.getHours()).padStart(2, "0")}:${String(fin.getMinutes()).padStart(2, "0")}`;
  };

  /* Las zonas ya no se piden aparte. Antes se cargaban TODAS las del
     país para el combo y el filtro volvía a pedir los paseos al
     servidor; ahora salen de los propios paseos —son las únicas en
     las que hay algo que filtrar— y se filtra en el cliente. */
  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      const [walksData, petsData] = await Promise.all([listWalksWithRelations(user.id), listPets()]);
      setWalks(walksData);
      setPets(petsData);
    } catch (cause) {
      setError(messageFrom(cause, t));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelarSolicitud = async () => {
    if (!porCancelar) return;
    setCancelando(true);
    try {
      await cancelWalkRequest(porCancelar.id_paseo);
      setWalks((actuales) =>
        actuales.map((w) => (w.id_paseo === porCancelar.id_paseo ? { ...w, estado: "cancelado" } : w)),
      );
      aviso.dato(t("paseos.cancelled", { mascota: porCancelar.mascota?.nombre ?? t("home.defaultPet") }), {
        detalle: t("paseos.cancelledDetail"),
      });
      setPorCancelar(null);
    } catch (cause) {
      aviso.error(cause, { respaldo: t("paseos.cancelFailed") });
      setPorCancelar(null);
      void load();
    } finally {
      setCancelando(false);
    }
  };

  /* ── Opciones de los combos ──
     El de mascotas solo aparece con dos o más: con una sola, «Todas mis
     mascotas» y «Oso» son la misma lista. Lo mismo las zonas. */
  const petOptions = useMemo(
    () => [{ value: "", label: t("paseos.allMyPets") }, ...pets.map((p) => ({ value: p.id_mascota, label: p.nombre }))],
    [pets, t],
  );

  const zonaOptions = useMemo(() => {
    const vistas = new Map<string, string>();
    walks.forEach((w) => {
      const lugar = lugarDe(w.zona);
      if (w.zona && lugar) vistas.set(w.zona.id_zona, lugar.principal);
    });
    return [
      { value: "", label: t("paseos.allZones") },
      ...[...vistas].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [walks, t]);

  /* ── Los filtros, en capas ──
     `base`: mascota y zona. Sobre eso se cuentan las cifras de arriba.
     `buscados`: más el texto. Sobre eso se cuentan las pestañas.
     `visibles`: más la pestaña. Eso es la tabla. */
  const base = useMemo(
    () =>
      walks.filter(
        (w) =>
          (!selectedPetId || w.mascota?.id_mascota === selectedPetId) &&
          (!selectedZonaId || w.zona?.id_zona === selectedZonaId),
      ),
    [walks, selectedPetId, selectedZonaId],
  );

  const buscados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return base;
    return base.filter((w) =>
      `${w.mascota?.nombre ?? ""} ${w.paseador?.nombre ?? ""} ${lugarDe(w.zona)?.completo ?? ""} ${w.direccion_encuentro} ${w.id_paseo}`
        .toLowerCase()
        .includes(texto),
    );
  }, [base, busqueda]);

  /* Próximos en orden de llegada —el de mañana arriba—; el historial,
     del más reciente al más viejo. */
  const visibles = useMemo(() => {
    const clave = (w: WalkWithRelations) => `${w.fecha}T${w.hora_inicio}`;
    if (vista === "proximos") {
      return buscados.filter(isUpcoming).sort((a, b) => clave(a).localeCompare(clave(b)));
    }
    const lista = vista === "historial" ? buscados.filter((w) => !isUpcoming(w)) : [...buscados];
    return lista.sort((a, b) => clave(b).localeCompare(clave(a)));
  }, [buscados, vista]);

  const cuentas = useMemo(() => {
    const proximos = buscados.filter(isUpcoming).length;
    return { proximos, historial: buscados.length - proximos, todos: buscados.length };
  }, [buscados]);

  const cifras = useMemo(() => {
    const proximos = base
      .filter(isUpcoming)
      .sort((a, b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`));
    const completados = base.filter((w) => w.estado === "finalizado");
    return {
      proximos: proximos.length,
      siguiente: proximos[0] ?? null,
      completados: completados.length,
      gastado: completados.reduce((suma, w) => suma + w.precio, 0),
      total: base.length,
    };
  }, [base]);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaActual - 1) * PAGE_SIZE;
  const finPagina = Math.min(inicioPagina + PAGE_SIZE, visibles.length);
  const paginaPaseos = visibles.slice(inicioPagina, inicioPagina + PAGE_SIZE);

  /* La pestaña no es un filtro: «Limpiar» deja la que esté elegida. */
  const hayFiltros = Boolean(busqueda || selectedPetId || selectedZonaId);
  const conFiltro =
    <V,>(set: (v: V) => void) =>
    (v: V) => {
      set(v);
      setPagina(1);
    };
  const limpiar = () => {
    setBusqueda("");
    setSelectedPetId("");
    setSelectedZonaId("");
    setPagina(1);
  };

  const detalle = detalleId ? walks.find((w) => w.id_paseo === detalleId) ?? null : null;

  /** La acción que urge, si la hay: cancelar mientras el paseador no
      respondió, o seguirlo en vivo mientras camina. */
  const accionDe = (p: WalkWithRelations) =>
    p.estado === "solicitado" ? (
      <button type="button" className={btnDangerCompacto} onClick={() => setPorCancelar(p)}>
        <X size={13} strokeWidth={2.2} />
        {t("paseos.cancel")}
      </button>
    ) : p.estado === "en_curso" ? (
      <Link to="/paseo-en-vivo" className={btnSecondaryCompacto}>
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        {t("paseos.watchLive")}
      </Link>
    ) : null;

  const nombreMascota = (p: WalkWithRelations) => p.mascota?.nombre ?? t("paseos.noName");

  /** El nombre abre el detalle. Subrayado al pasar por la fila, como
      el «Paseo con…» de Gestión de pagos. */
  const abrirDetalle = (paseo: WalkWithRelations, className: string) => (
    <button
      type="button"
      onClick={() => setDetalleId(paseo.id_paseo)}
      title={t("paseos.detail.open", { mascota: nombreMascota(paseo) })}
      className={`block max-w-full truncate text-left font-semibold text-ink underline-offset-[3px] transition-colors duration-150 hover:text-accent-deep ${className}`}
    >
      {nombreMascota(paseo)}
    </button>
  );

  return (
    <Page wide>
      <PageHeader
        title={t("paseos.title")}
        subtitle={t("paseos.subtitle")}
        action={
          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <Link to="/paseadores" className={`${btnPrimary} flex-1 sm:flex-none`}>
              <CalendarDays size={15} strokeWidth={2} />
              {t("paseos.scheduleWalk")}
            </Link>
            {botonNotificaciones}
          </div>
        }
      />

      {/* ── Las tres cifras ──
          Eran cuatro, con «40 % del total» y una barra debajo de
          próximos y completados: una proporción que no le dice nada a
          quien tiene un perro. Ahora cada nota dice algo que sirve: cuál
          es el siguiente paseo, de cuántos agendados salieron los
          completados y en cuántos se fue lo gastado. El total suelto se
          va: lo cuenta la pestaña «Todos». */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Cifra
          etiqueta={t("paseos.stats.upcoming")}
          valor={String(cifras.proximos)}
          Icono={CalendarDays}
          nota={
            cifras.siguiente
              ? t("paseos.stats.nextOne", {
                  cuando: `${fechaCorta(cifras.siguiente.fecha)} · ${hora(cifras.siguiente.hora_inicio)}`,
                })
              : t("paseos.stats.nothingScheduled")
          }
        />
        <Cifra
          etiqueta={t("paseos.stats.completed")}
          valor={String(cifras.completados)}
          Icono={CheckCircle2}
          nota={t(cifras.total === 1 ? "paseos.stats.ofScheduledOne" : "paseos.stats.ofScheduled", { total: cifras.total })}
        />
        <Cifra
          etiqueta={t("paseos.stats.totalSpent")}
          valor={colones(cifras.gastado)}
          Icono={Wallet}
          nota={
            cifras.completados === 0
              ? t("paseos.stats.noneCompleted")
              : t(cifras.completados === 1 ? "paseos.stats.spentInOne" : "paseos.stats.spentIn", { n: cifras.completados })
          }
        />
      </div>

      {/* ── Pestañas y búsqueda ──
          Una sola tira, como en Pagos. La vista era un combo más entre
          los filtros, con el mismo peso que «Todas las zonas»; es lo
          primero que se elige y ahora se ve como tal, con cuántos hay
          en cada una. */}
      <div className="flex flex-col gap-3 rounded-[18px] bg-surface p-3.5 xl:flex-row xl:items-center xl:gap-4">
        <div className="-mx-3.5 overflow-x-auto px-3.5 xl:mx-0 xl:shrink-0 xl:overflow-visible xl:px-0">
          <FilterTabs
            label={t("paseos.filters.label")}
            options={[
              { value: "proximos", label: t("paseos.filters.upcoming") },
              { value: "historial", label: t("paseos.filters.history") },
              { value: "todos", label: t("paseos.filters.all") },
            ]}
            value={vista}
            onChange={(v) => conFiltro(setVista)(v as Vista)}
            cuentas={cuentas}
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2.5 sm:flex-nowrap xl:justify-end">
          <label className="relative block min-w-[200px] flex-1 basis-full sm:basis-auto xl:max-w-[320px]">
            <span className="sr-only">{t("paseos.filters.searchAria")}</span>
            <Search
              size={14}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-mute"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(event) => conFiltro(setBusqueda)(event.target.value)}
              placeholder={t("paseos.filters.searchPlaceholder")}
              className="h-10 w-full rounded-full bg-sunken pr-3 pl-9 text-[12.5px] text-ink placeholder:text-ink-mute focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
            />
          </label>

          {pets.length > 1 && (
            <div className="min-w-[140px] flex-1 sm:w-[180px] sm:flex-none">
              <Combo
                value={selectedPetId}
                onChange={conFiltro(setSelectedPetId)}
                aria-label={t("paseos.filters.petAria")}
                options={petOptions}
                className="h-10 rounded-full py-0 text-[12.5px]"
              />
            </div>
          )}

          {zonaOptions.length > 2 && (
            <div className="min-w-[140px] flex-1 sm:w-[180px] sm:flex-none">
              <Combo
                value={selectedZonaId}
                onChange={conFiltro(setSelectedZonaId)}
                aria-label={t("paseos.filters.zoneAria")}
                options={zonaOptions}
                className="h-10 rounded-full py-0 text-[12.5px]"
              />
            </div>
          )}

          {hayFiltros && (
            <button type="button" className={`${btnQuiet} shrink-0 px-3.5 py-2 text-[12.5px]`} onClick={limpiar}>
              <X size={13} strokeWidth={2.2} />
              {t("paseos.filters.clear")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger"
        >
          {error}
          <button type="button" className={btnDangerCompacto} onClick={() => void load()}>
            {t("paseos.retry")}
          </button>
        </div>
      )}

      {/* ── Los paseos ── */}
      <Section bodyClass="p-0">
        {loading ? (
          <Skeleton name="paseos-lista" loading>
            <div />
          </Skeleton>
        ) : visibles.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={vista === "proximos" && !hayFiltros ? t("paseos.empty.noUpcoming") : t("paseos.empty.title")}
              hint={hayFiltros ? t("paseos.empty.withFilters") : t("paseos.empty.withoutFilters")}
              action={
                hayFiltros ? (
                  <button type="button" className={btnSecondary} onClick={limpiar}>
                    {t("paseos.empty.clearFilters")}
                  </button>
                ) : (
                  <Link to="/paseadores" className={btnPrimary}>
                    <CalendarDays size={15} strokeWidth={2} />
                    {t("paseos.scheduleWalk")}
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* ── De lg para arriba: la tabla ── */}
            <div className="hidden lg:block">
              <Table
                caption={t("paseos.table.caption")}
                min="min-w-[860px]"
                padX="px-4"
                columnas={[
                  { label: t("paseos.table.pet"), ancho: "w-[16%]" },
                  { label: t("paseos.table.when"), ancho: "w-[14%]" },
                  { label: t("paseos.table.walker"), ancho: "w-[17%]" },
                  { label: t("paseos.table.place"), ancho: "w-[16%]" },
                  { label: t("paseos.table.status"), ancho: "w-[15%]" },
                  { label: t("paseos.table.price"), ancho: "w-[11%]", align: "right" },
                  { label: t("paseos.table.actions"), ancho: "w-[11%]", align: "right", muda: true },
                ]}
              >
                {paginaPaseos.map((p) => {
                  const lugar = lugarDe(p.zona);
                  const accion = accionDe(p);
                  return (
                    <tr key={p.id_paseo} className="group transition-colors duration-150 hover:bg-accent-wash/40">
                      <td className="px-4 py-3">
                        <div
                          className={`flex min-w-0 items-center gap-3 transition-opacity duration-200 ${apagado(p) ? "opacity-55" : ""}`}
                        >
                          <FotoMascota paseo={p} size={36} />
                          {abrirDetalle(p, "text-[13.5px] group-hover:underline")}
                        </div>
                      </td>
                      <td className="nums px-4 py-3 whitespace-nowrap">
                        <span className="block text-[12.5px] font-medium text-ink first-letter:uppercase">
                          {fechaCorta(p.fecha)}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-ink-mute">
                          {hora(p.hora_inicio)} · {p.duracion_min} min
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Paseador paseo={p} />
                      </td>
                      <td className="px-4 py-3" title={lugar?.completo}>
                        {lugar ? (
                          <>
                            <span className="block truncate text-[12.5px] font-medium text-ink">{lugar.principal}</span>
                            {lugar.resto && (
                              <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">{lugar.resto}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-[12.5px] text-ink-mute italic">{t("paseos.table.noZone")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoInsignia paseo={p} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PrecioPaseo paseo={p} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {accion}
                          <button
                            type="button"
                            onClick={() => setDetalleId(p.id_paseo)}
                            aria-label={t("paseos.detail.open", { mascota: nombreMascota(p) })}
                            title={t("paseos.detail.open", { mascota: nombreMascota(p) })}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-mute transition-[background-color,color,transform] duration-150 ease-out hover:bg-sunken hover:text-ink active:scale-[0.94]"
                          >
                            <ChevronRight size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>

            {/* ── Debajo de lg: la lista de mano ──
                Filas cebra como la lista de Pagos, no tarjetas sueltas:
                la tabla y la lista son la misma cosa a distinto ancho. */}
            <ul className="lg:hidden [&>li:nth-child(even)]:bg-sunken/60">
              {paginaPaseos.map((p) => {
                const accion = accionDe(p);
                return (
                  <li key={p.id_paseo} className="px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                      <div className={`transition-opacity duration-200 ${apagado(p) ? "opacity-55" : ""}`}>
                        <FotoMascota paseo={p} size={40} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {abrirDetalle(p, "text-[14px]")}
                        <p className="nums mt-0.5 truncate text-[11.5px] text-ink-soft first-letter:uppercase">
                          {fechaCorta(p.fecha)} · {hora(p.hora_inicio)} · {p.duracion_min} min
                        </p>
                      </div>
                      <div className="shrink-0">
                        <PrecioPaseo paseo={p} />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-[52px]">
                      <EstadoInsignia paseo={p} />
                      <div className="min-w-0 max-w-full">
                        <Paseador paseo={p} />
                      </div>
                      {accion && <div className="ml-auto">{accion}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>

            <Paginacion
              etiqueta={t("paseos.pagination.label")}
              actual={paginaActual}
              total={totalPaginas}
              onCambiar={setPagina}
              desde={inicioPagina + 1}
              hasta={finPagina}
              cuantos={visibles.length}
              nombre={[t("paseos.pagination.singular"), t("paseos.pagination.plural")]}
            />
          </>
        )}
      </Section>

      {/* ── El detalle ──
          Con la forma del comprobante de Pagos: cabecera con quién y
          cuándo, renglones con los datos y el precio al pie. */}
      {detalle && (
        <Dialog title={t("paseos.detail.title")} onClose={() => setDetalleId(null)}>
          <div className="p-6">
            <div className="flex items-start gap-3.5 border-b border-sunken pb-4">
              <FotoMascota paseo={detalle} size={44} />
              <div className="min-w-0 flex-1">
                <h4 className="titular truncate text-[17px] text-ink">
                  {t("paseos.detail.walkOf", { mascota: nombreMascota(detalle) })}
                </h4>
                <p className="mt-0.5 text-[12.5px] text-ink-soft first-letter:uppercase">{fechaLarga(detalle.fecha)}</p>
                {/* En móvil la insignia va debajo: a la derecha le robaba
                    el ancho a la fecha y la partía en dos renglones. */}
                <div className="mt-2 sm:hidden">
                  <EstadoInsignia paseo={detalle} />
                </div>
              </div>
              <div className="hidden shrink-0 sm:block">
                <EstadoInsignia paseo={detalle} />
              </div>
            </div>

            {estadoDe(detalle) === "vencido" && (
              <div className="mt-4 flex items-start gap-2 rounded-[12px] bg-sunken px-3.5 py-2.5 text-[12.5px] text-ink-soft">
                <AlertCircle size={15} className="mt-px shrink-0 text-ink-mute" />
                {t(detalle.estado === "solicitado" ? "paseos.detail.overdueRequested" : "paseos.detail.overdueConfirmed")}
              </div>
            )}

            <dl className="mt-3 text-[13px]">
              {[
                [t("paseos.detail.walker"), detalle.paseador ? <Paseador paseo={detalle} /> : t("paseos.unassigned")],
                [
                  t("paseos.detail.schedule"),
                  <span className="nums">
                    {hora(detalle.hora_inicio)} – {horaFin(detalle)} · {detalle.duracion_min} min
                  </span>,
                ],
                [t("paseos.detail.meetingPoint"), detalle.direccion_encuentro],
                [t("paseos.detail.zone"), lugarDe(detalle.zona)?.completo ?? t("paseos.table.noZone")],
                [t("paseos.detail.code"), <span className="nums text-[12px] break-all text-ink-soft">{detalle.id_paseo}</span>],
              ].map(([etiqueta, valor]) => (
                <div key={String(etiqueta)} className="flex items-start justify-between gap-6 border-b border-sunken py-2.5">
                  <dt className="shrink-0 text-ink-soft">{etiqueta}</dt>
                  <dd className="flex min-w-0 justify-end text-right font-medium break-words text-ink">{valor}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 pt-3">
                <dt className="rotulo text-ink-mute">{t("paseos.detail.price")}</dt>
                <dd className="nums text-[22px] font-semibold tracking-[-0.02em] text-ink">{colones(detalle.precio)}</dd>
              </div>
              {detalle.precio !== detalle.precio_tarifa && (
                <p className="mt-1 text-right text-[12px] text-ink-soft">
                  {t("paseos.detail.offerNote", { tarifa: colones(detalle.precio_tarifa) })}
                </p>
              )}
            </dl>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-sunken pt-4">
              {detalle.estado === "solicitado" && (
                <button type="button" className={`${btnQuiet} text-danger hover:bg-danger-wash hover:text-danger`} onClick={() => setPorCancelar(detalle)}>
                  {t("paseos.cancelDialog.confirm")}
                </button>
              )}
              {detalle.estado === "en_curso" && (
                <Link to="/paseo-en-vivo" className={btnSecondary}>
                  {t("paseos.watchLive")}
                </Link>
              )}
              {detalle.estado === "finalizado" && (
                <button type="button" className={btnSecondary} onClick={() => void verRuta(detalle)}>
                  {t("paseos.detail.viewRoute")}
                </button>
              )}
              <button type="button" className={btnPrimary} onClick={() => setDetalleId(null)}>
                {t("paseos.detail.close")}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {rutaDe && (
        <Dialog title={t("paseos.route.title", { mascota: nombreMascota(rutaDe) })} onClose={() => setRutaDe(null)}>
          <div className="p-6">
            {rutaCargando ? (
              <div className="grid h-[360px] place-items-center bg-sunken text-[13px] text-ink-soft">
                {t("paseos.route.loading")}
              </div>
            ) : rutaError ? (
              <p className="text-[13px] text-danger">{rutaError}</p>
            ) : ruta && ruta.length > 1 ? (
              <MapContainer
                bounds={ruta.map((punto) => [punto.latitud, punto.longitud] as [number, number])}
                boundsOptions={{ padding: [28, 28] }}
                scrollWheelZoom
                className="h-[360px] w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline
                  positions={ruta.map((punto) => [punto.latitud, punto.longitud] as [number, number])}
                  pathOptions={{ color: "#12a9b9", weight: 5 }}
                />
                <Marker position={[ruta[0].latitud, ruta[0].longitud]} icon={pinInicio} />
                <Marker
                  position={[ruta[ruta.length - 1].latitud, ruta[ruta.length - 1].longitud]}
                  icon={pinFin}
                />
              </MapContainer>
            ) : (
              <EmptyState title={t("paseos.route.empty.title")} hint={t("paseos.route.empty.hint")} />
            )}
          </div>
        </Dialog>
      )}

      {porCancelar && (
        <Confirmar
          titulo={t("paseos.cancelDialog.title")}
          cuerpo={t("paseos.cancelDialog.body", {
            paseador: porCancelar.paseador?.nombre ?? t("paseos.cancelDialog.defaultWalker"),
            mascota: porCancelar.mascota?.nombre ?? t("home.defaultPet"),
          })}
          confirmar={t("paseos.cancelDialog.confirm")}
          cancelar={t("paseos.cancelDialog.back")}
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
