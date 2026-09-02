import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  MapPin,
  Pause,
  Play,
  Star,
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
} from "./ui";
import {
  listWalkerRequests,
  respondWalkRequest,
  type WalkerRequest,
} from "../services/walk-requests.service";
import { useAuth } from "../hooks/useAuth";

/* ─────────────────────────────────────────────────────────────
   El lado del paseador. Es la contraparte del lado del dueño:
   donde el dueño pide un paseo, el paseador lo acepta, lo ejecuta
   y cobra. Todo con datos de maqueta.
   ───────────────────────────────────────────────────────────── */

interface Solicitud {
  id: string;
  dueno: string;
  mascota: string;
  raza: string;
  foto: string;
  cuando: string;
  duracion: string;
  zona: string;
  distancia: string;
  pago: number;
  nota: string;
}

const solicitudes: Solicitud[] = [
  {
    id: "SOL-311",
    dueno: "Ana Corrales",
    mascota: "Rocky",
    raza: "Labrador Retriever",
    foto: "/mock/dog-rocky.jpg",
    cuando: "Hoy · 16:00",
    duracion: "45 min",
    zona: "Curridabat",
    distancia: "1.2 km de ti",
    pago: 4500,
    nota: "Tira un poco de la correa al inicio. Muy sociable.",
  },
  {
    id: "SOL-310",
    dueno: "Diego Solís",
    mascota: "Kira",
    raza: "Jack Russell Terrier",
    foto: "/mock/dog-kira.jpg",
    cuando: "Mañana · 07:30",
    duracion: "60 min",
    zona: "Curridabat",
    distancia: "2.4 km de ti",
    pago: 5200,
    nota: "Necesita paseo largo. Ya conoce la ruta del parque.",
  },
  {
    id: "SOL-308",
    dueno: "Laura Vega",
    mascota: "Nube",
    raza: "Bulldog Francés",
    foto: "/mock/dog-nube.jpg",
    cuando: "22 ago · 10:00",
    duracion: "30 min",
    zona: "San Pedro",
    distancia: "3.8 km de ti",
    pago: 3800,
    nota: "Primera vez con la plataforma. Perro pequeño y tranquilo.",
  },
];

/* ── Panel ───────────────────────────────────────────────────── */

export const PanelPaseador = () => {
  const [disponible, setDisponible] = useState(true);

  return (
    <Page>
      <PageHeader
        title="Panel del paseador"
        subtitle="Miércoles 19 de agosto · Curridabat y alrededores"
        action={
          <button
            type="button"
            onClick={() => setDisponible(!disponible)}
            aria-pressed={disponible}
            className={disponible ? btnSecondary : btnPrimary}
          >
            {disponible ? (
              <>
                <Pause size={15} strokeWidth={2} />
                Dejar de recibir solicitudes
              </>
            ) : (
              <>
                <Play size={15} strokeWidth={2} />
                Ponerme disponible
              </>
            )}
          </button>
        }
      />

      <div className="bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <Badge tono={disponible ? "ok" : "neutral"}>
            {disponible ? "Disponible" : "No disponible"}
          </Badge>
          <p className="text-[13px] text-ink-soft">
            {disponible
              ? "Los dueños de tu zona pueden enviarte solicitudes."
              : "No recibirás solicitudes nuevas hasta que te actives."}
          </p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat etiqueta="Paseos hoy" valor="3" nota="1 en curso" />
        <Stat etiqueta="Ganado hoy" valor={colones(13700)} nota="antes de comisión" />
        <Stat etiqueta="Esta semana" valor={colones(38400)} nota="9 paseos" />
        <Stat etiqueta="Calificación" valor="4.9" nota="214 reseñas" />
      </div>

      <Section title="Paseo en curso" bodyClass="">
        <div className="flex flex-wrap items-center gap-5 px-6 pt-4 pb-6">
          <MockPhoto
            src="/mock/dog-rocky.jpg"
            alt="Foto de Rocky"
            className="h-20 w-20 flex-shrink-0"
          />
          <div className="min-w-[180px] flex-1">
            <p className="text-[16px] font-semibold text-ink">Rocky</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              Ana Corrales · Labrador Retriever
            </p>
            <div className="nums mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Clock size={13} strokeWidth={1.9} aria-hidden />
                28 de 45 min
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} strokeWidth={1.9} aria-hidden />
                Parque de Curridabat
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className={btnSecondary}>
              Enviar foto
            </button>
            <button type="button" className={btnPrimary}>
              Finalizar paseo
            </button>
          </div>
        </div>
      </Section>

      <Section title="Próximas solicitudes" bodyClass="">
        <Table
          caption="Solicitudes pendientes de responder"
          columnas={[
            { label: "Dueño y mascota" },
            { label: "Cuándo" },
            { label: "Zona" },
            { label: "Pago", align: "right" },
          ]}
        >
          {solicitudes.map((s) => (
            <tr key={s.id}>
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
                {s.cuando}
              </td>
              <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{s.zona}</td>
              <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                {colones(s.pago)}
              </td>
            </tr>
          ))}
        </Table>
      </Section>
    </Page>
  );
};

