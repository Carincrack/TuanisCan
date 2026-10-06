import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "../lib/iconos";
import { listarResenasPaseador, type ResenaRecibida } from "../services/resenas-paseador.service";
import { useTranslation } from "../hooks/useTranslation";
import { Avatar, EmptyState, Page, PageHeader, Section } from "./ui";

const ResenasPaseador = () => {
  const { t, localeTag } = useTranslation();
  const [resenas, setResenas] = useState<ResenaRecibida[]>([]);
  const [error, setError] = useState("");
  const Estrellas = ({ valor }: { valor: number }) => <span className="flex gap-0.5" aria-label={t("resenasPaseador.starsAria", { valor })}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} aria-hidden className={n <= valor ? "fill-warn text-warn" : "fill-neutral-wash text-neutral-wash"} />)}</span>;
  const fechaCorta = (fecha: string) => new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(new Date(fecha));
  const cargar = useCallback(async () => { try { setError(""); setResenas(await listarResenasPaseador()); } catch { setError(t("resenasPaseador.loadError")); } }, [t]);
  useEffect(() => { void cargar(); }, [cargar]);
  const distribucion = useMemo(() => [5, 4, 3, 2, 1].map((estrellas) => ({ estrellas, cantidad: resenas.filter((r) => r.calificacion === estrellas).length })), [resenas]);
  const promedio = resenas.length ? resenas.reduce((total, r) => total + r.calificacion, 0) / resenas.length : 0;
  return <Page><PageHeader title={t("resenasPaseador.title")} subtitle={t("resenasPaseador.subtitle")} /><div className="grid gap-3 lg:grid-cols-3"><Section title={t("resenasPaseador.ratingSection")} bodyClass="px-6 pb-6"><p className="nums text-[38px] leading-none font-semibold text-ink">{promedio.toFixed(1)}</p><div className="mt-2 flex items-center gap-2"><Estrellas valor={Math.round(promedio)} /><span className="nums text-[12px] text-ink-soft">{t("resenasPaseador.countLabel", { count: resenas.length })}</span></div><ul className="mt-5 flex flex-col gap-2">{distribucion.map((d) => <li key={d.estrellas} className="flex items-center gap-3"><span className="nums w-7 flex-shrink-0 text-[12px] text-ink-soft">{d.estrellas} ★</span><span className="h-2 flex-1 bg-sunken"><span className="block h-full bg-accent" style={{ width: `${resenas.length ? (d.cantidad / resenas.length) * 100 : 0}%` }} /></span><span className="nums w-8 flex-shrink-0 text-right text-[12px] text-ink-mute">{d.cantidad}</span></li>)}</ul></Section><div className="flex flex-col gap-3 lg:col-span-2">{error ? <p className="bg-danger-wash px-4 py-3 text-danger">{error}</p> : resenas.length === 0 ? <EmptyState title={t("resenasPaseador.empty.title")} hint={t("resenasPaseador.empty.hint")} /> : resenas.map((r) => <article key={r.id_resena} className="bg-surface px-6 py-5"><div className="flex items-start gap-4"><Avatar nombre={r.dueno} size={40} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-[14px] font-semibold text-ink">{r.dueno}</h3><span className="nums text-[11.5px] text-ink-mute">{fechaCorta(r.fecha)}</span></div><p className="mt-0.5 text-[12px] text-ink-soft">{t("resenasPaseador.walkOf", { mascota: r.mascota })}</p><div className="mt-2 flex items-center gap-2"><Estrellas valor={r.calificacion} /><span className="nums text-[12px] font-medium text-ink-soft">{r.calificacion}.0</span></div>{r.comentario && <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{r.comentario}</p>}</div></div></article>)}</div></div></Page>;
};

export default ResenasPaseador;
