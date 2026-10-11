import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, MapPin, ShieldCheck } from "../lib/iconos";
import {
  finalizarPaseo,
  getPagoDelPaseo,
  getPaseoActivoPaseador,
  getPaseoConfirmadoPaseador,
  guardarUbicacionPaseo,
  iniciarPaseo,
} from "../services/live-walks.service";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import { useAlLlegarNotificacion } from "../lib/tiempoReal";
import { motivo } from "../lib/aviso";
import { Badge, EmptyState, Page, PageHeader, Section, btnDanger, btnPrimary, colones } from "./ui";

/* ─────────────────────────────────────────────────────────────
   PASEO ACTIVO DEL PASEADOR

   Dos momentos: el paseo de hoy, aceptado y esperando que empiece, y
   el paseo en curso, con la ubicación compartida.

   El paseo no se puede iniciar hasta que el dueño confirme el pago —el
   monto queda reservado y se cobra al terminar—. La base lo exige
   (\`iniciar_mi_paseo\`); acá se dice antes, con el botón apagado y el
   porqué al lado. Cuando el dueño confirma, llega un aviso en tiempo
   real y la pantalla se vuelve a cargar sola: el botón se enciende sin
   recargar nada.
   ───────────────────────────────────────────────────────────── */

const PaseoActivoPaseador = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const idPaseador = user?.id ?? null;
  const [walkId, setWalkId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [pago, setPago] = useState<{ estado: string; monto: number } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);

  const stop = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setSharing(false);
  };

  const load = useCallback(async () => {
    if (!idPaseador) return;
    try {
      const [walk, confirmed] = await Promise.all([
        getPaseoActivoPaseador(idPaseador),
        getPaseoConfirmadoPaseador(idPaseador),
      ]);
      setWalkId(walk?.id_paseo ?? null);
      setConfirmedId(confirmed?.id_paseo ?? null);
      setPago(confirmed ? await getPagoDelPaseo(confirmed.id_paseo) : null);
    } catch {
      setMessage(t("paseoActivoPaseador.errors.loadFailed"));
    }
  }, [idPaseador, t]);

  useEffect(() => {
    void load();
    return stop;
  }, [load]);

  /* El dueño confirmó el pago, o canceló: la pantalla se pone al día. */
  useAlLlegarNotificacion(["pago", "paseo"], () => void load());

  const start = () => {
    if (!walkId || !navigator.geolocation) {
      setMessage(t("paseoActivoPaseador.errors.noGeolocation"));
      return;
    }
    setMessage("");
    setSharing(true);
    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        if (Date.now() - lastSent.current < 15000) return;
        lastSent.current = Date.now();
        void guardarUbicacionPaseo(walkId, position.coords)
          .then(() => setMessage(t("paseoActivoPaseador.errors.locationShared")))
          .catch(() => {
            setMessage(t("paseoActivoPaseador.errors.sendFailed"));
            stop();
          });
      },
      () => {
        setMessage(t("paseoActivoPaseador.errors.locationFailed"));
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
  };

  const finish = async () => {
    if (!walkId) return;
    setFinishing(true);
    setMessage("");
    try {
      await finalizarPaseo(walkId);
      stop();
      setCompleted(true);
      setWalkId(null);
      setMessage(t("paseoActivoPaseador.errors.finishedMessage"));
    } catch {
      setMessage(t("paseoActivoPaseador.errors.finishFailed"));
    } finally {
      setFinishing(false);
    }
  };

  const begin = async () => {
    if (!confirmedId) return;
    setFinishing(true);
    setMessage("");
    try {
      await iniciarPaseo(confirmedId);
      setWalkId(confirmedId);
      setConfirmedId(null);
      setMessage(t("paseoActivoPaseador.errors.startedMessage"));
    } catch (cause) {
      // La base dice el motivo exacto: que no es hoy, o que falta el pago.
      setMessage(motivo(cause, t("paseoActivoPaseador.errors.startFailed")));
    } finally {
      setFinishing(false);
    }
  };

  const pagoListo = pago?.estado === "retenido" || pago?.estado === "pagado";

  if (!walkId) {
    return (
      <Page>
        <PageHeader title={t("paseoActivoPaseador.title")} subtitle={t("paseoActivoPaseador.subtitleIdle")} />
        {message && (
          <p className={`px-4 py-3 ${completed ? "bg-accent-wash text-accent-dark" : "bg-danger-wash text-danger"}`}>{message}</p>
        )}
        {confirmedId ? (
          <Section title={t("paseoActivoPaseador.confirmedTodayTitle")} bodyClass="px-6 pb-6">
            <p className="text-[13px] text-ink-soft">{t("paseoActivoPaseador.confirmedTodayHint")}</p>

            {pagoListo ? (
              <p className="mt-4 flex items-start gap-2 rounded-[14px] bg-ok-wash px-4 py-3 text-[13px] text-ok">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                {t("paseoActivoPaseador.paymentReady", { monto: colones(pago?.monto ?? 0) })}
              </p>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-warn-wash px-4 py-3 text-[13px] text-warn">
                <Clock size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{t("paseoActivoPaseador.paymentWaiting")}</p>
                  <p className="mt-0.5">{t("paseoActivoPaseador.paymentWaitingHint")}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void begin()}
              disabled={finishing || !pagoListo}
              className={`${btnPrimary} mt-4 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {finishing ? t("paseoActivoPaseador.starting") : t("paseoActivoPaseador.startWalk")}
            </button>
          </Section>
        ) : (
          <EmptyState title={t("paseoActivoPaseador.empty.title")} hint={t("paseoActivoPaseador.empty.hint")} />
        )}
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={t("paseoActivoPaseador.title")}
        subtitle={t("paseoActivoPaseador.subtitleActive")}
        action={<Badge tono="accent">{t("paseoActivoPaseador.statusInCourse")}</Badge>}
      />
      <Section title={t("paseoActivoPaseador.trackingSection")} bodyClass="px-6 pb-6">
        <p className="text-[13px] text-ink-soft">{t("paseoActivoPaseador.trackingHint")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={sharing ? stop : start} className={sharing ? btnDanger : btnPrimary}>
            <MapPin size={15} />
            {sharing ? t("paseoActivoPaseador.stopSharing") : t("paseoActivoPaseador.shareLocation")}
          </button>
          <button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            className={`${btnDanger} disabled:cursor-wait disabled:opacity-60`}
          >
            {finishing ? t("paseoActivoPaseador.finishing") : t("paseoActivoPaseador.finishWalk")}
          </button>
        </div>
        {message && (
          <p className="mt-4 text-[13px] text-ink-soft" aria-live="polite">
            {message}
          </p>
        )}
      </Section>
    </Page>
  );
};

export default PaseoActivoPaseador;
