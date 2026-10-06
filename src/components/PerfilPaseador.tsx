import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Star } from "../lib/iconos";
import { getUserProfile } from "../services/auth.service";
import { listarHistorialPaseador, type PaseoHistorialPaseador } from "../services/walker-history.service";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import type { UserProfile } from "../types/auth.types";
import { Avatar, EmptyState, Page, PageHeader, Section, Stat, btnSecondary, colones } from "./ui";

const PerfilPaseador = () => {
  const { user } = useAuth();
  const { t, localeTag } = useTranslation();
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [historial, setHistorial] = useState<PaseoHistorialPaseador[]>([]);
  const [error, setError] = useState("");
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
  const generado = useMemo(() => historial.reduce((total, paseo) => total + paseo.precio, 0), [historial]);
  const paseador = perfil?.paseador;
  return <Page><PageHeader title={t("perfilPaseador.title")} subtitle={t("perfilPaseador.subtitle")} action={<a href="/perfil" className={btnSecondary}>{t("perfilPaseador.editProfile")}</a>} />{error && <p className="bg-danger-wash px-5 py-3 text-danger">{error}</p>}<Section title={t("perfilPaseador.publicProfile")} bodyClass="px-6 pb-6"><div className="flex flex-wrap items-center gap-4"><Avatar nombre={perfil?.nombre ?? t("perfilPaseador.defaultWalker")} size={56} /><div className="min-w-[180px] flex-1"><h2 className="text-[18px] font-semibold text-ink">{perfil?.nombre ?? t("perfilPaseador.loading")}</h2><p className="mt-1 text-[13px] text-ink-soft">{paseador?.descripcion || t("perfilPaseador.noDescription")}</p><div className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-soft"><MapPin size={13} />{perfil?.zona?.nombre ?? t("perfilPaseador.noZone")}</div></div><div className="flex items-center gap-1 text-[14px] font-semibold text-ink"><Star size={15} className="fill-warn text-warn" />{paseador?.calificacion_promedio?.toFixed(1) ?? "0.0"}</div></div></Section><div className="grid gap-3 sm:grid-cols-3"><Stat etiqueta={t("perfilPaseador.stats.finishedWalks")} valor={String(historial.length)} /><Stat etiqueta={t("perfilPaseador.stats.petsWalked")} valor={String(new Set(historial.map((paseo) => paseo.mascota)).size)} /><Stat etiqueta={t("perfilPaseador.stats.earned")} valor={colones(generado)} /></div><Section title={t("perfilPaseador.history.title")} bodyClass="px-6 pb-6">{historial.length === 0 ? <EmptyState title={t("perfilPaseador.empty.title")} hint={t("perfilPaseador.empty.hint")} /> : <div className="grid gap-3 sm:grid-cols-2">{historial.map((paseo) => <article key={paseo.id_paseo} className="flex items-center gap-3 bg-sunken p-4"><Avatar nombre={paseo.mascota} size={42} /><div className="min-w-0 flex-1"><h3 className="truncate text-[14px] font-semibold text-ink">{paseo.mascota}</h3><p className="mt-0.5 text-[12px] text-ink-soft">{t("perfilPaseador.history.owner", { nombre: paseo.dueno, zona: paseo.zona })}</p><p className="mt-1 text-[11.5px] text-ink-mute">{fecha(paseo.fecha)} · {t("perfilPaseador.history.minutes", { duracion: paseo.duracion_min })}</p></div></article>)}</div>}</Section></Page>;
};

export default PerfilPaseador;
