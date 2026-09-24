import { Footprints, MapPin, PawPrint, ShieldCheck, Siren, Store } from "../lib/iconos";
import { MARCA } from "../lib/nav";
import { Page, PageHeader, Section } from "../components/ui";

const publico = [
  {
    Icon: PawPrint,
    titulo: "Dueños",
    texto:
      "Registrá a tus mascotas con su historial de vacunas, buscá paseadores verificados de tu zona y seguí cada paseo en tiempo real.",
  },
  {
    Icon: Footprints,
    titulo: "Paseadores",
    texto:
      "Publicá tu disponibilidad, recibí solicitudes de dueños cercanos y llevá el control de tu agenda y tus ganancias en un solo lugar.",
  },
  {
    Icon: Store,
    titulo: "Negocios",
    texto:
      "Veterinarias, tiendas y refugios aparecen en el directorio de su zona para que la comunidad los encuentre fácilmente.",
  },
];

const pilares = [
  {
    Icon: ShieldCheck,
    titulo: "Paseadores verificados",
    texto: "Cada perfil pasa por una revisión de documentos antes de poder recibir solicitudes.",
  },
  {
    Icon: MapPin,
    titulo: "Todo por zona",
    texto: "Buscás y te encuentran paseadores, negocios y reportes de mascotas perdidas cerca de vos.",
  },
  {
    Icon: Siren,
    titulo: "Red de mascotas perdidas",
    texto: "Reportes con ubicación y avistamientos de la comunidad para reencontrar mascotas más rápido.",
  },
];

const AboutPage = () => (
  <Page>
    <PageHeader
      title={`Sobre ${MARCA.completo}`}
      subtitle="Una plataforma para conectar dueños, paseadores y negocios alrededor del cuidado de las mascotas."
    />

    <Section title="Qué es" bodyClass="px-6 pb-6">
      <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-soft">
        {MARCA.completo} conecta a dueños de mascotas con paseadores verificados de su zona,
        centraliza el historial de salud de cada mascota y ayuda a la comunidad a reportar y
        reencontrar mascotas perdidas. Todo desde una sola cuenta, sin importar el rol con el
        que entrés.
      </p>
    </Section>

    <Section title="Quién la usa" bodyClass="px-6 pb-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {publico.map((p) => (
          <div key={p.titulo} className="bg-sunken p-5">
            <p.Icon size={20} strokeWidth={1.9} className="text-accent-dark" aria-hidden />
            <h3 className="mt-3 text-[14px] font-semibold text-ink">{p.titulo}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{p.texto}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section title="Cómo trabajamos" bodyClass="px-6 pb-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {pilares.map((p) => (
          <div key={p.titulo} className="flex items-start gap-3">
            <p.Icon size={16} strokeWidth={1.9} className="mt-0.5 flex-shrink-0 text-accent-dark" aria-hidden />
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink">{p.titulo}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{p.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  </Page>
);

export default AboutPage;
