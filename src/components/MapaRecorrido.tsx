import { useEffect, useMemo } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { UbicacionPaseo } from "../services/live-walks.service";

/* ─────────────────────────────────────────────────────────────
   EL MAPA DEL PASEO

   El recorrido que el paseador va compartiendo: la línea con todos
   los puntos y el puck en el último. Lo usan las dos puntas del
   paseo —el dueño en «Paseo en vivo» y el paseador en «Paseo
   activo»— y por eso vive acá una sola vez: el paseador tiene que
   ver EXACTAMENTE lo que ve el dueño, no una versión parecida.

   Solo dibuja lo que está guardado en la base. La posición del GPS
   que todavía no se envió no aparece: el dueño tampoco la ve.

   ── Por qué un "puck" y no el alfiler de siempre ──
   El alfiler con forma de gota (`tsc-map-marker__pin`) dice "acá hay
   un lugar fijo" —un negocio, un punto de encuentro— y lo usan
   directorio.tsx, MapaPunto y el resto del sistema. Lo que se mueve
   en vivo no es un lugar: es una persona caminando, y ese es el
   lenguaje que usan Uber y Google Maps para eso —un disco con un
   halo que pulsa y una flechita que apunta hacia donde va—. Por eso
   es una clase nueva (`tsc-map-puck`) y no un cambio al alfiler
   compartido: tocar ese cambiaría también el directorio y el
   selector de ubicación, que no tienen nada que ver con esto.
   ───────────────────────────────────────────────────────────── */

/** El mapa sigue al último punto sin alejarse si la persona acercó. */
const Seguir = ({ punto }: { punto: [number, number] | null }) => {
  const mapa = useMap();
  useEffect(() => {
    if (punto) mapa.flyTo(punto, Math.max(mapa.getZoom(), 15), { duration: 0.6 });
  }, [mapa, punto]);
  return null;
};

/** El rumbo entre dos puntos, en grados (0° = norte, crece en reloj).
    Con menos de dos puntos no hay de dónde sacarlo. */
const rumboEntre = (a: [number, number], b: [number, number]) => {
  const aLat = (a[0] * Math.PI) / 180;
  const bLat = (b[0] * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(bLat);
  const x = Math.cos(aLat) * Math.sin(bLat) - Math.sin(aLat) * Math.cos(bLat) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/** El puck: halo que respira, núcleo turquesa con borde blanco, y una
    flechita que gira hacia el rumbo —si ya hay de dónde calcularlo—.
    Se recrea solo cuando cambia el rumbo, no en cada punto nuevo: así
    no se reinicia la animación del halo a cada actualización. */
const usePuck = (rumbo: number | null) =>
  useMemo(
    () =>
      divIcon({
        className: "tsc-map-puck",
        html: `
          <span class="tsc-map-puck__halo" aria-hidden="true"></span>
          <span class="tsc-map-puck__nucleo">
            ${rumbo !== null ? `<span class="tsc-map-puck__flecha" style="transform:translate(-50%,-50%) rotate(${rumbo}deg)"></span>` : ""}
          </span>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    [rumbo],
  );

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
  /* El rumbo sale de los últimos dos puntos guardados, no del
     penúltimo cualquiera: si el paseador está quieto un rato y el
     siguiente punto cae casi en el mismo lugar, mejor conservar hacia
     dónde apuntaba que girar la flecha por un temblor del GPS. */
  const rumbo = useMemo(() => {
    if (recorrido.length < 2) return null;
    const [a, b] = recorrido.slice(-2);
    if (a[0] === b[0] && a[1] === b[1]) return null;
    return rumboEntre(a, b);
  }, [recorrido]);
  const puck = usePuck(rumbo);

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
      {recorrido.length > 1 && (
        <>
          {/* La capa ancha y tenue de abajo hace de halo; la de
              arriba lleva `tsc-ruta-resalte`, que le pone una sombra
              de verdad (`filter: drop-shadow`, no otro color plano
              encima) para que la ruta se levante del mapa en vez de
              verse pegada. */}
          <Polyline
            positions={recorrido}
            pathOptions={{ color: "#14a3b8", weight: 11, opacity: 0.18, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            positions={recorrido}
            pathOptions={{
              color: "#14a3b8",
              weight: 5,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
              className: "tsc-ruta-resalte",
            }}
          />
        </>
      )}
      <Marker position={punto} icon={puck} />
    </MapContainer>
  );
};
