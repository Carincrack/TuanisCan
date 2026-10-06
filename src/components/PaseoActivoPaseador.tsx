import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "../lib/iconos";
import { finalizarPaseo, getPaseoActivoPaseador, getPaseoConfirmadoPaseador, guardarUbicacionPaseo, iniciarPaseo } from "../services/live-walks.service";
import { useTranslation } from "../hooks/useTranslation";
import { Badge, EmptyState, Page, PageHeader, Section, btnDanger, btnPrimary } from "./ui";

const PaseoActivoPaseador = () => {
  const { t } = useTranslation();
  const [walkId, setWalkId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);
  const stop = () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; setSharing(false); };
  const load = useCallback(async () => { try { const [walk, confirmed] = await Promise.all([getPaseoActivoPaseador(), getPaseoConfirmadoPaseador()]); setWalkId(walk?.id_paseo ?? null); setConfirmedId(confirmed?.id_paseo ?? null); } catch { setMessage(t("paseoActivoPaseador.errors.loadFailed")); } }, [t]);
  useEffect(() => { void load(); return stop; }, [load]);
  const start = () => {
    if (!walkId || !navigator.geolocation) { setMessage(t("paseoActivoPaseador.errors.noGeolocation")); return; }
    setMessage(""); setSharing(true);
    watch.current = navigator.geolocation.watchPosition((position) => {
      if (Date.now() - lastSent.current < 15000) return;
      lastSent.current = Date.now();
      void guardarUbicacionPaseo(walkId, position.coords).then(() => setMessage(t("paseoActivoPaseador.errors.locationShared"))).catch(() => { setMessage(t("paseoActivoPaseador.errors.sendFailed")); stop(); });
    }, () => { setMessage(t("paseoActivoPaseador.errors.locationFailed")); stop(); }, { enableHighAccuracy: true, maximumAge: 10000 });
  };
  const finish = async () => {
    if (!walkId) return;
    setFinishing(true); setMessage("");
    try { await finalizarPaseo(walkId); stop(); setCompleted(true); setWalkId(null); setMessage(t("paseoActivoPaseador.errors.finishedMessage")); }
    catch { setMessage(t("paseoActivoPaseador.errors.finishFailed")); }
    finally { setFinishing(false); }
  };
  const begin = async () => {
    if (!confirmedId) return;
    setFinishing(true); setMessage("");
    try { await iniciarPaseo(confirmedId); setWalkId(confirmedId); setConfirmedId(null); setMessage(t("paseoActivoPaseador.errors.startedMessage")); }
    catch { setMessage(t("paseoActivoPaseador.errors.startFailed")); }
    finally { setFinishing(false); }
  };
  if (!walkId) return <Page><PageHeader title={t("paseoActivoPaseador.title")} subtitle={t("paseoActivoPaseador.subtitleIdle")} />{message && <p className={`px-4 py-3 ${completed ? "bg-accent-wash text-accent-dark" : "bg-danger-wash text-danger"}`}>{message}</p>}{confirmedId ? <Section title={t("paseoActivoPaseador.confirmedTodayTitle")} bodyClass="px-6 pb-6"><p className="text-[13px] text-ink-soft">{t("paseoActivoPaseador.confirmedTodayHint")}</p><button type="button" onClick={() => void begin()} disabled={finishing} className={`${btnPrimary} mt-4 disabled:cursor-wait disabled:opacity-60`}>{finishing ? t("paseoActivoPaseador.starting") : t("paseoActivoPaseador.startWalk")}</button></Section> : <EmptyState title={t("paseoActivoPaseador.empty.title")} hint={t("paseoActivoPaseador.empty.hint")} />}</Page>;
  return <Page><PageHeader title={t("paseoActivoPaseador.title")} subtitle={t("paseoActivoPaseador.subtitleActive")} action={<Badge tono="accent">{t("paseoActivoPaseador.statusInCourse")}</Badge>} /><Section title={t("paseoActivoPaseador.trackingSection")} bodyClass="px-6 pb-6"><p className="text-[13px] text-ink-soft">{t("paseoActivoPaseador.trackingHint")}</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={sharing ? stop : start} className={sharing ? btnDanger : btnPrimary}><MapPin size={15} />{sharing ? t("paseoActivoPaseador.stopSharing") : t("paseoActivoPaseador.shareLocation")}</button><button type="button" onClick={() => void finish()} disabled={finishing} className={`${btnDanger} disabled:cursor-wait disabled:opacity-60`}>{finishing ? t("paseoActivoPaseador.finishing") : t("paseoActivoPaseador.finishWalk")}</button></div>{message && <p className="mt-4 text-[13px] text-ink-soft" aria-live="polite">{message}</p>}</Section></Page>;
};
export default PaseoActivoPaseador;
