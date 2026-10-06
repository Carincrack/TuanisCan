import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  Loader,
  MapPin,
  Navigation,
  Pause,
  PawPrint,
  Play,
  ShieldCheck,
  Star,
  Stethoscope,
  Syringe,
  Timer,
  Wallet,
  X,
} from "../lib/iconos";
import {
  Avatar,
  Badge,
  EmptyState,
  FilterTabs,
  MockPhoto,
  Page,
  PageHeader,
  Section,
  Stat,
  Table,
  btnDanger,
  btnPrimary,
  btnSecondary,
  colones,
  input,
  surface,
} from "./ui";
import {
  listWalkerRequests,
  respondWalkRequest,
  type WalkerRequest,
} from "../services/walk-requests.service";
import { listarAgendaPaseador, type CitaAgendaPaseador } from "../services/walker-agenda.service";
import { useAuth } from "../hooks/useAuth";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";
import { listWalkerEarnings, type WalkerEarning } from "../services/payments.service";
import { listarResenasPaseador } from "../services/resenas-paseador.service";
import { toggleWalkerAvailability } from "../services/walkers.service";
import { formatDate, petAge, vaccineStatus } from "../lib/pets";
import { useTranslation } from "../hooks/useTranslation";

/* ─────────────────────────────────────────────────────────────
   El lado del paseador. Es la contraparte del lado del dueño:
   donde el dueño pide un paseo, el paseador lo acepta, lo ejecuta
   y cobra. Todo con datos de maqueta.
   ───────────────────────────────────────────────────────────── */

/* ── Panel ───────────────────────────────────────────────────── */

const hoyISO = () => new Date().toISOString().slice(0, 10);

export const PanelPaseador = () => {
  const { user, getProfile } = useAuth();
  const { t, localeTag } = useTranslation();
  const subtituloPanel = new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const [disponible, setDisponible] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [totalResenas, setTotalResenas] = useState(0);
  const [agenda, setAgenda] = useState<CitaAgendaPaseador[]>([]);
  const [pendientes, setPendientes] = useState<WalkerRequest[]>([]);
  const [ganancias, setGanancias] = useState<WalkerEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cambiandoDisponibilidad, setCambiandoDisponibilidad] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [perfil, citas, solicitudes, ingresos, resenas] = await Promise.all([
        getProfile(),
        listarAgendaPaseador(),
        listWalkerRequests(),
        listWalkerEarnings(),
        listarResenasPaseador(),
      ]);
      setDisponible(perfil?.paseador?.disponible ?? false);
      setCalificacion(perfil?.paseador?.calificacion_promedio ?? 0);
      setTotalResenas(resenas.length);
      setAgenda(citas);
      setPendientes(solicitudes);
      setGanancias(ingresos);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("paseadorPanel.panel.loadError"));
    } finally {
      setLoading(false);
    }
  }, [getProfile, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarDisponibilidad = async () => {
    if (!user) return;
    setCambiandoDisponibilidad(true);
    try {
      await toggleWalkerAvailability(user.id, !disponible);
      setDisponible(!disponible);
    } catch (cause) {
      aviso.error(cause, { respaldo: t("paseadorPanel.panel.availabilityError") });
    } finally {
      setCambiandoDisponibilidad(false);
    }
  };

  const hoy = hoyISO();
  const citasHoy = agenda.filter((c) => c.fecha === hoy);
  const paseoEnCurso = agenda.find((c) => c.estado === "en_curso");
  const gananciaHoy = ganancias
    .filter((g) => g.fecha === hoy)
    .reduce((sum, g) => sum + g.bruto, 0);
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - 6);
  const gananciaSemana = ganancias.filter((g) => new Date(`${g.fecha}T00:00:00`) >= inicioSemana);

  return (
    <Page>
      <PageHeader
        title={t("paseadorPanel.panel.title")}
        subtitle={subtituloPanel}
        action={
          <button
            type="button"
            onClick={() => void cambiarDisponibilidad()}
            disabled={cambiandoDisponibilidad}
            aria-pressed={disponible}
            className={`${disponible ? btnSecondary : btnPrimary} disabled:cursor-wait disabled:opacity-60`}
          >
            {disponible ? (
              <>
                <Pause size={15} strokeWidth={2} />
                {t("paseadorPanel.panel.stopReceiving")}
              </>
            ) : (
              <>
                <Play size={15} strokeWidth={2} />
                {t("paseadorPanel.panel.becomeAvailable")}
              </>
            )}
          </button>
        }
      />

      <div className="bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <Badge tono={disponible ? "ok" : "neutral"}>
            {disponible ? t("paseadorPanel.panel.available") : t("paseadorPanel.panel.unavailable")}
          </Badge>
          <p className="text-[13px] text-ink-soft">
            {disponible
              ? t("paseadorPanel.panel.availableHint")
              : t("paseadorPanel.panel.unavailableHint")}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-danger-wash px-6 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 px-6 py-8 text-[13px] text-ink-soft">
          <Loader size={16} className="animate-spin" /> {t("paseadorPanel.panel.loading")}
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              etiqueta={t("paseadorPanel.panel.stats.walksToday")}
              valor={String(citasHoy.length)}
              nota={paseoEnCurso ? t("paseadorPanel.panel.stats.oneInProgress") : undefined}
            />
            <Stat etiqueta={t("paseadorPanel.panel.stats.earnedToday")} valor={colones(gananciaHoy)} nota={t("paseadorPanel.panel.stats.beforeCommission")} />
            <Stat
              etiqueta={t("paseadorPanel.panel.stats.thisWeek")}
              valor={colones(gananciaSemana.reduce((sum, g) => sum + g.bruto, 0))}
              nota={`${gananciaSemana.length} ${t("paseadorPanel.panel.stats.walksSuffix")}`}
            />
            <Stat
              etiqueta={t("paseadorPanel.panel.stats.rating")}
              valor={calificacion.toFixed(1)}
              nota={`${totalResenas} ${t("paseadorPanel.panel.stats.reviewsSuffix")}`}
            />
          </div>

          <Section title={t("paseadorPanel.panel.ongoingWalk.title")} bodyClass="">
            {paseoEnCurso ? (
              <div className="flex flex-wrap items-center gap-5 px-6 pt-4 pb-6">
                {paseoEnCurso.foto ? (
                  <MockPhoto
                    src={paseoEnCurso.foto}
                    alt={t("common.photoOf", { nombre: paseoEnCurso.mascota })}
                    className="h-20 w-20 flex-shrink-0"
                  />
                ) : (
                  <Avatar nombre={paseoEnCurso.mascota} size={80} />
                )}
                <div className="min-w-[180px] flex-1">
                  <p className="text-[16px] font-semibold text-ink">{paseoEnCurso.mascota}</p>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{paseoEnCurso.dueno}</p>
                  <div className="nums mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} strokeWidth={1.9} aria-hidden />
                      {paseoEnCurso.duracion_min} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} strokeWidth={1.9} aria-hidden />
                      {paseoEnCurso.zona}
                    </span>
                  </div>
                </div>
                <Link to="/p/paseo-activo" className={btnPrimary}>
                  {t("paseadorPanel.panel.ongoingWalk.goToTracking")}
                </Link>
              </div>
            ) : (
              <EmptyState
                title={t("paseadorPanel.panel.ongoingWalk.empty.title")}
                hint={t("paseadorPanel.panel.ongoingWalk.empty.hint")}
              />
            )}
          </Section>

          <Section title={t("paseadorPanel.panel.upcomingRequests.title")} bodyClass="">
            {pendientes.length ? (
              <Table
                caption={t("paseadorPanel.panel.upcomingRequests.caption")}
                columnas={[
                  { label: t("paseadorPanel.panel.upcomingRequests.columns.ownerAndPet") },
                  { label: t("paseadorPanel.panel.upcomingRequests.columns.when") },
                  { label: t("paseadorPanel.panel.upcomingRequests.columns.zone") },
                  { label: t("paseadorPanel.panel.upcomingRequests.columns.pay"), align: "right" },
                ]}
              >
                {pendientes.slice(0, 5).map((s) => (
                  <tr key={s.id_paseo}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={s.dueno} size={32} />
                        <div>
                          <p className="text-[13px] font-medium text-ink">{s.mascota}</p>
                          <p className="text-[11.5px] text-ink-soft">{s.dueno}</p>
                        </div>
                      </div>
                    </td>
                    <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                      {new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(
                        new Date(`${s.fecha}T00:00:00`),
                      )}{" "}
                      · {s.hora_inicio.slice(0, 5)}
                    </td>
                    <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{s.zona}</td>
                    <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                      {colones(s.precio)}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title={t("paseadorPanel.panel.upcomingRequests.empty.title")}
                hint={t("paseadorPanel.panel.upcomingRequests.empty.hint")}
              />
            )}
          </Section>
        </>
      )}
    </Page>
  );
};

