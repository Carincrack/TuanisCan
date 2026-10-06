import { useCallback, useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import { escucharUbicaciones, getPaseoActivo, listUbicacionesPaseo, type UbicacionPaseo } from "../services/live-walks.service";
import type { WalkWithRelations } from "../services/walks.service";
import { Avatar, Badge, EmptyState, Page, PageHeader, Section } from "./ui";

const Follow = ({ point }: { point: [number, number] | null }) => { const map = useMap(); useEffect(() => { if (point) map.flyTo(point, Math.max(map.getZoom(), 15), { duration: .6 }); }, [map, point]); return null; };
const pin = divIcon({ className: "tsc-map-marker", html: '<span class="tsc-map-marker__pin is-active"><span></span></span>', iconSize: [44, 48], iconAnchor: [22, 44] });

const PaseoEnVivo = () => {
  const { user } = useAuth();
  const { t, localeTag } = useTranslation();
  const [walk, setWalk] = useState<WalkWithRelations | null>(null);
  const [locations, setLocations] = useState<UbicacionPaseo[]>([]);
  const [error, setError] = useState("");
  const time = (value: string) => new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  const load = useCallback(async () => { if (!user) return; try { const active = await getPaseoActivo(user.id); setWalk(active); setLocations(active ? await listUbicacionesPaseo(active.id_paseo) : []); } catch (cause) { setError(cause instanceof Error ? cause.message : t("paseoEnVivo.loadError")); } }, [user, t]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!walk) return; return escucharUbicaciones(walk.id_paseo, (location) => setLocations((current) => current.some((item) => item.id_ubicacion === location.id_ubicacion) ? current : [...current, location])); }, [walk]);
  const latest = locations.at(-1);
  const point = latest ? [latest.latitud, latest.longitud] as [number, number] : null;
  const route = useMemo(() => locations.map((location) => [location.latitud, location.longitud] as [number, number]), [locations]);
  if (!walk && !error) return <Page><PageHeader title={t("paseoEnVivo.title")} subtitle={t("paseoEnVivo.searching")} /></Page>;
  if (!walk) return <Page><PageHeader title={t("paseoEnVivo.title")} subtitle={t("paseoEnVivo.trackingSubtitle")} />{error && <p className="bg-danger-wash px-4 py-3 text-danger">{error}</p>}<EmptyState title={t("paseoEnVivo.empty.title")} hint={t("paseoEnVivo.empty.hint")} /></Page>;
  return <Page><PageHeader title={t("paseoEnVivo.title")} subtitle={`${t("paseoEnVivo.withWalker", { mascota: walk.mascota?.nombre ?? t("paseoEnVivo.defaultPet"), paseador: walk.paseador?.nombre ?? t("paseoEnVivo.defaultWalker") })} ${latest ? t("paseoEnVivo.updatedAt", { hora: time(latest.timestamp) }) : t("paseoEnVivo.waitingLocation")}`} action={<Badge tono="accent">{t("paseoEnVivo.statusInCourse")}</Badge>} /><div className="grid gap-3 lg:grid-cols-3"><div className="lg:col-span-2"><Section bodyClass="">{point ? <MapContainer center={point} zoom={15} scrollWheelZoom className="h-[360px] w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Follow point={point} />{route.length > 1 && <Polyline positions={route} pathOptions={{ color: "#12a9b9", weight: 5 }} />}{point && <Marker position={point} icon={pin} />}</MapContainer> : <div className="grid h-[360px] place-items-center bg-sunken px-6 text-center text-[13px] text-ink-soft">{t("paseoEnVivo.mapPlaceholder")}</div>}<p className="flex items-center gap-2 bg-sunken px-6 py-3 text-[12.5px] text-ink-soft"><MapPin size={14} />{latest ? `${latest.latitud.toFixed(5)}, ${latest.longitud.toFixed(5)}` : t("paseoEnVivo.noLocationYet")}</p></Section></div><div className="flex flex-col gap-3"><Section title={t("paseoEnVivo.walkerSection")} bodyClass="px-6 pb-5"><div className="flex items-center gap-4"><Avatar nombre={walk.paseador?.nombre ?? t("paseoEnVivo.walkerSection")} size={48} /><div><p className="font-semibold text-ink">{walk.paseador?.nombre ?? t("paseoEnVivo.walkerSection")}</p><p className="mt-0.5 text-[12px] text-ink-soft">{t("paseoEnVivo.walkerSectionHint")}</p></div></div></Section><Section title={t("paseoEnVivo.activitySection")} bodyClass="px-6 pb-5">{locations.length ? <ol className="flex flex-col gap-3">{locations.slice(-6).reverse().map((location) => <li key={location.id_ubicacion} className="flex gap-3"><span className="flex h-7 w-7 items-center justify-center bg-sunken text-ink-mute"><Navigation size={13} /></span><div><p className="text-[12.5px] text-ink-soft">{t("paseoEnVivo.locationShared")}</p><p className="nums text-[11.5px] text-ink-mute">{time(location.timestamp)}</p></div></li>)}</ol> : <p className="text-[12.5px] text-ink-soft">{t("paseoEnVivo.noActivity")}</p>}</Section></div></div></Page>;
};
export default PaseoEnVivo;
