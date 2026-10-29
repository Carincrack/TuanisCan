import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, MessageCircle, ShieldCheck } from "../lib/iconos";
import { rutaChat } from "../services/chat.service";
import {
  escucharUbicaciones,
  finalizarPaseo,
  getPagoDelPaseo,
  getPaseoActivoPaseador,
  getPaseoConfirmadoPaseador,
  guardarUbicacionPaseo,
  iniciarPaseo,
  listUbicacionesPaseo,
  type UbicacionPaseo,
} from "../services/live-walks.service";
import { listarAgendaPaseador, type CitaAgendaPaseador } from "../services/walker-agenda.service";
import { hoyEnCostaRica, mananaEnCostaRica } from "../lib/fechas";
import { MapaRecorrido } from "./MapaRecorrido";
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

   Con el paseo en curso, el paseador ve el MISMO mapa que el dueño
   (`MapaRecorrido`): el recorrido guardado y el último punto. Así sabe
   qué está viendo el dueño y desde qué hora, en vez de compartir a
   ciegas.
   ───────────────────────────────────────────────────────────── */

/** Agrega un punto sin repetirlo: llega dos veces, por la respuesta de
    guardar y por el tiempo real. */
const agregarUbicacion = (actuales: UbicacionPaseo[], nueva: UbicacionPaseo) =>
  actuales.some((u) => u.id_ubicacion === nueva.id_ubicacion) ? actuales : [...actuales, nueva];

