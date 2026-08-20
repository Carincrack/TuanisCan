import { useState } from "react";
import { Clock, Eye, MapPin, Phone, Siren } from "lucide-react";
import {
  Badge,
  EmptyState,
  FilterTabs,
  MockPhoto,
  Page,
  PageHeader,
  btnPrimary,
  btnSecondary,
  colones,
} from "./ui";

interface Reporte {
  id: string;
  nombre: string;
  especie: "Perro" | "Gato";
  raza: string;
  foto: string;
  zona: string;
  visto: string;
  contacto: string;
  recompensa: number | null;
  estado: "Perdida" | "Encontrada";
  senas: string;
}

const reportes: Reporte[] = [
  {
    id: "MP-021",
    nombre: "Nala",
    especie: "Perro",
    raza: "Golden Retriever",
    foto: "/mock/dog-nala.jpg",
    zona: "Curridabat",
    visto: "Hace 3 horas",
    contacto: "8712-4490",
    recompensa: 50000,
    estado: "Perdida",
    senas: "Collar rojo, cicatriz en la pata trasera izquierda.",
  },
  {
    id: "MP-020",
    nombre: "Pelusa",
    especie: "Gato",
    raza: "Británico de pelo corto",
    foto: "/mock/cat-2.jpg",
    zona: "Escazú",
    visto: "Ayer, 19:40",
    contacto: "6033-1178",
    recompensa: 25000,
    estado: "Perdida",
    senas: "Pelaje crema, ojos ámbar, sin collar.",
  },
  {
    id: "MP-019",
    nombre: "Toby",
    especie: "Perro",
    raza: "Mestizo pequeño",
    foto: "/mock/dog-toby.jpg",
    zona: "Heredia",
    visto: "16 ago, 08:15",
    contacto: "8890-2231",
    recompensa: null,
    estado: "Perdida",
    senas: "Café con manchas blancas, muy asustadizo.",
  },
  {
    id: "MP-017",
    nombre: "Simba",
    especie: "Gato",
    raza: "Naranja atigrado",
    foto: "/mock/cat-3.jpg",
    zona: "Cartago",
    visto: "14 ago, 12:00",
    contacto: "7012-8845",
    recompensa: null,
    estado: "Encontrada",
    senas: "Apareció a dos cuadras. Gracias a la comunidad.",
  },
];

const filtros = ["Todas", "Perdidas", "Encontradas", "Mi zona"];

const MascotasPerdidas = () => {
  const [filtro, setFiltro] = useState("Todas");

  const visibles = reportes.filter((r) => {
    if (filtro === "Perdidas") return r.estado === "Perdida";
    if (filtro === "Encontradas") return r.estado === "Encontrada";
    if (filtro === "Mi zona") return r.zona === "Curridabat";
    return true;
  });

  return (
    <Page>
      <PageHeader
        title="Mascotas perdidas"
        subtitle="Reportes activos de la comunidad. Cada aviso llega a los usuarios de la zona."
        action={
          <button type="button" className={btnPrimary}>
            <Siren size={15} strokeWidth={2} />
            Reportar mascota perdida
          </button>
        }
      />

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar reportes"
          options={filtros}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((r) => (
          <article key={r.id} className="flex flex-col bg-surface">
            <div className="relative">
              <MockPhoto src={r.foto} alt={`Foto de ${r.nombre}`} />
              <span className="absolute top-0 left-0">
                <Badge tono={r.estado === "Perdida" ? "danger" : "ok"}>
                  {r.estado}
                </Badge>
              </span>
            </div>

            <div className="flex flex-1 flex-col px-5 py-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[16px] font-semibold text-ink">{r.nombre}</h3>
                <span className="text-[11.5px] text-ink-mute">{r.especie}</span>
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{r.raza}</p>

              {r.recompensa && (
                <p className="nums mt-3 bg-warn-wash px-3 py-1.5 text-[12px] font-semibold text-warn">
                  Recompensa {colones(r.recompensa)}
                </p>
              )}

              <dl className="mt-3 flex flex-col gap-1.5 text-[12.5px] text-ink-soft">
                <div className="flex items-center gap-2">
                  <MapPin size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" />
                  <dd>Visto en {r.zona}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" />
                  <dd className="nums">{r.visto}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" />
                  <dd className="nums">{r.contacto}</dd>
                </div>
              </dl>

              <p className="mt-3 text-[12.5px] leading-snug text-ink-soft">{r.senas}</p>

              <div className="mt-auto pt-4">
                <button
                  type="button"
                  disabled={r.estado === "Encontrada"}
                  className={`${btnSecondary} w-full disabled:cursor-default disabled:opacity-45 disabled:hover:bg-neutral-wash`}
                >
                  <Eye size={14} strokeWidth={1.9} />
                  {r.estado === "Encontrada" ? "Caso cerrado" : "Vi a esta mascota"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {visibles.length === 0 && (
        <EmptyState
          title="Sin reportes en este filtro"
          hint="Buenas noticias. Prueba con otro filtro para ver el resto."
        />
      )}
    </Page>
  );
};

export default MascotasPerdidas;