/* ── Solicitudes ─────────────────────────────────────────────── */

const fechaSolicitud = (fecha: string, localeTag: string) =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${fecha}T00:00:00`));

const rangoHoras = (hora: string, minutos: number) => {
  const [h, m] = hora.split(":").map(Number);
  const fin = h * 60 + m + minutos;
  const dosDigitos = (n: number) => String(n).padStart(2, "0");
  return `${hora.slice(0, 5)}–${dosDigitos(Math.floor(fin / 60) % 24)}:${dosDigitos(fin % 60)}`;
};

/* La foto es lo primero que el paseador necesita: así va a reconocer
   a la mascota en el punto de encuentro. Tocarla la abre en grande. */
const FotoMascota = ({ solicitud: s }: { solicitud: WalkerRequest }) => {
  const { t } = useTranslation();
  return s.fotoUrl ? (
    <a
      href={s.fotoUrl}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={t("paseadorPanel.requests.card.viewPhotoFull", { mascota: s.mascota })}
    >
      <img
        src={s.fotoUrl}
        alt={t("common.photoOf", { nombre: s.mascota })}
        loading="lazy"
        className="aspect-[4/3] w-full bg-sunken object-cover transition-transform duration-300 hover:scale-[1.03] md:aspect-[4/5]"
      />
    </a>
  ) : (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[14px] bg-accent-wash text-accent-deep md:aspect-[4/5]">
      <PawPrint size={36} strokeWidth={1.6} aria-hidden />
      <span className="text-[12px]">{t("paseadorPanel.requests.card.noPhoto")}</span>
    </div>
  );
};

const Dato = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="min-w-0">
    <dt className="text-[12px] text-ink-mute">{rotulo}</dt>
    <dd className="mt-0.5 break-words text-[13.5px] text-ink">{valor}</dd>
  </div>
);

/* Todo lo que el dueño registró de la mascota, ordenado por lo que
   pesa en la decisión: primero la salud, después cómo es y al final
   las notas sueltas. */
const FichaMascota = ({ solicitud: s }: { solicitud: WalkerRequest }) => {
  const { t, localeTag } = useTranslation();
  const datos = [
    [t("paseadorPanel.requests.card.weight"), s.peso !== null ? `${s.peso} kg` : null],
    [t("paseadorPanel.requests.card.color"), s.color],
    [t("paseadorPanel.requests.card.sterilized"), s.esterilizado === null ? null : s.esterilizado ? t("paseadorPanel.requests.card.yes") : t("paseadorPanel.requests.card.no")],
    [t("paseadorPanel.requests.card.microchip"), s.microchip],
    [t("paseadorPanel.requests.card.vet"), s.veterinaria],
  ].filter((dato): dato is [string, string] => Boolean(dato[1]));

  return (
    <div className="mt-6 flex flex-col gap-5">
      {s.alergias ? (
        <div className="flex gap-3 rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] leading-snug text-danger">
          <AlertTriangle size={17} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          <span>
            <span className="font-semibold">{t("paseadorPanel.requests.card.allergies")} </span>
            {s.alergias}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-[13px] text-ok">
          <ShieldCheck size={16} strokeWidth={2} aria-hidden className="shrink-0" />
          {s.padecimientos.length ? t("paseadorPanel.requests.card.noAllergiesWithConditions") : t("paseadorPanel.requests.card.noAllergiesNoConditions")}
        </div>
      )}

      {s.padecimientos.length > 0 && (
        <div className="rounded-[14px] bg-warn-wash px-4 py-3">
          <h4 className="flex items-center gap-2 text-[13px] font-semibold text-warn">
            <Stethoscope size={16} strokeWidth={2} aria-hidden className="shrink-0" />
            {s.padecimientos.length === 1 ? t("paseadorPanel.requests.card.hasOneCondition") : t("paseadorPanel.requests.card.hasConditions", { count: s.padecimientos.length })}
          </h4>
          <ul className="mt-2 flex flex-col gap-2.5">
            {s.padecimientos.map((p) => (
              <li key={p.nombre} className="pl-6 text-[13px] leading-snug">
                <span className="font-semibold text-ink">{p.nombre}</span>
                {p.fecha_diagnostico && (
                  <span className="nums text-ink-mute"> · {t("paseadorPanel.requests.card.since")} {formatDate(p.fecha_diagnostico, localeTag)}</span>
                )}
                {p.cuidados && <p className="mt-0.5 whitespace-pre-wrap text-ink-soft">{p.cuidados}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {datos.length > 0 && (
        <dl className="nums grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {datos.map(([rotulo, valor]) => (
            <Dato key={rotulo} rotulo={rotulo} valor={valor} />
          ))}
        </dl>
      )}

      <div>
        <h4 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Syringe size={15} strokeWidth={1.8} aria-hidden className="text-ink-mute" />
          {t("paseadorPanel.requests.card.vaccines")}
        </h4>
        {s.vacunas.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-ink-soft">{t("paseadorPanel.requests.card.noVaccines")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-sunken">
            {s.vacunas.map((v) => {
              const estado = vaccineStatus(v.fecha_vencimiento);
              return (
                <li
                  key={`${v.nombre_vacuna}-${v.fecha_aplicacion}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[13px]"
                >
                  <span className="text-ink">{v.nombre_vacuna}</span>
                  <span className="flex items-center gap-3">
                    <span className="nums text-ink-mute">{t("paseadorPanel.requests.card.expires")} {formatDate(v.fecha_vencimiento, localeTag)}</span>
                    <Badge tono={estado === "vigente" ? "ok" : estado === "pendiente" ? "warn" : "danger"}>
                      {estado === "pendiente" ? t("paseadorPanel.requests.card.statusUpcoming") : estado}
                    </Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {s.notas && (
        <blockquote className="border-l-2 border-accent pl-4 text-[13px] leading-relaxed text-ink-soft">
          <p className="mb-1 font-semibold text-ink">{t("paseadorPanel.requests.card.notes")}</p>
          {s.notas}
        </blockquote>
      )}
    </div>
  );
};

