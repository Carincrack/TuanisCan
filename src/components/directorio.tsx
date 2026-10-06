import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { divIcon, latLngBounds } from "leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Heart,
  HeartHandshake,
  Maximize2,
  MapPin,
  Minimize2,
  Navigation,
  Phone,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Store,
} from "../lib/iconos";
import { getNegocios, getNegociosCercanos, getZonas } from "../services/auth.service";
import type { NegocioProfile, Zona } from "../types/auth.types";
import { useTranslation } from "../hooks/useTranslation";
import {
  Badge,
  EmptyState,
  FilterTabs,
  NotificationButtonContext,
  Page,
  btnQuiet,
  btnSecondary,
  input,
} from "./ui";
import { Combo } from "./Combo";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";
import { useZonasEncadenadas } from "../hooks/useZonasEncadenadas";

type TipoNegocio = NegocioProfile["tipo"];

/* Los valores de acá abajo —"Todos", "Veterinarias"...— son
   identificadores internos, estables entre idiomas: los compara
   `tipoPorFiltro` y los guarda `FilterTabs`. Lo que se traduce es
   solo la etiqueta, en `claveTipoLabel`. */
const tipos = ["Todos", "Veterinarias", "Tiendas", "Refugios"];
const claveTipoLabel: Record<string, string> = {
  Todos: "directorio.types.all",
  Veterinarias: "directorio.types.vets",
  Tiendas: "directorio.types.stores",
  Refugios: "directorio.types.shelters",
};
const tipoPorFiltro: Record<string, TipoNegocio | null> = {
  Todos: null,
  Veterinarias: "veterinaria",
  Tiendas: "tienda",
  Refugios: "refugio",
};
/* Un color por tipo, no solo un icono: en una lista de más de diez
   tarjetas el icono se lee al pasar, el color se lee de reojo. Los
   tres coinciden con los pines del mapa, así una tarjeta y su punto
   se reconocen como la misma cosa sin leer la etiqueta. */
const detalleTipo: Record<
  TipoNegocio,
  { claveLabel: string; Icon: typeof Store; bg: string; text: string }
