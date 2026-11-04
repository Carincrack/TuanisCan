import { Footprints, MapPin, PawPrint, ShieldCheck, Siren, Store } from "../lib/iconos";
import { MARCA } from "../lib/nav";
import { Page, PageHeader, Section } from "../components/ui";
import { useTranslation } from "../hooks/useTranslation";

const publico = [
  { Icon: PawPrint, claveTitulo: "about.whoUses.owners.titulo", claveTexto: "about.whoUses.owners.texto" },
  { Icon: Footprints, claveTitulo: "about.whoUses.walkers.titulo", claveTexto: "about.whoUses.walkers.texto" },
  { Icon: Store, claveTitulo: "about.whoUses.businesses.titulo", claveTexto: "about.whoUses.businesses.texto" },
];

const pilares = [
  { Icon: ShieldCheck, claveTitulo: "about.howWeWork.verifiedWalkers.titulo", claveTexto: "about.howWeWork.verifiedWalkers.texto" },
  { Icon: MapPin, claveTitulo: "about.howWeWork.byZone.titulo", claveTexto: "about.howWeWork.byZone.texto" },
  { Icon: Siren, claveTitulo: "about.howWeWork.lostPetsNetwork.titulo", claveTexto: "about.howWeWork.lostPetsNetwork.texto" },
];

const AboutPage = () => {
  const { t } = useTranslation();

  return (
    <Page>
      <PageHeader
        title={t("about.title", { marca: MARCA.completo })}
        subtitle={t("about.subtitle")}
      />

      <Section title={t("about.whatIs.title")} bodyClass="px-6 pb-6">
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-soft">
          {t("about.whatIs.body", { marca: MARCA.completo })}
        </p>
      </Section>

      <Section title={t("about.whoUses.title")} bodyClass="px-6 pb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {publico.map((p) => (
            <div key={p.claveTitulo} className="bg-sunken p-5">
              <p.Icon size={20} strokeWidth={1.9} className="text-accent-dark" aria-hidden />
              <h3 className="mt-3 text-[14px] font-semibold text-ink">{t(p.claveTitulo)}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{t(p.claveTexto)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("about.howWeWork.title")} bodyClass="px-6 pb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {pilares.map((p) => (
            <div key={p.claveTitulo} className="flex items-start gap-3">
              <p.Icon size={16} strokeWidth={1.9} className="mt-0.5 flex-shrink-0 text-accent-dark" aria-hidden />
              <div>
                <h3 className="text-[13.5px] font-semibold text-ink">{t(p.claveTitulo)}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{t(p.claveTexto)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
};

export default AboutPage;
