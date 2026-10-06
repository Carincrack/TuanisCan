import { useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import type { LatLngExpression } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "../lib/iconos";
import { useTranslation } from "../hooks/useTranslation";

/* San José, Costa Rica: centro por defecto mientras nadie marcó nada. */
const CENTRO_CR: LatLngExpression = [9.93, -84.09];

const icono = divIcon({
  className: "tsc-map-marker",
  html: `<span class="tsc-map-marker__pin is-active"><span></span></span>`,
  iconSize: [44, 48],
  iconAnchor: [22, 44],
});

const Recentrar = ({ lat, lng }: { lat: number | null; lng: number | null }) => {
  const mapa = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      mapa.flyTo([lat, lng], Math.max(mapa.getZoom(), 15), { duration: 0.6 });
    }
  }, [lat, lng, mapa]);
  return null;
};

const CapturaClic = ({ onChange }: { onChange: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(evento) {
      onChange(evento.latlng.lat, evento.latlng.lng);
    },
  });
  return null;
};

/* Reemplaza los campos de latitud/longitud escritos a mano: se toca el
   mapa (o se arrastra el pin) y las coordenadas quedan marcadas por
   debajo, sin que la persona tenga que saber sus números. */
export const SelectorUbicacion = ({
  latitud,
  longitud,
  onChange,
}: {
  latitud: string;
  longitud: string;
  onChange: (lat: number, lng: number) => void;
}) => {
  const { t } = useTranslation();
  const [buscando, setBuscando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState("");

  const lat = latitud ? Number(latitud) : null;
  const lng = longitud ? Number(longitud) : null;
  const posicion: LatLngExpression | null =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? [lat, lng]
      : null;

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setAvisoUbicacion(t("selectorUbicacion.noGeolocation"));
      return;
    }
    setBuscando(true);
    setAvisoUbicacion("");
    navigator.geolocation.getCurrentPosition(
      (resultado) => {
        onChange(resultado.coords.latitude, resultado.coords.longitude);
        setBuscando(false);
      },
      () => {
        setAvisoUbicacion(t("selectorUbicacion.locationError"));
        setBuscando(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const marcadorArrastrable = useMemo(
    () => ({
      dragend: (evento: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
        const { lat: lt, lng: lg } = evento.target.getLatLng();
        onChange(lt, lg);
      },
    }),
    [onChange]
  );

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl">
        <MapContainer
          center={posicion ?? CENTRO_CR}
          zoom={posicion ? 15 : 8}
          minZoom={6}
          scrollWheelZoom
          className="h-[200px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CapturaClic onChange={onChange} />
          <Recentrar lat={lat} lng={lng} />
          {posicion && (
            <Marker position={posicion} icon={icono} draggable eventHandlers={marcadorArrastrable} />
          )}
        </MapContainer>

        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={buscando}
          className="absolute right-3 bottom-3 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11.5px] font-semibold text-[#1E2A33] shadow-md transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
        >
          <Navigation size={14} />
          {buscando ? t("selectorUbicacion.searching") : t("selectorUbicacion.myLocation")}
        </button>
      </div>

      <p className="mt-2 text-[11.5px] text-slate-500">
        {posicion
          ? t("selectorUbicacion.marked", {
              lat: (posicion as [number, number])[0].toFixed(5),
              lng: (posicion as [number, number])[1].toFixed(5),
            })
          : t("selectorUbicacion.tapHint")}
      </p>
      {avisoUbicacion && <p className="mt-1 text-[11.5px] text-red-500">{avisoUbicacion}</p>}
    </div>
  );
};