const PaseoActivoPaseador = () => {
  const { t, localeTag } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const idPaseador = user?.id ?? null;
  const [walkId, setWalkId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [pago, setPago] = useState<{ estado: string; monto: number } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");
  const [ubicaciones, setUbicaciones] = useState<UbicacionPaseo[]>([]);
  const [proximo, setProximo] = useState<CitaAgendaPaseador | null>(null);
  const [pagoProximo, setPagoProximo] = useState<{ estado: string; monto: number } | null>(null);
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);

  /* Lo que ya ve el dueño: lo guardado hasta ahora y lo que vaya
     entrando. Si el paseador recarga a mitad del paseo, el recorrido
     vuelve entero. */
  useEffect(() => {
    if (!walkId) {
      setUbicaciones([]);
      return;
    }
    let vigente = true;
    void listUbicacionesPaseo(walkId)
      .then((lista) => { if (vigente) setUbicaciones(lista); })
      .catch(() => undefined);
    const dejar = escucharUbicaciones(walkId, (nueva) => setUbicaciones((actuales) => agregarUbicacion(actuales, nueva)));
    return () => {
      vigente = false;
      dejar();
    };
  }, [walkId]);

  const stop = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setSharing(false);
  };

  const load = useCallback(async () => {
    if (!idPaseador) return;
    try {
      const [walk, confirmed, agenda] = await Promise.all([
        getPaseoActivoPaseador(idPaseador),
        getPaseoConfirmadoPaseador(idPaseador),
        listarAgendaPaseador().catch(() => [] as CitaAgendaPaseador[]),
      ]);
      setWalkId(walk?.id_paseo ?? null);
      setConfirmedId(confirmed?.id_paseo ?? null);
      setPago(confirmed ? await getPagoDelPaseo(confirmed.id_paseo) : null);

      /* Sin paseo hoy: el próximo confirmado de los días que vienen. Un
         paseo de mañana con el pago ya reservado es justo lo que el
         paseador espera ver acá; «no tienes paseos» lo hacía creer que
         se había perdido. */
      const hoy = hoyEnCostaRica();
      const siguiente = confirmed
        ? null
        : agenda
            .filter((cita) => cita.estado === "confirmado" && cita.fecha > hoy)
            .sort((a, b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`))[0] ?? null;
      setProximo(siguiente);
      setPagoProximo(siguiente ? await getPagoDelPaseo(siguiente.id_paseo) : null);
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
          // Sin mensaje de «listo»: el punto en el mapa y la hora de
          // abajo ya lo dicen.
          .then((nueva) => setUbicaciones((actuales) => agregarUbicacion(actuales, nueva)))
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

  /** «mañana» o «el jueves 23 de octubre». Nunca «hoy»: el de hoy va
      en la tarjeta de arriba, con el botón para iniciarlo. */
  const diaDe = (fecha: string) =>
    fecha === mananaEnCostaRica()
      ? t("paseoActivoPaseador.tomorrow")
      : t("paseoActivoPaseador.onDay", {
          dia: new Intl.DateTimeFormat(localeTag, { weekday: "long", day: "numeric", month: "long" }).format(
            new Date(`${fecha}T12:00:00`),
          ),
        });

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
              <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-ok-wash px-4 py-3 text-[13px] text-ok">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                {t("paseoActivoPaseador.paymentReady", { monto: colones(pago?.monto ?? 0) })}
              </div>
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
        ) : proximo ? (
          /* ── El próximo paseo ──
             Qué, cuándo y si el pago ya está: lo que el paseador
             necesita para saber que está todo en orden. El botón de
             iniciar no aparece todavía; se dice cuándo va a aparecer. */
          <Section title={t("paseoActivoPaseador.nextTitle")} bodyClass="px-6 pb-6">
            <p className="text-[17px] font-semibold text-ink">{proximo.mascota}</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              {t("paseoActivoPaseador.nextWhen", {
                dia: diaDe(proximo.fecha),
                hora: proximo.hora_inicio.slice(0, 5),
                duracion: proximo.duracion_min,
              })}
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-mute">
              {t("paseoActivoPaseador.nextWho", { dueno: proximo.dueno, zona: proximo.zona })}
            </p>

            {pagoProximo?.estado === "retenido" || pagoProximo?.estado === "pagado" ? (
              <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-ok-wash px-4 py-3 text-[13px] text-ok">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                {t("paseoActivoPaseador.paymentReady", { monto: colones(pagoProximo?.monto ?? proximo.precio) })}
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-warn-wash px-4 py-3 text-[13px] text-warn">
                <Clock size={16} className="mt-0.5 shrink-0" />
                {t("paseoActivoPaseador.paymentWaiting")}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-soft">
              <CalendarDays size={15} className="mt-0.5 shrink-0" />
              {t("paseoActivoPaseador.nextStartHint", { dia: diaDe(proximo.fecha) })}
            </div>
          </Section>
        ) : (
          <EmptyState title={t("paseoActivoPaseador.empty.title")} hint={t("paseoActivoPaseador.empty.hint")} />
        )}
      </Page>
    );
  }

  const ultima = ubicaciones.at(-1);
  const hora = (valor: string) =>
    new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(new Date(valor));

  return (
    <Page>
      <PageHeader
        title={t("paseoActivoPaseador.title")}
        subtitle={t("paseoActivoPaseador.subtitleActive")}
        action={<Badge tono="accent">{t("paseoActivoPaseador.statusInCourse")}</Badge>}
      />

      {/* ── Lo que ve el dueño ──
          El mapa primero: es la respuesta a «¿qué está viendo el dueño
          de mí?». Pegado debajo, desde qué hora lo ve, si se sigue
          enviando y el botón que lo cambia: la causa y el efecto en el
          mismo sitio, sin bajar a otra sección para compartir. */}
      <Section title={t("paseoActivoPaseador.ownerViewSection")} bodyClass="">
        <MapaRecorrido ubicaciones={ubicaciones} vacio={t("paseoActivoPaseador.mapEmpty")} />
        <div className="flex flex-col gap-3 bg-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-[12.5px]">
            <div className="flex items-start gap-2 text-ink-soft">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              {ultima
                ? t("paseoActivoPaseador.ownerSeesAt", { hora: hora(ultima.timestamp) })
                : t("paseoActivoPaseador.ownerSeesNothing")}
            </div>
            <p className={`mt-1.5 inline-flex items-center gap-1.5 font-semibold ${sharing ? "text-accent-dark" : "text-ink-mute"}`}>
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${sharing ? "animate-pulse bg-accent motion-reduce:animate-none" : "bg-ink-mute"}`}
              />
              {sharing ? t("paseoActivoPaseador.sharingOn") : t("paseoActivoPaseador.sharingOff")}
            </p>
          </div>
          <button
            type="button"
            onClick={sharing ? stop : start}
            className={`${sharing ? btnDanger : btnPrimary} w-full shrink-0 justify-center sm:w-auto`}
          >
            <MapPin size={15} />
            {sharing ? t("paseoActivoPaseador.stopSharing") : t("paseoActivoPaseador.shareLocation")}
          </button>
        </div>
      </Section>

      {message && (
        <p className="px-1 text-[13px] text-ink-soft" aria-live="polite">
          {message}
        </p>
      )}

      {/* El chat con el dueño: abierto mientras dure el paseo. */}
      <button
        type="button"
        onClick={() => void navigate({ href: rutaChat(walkId, "paseador") })}
        className="flex w-full items-center gap-3 rounded-[22px] bg-surface px-5 py-4 text-left transition-[transform,background-color] duration-150 hover:bg-accent-wash/50 active:scale-[0.99]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-dark">
          <MessageCircle size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">{t("chat.openChatOwner")}</span>
          <span className="block text-[12px] text-ink-soft">{t("paseoActivoPaseador.chatHint")}</span>
        </span>
      </button>

      {/* ── Terminar ──
          Aparte y al final: es lo único que no se deshace, y pegado a
          «Compartir» se tocaba con el mismo pulgar. */}
      <Section title={t("paseoActivoPaseador.finishSection")} bodyClass="px-6 pb-6">
        <p className="text-[13px] text-ink-soft">{t("paseoActivoPaseador.finishHint")}</p>
        <button
          type="button"
          onClick={() => void finish()}
          disabled={finishing}
          className={`${btnDanger} mt-4 w-full justify-center disabled:cursor-wait disabled:opacity-60 sm:w-auto`}
        >
          {finishing ? t("paseoActivoPaseador.finishing") : t("paseoActivoPaseador.finishWalk")}
        </button>
      </Section>
    </Page>
  );
};

export default PaseoActivoPaseador;