/* ── Solicitudes ─────────────────────────────────────────────── */

export const SolicitudesPaseador = () => {
  const { getProfile, isAdmin } = useAuth();
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
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las solicitudes.");
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, [getProfile, isAdmin]);

  const responder = async (solicitud: WalkerRequest, aprobada: boolean) => {
    if (!habilitado) {
      setError("Tenés que verificar tu perfil antes de responder solicitudes.");
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
      setMessage(
        aprobada
          ? `Solicitud de ${solicitud.mascota} aprobada.`
          : `Solicitud de ${solicitud.mascota} rechazada.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo responder la solicitud.");
    } finally {
      setSavingId(null);
    }
  };

  const formatoFecha = (fecha: string, hora: string) =>
    `${new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${fecha}T00:00:00`))} · ${hora.slice(0, 5)}`;

  return (
    <Page>
      <PageHeader
        title="Solicitudes"
        subtitle="Paseos que te ofrecieron los dueños de tu zona. Responde antes de 30 minutos."
      />

      {(error || message) && (
        <div aria-live="polite" className={`px-6 py-3 text-[13px] ${error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"}`}>
          {error ?? message}
        </div>
      )}

      {loading && (
        <p className="bg-surface px-6 py-8 text-[13px] text-ink-soft">
          Cargando solicitudes...
        </p>
      )}

      {!loading && pendientes.map((s) => (
        <article key={s.id_paseo} className="bg-surface">
          <div className="flex flex-wrap gap-5 px-6 py-5">
            {s.fotoUrl ? (
              <MockPhoto
                src={s.fotoUrl}
                alt={`Foto de ${s.mascota}`}
                className="h-28 w-28 flex-shrink-0"
              />
            ) : (
              <Avatar nombre={s.mascota} size={112} />
            )}

            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-semibold text-ink">{s.mascota}</h3>
                <Badge tono="warn">Pendiente</Badge>
              </div>
              <p className="mt-1 text-[12.5px] text-ink-soft">
                {s.raza} · dueño: {s.dueno}
              </p>

              <dl className="nums mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[12.5px]">
                <div>
                  <dt className="rotulo text-ink-mute">
                    Cuándo
                  </dt>
                  <dd className="mt-0.5 text-ink">{formatoFecha(s.fecha, s.hora_inicio)}</dd>
                </div>
                <div>
                  <dt className="rotulo text-ink-mute">
                    Duración
                  </dt>
                  <dd className="mt-0.5 text-ink">{s.duracion_min} min</dd>
                </div>
                <div>
                  <dt className="rotulo text-ink-mute">
                    Zona
                  </dt>
                  <dd className="mt-0.5 text-ink">
                    {s.zona}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 bg-sunken px-4 py-3 text-[12.5px] leading-snug text-ink-soft">
                {s.direccion_encuentro}
              </p>

              <label className="mt-4 block">
                <span className="rotulo text-ink-mute">Comentario para el dueño</span>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={comentarios[s.id_paseo] ?? ""}
                  onChange={(e) =>
                    setComentarios({
                      ...comentarios,
                      [s.id_paseo]: e.target.value,
                    })
                  }
                  className={`${input} mt-2 resize-y`}
                  placeholder="Opcional al aprobar o rechazar"
                />
              </label>
            </div>

            <div className="flex w-full flex-col justify-between gap-4 sm:w-[200px]">
              <div className="bg-sunken px-4 py-3 text-right">
                <p className="rotulo text-ink-mute">
                  Pago
                </p>
                <p className="nums mt-1 text-[22px] font-semibold text-ink">
                  {colones(s.precio)}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={savingId === s.id_paseo}
                  onClick={() => void responder(s, true)}
                  className={`${btnPrimary} w-full`}
                >
                  <Check size={15} strokeWidth={2.2} />
                  {savingId === s.id_paseo ? "Guardando..." : "Aceptar"}
                </button>
                <button
                  type="button"
                  disabled={savingId === s.id_paseo}
                  onClick={() => void responder(s, false)}
                  className={`${btnDanger} w-full`}
                >
                  <X size={15} strokeWidth={2.2} />
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}

      {!loading && pendientes.length === 0 && (
        <EmptyState
          title={
            habilitado
              ? "No tienes solicitudes pendientes"
              : "Todavía no aparecés en las búsquedas"
          }
          hint={
            habilitado
              ? "Cuando un dueño de tu zona te elija, la solicitud aparece aquí."
              : "Los dueños solo ven paseadores con la verificación aprobada. Completá tus documentos y esperá la revisión."
          }
        />
      )}
    </Page>
  );
};

/* ── Agenda ──────────────────────────────────────────────────── */

interface Cita {
  hora: string;
  mascota: string;
  dueno: string;
  zona: string;
  duracion: string;
  pago: number;
  estado: "Confirmado" | "En curso" | "Completado";
}

const agenda: Record<string, Cita[]> = {
  Hoy: [
    {
      hora: "09:00",
      mascota: "Nube",
      dueno: "Laura Vega",
      zona: "San Pedro",
      duracion: "30 min",
      pago: 3800,
      estado: "Completado",
    },
    {
      hora: "11:30",
      mascota: "Kira",
      dueno: "Diego Solís",
      zona: "Curridabat",
      duracion: "60 min",
      pago: 5200,
      estado: "Completado",
    },
    {
      hora: "16:00",
      mascota: "Rocky",
      dueno: "Ana Corrales",
      zona: "Curridabat",
      duracion: "45 min",
      pago: 4500,
      estado: "En curso",
    },
  ],
  Mañana: [
    {
      hora: "07:30",
      mascota: "Kira",
      dueno: "Diego Solís",
      zona: "Curridabat",
      duracion: "60 min",
      pago: 5200,
      estado: "Confirmado",
    },
    {
      hora: "15:00",
      mascota: "Luna",
      dueno: "Ana Corrales",
      zona: "Escazú",
      duracion: "60 min",
      pago: 5200,
      estado: "Confirmado",
    },
  ],
  "Viernes 21": [
    {
      hora: "08:00",
      mascota: "Rocky",
      dueno: "Ana Corrales",
      zona: "Curridabat",
      duracion: "45 min",
      pago: 4500,
      estado: "Confirmado",
    },
  ],
};

const tonoCita = (estado: Cita["estado"]) =>
  estado === "En curso" ? "accent" : estado === "Completado" ? "neutral" : "ok";

export const AgendaPaseador = () => {
  const dias = Object.keys(agenda);
  const [dia, setDia] = useState(dias[0]);
  const citas = agenda[dia];
  const total = citas.reduce((s, c) => s + c.pago, 0);

  return (
    <Page>
      <PageHeader
        title="Agenda"
        subtitle="Paseos que ya aceptaste, ordenados por hora."
      />

      <div className="bg-surface">
        <FilterTabs label="Elegir día" options={dias} value={dia} onChange={setDia} />
      </div>

      <Section bodyClass="">
        <Table
          caption={`Paseos agendados para ${dia}`}
          columnas={[
            { label: "Hora" },
            { label: "Mascota" },
            { label: "Zona" },
            { label: "Estado" },
            { label: "Pago", align: "right" },
          ]}
        >
          {citas.map((c) => (
            <tr key={c.hora + c.mascota}>
              <td className="nums px-6 py-3.5 text-[13px] font-semibold text-ink">
                {c.hora}
              </td>
              <td className="px-6 py-3.5">
                <p className="text-[13px] font-medium text-ink">{c.mascota}</p>
                <p className="text-[11.5px] text-ink-soft">
                  {c.dueno} · {c.duracion}
                </p>
              </td>
              <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{c.zona}</td>
              <td className="px-6 py-3.5">
                <Badge tono={tonoCita(c.estado)}>{c.estado}</Badge>
              </td>
              <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                {colones(c.pago)}
              </td>
            </tr>
          ))}
        </Table>

        <div className="flex items-center justify-between bg-sunken px-6 py-3.5">
          <span className="text-[12.5px] font-medium text-ink-soft">
            Total de {dia.toLowerCase()}
          </span>
          <span className="nums text-[15px] font-semibold text-ink">
            {colones(total)}
          </span>
        </div>
      </Section>
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

interface Ingreso {
  fecha: string;
  mascota: string;
  dueno: string;
  bruto: number;
  comision: number;
  estado: "Liquidado" | "Por liquidar";
}

const ingresos: Ingreso[] = [
  { fecha: "19 ago", mascota: "Nube", dueno: "Laura Vega", bruto: 3800, comision: 570, estado: "Por liquidar" },
  { fecha: "19 ago", mascota: "Kira", dueno: "Diego Solís", bruto: 5200, comision: 780, estado: "Por liquidar" },
  { fecha: "18 ago", mascota: "Rocky", dueno: "Ana Corrales", bruto: 4500, comision: 675, estado: "Por liquidar" },
  { fecha: "17 ago", mascota: "Luna", dueno: "Ana Corrales", bruto: 5200, comision: 780, estado: "Liquidado" },
  { fecha: "16 ago", mascota: "Kira", dueno: "Diego Solís", bruto: 5200, comision: 780, estado: "Liquidado" },
  { fecha: "15 ago", mascota: "Rocky", dueno: "Ana Corrales", bruto: 4500, comision: 675, estado: "Liquidado" },
];

const filtrosIngreso = ["Todos", "Por liquidar", "Liquidados"];

export const GananciasPaseador = () => {
  const [filtro, setFiltro] = useState("Todos");

  const visibles = ingresos.filter((i) =>
    filtro === "Por liquidar"
      ? i.estado === "Por liquidar"
      : filtro === "Liquidados"
        ? i.estado === "Liquidado"
        : true
  );

  const neto = (i: Ingreso) => i.bruto - i.comision;
  const totalNeto = visibles.reduce((s, i) => s + neto(i), 0);

  return (
    <Page>
      <PageHeader
        title="Ganancias"
        subtitle="Ingresos por paseo, comisión de la plataforma y liquidaciones."
        action={
          <span className="flex items-center gap-2 bg-sunken px-4 py-2.5 text-[13px] text-ink-soft">
            <Wallet size={15} strokeWidth={1.9} aria-hidden />
            Comisión 15%
          </span>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Stat etiqueta="Por liquidar" valor={colones(11730)} nota="3 paseos" />
        <Stat etiqueta="Liquidado en agosto" valor={colones(38400)} nota="9 paseos" />
        <Stat etiqueta="Próximo depósito" valor="21 ago" nota="viernes" />
      </div>

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar ingresos"
          options={filtrosIngreso}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <Section bodyClass="">
        <Table
          caption={`Ingresos filtrados por ${filtro.toLowerCase()}`}
          columnas={[
            { label: "Fecha" },
            { label: "Paseo" },
            { label: "Estado" },
            { label: "Bruto", align: "right" },
            { label: "Comisión", align: "right" },
            { label: "Neto", align: "right" },
          ]}
        >
          {visibles.map((i, idx) => (
            <tr key={i.fecha + i.mascota + idx}>
              <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                {i.fecha}
              </td>
              <td className="px-6 py-3.5">
                <p className="text-[13px] font-medium text-ink">{i.mascota}</p>
                <p className="text-[11.5px] text-ink-soft">{i.dueno}</p>
              </td>
              <td className="px-6 py-3.5">
                <Badge tono={i.estado === "Liquidado" ? "neutral" : "warn"}>
                  {i.estado}
                </Badge>
              </td>
              <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                {colones(i.bruto)}
              </td>
              <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                −{colones(i.comision)}
              </td>
              <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                {colones(neto(i))}
              </td>
            </tr>
          ))}
        </Table>

        <div className="flex items-center justify-between bg-sunken px-6 py-3.5">
          <span className="text-[12.5px] font-medium text-ink-soft">
            Neto de la selección
          </span>
          <span className="nums text-[15px] font-semibold text-ink">
            {colones(totalNeto)}
          </span>
        </div>
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