> = {
  veterinaria: {
    claveLabel: "directorio.businessType.vet",
    Icon: Stethoscope,
    bg: "bg-sky-100",
    text: "text-sky-700",
  },
  tienda: {
    claveLabel: "directorio.businessType.store",
    Icon: Store,
    bg: "bg-violet-100",
    text: "text-violet-700",
  },
  refugio: {
    claveLabel: "directorio.businessType.shelter",
    Icon: HeartHandshake,
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
};
type UbicacionActual = { latitud: number; longitud: number };

const tieneUbicacion = (negocio: NegocioProfile) =>
  Number.isFinite(negocio.latitud) && Number.isFinite(negocio.longitud);

const ControlMapa = ({
  negocios,
  seleccionado,
  ampliado,
}: {
  negocios: NegocioProfile[];
  seleccionado?: NegocioProfile;
  ampliado: boolean;
}) => {
  const mapa = useMap();

  useEffect(() => {
    window.setTimeout(() => mapa.invalidateSize(), 100);
  }, [ampliado, mapa]);

  useEffect(() => {
    if (seleccionado?.latitud != null && seleccionado.longitud != null) {
      mapa.flyTo([seleccionado.latitud, seleccionado.longitud], Math.max(mapa.getZoom(), 14), {
        duration: 0.7,
      });
      return;
    }

    if (negocios.length === 1) {
      mapa.setView([negocios[0].latitud!, negocios[0].longitud!], 14);
    } else if (negocios.length > 1) {
      mapa.fitBounds(
        latLngBounds(negocios.map((negocio) => [negocio.latitud!, negocio.longitud!])),
        { padding: [36, 36], maxZoom: 13 }
      );
    }
  }, [mapa, negocios, seleccionado]);

  return null;
};

const PuntoNegocio = ({
  negocio,
  zona,
  activo,
  onSelect,
}: {
  negocio: NegocioProfile;
  zona?: Zona;
  activo: boolean;
  onSelect: () => void;
}) => {
  const { t } = useTranslation();
  const marcador = useRef<LeafletMarker>(null);
  const icono = useMemo(
    () =>
      divIcon({
        className: "tsc-map-marker",
        html: `<span class="tsc-map-marker__pin${activo ? " is-active" : ""}"><span></span></span>`,
        iconSize: [44, 48],
        iconAnchor: [22, 44],
        popupAnchor: [0, -42],
      }),
    [activo]
  );

  useEffect(() => {
    if (activo) marcador.current?.openPopup();
  }, [activo]);

  return (
    <Marker
      ref={marcador}
      position={[negocio.latitud!, negocio.longitud!]}
      icon={icono}
      eventHandlers={{ click: onSelect }}
      riseOnHover
      title={negocio.nombre}
    >
      <Popup minWidth={220}>
        <div className="text-[13px] text-ink">
          <p className="font-semibold">{negocio.nombre}</p>
          <p className="mt-1 text-[12px] font-medium text-accent-dark">
            {t(detalleTipo[negocio.tipo].claveLabel)}
          </p>
          <p className="mt-2 text-[12px] text-ink-soft">
            {negocio.direccion || t("directorio.noAddress")}
            {zona && <span className="block">{zona.nombre}, {zona.canton}</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {negocio.telefono && (
              <a href={`tel:${negocio.telefono}`} className="font-semibold text-accent-dark hover:underline">
                {t("directorio.call")}
              </a>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${negocio.latitud},${negocio.longitud}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent-dark hover:underline"
            >
              {t("directorio.getDirections")}
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

const Directorio = () => {
  const { t } = useTranslation();
  const [negocios, setNegocios] = useState<NegocioProfile[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [tipo, setTipo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [mapaAmpliado, setMapaAmpliado] = useState(false);
  const [ubicacion, setUbicacion] = useState<UbicacionActual | null>(null);
  const [buscandoCerca, setBuscandoCerca] = useState(false);
  const [orden, setOrden] = useState("cercanos");
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const contenedorMapa = useRef<HTMLDivElement>(null);
  const botonNotificaciones = useContext(NotificationButtonContext);

  const alternarFavorito = (id: string) =>
    setFavoritos((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError("");

    const consultaNegocios = ubicacion
      ? getNegociosCercanos(ubicacion.latitud, ubicacion.longitud)
      : getNegocios();
    Promise.all([consultaNegocios, getZonas()])
      .then(([negociosData, zonasData]) => {
        if (!vigente) return;
        setNegocios(negociosData);
        setZonas(zonasData);
      })
      .catch((causa) => {
        if (!vigente) return;
        setError(t("directorio.loadError"));
        aviso.error(causa, { respaldo: t("directorio.loadErrorToast") });
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento, ubicacion]);

  useEffect(() => {
    const actualizarPantallaCompleta = () =>
      setMapaAmpliado(document.fullscreenElement === contenedorMapa.current);
    document.addEventListener("fullscreenchange", actualizarPantallaCompleta);
    return () => document.removeEventListener("fullscreenchange", actualizarPantallaCompleta);
  }, []);

  const zonasPorId = useMemo(
    () => new Map(zonas.map((zona) => [zona.id_zona, zona])),
    [zonas]
  );

  /* El filtro de zona era un solo desplegable con el catálogo entero
     —más de quinientas filas, todas rotuladas "Distrito · Cantón,
     Provincia"—. Para usarlo había que saber ya el nombre del
     distrito, que es justo lo que uno viene a averiguar. Ahora se
     baja por la jerarquía, igual que en el catálogo de zonas y en el
     registro. */
  const territorio = useZonasEncadenadas(zonas);
  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");
    const tipoSeleccionado = tipoPorFiltro[tipo];

    return negocios.filter((negocio) => {
      const zona = negocio.zona_id ? zonasPorId.get(negocio.zona_id) : null;
      const texto = [
        negocio.nombre,
        negocio.direccion,
        zona?.nombre,
        zona?.canton,
        zona?.provincia,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");

      return (
        (!tipoSeleccionado || negocio.tipo === tipoSeleccionado) &&
        territorio.cubre(zona) &&
        (!consulta || texto.includes(consulta))
      );
    });
    /* `territorio` se rehace en cada render, así que no puede ir en
       las dependencias: entraría en bucle. Lo que de verdad cambia
       el resultado son los tres escalones. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    busqueda,
    negocios,
    tipo,
    zonasPorId,
    territorio.provincia,
    territorio.canton,
    territorio.distrito,
  ]);

  /* "Más cercanos" ya viene ordenado del servicio (usa la ubicación o
     el orden por defecto de Supabase); acá solo se reordena cuando el
     usuario pide alfabético, así el filtro no reconsulta nada. */
  const ordenados = useMemo(() => {
    if (orden !== "nombre") return visibles;
    return [...visibles].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [visibles, orden]);

  const ubicados = useMemo(() => visibles.filter(tieneUbicacion), [visibles]);
  const seleccionado =
    visibles.find((negocio) => negocio.id_negocio === seleccionadoId) ??
    ubicados[0] ??
    visibles[0];
  const seleccionadoEnMapa = ubicados.find(
    (negocio) => negocio.id_negocio === seleccionadoId
  );

  const alternarMapaAmpliado = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await contenedorMapa.current?.requestFullscreen();
  };

  const buscarCerca = () => {
    if (!navigator.geolocation) {
      setError(t("directorio.errors.noGeolocation"));
      return;
    }
    setBuscandoCerca(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setSeleccionadoId(null);
        setUbicacion({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude });
        setBuscandoCerca(false);
      },
      () => {
        setError(t("directorio.errors.locationFailed"));
        setBuscandoCerca(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="titular text-[28px] text-ink">{t("directorio.title")}</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            {ubicacion
              ? t("directorio.subtitleNearby")
              : t("directorio.subtitleAll")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={ubicacion ? () => setUbicacion(null) : buscarCerca}
            disabled={buscandoCerca}
            className={`${btnSecondary} disabled:cursor-wait disabled:opacity-60`}
          >
            <Navigation size={15} />
            {ubicacion ? t("directorio.viewAll") : buscandoCerca ? t("directorio.searching") : t("directorio.nearMe")}
          </button>
          {botonNotificaciones}
        </div>
      </div>

      <section aria-label={t("directorio.filtersAria")} className="bg-surface p-4 sm:p-5">
        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
            <div className="relative">
              <label htmlFor="buscar-negocio" className="sr-only">
                {t("directorio.searchAria")}
              </label>
              <input
                id="buscar-negocio"
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder={t("directorio.searchPlaceholder")}
                className={`${input} pl-10`}
              />
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute"
              />
            </div>

            <FilterTabs
              label={t("directorio.typeFilterAria")}
              options={tipos.map((o) => ({ value: o, label: t(claveTipoLabel[o]) }))}
              value={tipo}
              onChange={setTipo}
            />
          </div>

          {/* Los tres escalones. El de abajo se queda apagado hasta
              que el de arriba elige, y lo dice en el sitio: un cantón
              apagado que siguiera diciendo "Todos los cantones"
              parecería roto. */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label htmlFor="provincia-directorio" className="sr-only">
                {t("directorio.provinceFilterAria")}
              </label>
              <Combo
                id="provincia-directorio"
                Icon={MapPin}
                value={territorio.provincia}
                onChange={territorio.elegirProvincia}
                aria-label={t("directorio.provinceAria")}
                options={territorio.provincias.map((item) => ({
                  value: item,
                  label: item === "Todas" ? t("directorio.allProvinces") : item,
                }))}
              />
            </div>

            <div>
              <label htmlFor="canton-directorio" className="sr-only">
                {t("directorio.cantonFilterAria")}
              </label>
              <Combo
                id="canton-directorio"
                value={territorio.canton}
                onChange={territorio.elegirCanton}
                disabled={!territorio.filtrando}
                textoInactivo={t("directorio.selectProvince")}
                aria-label={t("directorio.cantonAria")}
                options={territorio.cantones.map((item) => ({
                  value: item,
                  label: item === "Todos" ? t("directorio.allCantons") : item,
                }))}
              />
            </div>

            <div>
              <label htmlFor="distrito-directorio" className="sr-only">
                {t("directorio.districtFilterAria")}
              </label>
              <Combo
                id="distrito-directorio"
                value={territorio.distrito}
                onChange={territorio.elegirDistrito}
                disabled={territorio.canton === "Todos"}
                textoInactivo={t("directorio.selectCanton")}
                aria-label={t("directorio.districtAria")}
                options={territorio.distritos.map((item) => ({
                  value: item,
                  label: item === "Todos" ? t("directorio.allDistricts") : item,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      {cargando ? (
        <Skeleton name="directorio-rejilla" loading>
          <div />
        </Skeleton>
      ) : error ? (
        <div className="bg-surface px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-danger">{error}</p>
          <button
            type="button"
            onClick={() => setIntento((valor) => valor + 1)}
            className={`${btnSecondary} mt-4`}
          >
            {t("directorio.retry")}
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <EmptyState
          title={t("directorio.empty.title")}
          hint={
            territorio.filtrando
              ? t("directorio.empty.withZoneFilter")
              : t("directorio.empty.withoutZoneFilter")
          }
          action={
            territorio.filtrando ? (
              <button
                type="button"
                onClick={territorio.limpiar}
                className={btnSecondary}
              >
                {t("directorio.empty.viewAllZones")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
          <section aria-label={t("directorio.resultsAria", { count: ordenados.length })} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="text-[13px] font-medium text-ink-soft">
                {ordenados.length} {ordenados.length === 1 ? t("directorio.resultSingular") : t("directorio.resultPlural")}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-ink-mute">{t("directorio.sortBy")}</span>
                <Combo
                  id="orden-directorio"
                  value={orden}
                  onChange={setOrden}
                  aria-label={t("directorio.sortAria")}
                  className="min-w-[160px]"
                  options={[
                    { value: "cercanos", label: t("directorio.sortNearest") },
                    { value: "nombre", label: t("directorio.sortName") },
                  ]}
                />
                <button
                  type="button"
                  className={`${btnQuiet} px-2.5`}
                  aria-label={t("directorio.moreFilters")}
                  title={t("directorio.moreFilters")}
                >
                  <SlidersHorizontal size={16} aria-hidden />
                </button>
              </div>
            </div>

            {ordenados.map((negocio) => {
              const zona = negocio.zona_id ? zonasPorId.get(negocio.zona_id) : null;
              const { Icon, claveLabel, bg, text } = detalleTipo[negocio.tipo];
              const label = t(claveLabel);
              const activo = negocio.id_negocio === seleccionado?.id_negocio;
              const favorito = favoritos.has(negocio.id_negocio);

              return (
                <article
                  key={negocio.id_negocio}
                  className={`flex flex-col gap-4 rounded-[18px] bg-surface p-4 outline outline-black/[0.05] transition-colors sm:p-5 ${
                    activo ? "outline-2 -outline-offset-2 outline-accent" : "-outline-offset-1"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative size-16 shrink-0 sm:size-[72px]">
                      {negocio.foto ? (
                        <img
                          src={negocio.foto}
                          alt={negocio.nombre}
                          className="size-full rounded-2xl object-cover"
                        />
                      ) : (
                        <span className={`flex size-full items-center justify-center rounded-2xl ${bg} ${text}`}>
                          <Icon size={26} aria-hidden />
                        </span>
                      )}
                      {negocio.foto && (
                        <span
                          title={label}
                          className={`absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border-2 border-surface ${bg} ${text}`}
                        >
                          <Icon size={13} aria-hidden />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-[16px] font-semibold text-ink">{negocio.nombre}</h3>
                        <button
                          type="button"
                          onClick={() => alternarFavorito(negocio.id_negocio)}
                          aria-pressed={favorito}
                          aria-label={favorito ? t("directorio.removeFavorite") : t("directorio.addFavorite")}
                          className="shrink-0 p-1 text-ink-mute hover:text-danger"
                        >
                          <Heart
                            size={18}
                            aria-hidden
                            className={favorito ? "fill-danger text-danger" : ""}
                          />
                        </button>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.02em] uppercase ${bg} ${text}`}
                        >
                          <Icon size={11} aria-hidden />
                          {label}
                        </span>
                        {negocio.destacado && <Badge tono="warn">{t("directorio.featured")}</Badge>}
                      </div>
                    </div>
                  </div>

                  <dl className="grid gap-x-4 gap-y-2.5 border-t border-black/[0.05] pt-3.5 text-[13px] text-ink-soft sm:grid-cols-2">
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-ink-mute" aria-hidden />
                      <dd className="min-w-0">
                        {negocio.direccion || t("directorio.noAddress")}
                        {zona && (
                          <span className="block text-[12px] text-ink-mute">
                            {zona.nombre}, {zona.canton}, {zona.provincia}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock size={15} className="mt-0.5 shrink-0 text-ink-mute" aria-hidden />
                      <dd>{negocio.horario || t("directorio.noSchedule")}</dd>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone size={15} className="mt-0.5 shrink-0 text-ink-mute" aria-hidden />
                      <dd>
                        {negocio.telefono ? (
                          <a className="font-medium text-ink hover:text-accent-dark hover:underline" href={`tel:${negocio.telefono}`}>
                            {negocio.telefono}
                          </a>
                        ) : (
                          t("directorio.noPhone")
                        )}
                      </dd>
                    </div>
                  </dl>

                  {tieneUbicacion(negocio) && (
                    <button
                      type="button"
                      onClick={() => setSeleccionadoId(negocio.id_negocio)}
                      className={`${btnSecondary} w-full justify-center sm:ml-auto sm:w-auto`}
                    >
                      {t("directorio.viewDetails")}
                      <ArrowRight size={14} aria-hidden />
                    </button>
                  )}
                </article>
              );
            })}
          </section>

          <aside
            ref={contenedorMapa}
            className="tsc-map-shell bg-surface xl:sticky xl:top-3"
            aria-label={t("directorio.map.aria")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <h3 className="text-[14px] font-semibold text-ink">{t("directorio.map.title")}</h3>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {ubicados.length} {ubicados.length === 1 ? t("directorio.map.locationSingular") : t("directorio.map.locationPlural")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {seleccionado && tieneUbicacion(seleccionado) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${seleccionado.latitud},${seleccionado.longitud}`}
                    target="_blank"
                    rel="noreferrer"
                    className={btnQuiet}
                  >
                    {t("directorio.getDirections")} <ExternalLink size={13} aria-hidden />
                  </a>
                )}
                <button
                  type="button"
                  onClick={alternarMapaAmpliado}
                  className={btnQuiet}
                  aria-label={mapaAmpliado ? t("directorio.map.exitFullscreen") : t("directorio.map.expand")}
                  title={mapaAmpliado ? t("directorio.map.exitFullscreen") : t("directorio.map.expand")}
                >
                  {mapaAmpliado ? <Minimize2 size={17} aria-hidden /> : <Maximize2 size={17} aria-hidden />}
                  <span className="hidden sm:inline">{mapaAmpliado ? t("directorio.map.collapseShort") : t("directorio.map.expandShort")}</span>
                </button>
              </div>
            </div>

            {ubicados.length > 0 ? (
              <MapContainer
                center={[9.93, -84.09]}
                zoom={8}
                minZoom={7}
                scrollWheelZoom
                className="h-[380px] w-full bg-sunken sm:h-[460px] xl:h-[540px]"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ControlMapa
                  negocios={ubicados}
                  seleccionado={seleccionadoEnMapa}
                  ampliado={mapaAmpliado}
                />
                {ubicados.map((negocio) => (
                  <PuntoNegocio
                    key={negocio.id_negocio}
                    negocio={negocio}
                    zona={negocio.zona_id ? zonasPorId.get(negocio.zona_id) : undefined}
                    activo={negocio.id_negocio === seleccionadoId}
                    onSelect={() => setSeleccionadoId(negocio.id_negocio)}
                  />
                ))}
              </MapContainer>
            ) : (
              <EmptyState
                title={t("directorio.map.empty.title")}
                hint={t("directorio.map.empty.hint")}
              />
            )}
          </aside>
        </div>
      )}
    </Page>
  );
};

export default Directorio;
