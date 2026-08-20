import { Plus, Syringe } from "lucide-react";
import {
  Badge,
  MockPhoto,
  Page,
  PageHeader,
  btnPrimary,
  btnSecondary,
} from "./ui";

interface Mascota {
  nombre: string;
  especie: string;
  raza: string;
  edad: string;
  peso: string;
  zona: string;
  foto: string;
  estado: "Al día" | "Vacuna pendiente";
  nota: string;
}

const pets: Mascota[] = [
  {
    nombre: "Rocky",
    especie: "Perro",
    raza: "Labrador Retriever",
    edad: "3 años",
    peso: "28 kg",
    zona: "Curridabat",
    foto: "/mock/dog-rocky.jpg",
    estado: "Al día",
    nota: "Le encantan los paseos largos por la mañana.",
  },
  {
    nombre: "Michi",
    especie: "Gato",
    raza: "Doméstico pelo corto",
    edad: "2 años",
    peso: "4.2 kg",
    zona: "Curridabat",
    foto: "/mock/cat-1.jpg",
    estado: "Vacuna pendiente",
    nota: "Antirrábica vence el 28 de agosto.",
  },
  {
    nombre: "Luna",
    especie: "Perro",
    raza: "Border Collie",
    edad: "5 años",
    peso: "19 kg",
    zona: "Escazú",
    foto: "/mock/dog-luna.jpg",
    estado: "Al día",
    nota: "Necesita mucha actividad; ideal paseos de 60 min.",
  },
];

const Mascotas = () => (
  <Page>
    <PageHeader
      title="Mis mascotas"
      subtitle="Tres perfiles registrados en tu cuenta."
      action={
        <button type="button" className={btnPrimary}>
          <Plus size={15} strokeWidth={2} />
          Registrar mascota
        </button>
      }
    />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {pets.map((pet) => (
        <article key={pet.nombre} className="flex flex-col bg-surface">
          <div className="relative">
            <MockPhoto src={pet.foto} alt={`Foto de ${pet.nombre}`} />
            <span className="absolute top-0 left-0">
              <Badge tono={pet.estado === "Al día" ? "ok" : "warn"}>
                {pet.estado}
              </Badge>
            </span>
          </div>

          <div className="flex flex-1 flex-col px-5 py-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[16px] font-semibold text-ink">{pet.nombre}</h3>
              <span className="text-[11.5px] text-ink-mute">{pet.especie}</span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{pet.raza}</p>

            <dl className="mt-4 grid grid-cols-3 gap-px bg-canvas">
              {[
                { t: "Edad", v: pet.edad },
                { t: "Peso", v: pet.peso },
                { t: "Zona", v: pet.zona },
              ].map((d) => (
                <div key={d.t} className="bg-sunken px-3 py-2.5">
                  <dt className="text-[10px] tracking-[0.08em] text-ink-mute uppercase">
                    {d.t}
                  </dt>
                  <dd className="nums mt-1 truncate text-[12.5px] text-ink">{d.v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-snug text-ink-soft">
              {pet.estado === "Vacuna pendiente" && (
                <Syringe
                  size={13}
                  aria-hidden
                  className="mt-0.5 flex-shrink-0 text-warn"
                />
              )}
              {pet.nota}
            </p>

            <div className="mt-auto pt-4">
              <button type="button" className={`${btnSecondary} w-full`}>
                Ver perfil
              </button>
            </div>
          </div>
        </article>
      ))}

      <button
        type="button"
        className="flex min-h-[240px] flex-col items-center justify-center gap-3 bg-sunken text-ink-mute transition-colors duration-150 hover:bg-neutral-wash hover:text-ink"
      >
        <Plus size={22} strokeWidth={1.8} aria-hidden />
        <span className="text-[13px] font-medium">Registrar otra mascota</span>
      </button>
    </div>
  </Page>
);

export default Mascotas;
