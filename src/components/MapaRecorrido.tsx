import { useEffect, useMemo } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { UbicacionPaseo } from "../services/live-walks.service";

/* ─────────────────────────────────────────────────────────────
   EL MAPA DEL PASEO

   El recorrido que el paseador va compartiendo: la línea con todos
   los puntos y el alfiler en el último. Lo usan las dos puntas del
   paseo —el dueño en «Paseo en vivo» y el paseador en «Paseo
   activo»— y por eso vive acá una sola vez: el paseador tiene que
   ver EXACTAMENTE lo que ve el dueño, no una versión parecida.

   Solo dibuja lo que está guardado en la base. La posición del GPS
   que todavía no se envió no aparece: el dueño tampoco la ve.
   ───────────────────────────────────────────────────────────── */

/** El mapa sigue al último punto sin alejarse si la persona acercó. */
const Seguir = ({ punto }: { punto: [number, number] | null }) => {
  const mapa = useMap();
  useEffect(() => {
    if (punto) mapa.flyTo(punto, Math.max(mapa.getZoom(), 15), { duration: 0.6 });
  }, [mapa, punto]);
  return null;
};

const alfiler = divIcon({
  className: "tsc-map-marker",
  html: '<span class="tsc-map-marker__pin is-active"><span></span></span>',
  iconSize: [44, 48],
  iconAnchor: [22, 44],
});

export const MapaRecorrido = ({
  ubicaciones,
  vacio,
  alto = "h-[300px] sm:h-[360px]",
}: {
  ubicaciones: UbicacionPaseo[];
  /** Lo que se lee mientras no hay ningún punto. */
  vacio: string;
  alto?: string;
}) => {
  const ultima = ubicaciones.at(-1);
  const punto = useMemo(
    () => (ultima ? ([ultima.latitud, ultima.longitud] as [number, number]) : null),
    [ultima],
  );
  const recorrido = useMemo(
    () => ubicaciones.map((u) => [u.latitud, u.longitud] as [number, number]),
    [ubicaciones],
  );

  if (!punto) {
    return <div className={`grid ${alto} place-items-center bg-sunken px-6 text-center text-[13px] text-ink-soft`}>{vacio}</div>;
  }

  return (
    <MapContainer center={punto} zoom={15} scrollWheelZoom className={`${alto} w-full`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Seguir punto={punto} />
      {recorrido.length > 1 && <Polyline positions={recorrido} pathOptions={{ color: "#12a9b9", weight: 5 }} />}
      <Marker position={punto} icon={alfiler} />
    </MapContainer>
  );
};
