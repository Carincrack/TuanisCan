import { useEffect, useId, useMemo, useState } from "react";
import { divIcon, latLng } from "leaflet";
import type { LatLngExpression } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "../lib/iconos";
import { useTranslation } from "../hooks/useTranslation";
import { fieldLabel, input } from "./ui";

/* ─────────────────────────────────────────────────────────────
   MARCAR UN PUNTO EN EL MAPA

   Para los formularios de mascotas perdidas: dónde se perdió, dónde
   se encontró, dónde se la vio. Antes la única forma de dar el lugar
   era «Usar la ubicación donde estoy» o escribir las coordenadas a
   mano, y quien reporta desde su casa no está donde se le perdió el
   perro.

   Ahora se toca el mapa —o se arrastra el pin— y las coordenadas se
   escriben solas en el campo de abajo. El campo sigue ahí y se puede
   editar: quien tenga las coordenadas copiadas de otro lado las pega
   y el pin salta a ese lugar. El botón de la ubicación actual vive
   sobre el mapa, como en el selector del registro.

   Mismo mapa y mismo pin que el directorio y el paseo en vivo: las
   teselas de OpenStreetMap y la gota turquesa de `tsc-map-marker`.
   ───────────────────────────────────────────────────────────── */

/* San José: el centro mientras no hay nada marcado. */
const CENTRO_CR: LatLngExpression = [9.93, -84.09];

const pinElegido = divIcon({
  className: "tsc-map-marker",
  html: `<span class="tsc-map-marker__pin is-active"><span></span></span>`,
  iconSize: [44, 48],
  iconAnchor: [22, 44],
});

/* El de referencia va en el navy de los puntos que no son el elegido,
   como el resto de negocios del directorio. */
const pinReferencia = divIcon({
  className: "tsc-map-marker",
  html: `<span class="tsc-map-marker__pin"><span></span></span>`,
  iconSize: [44, 48],
  iconAnchor: [22, 44],
});

interface Punto {
  latitud: number;
  longitud: number;
}

/** «10.169410, -85.541761» → punto, o null si no se puede leer. */
const leerPunto = (texto: string): Punto | null => {
  const partes = texto.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!partes) return null;
  const latitud = Number(partes[1].replace(",", "."));
  const longitud = Number(partes[2].replace(",", "."));
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return null;
  if (Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return null;
  return { latitud, longitud };
};

const escribirPunto = ({ latitud, longitud }: Punto) => `${latitud.toFixed(6)}, ${longitud.toFixed(6)}`;

/* El mapa vive dentro de una ventana que entra creciendo: Leaflet mide
   su caja al nacer y, medida en plena animación, dejaba franjas grises
   sin teselas. Se vuelve a medir cuando la caja cambia de tamaño. */
const AjustarTamano = () => {
  const mapa = useMap();
  useEffect(() => {
    const caja = mapa.getContainer();
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(caja);
    const tardio = window.setTimeout(() => mapa.invalidateSize(), 300);
    return () => {
      observador.disconnect();
      window.clearTimeout(tardio);
    };
  }, [mapa]);
  return null;
};

/** Lleva el mapa al punto cuando llega de afuera —la ubicación actual,
    unas coordenadas pegadas—. Si el punto ya está a la vista y cerca,
    no se mueve: tocar el mapa no debe hacerlo saltar. */
const SeguirPunto = ({ punto }: { punto: Punto | null }) => {
  const mapa = useMap();
  const lat = punto?.latitud;
  const lng = punto?.longitud;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const destino = latLng(lat, lng);
    if (!mapa.getBounds().contains(destino) || mapa.getZoom() < 13) {
      mapa.flyTo(destino, Math.max(mapa.getZoom(), 15), { duration: 0.6 });
    }
  }, [lat, lng, mapa]);
  return null;
};

const TocarMapa = ({ onPunto }: { onPunto: (punto: Punto) => void }) => {
  useMapEvents({
    click: (evento) => onPunto({ latitud: evento.latlng.lat, longitud: evento.latlng.lng }),
  });
  return null;
};

