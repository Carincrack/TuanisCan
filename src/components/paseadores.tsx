import { useState } from "react";
import { BadgeCheck, MapPin, Search, Star } from "lucide-react";
import {
  Badge,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  btnPrimary,
  btnSecondary,
  colones,
  input,
} from "./ui";

interface Paseador {
  nombre: string;
  foto: string;
  zona: string;
  rating: number;
  resenas: number;
  precio: number;
  disponible: string;
  verificada: boolean;
  nota: string;
}

const walkers: Paseador[] = [
  { nombre: "María Fernández", foto: "/mock/walker-1.jpg", zona: "Curridabat", rating: 4.9, resenas: 214, precio: 4500, disponible: "Hoy", verificada: true, nota: "Paseos largos y reportes con foto al terminar." },
  { nombre: "Luis Rojas", foto: "/mock/walker-2.jpg", zona: "Heredia", rating: 4.8, resenas: 187, precio: 3800, disponible: "Hoy", verificada: true, nota: "Especialista en razas grandes y cachorros." },
  { nombre: "Carolina Mora", foto: "/mock/walker-3.jpg", zona: "Escazú", rating: 4.9, resenas: 156, precio: 5200, disponible: "Mañana", verificada: true, nota: "Rutas de montaña y paseos de 60 minutos." },
  { nombre: "Andrés Blanco", foto: "/mock/walker-4.jpg", zona: "Cartago", rating: 4.6, resenas: 92, precio: 3500, disponible: "Hoy", verificada: false, nota: "Disponible en horarios de la tarde." },
  { nombre: "Valeria Chacón", foto: "/mock/walker-5.jpg", zona: "Escazú", rating: 4.7, resenas: 118, precio: 4800, disponible: "Jueves", verificada: true, nota: "Atiende perros mayores y con movilidad reducida." },
  { nombre: "Jorge Salas", foto: "/mock/walker-6.jpg", zona: "Curridabat", rating: 4.5, resenas: 73, precio: 3900, disponible: "Hoy", verificada: false, nota: "Paseos grupales de máximo tres perros." },
];

const zonas = ["Todas", "Curridabat", "Heredia", "Escazú", "Cartago"];

const Paseadores = () => {
  const [zona, setZona] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");

  const q = busqueda.trim().toLowerCase();
  const visibles = walkers.filter(
    (w) =>
      (zona === "Todas" || w.zona === zona) &&
      (q === "" ||
        w.nombre.toLowerCase().includes(q) ||
        w.zona.toLowerCase().includes(q))
  );

  return (
    <Page>
      <PageHeader
        title="Buscar paseadores"
        subtitle="Perfiles verificados cerca de tu zona, con calificación de la comunidad."
      />

      <div className="flex flex-col gap-3 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-[300px]">
          <label htmlFor="buscar-paseador" className="sr-only">
            Buscar paseador por nombre o zona
          </label>
          <input
            id="buscar-paseador"
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

        <FilterTabs label="Filtrar por zona" options={zonas} value={zona} onChange={setZona} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((w) => (
          <article key={w.nombre} className="flex flex-col bg-surface px-5 py-5">
            <div className="flex items-start gap-4">
              <img
                src={w.foto}
                alt=""
                aria-hidden
                className="h-12 w-12 flex-shrink-0 bg-sunken object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-[15px] font-semibold text-ink">
                    {w.nombre}
                  </h3>
                  {w.verificada && (
                    <BadgeCheck
                      size={15}
                      strokeWidth={2}
                      className="flex-shrink-0 text-accent"
                      aria-label="Paseador verificado"
                    />
                  )}
                </div>

                <p className="nums mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                  <Star size={13} className="fill-warn text-warn" aria-hidden />
                  <span className="font-semibold text-ink">{w.rating}</span>
                  <span className="text-ink-mute">({w.resenas} reseñas)</span>
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                  <MapPin size={13} strokeWidth={1.9} aria-hidden className="text-ink-mute" />
                  {w.zona}
                </p>
              </div>
            </div>

            <p className="mt-4 text-[12.5px] leading-snug text-ink-soft">{w.nota}</p>

            <div className="mt-4 flex items-end justify-between gap-3 bg-sunken px-4 py-3">
              <div>
                <p className="nums text-[17px] font-semibold text-ink">
                  {colones(w.precio)}
                </p>
                <p className="text-[11px] text-ink-mute">por paseo</p>
              </div>
              <Badge tono={w.disponible === "Hoy" ? "ok" : "neutral"}>
                {w.disponible === "Hoy" ? "Disponible hoy" : `Desde ${w.disponible}`}
              </Badge>
            </div>

            <div className="mt-auto flex gap-px pt-4">
              <button type="button" className={`${btnSecondary} flex-1`}>
                Ver perfil
              </button>
              <button type="button" className={`${btnPrimary} flex-1`}>
                Solicitar paseo
              </button>
            </div>
          </article>
        ))}
      </div>

      {visibles.length === 0 && (
        <EmptyState
          title="No hay paseadores con ese criterio"
          hint="Prueba con otra zona o quita el filtro de búsqueda."
        />
      )}
    </Page>
  );
};

export default Paseadores;