const TarjetaSolicitud = ({
  solicitud: s,
  comentario,
  onComentario,
  guardando,
  onResponder,
}: {
  solicitud: WalkerRequest;
  comentario: string;
  onComentario: (valor: string) => void;
  guardando: boolean;
  onResponder: (aprobada: boolean) => void;
}) => {
  const { t, localeTag } = useTranslation();
  const esOferta = s.precio !== s.precio_tarifa;
  const diferencia = s.precio_tarifa > 0 ? Math.round(((s.precio - s.precio_tarifa) / s.precio_tarifa) * 100) : 0;

  const rasgos = [
    s.especie,
    s.raza,
    s.sexo === "macho" ? t("paseadorPanel.requests.card.male") : s.sexo === "hembra" ? t("paseadorPanel.requests.card.female") : null,
    s.fecha_nacimiento ? petAge(s.fecha_nacimiento, t) : null,
  ].filter(Boolean) as string[];

  return (
    <article className={`${surface} overflow-hidden`} aria-labelledby={`solicitud-${s.id_paseo}`}>
      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <FotoMascota solicitud={s} />
          <div className="flex items-center gap-3">
            <Avatar nombre={s.dueno} size={34} />
            <div className="min-w-0">
              <p className="text-[12px] text-ink-mute">{t("paseadorPanel.requests.card.owner")}</p>
              <p className="truncate text-[13.5px] font-medium text-ink">{s.dueno}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id={`solicitud-${s.id_paseo}`} className="titular text-[26px] leading-tight text-ink">
                {s.mascota}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {rasgos.map((rasgo) => (
                  <li key={rasgo} className="rounded-full bg-sunken px-3 py-1 text-[12px] text-ink-soft">
                    {rasgo}
                  </li>
                ))}
              </ul>
            </div>
            {esOferta ? (
              <div className="rounded-[14px] bg-accent-wash px-4 py-2.5 text-right">
                <p className="text-[12px] font-semibold text-accent-deep">{t("paseadorPanel.requests.card.ownerOffer")}</p>
                <p className="nums text-[26px] font-semibold leading-tight text-ink">{colones(s.precio)}</p>
                <p className="nums text-[12px] text-ink-soft">
                  {t("paseadorPanel.requests.card.yourRate")} <span className="line-through">{colones(s.precio_tarifa)}</span>
                  <span className={`ml-1.5 font-semibold ${diferencia > 0 ? "text-ok" : "text-warn"}`}>
                    {diferencia > 0 ? "+" : ""}{diferencia}%
                  </span>
                </p>
              </div>
            ) : (
              <div className="text-right">
                <p className="nums text-[26px] font-semibold leading-tight text-ink">{colones(s.precio)}</p>
                <p className="text-[12px] text-ink-mute">{t("paseadorPanel.requests.card.paidForThisWalk")}</p>
              </div>
            )}
          </header>

          <dl className="nums mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-suelo sm:grid-cols-4">
            {[
              { icono: CalendarDays, rotulo: t("paseadorPanel.requests.card.day"), valor: fechaSolicitud(s.fecha, localeTag) },
              { icono: Clock, rotulo: t("paseadorPanel.requests.card.schedule"), valor: rangoHoras(s.hora_inicio, s.duracion_min) },
              { icono: Timer, rotulo: t("paseadorPanel.requests.card.duration"), valor: `${s.duracion_min} min` },
              { icono: MapPin, rotulo: t("paseadorPanel.requests.card.zone"), valor: s.zona },
            ].map(({ icono: Icono, rotulo, valor }) => (
              <div key={rotulo} className="bg-sunken px-4 py-3">
                <dt className="flex items-center gap-1.5 text-[12px] text-ink-mute">
                  <Icono size={13} strokeWidth={1.8} aria-hidden />
                  {rotulo}
                </dt>
                <dd className="mt-1 text-[13.5px] font-medium first-letter:uppercase text-ink">{valor}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 flex gap-2.5 text-[13px] leading-snug text-ink-soft">
            <Navigation size={15} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-accent-dark" />
            <span>
              <span className="text-ink">{t("paseadorPanel.requests.card.meetingPoint")} </span>
              {s.direccion_encuentro}
            </span>
          </div>

          <FichaMascota solicitud={s} />
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-sunken bg-canvas/60 px-5 py-4 sm:px-6 md:flex-row md:items-end">
        <label className="block flex-1">
          <span className="text-[12px] text-ink-mute">{t("paseadorPanel.requests.card.messageFor", { nombre: s.dueno })}</span>
          <textarea
            rows={2}
            maxLength={500}
            value={comentario}
            onChange={(e) => onComentario(e.target.value)}
            className={`${input} mt-1.5 resize-y bg-surface`}
            placeholder={t("paseadorPanel.requests.card.messagePlaceholder")}
          />
        </label>
        <div className="flex gap-2 md:pb-0.5">
          <button
            type="button"
            disabled={guardando}
            onClick={() => onResponder(false)}
            className={`${btnDanger} flex-1 md:flex-none`}
          >
            <X size={15} strokeWidth={2.2} />
            {t("paseadorPanel.requests.card.reject")}
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => onResponder(true)}
            className={`${btnPrimary} flex-1 md:flex-none`}
          >
            <Check size={15} strokeWidth={2.2} />
            {guardando ? t("paseadorPanel.requests.card.saving") : esOferta ? t("paseadorPanel.requests.card.acceptOffer", { monto: colones(s.precio) }) : t("paseadorPanel.requests.card.accept")}
          </button>
        </div>
      </footer>
    </article>
  );
};

export const SolicitudesPaseador = () => {
  const { getProfile, isAdmin } = useAuth();
  const { t, localeTag } = useTranslation();
  const [pendientes, setPendientes] = useState<WalkerRequest[]>([]);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  /* Entrar al panel y poder ejercer son dos cosas distintas: la cuenta
     abre apenas se crea el perfil, pero aceptar paseos espera la
     aprobación. La base ya lo impide; acá se dice antes de que el
     usuario lo descubra con un error rojo. */
  const [habilitado, setHabilitado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [solicitudes, perfil] = await Promise.all([
          listWalkerRequests(),
          getProfile(),
        ]);
        setPendientes(solicitudes);
        setHabilitado(isAdmin || perfil?.verificacion.estado === "aprobado");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t("paseadorPanel.requests.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, [getProfile, isAdmin, t]);

  const responder = async (solicitud: WalkerRequest, aprobada: boolean) => {
    if (!habilitado) {
      aviso.ojo(t("paseadorPanel.requests.verifyFirst"), {
        detalle: t("paseadorPanel.requests.verifyFirstDetail"),
      });
      return;
    }
    setSavingId(solicitud.id_paseo);
    setError(null);
    setMessage(null);
    try {
      await respondWalkRequest(
        solicitud.id_paseo,
        aprobada,
        comentarios[solicitud.id_paseo] ?? "",
      );
      setPendientes((actuales) =>
        actuales.filter((item) => item.id_paseo !== solicitud.id_paseo),
      );
      if (aprobada) {
        aviso.ok(t("paseadorPanel.requests.confirmed", { mascota: solicitud.mascota }), {
          detalle: `${formatoFecha(solicitud.fecha, solicitud.hora_inicio)} · ${solicitud.direccion_encuentro}`,
        });
      } else {
        aviso.dato(t("paseadorPanel.requests.rejected", { mascota: solicitud.mascota }), {
          detalle: t("paseadorPanel.requests.rejectedDetail"),
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("paseadorPanel.requests.respondError"));
      aviso.error(cause, { respaldo: t("paseadorPanel.requests.respondError") });
      /* Puede que el dueño la haya cancelado mientras tanto: se recarga
         para que la tarjeta no quede colgada. */
      listWalkerRequests().then(setPendientes).catch(() => {});
    } finally {
      setSavingId(null);
    }
  };

  const formatoFecha = (fecha: string, hora: string) =>
    `${new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "short",
    }).format(new Date(`${fecha}T00:00:00`))} · ${hora.slice(0, 5)}`;

  return (
    <Page>
      <PageHeader
        title={t("paseadorPanel.requests.title")}
        subtitle={t("paseadorPanel.requests.subtitle")}
      />

      {(error || message) && (
        <div aria-live="polite" className={`px-6 py-3 text-[13px] ${error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"}`}>
          {error ?? message}
        </div>
      )}

      {loading && (
        <Skeleton name="paseador-solicitudes" loading>
          <div />
        </Skeleton>
      )}

      {!loading && pendientes.map((s) => (
        <TarjetaSolicitud
          key={s.id_paseo}
          solicitud={s}
          comentario={comentarios[s.id_paseo] ?? ""}
          onComentario={(valor) =>
            setComentarios({ ...comentarios, [s.id_paseo]: valor })
          }
          guardando={savingId === s.id_paseo}
          onResponder={(aprobada) => void responder(s, aprobada)}
        />
      ))}

      {!loading && pendientes.length === 0 && (
        <EmptyState
          title={
            habilitado
              ? t("paseadorPanel.requests.empty.titleEnabled")
              : t("paseadorPanel.requests.empty.titleDisabled")
          }
          hint={
            habilitado
              ? t("paseadorPanel.requests.empty.hintEnabled")
              : t("paseadorPanel.requests.empty.hintDisabled")
          }
        />
      )}
    </Page>
  );
};

/* ── Agenda ──────────────────────────────────────────────────── */

const tonoCita = (estado: CitaAgendaPaseador["estado"]) =>
  estado === "en_curso" ? "accent" : "ok";

export const AgendaPaseador = () => {
  const { t, localeTag } = useTranslation();
  const labelCita = (estado: CitaAgendaPaseador["estado"]) =>
    estado === "en_curso" ? t("paseadorPanel.agenda.statusInCourse") : t("paseadorPanel.agenda.statusConfirmed");

  const etiquetaDia = useCallback((fechaISO: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const fecha = new Date(`${fechaISO}T00:00:00`);

    if (fecha.getTime() === hoy.getTime()) return t("paseadorPanel.agenda.today");
    if (fecha.getTime() === manana.getTime()) return t("paseadorPanel.agenda.tomorrow");

    const formato = new Intl.DateTimeFormat(localeTag, { weekday: "long", day: "numeric" }).format(fecha);
    return formato.charAt(0).toUpperCase() + formato.slice(1);
  }, [t, localeTag]);

  const [citas, setCitas] = useState<CitaAgendaPaseador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dia, setDia] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    listarAgendaPaseador()
      .then((data) => {
        setCitas(data);
        const primerDia = data[0] ? etiquetaDia(data[0].fecha) : "";
        setDia(primerDia);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : t("paseadorPanel.agenda.loadError")))
      .finally(() => setLoading(false));
  }, [etiquetaDia, t]);

  const agendaPorDia = new Map<string, CitaAgendaPaseador[]>();
  citas.forEach((cita) => {
    const etiqueta = etiquetaDia(cita.fecha);
    const grupo = agendaPorDia.get(etiqueta) ?? [];
    grupo.push(cita);
    agendaPorDia.set(etiqueta, grupo);
  });

  const dias = [...agendaPorDia.keys()];
  const citasDelDia = agendaPorDia.get(dia) ?? [];
  const total = citasDelDia.reduce((s, c) => s + c.precio, 0);

  return (
    <Page>
      <PageHeader
        title={t("paseadorPanel.agenda.title")}
        subtitle={t("paseadorPanel.agenda.subtitle")}
      />

      {error && (
        <div role="alert" className="bg-danger-wash px-6 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 px-6 py-8 text-[13px] text-ink-soft">
          <Loader size={16} className="animate-spin" /> {t("paseadorPanel.agenda.loading")}
        </div>
      ) : dias.length === 0 ? (
        <EmptyState
          title={t("paseadorPanel.agenda.empty.title")}
          hint={t("paseadorPanel.agenda.empty.hint")}
        />
      ) : (
        <>
          <div className="bg-surface">
            <FilterTabs label={t("paseadorPanel.agenda.pickDay")} options={dias.map((o) => ({ value: o, label: o }))} value={dia} onChange={setDia} />
          </div>

          <Section bodyClass="">
            <Table
              caption={t("paseadorPanel.agenda.caption", { dia })}
              columnas={[
                { label: t("paseadorPanel.agenda.columns.time") },
                { label: t("paseadorPanel.agenda.columns.pet") },
                { label: t("paseadorPanel.agenda.columns.zone") },
                { label: t("paseadorPanel.agenda.columns.status") },
                { label: t("paseadorPanel.agenda.columns.pay"), align: "right" },
              ]}
            >
              {citasDelDia.map((c) => (
                <tr key={c.id_paseo}>
                  <td className="nums px-6 py-3.5 text-[13px] font-semibold text-ink">
                    {c.hora_inicio.slice(0, 5)}
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-[13px] font-medium text-ink">{c.mascota}</p>
                    <p className="text-[11.5px] text-ink-soft">
                      {c.dueno} · {c.duracion_min} min
                    </p>
                  </td>
                  <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{c.zona}</td>
                  <td className="px-6 py-3.5">
                    <Badge tono={tonoCita(c.estado)}>{labelCita(c.estado)}</Badge>
                  </td>
                  <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                    {colones(c.precio)}
                  </td>
                </tr>
              ))}
            </Table>

            <div className="flex items-center justify-between bg-sunken px-6 py-3.5">
              <span className="text-[12.5px] font-medium text-ink-soft">
                {t("paseadorPanel.agenda.totalOf", { dia: dia.toLowerCase() })}
              </span>
              <span className="nums text-[15px] font-semibold text-ink">
                {colones(total)}
              </span>
            </div>
          </Section>
        </>
      )}
    </Page>
  );
};

/* ── Paseo activo ────────────────────────────────────────────── */

const bitacora = [
  { hora: "16:00", texto: "Recogiste a Rocky en casa de Ana." },
  { hora: "16:08", texto: "Salida hacia el Parque de Curridabat." },
  { hora: "16:19", texto: "Enviaste una foto al dueño." },
  { hora: "16:28", texto: "Pausa de agua." },
];

export const PaseoActivoPaseador = () => (
  <Page>
    <PageHeader
      title="Paseo activo"
      subtitle="Rocky · Ana Corrales · iniciado a las 16:00"
      action={<Badge tono="accent">En curso</Badge>}
    />

    <div className="grid gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section bodyClass="">
          <img
            src="/mock/map.svg"
            alt="Recorrido del paseo por el Parque de Curridabat"
            className="h-[300px] w-full object-cover sm:h-[380px]"
          />
          <dl className="grid grid-cols-3 gap-2.5">
            {[
              { t: "Tiempo", v: "28 min" },
              { t: "Distancia", v: "2.1 km" },
              { t: "Ritmo", v: "4.5 km/h" },
            ].map((m) => (
              <div key={m.t} className="bg-surface px-5 py-4 text-center">
                <dt className="rotulo text-ink-mute">
                  {m.t}
                </dt>
                <dd className="nums mt-1.5 text-[20px] font-semibold text-ink">
                  {m.v}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <div className="flex flex-col gap-3">
        <Section title="Mascota" bodyClass="px-6 pb-5">
          <div className="flex items-center gap-4">
            <MockPhoto
              src="/mock/dog-rocky.jpg"
              alt="Foto de Rocky"
              className="h-16 w-16 flex-shrink-0"
            />
            <div>
              <p className="text-[15px] font-semibold text-ink">Rocky</p>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                Labrador · 28 kg · 3 años
              </p>
            </div>
          </div>
          <p className="mt-4 bg-sunken px-4 py-3 text-[12.5px] leading-snug text-ink-soft">
            Tira un poco de la correa al inicio. Muy sociable con otros perros.
          </p>
        </Section>

        <Section title="Acciones" bodyClass="px-6 pb-5">
          <div className="flex flex-col gap-2">
            <button type="button" className={`${btnSecondary} w-full`}>
              Enviar foto al dueño
            </button>
            <button type="button" className={`${btnSecondary} w-full`}>
              Reportar incidente
            </button>
            <button type="button" className={`${btnPrimary} w-full`}>
              Finalizar paseo
            </button>
          </div>
        </Section>

        <Section title="Bitácora" bodyClass="px-6 pb-5">
          <ol className="flex flex-col gap-3">
            {bitacora.map((b) => (
              <li key={b.hora} className="flex gap-3">
                <span className="nums w-11 flex-shrink-0 text-[12px] font-medium text-ink-mute">
                  {b.hora}
                </span>
                <span className="text-[12.5px] leading-snug text-ink-soft">
                  {b.texto}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  </Page>
);

/* ── Ganancias ───────────────────────────────────────────────── */

const filtrosIngreso = ["Todos", "Pendientes", "Pagados"];
const claveFiltroIngresoLabel: Record<string, string> = {
  Todos: "paseadorPanel.earnings.filters.all",
  Pendientes: "paseadorPanel.earnings.filters.pending",
  Pagados: "paseadorPanel.earnings.filters.paid",
};

export const GananciasPaseador = () => {
  const { t, localeTag } = useTranslation();
  const fechaIngreso = (fecha: string) =>
    new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(
      new Date(`${fecha}T00:00:00`),
    );
  const [filtro, setFiltro] = useState("Todos");
  const [ingresos, setIngresos] = useState<WalkerEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    listWalkerEarnings()
      .then(setIngresos)
      .catch((cause) => setError(cause instanceof Error ? cause.message : t("paseadorPanel.earnings.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const visibles = ingresos.filter((i) =>
    filtro === "Pendientes"
      ? i.estado_pago === "pendiente"
      : filtro === "Pagados"
        ? i.estado_pago === "pagado"
        : true
  );

  const pagados = ingresos.filter((i) => i.estado_pago === "pagado");
  const pendientes = ingresos.filter((i) => i.estado_pago === "pendiente");
  const totalNeto = visibles.reduce((s, i) => s + i.neto, 0);

  return (
    <Page>
      <PageHeader
        title={t("paseadorPanel.earnings.title")}
        subtitle={t("paseadorPanel.earnings.subtitle")}
        action={
          <span className="flex items-center gap-2 bg-sunken px-4 py-2.5 text-[13px] text-ink-soft">
            <Wallet size={15} strokeWidth={1.9} aria-hidden />
            {t("paseadorPanel.earnings.commission")}
          </span>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Stat etiqueta={t("paseadorPanel.earnings.stats.available")} valor={colones(pagados.reduce((sum, item) => sum + item.neto, 0))} nota={`${pagados.length} ${t("paseadorPanel.earnings.stats.paymentsSuffix")}`} />
        <Stat etiqueta={t("paseadorPanel.earnings.stats.pendingPayment")} valor={colones(pendientes.reduce((sum, item) => sum + item.neto, 0))} nota={`${pendientes.length} ${t("paseadorPanel.earnings.stats.walksSuffix")}`} />
        <Stat etiqueta={t("paseadorPanel.earnings.stats.deductedCommission")} valor={colones(pagados.reduce((sum, item) => sum + item.comision, 0))} nota="15%" />
      </div>

      <div className="bg-surface">
        <FilterTabs
          label={t("paseadorPanel.earnings.filters.label")}
          options={filtrosIngreso.map((o) => ({ value: o, label: t(claveFiltroIngresoLabel[o]) }))}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <Section bodyClass="">
        {error ? (
          <div role="alert" className="px-6 py-6 text-[13px] text-danger">{error}</div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-6 py-8 text-[13px] text-ink-soft">
            <Loader size={16} className="animate-spin" /> {t("paseadorPanel.earnings.loading")}
          </div>
        ) : visibles.length ? (
          <><Table
          caption={t("paseadorPanel.earnings.caption", { filtro: t(claveFiltroIngresoLabel[filtro]).toLowerCase() })}
          columnas={[
            { label: t("paseadorPanel.earnings.columns.date") },
            { label: t("paseadorPanel.earnings.columns.walk") },
            { label: t("paseadorPanel.earnings.columns.status") },
            { label: t("paseadorPanel.earnings.columns.gross"), align: "right" },
            { label: t("paseadorPanel.earnings.columns.commission"), align: "right" },
            { label: t("paseadorPanel.earnings.columns.net"), align: "right" },
          ]}
        >
          {visibles.map((i) => (
            <tr key={i.id_pago}>
              <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                {fechaIngreso(i.fecha)}
              </td>
              <td className="px-6 py-3.5">
                <p className="text-[13px] font-medium text-ink">{i.mascota}</p>
                <p className="text-[11.5px] text-ink-soft">{i.dueno}</p>
              </td>
              <td className="px-6 py-3.5">
                <Badge tono={i.estado_pago === "pagado" ? "ok" : "warn"}>
                  {i.estado_pago === "pagado" ? t("paseadorPanel.earnings.statusPaid") : t("paseadorPanel.earnings.statusPending")}
                </Badge>
              </td>
              <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                {colones(i.bruto)}
              </td>
              <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                −{colones(i.comision)}
              </td>
              <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                {colones(i.neto)}
              </td>
            </tr>
          ))}
        </Table>

        <div className="flex items-center justify-between bg-sunken px-6 py-3.5">
          <span className="text-[12.5px] font-medium text-ink-soft">
            {t("paseadorPanel.earnings.netOfSelection")}
          </span>
          <span className="nums text-[15px] font-semibold text-ink">
            {colones(totalNeto)}
          </span>
        </div>
        </>
        ) : (
          <EmptyState title={t("paseadorPanel.earnings.empty.title")} hint={t("paseadorPanel.earnings.empty.hint")} />
        )}
      </Section>
    </Page>
  );
};

/* ── Perfil público ──────────────────────────────────────────── */

const zonasDisponibles = ["Curridabat", "San Pedro", "Escazú", "Heredia", "Cartago"];
const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const PerfilPaseador = () => {
  const [zonas, setZonas] = useState(["Curridabat", "San Pedro"]);
  const [dias, setDias] = useState(["Lun", "Mar", "Mié", "Jue", "Vie"]);

  const alternar = (
    lista: string[],
    set: (v: string[]) => void,
    valor: string
  ) =>
    set(
      lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]
    );

  const etiqueta =
    "block rotulo text-ink-mute";

  return (
    <Page>
      <PageHeader
        title="Mi perfil"
        subtitle="Así te ven los dueños cuando buscan paseador."
        action={
          <button type="button" className={btnPrimary}>
            Guardar cambios
          </button>
        }
      />

      <Section title="Vista previa pública" bodyClass="px-6 pb-6">
        <div className="flex flex-wrap items-start gap-5 bg-sunken p-5">
          <Avatar nombre="María Fernández" size={64} />
          <div className="min-w-[200px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-semibold text-ink">
                María Fernández
              </h3>
              <Badge tono="ok">Verificada</Badge>
            </div>
            <div className="nums mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
              <Star size={13} className="fill-warn text-warn" aria-hidden />
              4.9 · 214 reseñas · 312 paseos
            </div>
            <p className="mt-3 text-[12.5px] leading-snug text-ink-soft">
              Paseos largos y reportes con foto al terminar. Especialista en
              razas grandes.
            </p>
          </div>
          <div className="bg-surface px-5 py-4 text-right">
            <p className="rotulo text-ink-mute">
              Tarifa base
            </p>
            <p className="nums mt-1 text-[22px] font-semibold text-ink">
              {colones(4500)}
            </p>
            <p className="text-[11.5px] text-ink-soft">por paseo de 45 min</p>
          </div>
        </div>
      </Section>

      <Section title="Datos del perfil" bodyClass="px-6 pb-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="tarifa" className={etiqueta}>
              Tarifa base por 45 min
            </label>
            <input
              id="tarifa"
              type="number"
              defaultValue={4500}
              className={`${input} nums mt-2`}
            />
          </div>
          <div>
            <label htmlFor="radio" className={etiqueta}>
              Radio de atención (km)
            </label>
            <input
              id="radio"
              type="number"
              defaultValue={5}
              className={`${input} nums mt-2`}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bio" className={etiqueta}>
              Descripción
            </label>
            <textarea
              id="bio"
              rows={3}
              defaultValue="Paseos largos y reportes con foto al terminar. Especialista en razas grandes."
              className={`${input} mt-2 resize-none`}
            />
          </div>
        </div>
      </Section>

      <Section title="Zonas que cubro" bodyClass="px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          {zonasDisponibles.map((z) => (
            <button
              key={z}
              type="button"
              aria-pressed={zonas.includes(z)}
              onClick={() => alternar(zonas, setZonas, z)}
              className={`rounded-full px-4 py-2.5 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                zonas.includes(z)
                  ? "bg-rail text-white"
                  : "bg-sunken text-ink-soft hover:bg-neutral-wash hover:text-ink"
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Días disponibles" bodyClass="px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          {diasSemana.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dias.includes(d)}
              onClick={() => alternar(dias, setDias, d)}
              className={`w-14 rounded-full py-2.5 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                dias.includes(d)
                  ? "bg-rail text-white"
                  : "bg-sunken text-ink-soft hover:bg-neutral-wash hover:text-ink"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </Section>
    </Page>
  );
};

/* ── Reseñas recibidas ───────────────────────────────────────── */

const recibidas = [
  {
    id: "R-214",
    dueno: "Ana Corrales",
    mascota: "Rocky",
    fecha: "15 ago",
    estrellas: 5,
    texto: "Ya es la quinta vez que pasea a Rocky. Confianza total.",
  },
  {
    id: "R-211",
    dueno: "Diego Solís",
    mascota: "Kira",
    fecha: "13 ago",
    estrellas: 5,
    texto: "Puntual y muy atenta. Kira llegó cansada y feliz.",
  },
  {
    id: "R-206",
    dueno: "Laura Vega",
    mascota: "Nube",
    fecha: "9 ago",
    estrellas: 4,
    texto: "Buen paseo. Me hubiera gustado recibir la foto un poco antes.",
  },
];

const distribucion = [
  { estrellas: 5, cantidad: 182 },
  { estrellas: 4, cantidad: 26 },
  { estrellas: 3, cantidad: 4 },
  { estrellas: 2, cantidad: 1 },
  { estrellas: 1, cantidad: 1 },
];

const totalResenas = distribucion.reduce((s, d) => s + d.cantidad, 0);

/* El número va junto a las estrellas: la forma sola no comunica el valor. */
const Estrellas = ({ valor }: { valor: number }) => (
  <span className="flex gap-0.5" aria-label={`${valor} de 5 estrellas`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={13}
        aria-hidden
        className={n <= valor ? "fill-warn text-warn" : "fill-neutral-wash text-neutral-wash"}
      />
    ))}
  </span>
);

export const ResenasPaseador = () => (
  <Page>
    <PageHeader
      title="Reseñas recibidas"
      subtitle="Lo que dicen los dueños después de cada paseo."
    />

    <div className="grid gap-3 lg:grid-cols-3">
      <Section title="Calificación" bodyClass="px-6 pb-6">
        <p className="nums text-[38px] leading-none font-semibold text-ink">4.9</p>
        <div className="mt-2 flex items-center gap-2">
          <Estrellas valor={5} />
          <span className="nums text-[12px] text-ink-soft">
            {totalResenas} reseñas
          </span>
        </div>

        <ul className="mt-5 flex flex-col gap-2">
          {distribucion.map((d) => (
            <li key={d.estrellas} className="flex items-center gap-3">
              <span className="nums w-7 flex-shrink-0 text-[12px] text-ink-soft">
                {d.estrellas} ★
              </span>
              <span className="h-2 flex-1 bg-sunken">
                <span
                  className="block h-full bg-accent"
                  style={{ width: `${(d.cantidad / totalResenas) * 100}%` }}
                />
              </span>
              <span className="nums w-8 flex-shrink-0 text-right text-[12px] text-ink-mute">
                {d.cantidad}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-col gap-3 lg:col-span-2">
        {recibidas.map((r) => (
          <article key={r.id} className="bg-surface px-6 py-5">
            <div className="flex items-start gap-4">
              <Avatar nombre={r.dueno} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[14px] font-semibold text-ink">{r.dueno}</h3>
                  <span className="nums text-[11.5px] text-ink-mute">{r.fecha}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  Paseo de {r.mascota}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Estrellas valor={r.estrellas} />
                  <span className="nums text-[12px] font-medium text-ink-soft">
                    {r.estrellas}.0
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
                  {r.texto}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </Page>
);
