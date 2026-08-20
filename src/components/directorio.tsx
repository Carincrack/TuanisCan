import { useState } from "react";
import {
  BadgeCheck,
  Clock,
  MapPin,
  Phone,
  Scissors,
  Search,
  Star,
  Stethoscope,
  Store,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  FilterTabs,
  MockPhoto,
  Page,
  PageHeader,
  btnSecondary,
  input,
} from "./ui";

type Categoria = "Veterinaria" | "Tienda" | "Grooming";

interface Comercio {
  nombre: string;
  categoria: Categoria;
  foto: string;
  zona: string;
  rating: number;
  resenas: number;
  horario: string;
  abierto: boolean;
  telefono: string;
  verificado: boolean;
  nota: string;
}

const comercios: Comercio[] = [
  { nombre: "Veterinaria San Rafael", categoria: "Veterinaria", foto: "/mock/local-1.svg", zona: "Curridabat", rating: 4.8, resenas: 132, horario: "8:00 – 18:00", abierto: true, telefono: "2271-4400", verificado: true, nota: "Urgencias 24/7 y vacunación a domicilio." },
  { nombre: "PetShop La Sabana", categoria: "Tienda", foto: "/mock/local-2.svg", zona: "San José", rating: 4.6, resenas: 88, horario: "9:00 – 20:00", abierto: true, telefono: "2233-1180", verificado: true, nota: "Alimento premium y envío el mismo día." },
  { nombre: "Spa Canino Escazú", categoria: "Grooming", foto: "/mock/local-3.svg", zona: "Escazú", rating: 4.9, resenas: 201, horario: "9:00 – 17:00", abierto: false, telefono: "2288-9012", verificado: true, nota: "Baño, corte de raza y limpieza dental." },
  { nombre: "Clínica Veterinaria Heredia", categoria: "Veterinaria", foto: "/mock/local-1.svg", zona: "Heredia", rating: 4.5, resenas: 64, horario: "7:30 – 17:30", abierto: true, telefono: "2260-7745", verificado: false, nota: "Cirugía, laboratorio y control de peso." },
  { nombre: "Mundo Mascota Cartago", categoria: "Tienda", foto: "/mock/local-2.svg", zona: "Cartago", rating: 4.3, resenas: 41, horario: "9:00 – 19:00", abierto: true, telefono: "2551-3390", verificado: false, nota: "Accesorios, juguetes y arena para gatos." },
  { nombre: "Peluquería Patitas", categoria: "Grooming", foto: "/mock/local-3.svg", zona: "Curridabat", rating: 4.7, resenas: 97, horario: "10:00 – 18:00", abierto: true, telefono: "2272-6621", verificado: true, nota: "Atiende gatos y razas pequeñas sin sedación." },
];

const iconoCategoria: Record<Categoria, typeof Store> = {
  Veterinaria: Stethoscope,
  Tienda: Store,
  Grooming: Scissors,
};

const categorias = ["Todas", "Veterinaria", "Tienda", "Grooming"];

const Directorio = () => {
  const [categoria, setCategoria] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");

  const q = busqueda.trim().toLowerCase();
  const visibles = comercios.filter(
    (c) =>
      (categoria === "Todas" || c.categoria === categoria) &&
      (q === "" ||
        c.nombre.toLowerCase().includes(q) ||
        c.zona.toLowerCase().includes(q))
  );

  return (
    <Page>
      <PageHeader
        title="Directorio"
        subtitle="Veterinarias, tiendas y grooming cerca de tu zona."
      />

      <div className="flex flex-col gap-3 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-[300px]">
          <label htmlFor="buscar-comercio" className="sr-only">
            Buscar comercio por nombre o zona
          </label>
          <input
            id="buscar-comercio"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o zona"
            className={`${input} pl-9`}
          />
          <Search
            size={15}
            strokeWidth={1.9}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-mute"
          />
        </div>

        <FilterTabs
          label="Filtrar por categoría"
          options={categorias}
          value={categoria}
          onChange={setCategoria}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((c) => {
          const Icon = iconoCategoria[c.categoria];
          return (
            <article key={c.nombre} className="flex flex-col bg-surface">
              <MockPhoto
                src={c.foto}
                alt={`Fachada de ${c.nombre}`}
                className="aspect-[16/9]"
              />

              <div className="flex flex-1 flex-col px-5 py-4">
                <div className="flex items-center gap-2">
                  <Icon
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden
                    className="flex-shrink-0 text-ink-mute"
                  />
                  <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                    {c.nombre}
                  </h3>
                  {c.verificado && (
                    <BadgeCheck
                      size={15}
                      strokeWidth={2}
                      className="flex-shrink-0 text-accent"
                      aria-label="Comercio verificado"
                    />
                  )}
                </div>

                <p className="nums mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                  <Star size={13} className="fill-warn text-warn" aria-hidden />
                  <span className="font-semibold text-ink">{c.rating}</span>
                  <span className="text-ink-mute">({c.resenas} reseñas)</span>
                </p>

                <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">{c.nota}</p>

                <dl className="mt-3 flex flex-col gap-1.5 text-[12.5px] text-ink-soft">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" />
                    <dd>{c.zona}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" />
                    <dd className="nums flex items-center gap-2">
                      {c.horario}
                      <Badge tono={c.abierto ? "ok" : "neutral"}>
                        {c.abierto ? "Abierto" : "Cerrado"}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" />
                    <dd className="nums">{c.telefono}</dd>
                  </div>
                </dl>

                <div className="mt-auto pt-4">
                  <button type="button" className={`${btnSecondary} w-full`}>
                    Ver ficha
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visibles.length === 0 && (
        <EmptyState
          title="Sin resultados"
          hint="Prueba con otro nombre, zona o categoría."
        />
      )}
    </Page>
  );
};

export default Directorio;
