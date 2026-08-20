import { useState } from "react";
import { CalendarDays, Repeat } from "lucide-react";
import {
  Badge,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  Section,
  Table,
  btnPrimary,
  btnSecondary,
  colones,
} from "./ui";

interface Paseo {
  id: string;
  mascota: string;
  paseador: string;
  fecha: string;
  hora: string;
  duracion: string;
  zona: string;
  precio: number;
  estado: "Programado" | "En curso" | "Completado" | "Cancelado";
  recurrente: boolean;
}

const paseos: Paseo[] = [
  { id: "PS-0148", mascota: "Rocky", paseador: "María Fernández", fecha: "Hoy", hora: "16:00", duracion: "45 min", zona: "Curridabat", precio: 4500, estado: "En curso", recurrente: true },
  { id: "PS-0149", mascota: "Luna", paseador: "Luis Rojas", fecha: "Mañana", hora: "07:30", duracion: "60 min", zona: "Escazú", precio: 5200, estado: "Programado", recurrente: true },
  { id: "PS-0150", mascota: "Rocky", paseador: "María Fernández", fecha: "22 ago", hora: "16:00", duracion: "45 min", zona: "Curridabat", precio: 4500, estado: "Programado", recurrente: true },
  { id: "PS-0141", mascota: "Luna", paseador: "Carolina Mora", fecha: "17 ago", hora: "08:00", duracion: "60 min", zona: "Escazú", precio: 5200, estado: "Completado", recurrente: false },
  { id: "PS-0139", mascota: "Rocky", paseador: "María Fernández", fecha: "15 ago", hora: "16:00", duracion: "45 min", zona: "Curridabat", precio: 4500, estado: "Completado", recurrente: true },
  { id: "PS-0134", mascota: "Michi", paseador: "Luis Rojas", fecha: "12 ago", hora: "10:00", duracion: "30 min", zona: "Curridabat", precio: 3800, estado: "Cancelado", recurrente: false },
];

const tonoEstado = (e: Paseo["estado"]) =>
  e === "En curso"
    ? "accent"
    : e === "Programado"
      ? "ok"
      : e === "Cancelado"
        ? "danger"
        : "neutral";

const filtros = ["Próximos", "Historial", "Todos"];

const esProximo = (p: Paseo) => p.estado === "Programado" || p.estado === "En curso";

const Paseos = () => {
  const [filtro, setFiltro] = useState("Próximos");

  const visibles = paseos.filter((p) =>
    filtro === "Todos" ? true : filtro === "Próximos" ? esProximo(p) : !esProximo(p)
  );

  const total = visibles.reduce((s, p) => s + p.precio, 0);

  return (
    <Page>
      <PageHeader
        title="Paseos"
        subtitle="Agenda, seguimiento y historial de los paseos de tus mascotas."
        action={
          <button type="button" className={btnPrimary}>
            <CalendarDays size={15} strokeWidth={2} />
            Agendar paseo
          </button>
        }
      />

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar paseos"
          options={filtros}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <Section bodyClass="">
        {visibles.length > 0 ? (
          <>
            <Table
              caption={`Paseos filtrados por ${filtro.toLowerCase()}`}
              columnas={[
                { label: "Mascota" },
                { label: "Paseador" },
                { label: "Cuándo" },
                { label: "Zona" },
                { label: "Estado" },
                { label: "Precio", align: "right" },
                { label: "Acción", align: "right" },
              ]}
            >
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3.5">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-ink">
                        {p.mascota}
                      </span>
                      {p.recurrente && (
                        <Repeat
                          size={12}
                          strokeWidth={2}
                          className="text-ink-mute"
                          aria-label="Paseo recurrente"
                        />
                      )}
                    </span>
                    <span className="nums block text-[11.5px] text-ink-mute">
                      {p.id}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">
                    {p.paseador}
                  </td>
                  <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                    {p.fecha} · {p.hora}
                    <span className="block text-[11.5px] text-ink-mute">
                      {p.duracion}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{p.zona}</td>
                  <td className="px-6 py-3.5">
                    <Badge tono={tonoEstado(p.estado)}>{p.estado}</Badge>
                  </td>
                  <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                    {colones(p.precio)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button type="button" className={btnSecondary}>
                      {p.estado === "En curso" ? "Ver en vivo" : "Detalle"}
                    </button>
                  </td>
                </tr>
              ))}
            </Table>

            <div className="flex items-center justify-between bg-sunken px-6 py-3.5">
              <span className="text-[12.5px] font-medium text-ink-soft">
                {visibles.length} {visibles.length === 1 ? "paseo" : "paseos"}
              </span>
              <span className="nums text-[15px] font-semibold text-ink">
                {colones(total)}
              </span>
            </div>
          </>
        ) : (
          <EmptyState
            title="No hay paseos en esta vista"
            hint="Cambia el filtro o agenda un paseo nuevo."
          />
        )}
      </Section>
    </Page>
  );
};

export default Paseos;
