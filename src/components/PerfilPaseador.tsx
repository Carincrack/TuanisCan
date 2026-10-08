import { useCallback, useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Star } from "../lib/iconos";
import { getUserProfile } from "../services/auth.service";
import { listarHistorialPaseador, type PaseoHistorialPaseador } from "../services/walker-history.service";
import { listUbicacionesPaseo, type UbicacionPaseo } from "../services/live-walks.service";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import type { UserProfile } from "../types/auth.types";
import { Avatar, Dialog, EmptyState, Page, PageHeader, Section, Stat, btnSecondary, btnSecondaryCompacto, colones } from "./ui";

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

const PerfilPaseador = () => {
  const { user } = useAuth();
  const { t, localeTag } = useTranslation();
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [historial, setHistorial] = useState<PaseoHistorialPaseador[]>([]);
  const [error, setError] = useState("");
  const [rutaDe, setRutaDe] = useState<PaseoHistorialPaseador | null>(null);
  const [ruta, setRuta] = useState<UbicacionPaseo[] | null>(null);
  const [rutaCargando, setRutaCargando] = useState(false);
  const [rutaError, setRutaError] = useState("");
  const fecha = (valor: string) => new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${valor}T12:00:00`));
  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      setError("");
      const [datos, paseos] = await Promise.all([getUserProfile(user.id, user.email ?? ""), listarHistorialPaseador()]);
      setPerfil(datos); setHistorial(paseos);
    } catch { setError(t("perfilPaseador.loadError")); }
  }, [user, t]);
  useEffect(() => { void cargar(); }, [cargar]);
  const verRuta = async (paseo: PaseoHistorialPaseador) => {
    setRutaDe(paseo);
    setRuta(null);
    setRutaError("");
    setRutaCargando(true);
    try {
      setRuta(await listUbicacionesPaseo(paseo.id_paseo));
    } catch (cause) {
      setRutaError(cause instanceof Error ? cause.message : t("perfilPaseador.history.routeLoadError"));
    } finally {
      setRutaCargando(false);
    }
  };
  const generado = useMemo(() => historial.reduce((total, paseo) => total + paseo.precio, 0), [historial]);
  const paseador = perfil?.paseador;
  return <Page><PageHeader title={t("perfilPaseador.title")} subtitle={t("perfilPaseador.subtitle")} action={<a href="/perfil" className={btnSecondary}>{t("perfilPaseador.editProfile")}</a>} />{error && <p className="bg-danger-wash px-5 py-3 text-danger">{error}</p>}<Section title={t("perfilPaseador.publicProfile")} bodyClass="px-6 pb-6"><div className="flex flex-wrap items-center gap-4"><Avatar nombre={perfil?.nombre ?? t("perfilPaseador.defaultWalker")} size={56} /><div className="min-w-[180px] flex-1"><h2 className="text-[18px] font-semibold text-ink">{perfil?.nombre ?? t("perfilPaseador.loading")}</h2><p className="mt-1 text-[13px] text-ink-soft">{paseador?.descripcion || t("perfilPaseador.noDescription")}</p><div className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-soft"><MapPin size={13} />{perfil?.zona?.nombre ?? t("perfilPaseador.noZone")}</div></div><div className="flex items-center gap-1 text-[14px] font-semibold text-ink"><Star size={15} className="fill-warn text-warn" />{paseador?.calificacion_promedio?.toFixed(1) ?? "0.0"}</div></div></Section><div className="grid gap-3 sm:grid-cols-3"><Stat etiqueta={t("perfilPaseador.stats.finishedWalks")} valor={String(historial.length)} /><Stat etiqueta={t("perfilPaseador.stats.petsWalked")} valor={String(new Set(historial.map((paseo) => paseo.mascota)).size)} /><Stat etiqueta={t("perfilPaseador.stats.earned")} valor={colones(generado)} /></div><Section title={t("perfilPaseador.history.title")} bodyClass="px-6 pb-6">{historial.length === 0 ? <EmptyState title={t("perfilPaseador.empty.title")} hint={t("perfilPaseador.empty.hint")} /> : <div className="grid gap-3 sm:grid-cols-2">{historial.map((paseo) => <article key={paseo.id_paseo} className="flex items-center gap-3 bg-sunken p-4"><Avatar nombre={paseo.mascota} size={42} /><div className="min-w-0 flex-1"><h3 className="truncate text-[14px] font-semibold text-ink">{paseo.mascota}</h3><p className="mt-0.5 text-[12px] text-ink-soft">{t("perfilPaseador.history.owner", { nombre: paseo.dueno, zona: paseo.zona })}</p><p className="mt-1 text-[11.5px] text-ink-mute">{fecha(paseo.fecha)} · {t("perfilPaseador.history.minutes", { duracion: paseo.duracion_min })}</p></div><button type="button" className={btnSecondaryCompacto} onClick={() => void verRuta(paseo)}>{t("perfilPaseador.history.viewRoute")}</button></article>)}</div>}</Section>{rutaDe && <Dialog title={t("perfilPaseador.history.routeTitle", { mascota: rutaDe.mascota })} onClose={() => setRutaDe(null)}><div className="p-6">{rutaCargando ? <div className="grid h-[360px] place-items-center bg-sunken text-[13px] text-ink-soft">{t("perfilPaseador.history.routeLoading")}</div> : rutaError ? <p className="text-[13px] text-danger">{rutaError}</p> : ruta && ruta.length > 1 ? <MapContainer bounds={ruta.map((punto) => [punto.latitud, punto.longitud] as [number, number])} boundsOptions={{ padding: [28, 28] }} scrollWheelZoom className="h-[360px] w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Polyline positions={ruta.map((punto) => [punto.latitud, punto.longitud] as [number, number])} pathOptions={{ color: "#12a9b9", weight: 5 }} /><Marker position={[ruta[0].latitud, ruta[0].longitud]} icon={pinInicio} /><Marker position={[ruta[ruta.length - 1].latitud, ruta[ruta.length - 1].longitud]} icon={pinFin} /></MapContainer> : <EmptyState title={t("perfilPaseador.history.routeEmpty.title")} hint={t("perfilPaseador.history.routeEmpty.hint")} />}</div></Dialog>}</Page>;
};

export default PerfilPaseador;
