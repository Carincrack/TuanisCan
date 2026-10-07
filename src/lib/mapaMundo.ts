import { geoArea, geoBounds, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, Geometry, Polygon } from "geojson";
import urlMapaBasico from "world-atlas/countries-110m.json?url";
import urlMapaDetalle from "world-atlas/countries-50m.json?url";
import { ALFA2_DE_NUMERICO } from "./paisesMapa";

/* ─────────────────────────────────────────────────────────────
   EL MAPA DEL MUNDO

   Lo que necesita el globo de países (GloboPaises.tsx): las fronteras
   de cada país, ya preparadas para dibujar y para saber cuál se tocó.

   Hay dos mapas. El de 110 m (100 kB) llega rápido y alcanza para
   dibujar el globo mientras gira; el de 50 m (750 kB) trae la costa de
   Costa Rica bien dibujada y los países chicos.

   Cada uno se pide UNA vez por visita y se guarda acá. Abrir la ventana
   por segunda vez no los vuelve a bajar ni a descomprimir, y el
   formulario puede pedir el liviano antes de que se abra la ventana
   (`precargarMapa`), para que el globo aparezca ya dibujado.
   ───────────────────────────────────────────────────────────── */

export interface PaisMapa {
  codigo: string;
  forma: Feature<Geometry>;
  /** Caja en grados, para descartar rápido al buscar qué país se tocó. */
  caja: [[number, number], [number, number]];
  /** Centro del territorio PRINCIPAL: el de Francia incluye la Guayana,
      y su centroide sin más caería en medio del Atlántico. */
  centro: [number, number];
  /** Radio angular aproximado del territorio principal, en radianes.
      Decide cuánto acercarse al viajar hasta él. */
  radio: number;
}

export interface Mapa {
  paises: Map<string, PaisMapa>;
  /** Kosovo, Somalilandia… Se dibujan como tierra pero no se eligen:
      no tienen código en la norma. */
  sinCodigo: Feature<Geometry>[];
}

const territorioPrincipal = (forma: Feature<Geometry>): Geometry => {
  if (forma.geometry.type !== "MultiPolygon") return forma.geometry;
  let mayor: Polygon | null = null;
  let area = -1;
  for (const coordenadas of forma.geometry.coordinates) {
    const poligono: Polygon = { type: "Polygon", coordinates: coordenadas };
    const a = geoArea(poligono);
    if (a > area) {
      area = a;
      mayor = poligono;
    }
  }
  return mayor ?? forma.geometry;
};

const cargarMapa = async (url: string): Promise<Mapa> => {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo bajar el mapa (${respuesta.status})`);
  const topologia = (await respuesta.json()) as Topology<{ countries: GeometryCollection }>;
  const coleccion = feature(topologia, topologia.objects.countries);
  const paises = new Map<string, PaisMapa>();
  const sinCodigo: Feature<Geometry>[] = [];

  for (const forma of coleccion.features as Feature<Geometry>[]) {
    const codigo = ALFA2_DE_NUMERICO[String(forma.id)];
    if (!codigo) {
      sinCodigo.push(forma);
      continue;
    }
    const principal = territorioPrincipal(forma);
    paises.set(codigo, {
      codigo,
      forma,
      caja: geoBounds(forma),
      centro: geoCentroid(principal),
      radio: Math.sqrt(geoArea(principal) / Math.PI),
    });
  }
  return { paises, sinCodigo };
};

const guardados = new Map<string, Promise<Mapa>>();

const mapaDe = (url: string) => {
  let promesa = guardados.get(url);
  if (!promesa) {
    promesa = cargarMapa(url);
    // Si falla, se olvida: el próximo intento lo vuelve a pedir en vez
    // de devolver el mismo error para siempre.
    promesa.catch(() => guardados.delete(url));
    guardados.set(url, promesa);
  }
  return promesa;
};

export const mapaBasico = () => mapaDe(urlMapaBasico);
export const mapaDetalle = () => mapaDe(urlMapaDetalle);

/** Para el formulario: deja bajando el mapa liviano antes de que se
    abra la ventana. */
export const precargarMapa = () => {
  void mapaBasico().catch(() => undefined);
};

/** ¿Cae el punto dentro de la caja? Si la caja cruza el antimeridiano
    —Rusia, Fiyi— el oeste queda a la derecha del este. */
export const enCaja = ([lon, lat]: [number, number], [[oeste, sur], [este, norte]]: PaisMapa["caja"]) =>
  lat >= sur && lat <= norte && (oeste <= este ? lon >= oeste && lon <= este : lon >= oeste || lon <= este);
