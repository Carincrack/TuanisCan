import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "../lib/iconos";
import { finalizarPaseo, getPaseoActivoPaseador, getPaseoConfirmadoPaseador, guardarUbicacionPaseo, iniciarPaseo } from "../services/live-walks.service";
import { Badge, EmptyState, Page, PageHeader, Section, btnDanger, btnPrimary } from "./ui";

const PaseoActivoPaseador = () => {
  const [walkId, setWalkId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);
  const stop = () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; setSharing(false); };
  const load = useCallback(async () => { try { const [walk, confirmed] = await Promise.all([getPaseoActivoPaseador(), getPaseoConfirmadoPaseador()]); setWalkId(walk?.id_paseo ?? null); setConfirmedId(confirmed?.id_paseo ?? null); } catch { setMessage("No se pudo consultar el paseo activo."); } }, []);
  useEffect(() => { void load(); return stop; }, [load]);
  const start = () => {
    if (!walkId || !navigator.geolocation) { setMessage("Este navegador no permite compartir ubicación."); return; }
    setMessage(""); setSharing(true);
    watch.current = navigator.geolocation.watchPosition((position) => {
      if (Date.now() - lastSent.current < 15000) return;
      lastSent.current = Date.now();
      void guardarUbicacionPaseo(walkId, position.coords).then(() => setMessage("Ubicación compartida con el dueño.")).catch(() => { setMessage("No se pudo enviar la ubicación."); stop(); });
    }, () => { setMessage("No se pudo obtener tu ubicación."); stop(); }, { enableHighAccuracy: true, maximumAge: 10000 });
  };
  const finish = async () => {
    if (!walkId) return;
    setFinishing(true); setMessage("");
    try { await finalizarPaseo(walkId); stop(); setCompleted(true); setWalkId(null); setMessage("Paseo finalizado. El dueño ya puede dejar su reseña."); }
    catch { setMessage("No se pudo finalizar el paseo. Inténtalo de nuevo."); }
    finally { setFinishing(false); }
  };
  const begin = async () => {
    if (!confirmedId) return;
    setFinishing(true); setMessage("");
    try { await iniciarPaseo(confirmedId); setWalkId(confirmedId); setConfirmedId(null); setMessage("Paseo iniciado. Ya puedes compartir tu ubicación."); }
    catch { setMessage("No se pudo iniciar el paseo. Verifica que sea para hoy."); }
    finally { setFinishing(false); }
  };
  if (!walkId) return <Page><PageHeader title="Paseo activo" subtitle="Comparte tu ubicación durante el paseo." />{message && <p className={`px-4 py-3 ${completed ? "bg-accent-wash text-accent-dark" : "bg-danger-wash text-danger"}`}>{message}</p>}{confirmedId ? <Section title="Paseo confirmado para hoy" bodyClass="px-6 pb-6"><p className="text-[13px] text-ink-soft">Inícialo para habilitar el seguimiento en tiempo real para el dueño.</p><button type="button" onClick={() => void begin()} disabled={finishing} className={`${btnPrimary} mt-4 disabled:cursor-wait disabled:opacity-60`}>{finishing ? "Iniciando…" : "Iniciar paseo"}</button></Section> : <EmptyState title="No tienes paseos en curso" hint="El seguimiento se habilita cuando inicias un paseo." />}</Page>;
  return <Page><PageHeader title="Paseo activo" subtitle="Tu ubicación se comparte solo mientras el paseo está en curso." action={<Badge tono="accent">En curso</Badge>} /><Section title="Seguimiento en tiempo real" bodyClass="px-6 pb-6"><p className="text-[13px] text-ink-soft">Permite la ubicación en tu teléfono para que el dueño vea el recorrido actualizado.</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={sharing ? stop : start} className={sharing ? btnDanger : btnPrimary}><MapPin size={15} />{sharing ? "Dejar de compartir" : "Compartir ubicación"}</button><button type="button" onClick={() => void finish()} disabled={finishing} className={`${btnDanger} disabled:cursor-wait disabled:opacity-60`}>{finishing ? "Finalizando…" : "Finalizar paseo"}</button></div>{message && <p className="mt-4 text-[13px] text-ink-soft" aria-live="polite">{message}</p>}</Section></Page>;
};
export default PaseoActivoPaseador;