const MapaPunto = ({
  etiqueta,
  texto,
  onTexto,
  referencia,
  pista,
  requerido = false,
}: {
  /** El rótulo del campo: «Dónde se perdió *». */
  etiqueta: string;
  /** Las coordenadas como texto, igual que antes en el formulario. */
  texto: string;
  onTexto: (texto: string) => void;
  /** Un punto que no se mueve, para ubicarse: dónde se perdió la
      mascota, al marcar dónde se la vio. */
  referencia?: (Punto & { nombre: string }) | null;
  /** Qué hacer, mientras no hay nada marcado. */
  pista: string;
  requerido?: boolean;
}) => {
  const { t } = useTranslation();
  const idEtiqueta = useId();
  const [buscando, setBuscando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState("");

  const punto = leerPunto(texto);
  const marcar = (nuevo: Punto) => onTexto(escribirPunto(nuevo));

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setAvisoUbicacion(t("mapaPunto.noGeolocation"));
      return;
    }
    setBuscando(true);
    setAvisoUbicacion("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        marcar({ latitud: coords.latitude, longitud: coords.longitude });
        setBuscando(false);
      },
      () => {
        setAvisoUbicacion(t("mapaPunto.locationFailed"));
        setBuscando(false);
      },
      { enableHighAccuracy: true, timeout: 9000 },
    );
  };

  const arrastre = useMemo(
    () => ({
      dragend: (evento: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
        const { lat, lng } = evento.target.getLatLng();
        onTexto(escribirPunto({ latitud: lat, longitud: lng }));
      },
    }),
    [onTexto],
  );

  const inicio = punto ?? referencia ?? null;

  return (
    <div className="grid gap-2">
      <span id={idEtiqueta} className={fieldLabel}>
        {etiqueta}
      </span>

      {/* `isolate`: los paneles de Leaflet llevan z-index 400 y, sin una
          capa propia, tapaban la lista de los combos de arriba. */}
      <div className="relative isolate overflow-hidden rounded-[14px] bg-sunken">
        <MapContainer
          center={inicio ? [inicio.latitud, inicio.longitud] : CENTRO_CR}
          zoom={inicio ? 15 : 8}
          minZoom={6}
          scrollWheelZoom={false}
          className="h-[240px] w-full sm:h-[280px]"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AjustarTamano />
          <TocarMapa onPunto={marcar} />
          <SeguirPunto punto={punto} />
          {referencia && (
            <Marker
              position={[referencia.latitud, referencia.longitud]}
              icon={pinReferencia}
              title={referencia.nombre}
              keyboard={false}
            />
          )}
          {punto && (
            <Marker
              position={[punto.latitud, punto.longitud]}
              icon={pinElegido}
              draggable
              eventHandlers={arrastre}
              title={t("mapaPunto.dragHint")}
            />
          )}
        </MapContainer>

        {/* Arriba a la derecha y no abajo: ahí van los créditos de
            OpenStreetMap, que el mapa tiene que mostrar. */}
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={buscando}
          className="absolute top-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[12px] font-semibold text-ink shadow-[0_1px_2px_rgba(20,36,46,0.1),0_6px_16px_-6px_rgba(20,36,46,0.3)] transition-[color,transform] duration-150 ease-out hover:text-accent-deep active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
        >
          <Navigation size={14} />
          {buscando ? t("mapaPunto.searching") : t("mapaPunto.myLocation")}
        </button>
      </div>

      <div className="relative">
        <MapPin size={14} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-mute" />
        <input
          className={`${input} nums pl-9`}
          aria-labelledby={idEtiqueta}
          aria-describedby={`${idEtiqueta}-pista`}
          required={requerido}
          inputMode="decimal"
          autoComplete="off"
          placeholder="10.169410, -85.541761"
          value={texto}
          onChange={(evento) => onTexto(evento.target.value)}
        />
      </div>

      <p id={`${idEtiqueta}-pista`} className="text-[12px] leading-snug text-ink-soft">
        {punto ? t("mapaPunto.markedHint") : pista}
        {referencia && (
          <span className="mt-1 flex items-center gap-1.5 text-ink-mute">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rail ring-2 ring-white" />
            {t("mapaPunto.reference", { nombre: referencia.nombre })}
          </span>
        )}
      </p>
      {avisoUbicacion && (
        <p role="alert" className="text-[12px] text-danger">
          {avisoUbicacion}
        </p>
      )}
    </div>
  );
};

export default MapaPunto;
