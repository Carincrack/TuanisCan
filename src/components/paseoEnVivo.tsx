import { useCallback, useEffect, useState } from "react";
import { MapPin, Navigation } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import { useAlLlegarNotificacion } from "../lib/tiempoReal";
import { escucharUbicaciones, getPaseoActivo, listUbicacionesPaseo, type UbicacionPaseo } from "../services/live-walks.service";
import type { WalkWithRelations } from "../services/walks.service";
import { Avatar, Badge, EmptyState, Page, PageHeader, Section } from "./ui";
import { MapaRecorrido } from "./MapaRecorrido";

const PaseoEnVivo = () => {
  const { user } = useAuth();
  const { t, localeTag } = useTranslation();
  const [walk, setWalk] = useState<WalkWithRelations | null>(null);
  const [locations, setLocations] = useState<UbicacionPaseo[]>([]);
  const [error, setError] = useState("");
  const time = (value: string) => new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  const load = useCallback(async () => { if (!user) return; try { const active = await getPaseoActivo(user.id); setWalk(active); setLocations(active ? await listUbicacionesPaseo(active.id_paseo) : []); } catch (cause) { setError(cause instanceof Error ? cause.message : t("paseoEnVivo.loadError")); } }, [user, t]);
  useEffect(() => { void load(); }, [load]);
  // Cuando el paseador inicia o termina, el mapa aparece o se va solo.
  useAlLlegarNotificacion(["paseo", "resena"], () => void load());
  useEffect(() => { if (!walk) return; return escucharUbicaciones(walk.id_paseo, (location) => setLocations((current) => current.some((item) => item.id_ubicacion === location.id_ubicacion) ? current : [...current, location])); }, [walk]);
  const latest = locations.at(-1);
  if (!walk && !error) return <Page><PageHeader title={t("paseoEnVivo.title")} subtitle={t("paseoEnVivo.searching")} /></Page>;
  if (!walk) return <Page><PageHeader title={t("paseoEnVivo.title")} subtitle={t("paseoEnVivo.trackingSubtitle")} />{error && <p className="bg-danger-wash px-4 py-3 text-danger">{error}</p>}<EmptyState title={t("paseoEnVivo.empty.title")} hint={t("paseoEnVivo.empty.hint")} /></Page>;
  return <Page><PageHeader title={t("paseoEnVivo.title")} subtitle={`${t("paseoEnVivo.withWalker", { mascota: walk.mascota?.nombre ?? t("paseoEnVivo.defaultPet"), paseador: walk.paseador?.nombre ?? t("paseoEnVivo.defaultWalker") })} ${latest ? t("paseoEnVivo.updatedAt", { hora: time(latest.timestamp) }) : t("paseoEnVivo.waitingLocation")}`} action={<Badge tono="accent">{t("paseoEnVivo.statusInCourse")}</Badge>} /><div className="grid gap-3 lg:grid-cols-3"><div className="lg:col-span-2"><Section bodyClass=""><MapaRecorrido ubicaciones={locations} vacio={t("paseoEnVivo.mapPlaceholder")} /><div className="flex items-center gap-2 bg-sunken px-6 py-3 text-[12.5px] text-ink-soft"><MapPin size={14} />{latest ? `${latest.latitud.toFixed(5)}, ${latest.longitud.toFixed(5)}` : t("paseoEnVivo.noLocationYet")}</div></Section></div><div className="flex flex-col gap-3"><Section title={t("paseoEnVivo.walkerSection")} bodyClass="px-6 pb-5"><div className="flex items-center gap-4"><Avatar nombre={walk.paseador?.nombre ?? t("paseoEnVivo.walkerSection")} size={48} /><div><p className="font-semibold text-ink">{walk.paseador?.nombre ?? t("paseoEnVivo.walkerSection")}</p><p className="mt-0.5 text-[12px] text-ink-soft">{t("paseoEnVivo.walkerSectionHint")}</p></div></div></Section><Section title={t("paseoEnVivo.activitySection")} bodyClass="px-6 pb-5">{locations.length ? <ol className="flex flex-col gap-3">{locations.slice(-6).reverse().map((location) => <li key={location.id_ubicacion} className="flex gap-3"><span className="flex h-7 w-7 items-center justify-center bg-sunken text-ink-mute"><Navigation size={13} /></span><div><p className="text-[12.5px] text-ink-soft">{t("paseoEnVivo.locationShared")}</p><p className="nums text-[11.5px] text-ink-mute">{time(location.timestamp)}</p></div></li>)}</ol> : <p className="text-[12.5px] text-ink-soft">{t("paseoEnVivo.noActivity")}</p>}</Section></div></div></Page>;
};
export default PaseoEnVivo;
