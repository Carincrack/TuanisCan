import { useState } from "react";
import { Star } from "lucide-react";
import {
  Avatar,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  Section,
  btnPrimary,
  btnSecondary,
} from "./ui";

interface Resena {
  id: string;
  paseador: string;
  mascota: string;
  fecha: string;
  estrellas: number;
  texto: string;
}

const escritas: Resena[] = [
  {
    id: "RS-088",
    paseador: "Carolina Mora",
    mascota: "Luna",
    fecha: "17 ago",
    estrellas: 5,
    texto:
      "Puntual y muy atenta. Mandó fotos durante todo el paseo y Luna volvió cansadísima, justo lo que necesitaba.",
  },
  {
    id: "RS-084",
    paseador: "María Fernández",
    mascota: "Rocky",
    fecha: "15 ago",
    estrellas: 5,
    texto: "Ya es la quinta vez que pasea a Rocky. Confianza total.",
  },
  {
    id: "RS-079",
    paseador: "Luis Rojas",
    mascota: "Michi",
    fecha: "8 ago",
    estrellas: 4,
    texto:
      "Buen trato, pero llegó 10 minutos tarde. Avisó por el chat, así que tampoco fue problema.",
  },
];

const pendientes = [
  { id: "PN-01", paseador: "María Fernández", mascota: "Rocky", fecha: "Hoy" },
  { id: "PN-02", paseador: "Luis Rojas", mascota: "Luna", fecha: "10 ago" },
];

const distribucion = [
  { estrellas: 5, cantidad: 2 },
  { estrellas: 4, cantidad: 1 },
  { estrellas: 3, cantidad: 0 },
  { estrellas: 2, cantidad: 0 },
  { estrellas: 1, cantidad: 0 },
];

const total = distribucion.reduce((s, d) => s + d.cantidad, 0);
const promedio = distribucion.reduce((s, d) => s + d.estrellas * d.cantidad, 0) / total;

/* El valor numérico acompaña siempre a las estrellas: la forma sola no
   comunica la calificación. */
const Estrellas = ({ valor }: { valor: number }) => (
  <span className="flex gap-0.5" aria-label={`${valor} de 5 estrellas`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={13}
        aria-hidden
        className={
          n <= valor ? "fill-warn text-warn" : "fill-neutral-wash text-neutral-wash"
        }
      />
    ))}
  </span>
);

const filtros = ["Escritas", "Pendientes"];

const Resenas = () => {
  const [filtro, setFiltro] = useState("Escritas");

  return (
    <Page>
      <PageHeader
        title="Reseñas"
        subtitle="Tu historial de calificaciones a paseadores y las que quedan pendientes."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Section title="Promedio que has dado" bodyClass="px-6 pb-6">
          <p className="nums text-[38px] leading-none font-semibold text-ink">
            {promedio.toFixed(1)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Estrellas valor={Math.round(promedio)} />
            <span className="nums text-[12px] text-ink-soft">
              {total} reseñas · {pendientes.length} pendientes
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
                    style={{ width: total ? `${(d.cantidad / total) * 100}%` : "0%" }}
                  />
                </span>
                <span className="nums w-4 flex-shrink-0 text-right text-[12px] text-ink-mute">
                  {d.cantidad}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="bg-surface">
            <FilterTabs
              label="Filtrar reseñas"
              options={filtros}
              value={filtro}
              onChange={setFiltro}
            />
          </div>

          {filtro === "Escritas" &&
            escritas.map((r) => (
              <article key={r.id} className="bg-surface px-6 py-5">
                <div className="flex items-start gap-4">
                  <Avatar nombre={r.paseador} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[14px] font-semibold text-ink">
                        {r.paseador}
                      </h3>
                      <span className="nums text-[11.5px] text-ink-mute">
                        {r.fecha}
                      </span>
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

                    <button type="button" className={`${btnSecondary} mt-4`}>
                      Editar reseña
                    </button>
                  </div>
                </div>
              </article>
            ))}

          {filtro === "Pendientes" &&
            pendientes.map((p) => (
              <article
                key={p.id}
                className="flex flex-wrap items-center gap-4 bg-surface px-6 py-5"
              >
                <Avatar nombre={p.paseador} size={40} />
                <div className="min-w-[140px] flex-1">
                  <h3 className="text-[14px] font-semibold text-ink">{p.paseador}</h3>
                  <p className="nums mt-0.5 text-[12.5px] text-ink-soft">
                    Paseo de {p.mascota} · {p.fecha}
                  </p>
                </div>
                <button type="button" className={`${btnPrimary} ml-auto`}>
                  <Star size={14} strokeWidth={2} />
                  Calificar
                </button>
              </article>
            ))}

          {filtro === "Pendientes" && pendientes.length === 0 && (
            <EmptyState
              title="No tienes reseñas pendientes"
              hint="Cuando termine un paseo, aparecerá aquí para calificarlo."
            />
          )}
        </div>
      </div>
    </Page>
  );
};

export default Resenas;
