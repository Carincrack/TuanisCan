import { Camera, MapPin, MessageCircle, Navigation, Phone, Siren, Timer } from "../lib/iconos";
import {
  Avatar,
  Badge,
  MockPhoto,
  Page,
  PageHeader,
  Section,
  btnDanger,
  btnSecondary,
} from "./ui";

const metricas = [
  { etiqueta: "Tiempo", valor: "28 min", nota: "de 45 min" },
  { etiqueta: "Distancia", valor: "2.1 km", nota: "recorridos" },
  { etiqueta: "Ritmo", valor: "4.5 km/h", nota: "promedio" },
];

const eventos = [
  { hora: "16:00", texto: "María recogió a Rocky en tu casa.", Icon: Navigation },
  { hora: "16:08", texto: "Salida hacia el Parque de Curridabat.", Icon: MapPin },
  { hora: "16:19", texto: "Foto enviada desde el parque.", Icon: Camera },
  { hora: "16:28", texto: "Pausa de agua. Todo en orden.", Icon: Timer },
];

const PaseoEnVivo = () => (
  <Page>
    <PageHeader
      title="Paseo en vivo"
      subtitle="Rocky está de paseo con María Fernández. Actualizado hace 30 segundos."
      action={<Badge tono="accent">En curso</Badge>}
    />

    <div className="grid gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section bodyClass="">
          <img
            src="/mock/map.svg"
            alt="Recorrido de Rocky por el Parque de Curridabat"
            className="h-[300px] w-full object-cover sm:h-[400px]"
          />
          <p className="bg-sunken px-6 py-3 text-[12.5px] text-ink-soft">
            Parque de Curridabat · a 900 m de casa
          </p>
          <dl className="grid grid-cols-3 gap-2.5">
            {metricas.map((m) => (
              <div key={m.etiqueta} className="bg-surface px-5 py-4 text-center">
                <dt className="rotulo text-ink-mute">
                  {m.etiqueta}
                </dt>
                <dd className="nums mt-1.5 text-[20px] font-semibold text-ink">
                  {m.valor}
                </dd>
                <p className="mt-0.5 text-[11.5px] text-ink-mute">{m.nota}</p>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <div className="flex flex-col gap-3">
        <Section title="Paseadora" bodyClass="px-6 pb-5">
          <div className="flex items-center gap-4">
            <Avatar nombre="María Fernández" size={48} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">María Fernández</p>
              <p className="nums mt-0.5 text-[12px] text-ink-soft">
                Verificada · 4.9 · 214 reseñas
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className={`${btnSecondary} w-full`}>
              <MessageCircle size={14} strokeWidth={1.9} />
              Enviar mensaje
            </button>
            <button type="button" className={`${btnSecondary} w-full`}>
              <Phone size={14} strokeWidth={1.9} />
              Llamar
            </button>
            <button type="button" className={`${btnDanger} w-full`}>
              <Siren size={14} strokeWidth={1.9} />
              Reportar emergencia
            </button>
          </div>
        </Section>

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
        </Section>

        <Section title="Actividad del paseo" bodyClass="px-6 pb-5">
          <ol className="flex flex-col gap-3">
            {eventos.map(({ hora, texto, Icon }) => (
              <li key={hora} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center bg-sunken text-ink-mute">
                  <Icon size={13} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] leading-snug text-ink-soft">{texto}</p>
                  <p className="nums mt-0.5 text-[11.5px] text-ink-mute">{hora}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  </Page>
);

export default PaseoEnVivo;
