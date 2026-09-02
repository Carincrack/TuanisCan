import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { listPets } from "../services/pets.service";
import { listWalksWithRelations, getWalkStats, isUpcoming } from "../services/walks.service";
import type { WalkWithRelations } from "../services/walks.service";
import type { Pet } from "../types/pet.types";
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
  btnPrimary,
  btnSecondary,
  colones,
  fieldLabel,
} from "./ui";
import { Combo } from "./Combo";

const filtros = ["Próximos", "Historial", "Todos"];

const formatoFecha = (fecha: string) =>
  new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${fecha}T00:00:00`));

const tonoEstado = (estado: string) => {
  switch (estado) {
    case "solicitado":
      return "warn";
    case "confirmado":
      return "ok";
    case "en_curso":
      return "accent";
    case "finalizado":
      return "neutral";
    case "cancelado":
      return "danger";
    default:
      return "neutral";
  }
};

const labelEstado = (estado: string) => {
  switch (estado) {
    case "solicitado":
      return "Solicitado";
    case "confirmado":
      return "Confirmado";
    case "en_curso":
      return "En curso";
    case "finalizado":
      return "Completado";
    case "cancelado":
      return "Cancelado";
    default:
      return estado;
  }
};

const messageFrom = (cause: unknown) =>
  cause instanceof Error
    ? cause.message
    : typeof cause === "object" && cause && "message" in cause
      ? String((cause as { message: string }).message)
      : "No se pudieron cargar los paseos.";

const Paseos = () => {
  const { user } = useAuth();
  const [walks, setWalks] = useState<WalkWithRelations[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [filtro, setFiltro] = useState("Próximos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      const [walksData, petsData] = await Promise.all([
        listWalksWithRelations(user.id),
        listPets(),
      ]);
      setWalks(walksData);
      setPets(petsData);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const petOptions = useMemo(
    () => [
      { value: "", label: "Todas mis mascotas" },
      ...pets.map((p) => ({ value: p.id_mascota, label: p.nombre })),
    ],
    [pets]
  );

  const filteredWalks = useMemo(() => {
    let result = selectedPetId
      ? walks.filter((w) => w.mascota?.id_mascota === selectedPetId)
      : walks;

    if (filtro === "Próximos") {
      result = result.filter((w) => isUpcoming(w as { estado: string }));
    } else if (filtro === "Historial") {
      result = result.filter((w) => !isUpcoming(w as { estado: string }));
    }

    return result;
  }, [filtro, selectedPetId, walks]);

  const stats = useMemo(() => {
    const allWalks = selectedPetId
      ? walks.filter((w) => w.mascota?.id_mascota === selectedPetId)
      : walks;
    return getWalkStats(allWalks as never[]);
  }, [selectedPetId, walks]);

  const total = useMemo(
    () => filteredWalks.filter((w) => w.estado === "finalizado").reduce((s, w) => s + w.precio, 0),
    [filteredWalks]
  );

  const selectedPet = selectedPetId
    ? pets.find((p) => p.id_mascota === selectedPetId) ?? null
    : null;

  return (
    <Page>
      <PageHeader
        title="Paseos"
        subtitle={
          loading
            ? "Cargando..."
            : selectedPet
              ? `Paseos de ${selectedPet.nombre}`
              : "Agenda, seguimiento e historial de los paseos de tus mascotas."
        }
        action={
          <button type="button" className={btnPrimary}>
            <CalendarDays size={15} strokeWidth={2} />
            Agendar paseo
          </button>
        }
      />

      <section className="bg-surface p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className={fieldLabel}>
            Mascota
            <Combo
              value={selectedPetId}
              onChange={setSelectedPetId}
              options={petOptions}
              placeholder="Todas mis mascotas"
            />
          </label>
          <FilterTabs
            label="Filtrar paseos"
            options={filtros}
            value={filtro}
            onChange={setFiltro}
          />
        </div>
      </section>

      {error && (
        <div role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-surface px-6 py-12 text-center text-[13px] text-ink-soft">
          Cargando paseos...
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              etiqueta="Total de paseos"
              valor={String(stats.total)}
              nota={`${stats.completed} completados`}
            />
            <Stat
              etiqueta="Paseos completados"
              valor={String(stats.completed)}
            />
            <Stat
              etiqueta="Paseos próximos"
              valor={String(stats.upcoming)}
            />
            <Stat
              etiqueta="Total gastado"
              valor={colones(stats.totalSpent)}
              nota="en paseos completados"
            />
          </div>

          <Section bodyClass="">
            {filteredWalks.length > 0 ? (
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
                  {filteredWalks.map((p) => (
                    <tr key={p.id_paseo}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.mascota?.fotoUrl ? (
                            <MockPhoto
                              src={p.mascota.fotoUrl}
                              alt={p.mascota.nombre}
                              className="h-10 w-10"
                            />
                          ) : (
                            <Avatar nombre={p.mascota?.nombre ?? "M"} size={40} />
                          )}
                          <div>
                            <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                              {p.mascota?.nombre ?? "Sin nombre"}
                            </span>
                            <span className="nums block text-[11.5px] text-ink-mute">
                              {p.id_paseo.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {p.paseador ? (
                          <div className="flex items-center gap-2">
                            {p.paseador.fotoUrl ? (
                              <img
                                src={p.paseador.fotoUrl}
                                alt={p.paseador.nombre ?? ""}
                                className="h-7 w-7 rounded-full object-cover"
                              />
                            ) : (
                              <Avatar nombre={p.paseador.nombre ?? "P"} size={28} />
                            )}
                            <span className="text-[12.5px] text-ink-soft">
                              {p.paseador.nombre ?? "Sin asignar"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12.5px] text-ink-mute">
                            Sin asignar
                          </span>
                        )}
                      </td>
                      <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                        {formatoFecha(p.fecha)} · {p.hora_inicio.slice(0, 5)}
                        <span className="block text-[11.5px] text-ink-mute">
                          {p.duracion_min} min
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">
                        {p.zona?.nombre ?? "Sin zona"}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge tono={tonoEstado(p.estado)}>
                          {labelEstado(p.estado)}
                        </Badge>
                      </td>
                      <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                        {colones(p.precio)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button type="button" className={btnSecondary}>
                          {p.estado === "en_curso"
                            ? "Ver en vivo"
                            : "Detalle"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </Table>

                <div className="flex items-center justify-between bg-sunken px-6 py-3.5">
                  <span className="text-[12.5px] font-medium text-ink-soft">
                    {filteredWalks.length}{" "}
                    {filteredWalks.length === 1 ? "paseo" : "paseos"}
                  </span>
                  <span className="nums text-[15px] font-semibold text-ink">
                    {colones(total)}
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                title="No hay paseos en esta vista"
                hint={
                  selectedPetId
                    ? `${selectedPet?.nombre} no tiene paseos ${
                        filtro === "Próximos"
                          ? "programados"
                          : filtro === "Historial"
                            ? "anteriores"
                            : ""
                      }. Prueba con otro filtro o mascota.`
                    : "Cambia el filtro o agenda un paseo nuevo."
                }
              />
            )}
          </Section>
        </>
      )}
    </Page>
  );
};

export default Paseos;
