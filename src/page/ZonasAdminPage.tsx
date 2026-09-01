import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { createZona, deleteZona, getZonas } from "../services/auth.service";
import type { Zona } from "../types/auth.types";
import {
  EmptyState,
  Page,
  PageHeader,
  Section,
  Table,
  btnDanger,
  btnPrimary,
  input,
} from "../components/ui";

const ubicacionesCostaRica: Record<string, string[]> = {
  "San José": [
    "San José",
    "Escazú",
    "Desamparados",
    "Puriscal",
    "Tarrazú",
    "Aserrí",
    "Mora",
    "Goicoechea",
    "Santa Ana",
    "Alajuelita",
    "Vázquez de Coronado",
    "Acosta",
    "Tibás",
    "Moravia",
    "Montes de Oca",
    "Turrubares",
    "Dota",
    "Curridabat",
    "Pérez Zeledón",
    "León Cortés Castro",
  ],
  Alajuela: [
    "Alajuela",
    "San Ramón",
    "Grecia",
    "San Mateo",
    "Atenas",
    "Naranjo",
    "Palmares",
    "Poás",
    "Orotina",
    "San Carlos",
    "Zarcero",
    "Sarchí",
    "Upala",
    "Los Chiles",
    "Guatuso",
    "Río Cuarto",
  ],
  Cartago: [
    "Cartago",
    "Paraíso",
    "La Unión",
    "Jiménez",
    "Turrialba",
    "Alvarado",
    "Oreamuno",
    "El Guarco",
  ],
  Heredia: [
    "Heredia",
    "Barva",
    "Santo Domingo",
    "Santa Bárbara",
    "San Rafael",
    "San Isidro",
    "Belén",
    "Flores",
    "San Pablo",
    "Sarapiquí",
  ],
  Guanacaste: [
    "Liberia",
    "Nicoya",
    "Santa Cruz",
    "Bagaces",
    "Carrillo",
    "Cañas",
    "Abangares",
    "Tilarán",
    "Nandayure",
    "La Cruz",
    "Hojancha",
  ],
  Puntarenas: [
    "Puntarenas",
    "Esparza",
    "Buenos Aires",
    "Montes de Oro",
    "Osa",
    "Quepos",
    "Golfito",
    "Coto Brus",
    "Parrita",
    "Corredores",
    "Garabito",
    "Monteverde",
    "Puerto Jiménez",
  ],
  Limón: [
    "Limón",
    "Pococí",
    "Siquirres",
    "Talamanca",
    "Matina",
    "Guácimo",
  ],
};

const provinciasBase = Object.keys(ubicacionesCostaRica);
const normalizar = (valor: string) =>
  valor
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");

const ZonasAdminPage = () => {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nombre, setNombre] = useState("");
  const [provincia, setProvincia] = useState("");
  const [canton, setCanton] = useState("");
  const [distrito, setDistrito] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [provinciaFiltro, setProvinciaFiltro] = useState("Todas");
  const [cantonFiltro, setCantonFiltro] = useState("Todos");
  const [distritoFiltro, setDistritoFiltro] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);

  const registrosPorPagina = 10;
  const cantonesDisponibles = ubicacionesCostaRica[provincia] ?? [];

  const distritosDisponibles = useMemo(() => {
    if (!provincia || !canton) return [];

    return zonas
      .filter(
        (zona) =>
          normalizar(zona.provincia) === normalizar(provincia) &&
          normalizar(zona.canton) === normalizar(canton),
      )
      .map((zona) => zona.distrito || "")
      .filter((item, index, items) => item && items.indexOf(item) === index)
      .sort();
  }, [zonas, provincia, canton]);

  const cargar = async () => {
    const data = await getZonas();
    setZonas(data);
  };

  useEffect(() => {
    cargar()
      .catch(() => setError("No se pudo cargar el catálogo de zonas"))
      .finally(() => setLoading(false));
  }, []);

  const cambiarProvincia = (nuevaProvincia: string) => {
    setProvincia(nuevaProvincia);
    setCanton("");
    setDistrito("");
  };

  const cambiarCanton = (nuevoCanton: string) => {
    setCanton(nuevoCanton);
    setDistrito("");
  };

  const limpiarFormulario = () => {
    setNombre("");
    setProvincia("");
    setCanton("");
    setDistrito("");
  };

  const abrirModalAgregar = () => {
    setError(null);
    setMessage(null);
    setModalAbierto(true);
  };

  const cerrarModalAgregar = () => {
    if (saving) return;

    setModalAbierto(false);
    setError(null);
    limpiarFormulario();
  };

  const provinciasFiltro = useMemo(() => {
    const provincias = zonas
      .map((zona) => zona.provincia)
      .filter((item, index, items) => item && items.indexOf(item) === index)
      .sort();

    return ["Todas", ...provincias];
  }, [zonas]);

  const cantonesFiltro = useMemo(() => {
    const cantones = zonas
      .filter(
        (zona) =>
          provinciaFiltro === "Todas" ||
          normalizar(zona.provincia) === normalizar(provinciaFiltro),
      )
      .map((zona) => zona.canton)
      .filter((item, index, items) => item && items.indexOf(item) === index)
      .sort();

    return ["Todos", ...cantones];
  }, [zonas, provinciaFiltro]);

  const distritosFiltro = useMemo(() => {
    const distritos = zonas
      .filter(
        (zona) =>
          (provinciaFiltro === "Todas" ||
            normalizar(zona.provincia) === normalizar(provinciaFiltro)) &&
          (cantonFiltro === "Todos" ||
            normalizar(zona.canton) === normalizar(cantonFiltro)),
      )
      .map((zona) => zona.distrito || "")
      .filter((item, index, items) => item && items.indexOf(item) === index)
      .sort();

    return ["Todos", ...distritos];
  }, [zonas, provinciaFiltro, cantonFiltro]);

  const visibles = zonas.filter((zona) => {
    const coincideProvincia =
      provinciaFiltro === "Todas" ||
      normalizar(zona.provincia) === normalizar(provinciaFiltro);
    const coincideCanton =
      cantonFiltro === "Todos" ||
      normalizar(zona.canton) === normalizar(cantonFiltro);
    const coincideDistrito =
      distritoFiltro === "Todos" ||
      normalizar(zona.distrito || "") === normalizar(distritoFiltro);
    const contenidoZona = normalizar(
      `${zona.nombre} ${zona.canton} ${zona.provincia} ${zona.distrito || ""}`,
    );

    return (
      coincideProvincia &&
      coincideCanton &&
      coincideDistrito &&
      contenidoZona.includes(normalizar(busqueda))
    );
  });

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, provinciaFiltro, cantonFiltro, distritoFiltro]);

  const cambiarProvinciaFiltro = (nuevaProvincia: string) => {
    setProvinciaFiltro(nuevaProvincia);
    setCantonFiltro("Todos");
    setDistritoFiltro("Todos");
  };

  const cambiarCantonFiltro = (nuevoCanton: string) => {
    setCantonFiltro(nuevoCanton);
    setDistritoFiltro("Todos");
  };

  const totalPaginas = Math.ceil(visibles.length / registrosPorPagina);
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const zonasPaginadas = visibles.slice(inicio, fin);

  const agregar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!nombre.trim()) {
      setError("Ingresa el nombre de la zona");
      return;
    }

    if (!provincia) {
      setError("Selecciona la provincia");
      return;
    }

    if (!canton) {
      setError("Selecciona el cantón");
      return;
    }

    if (!distrito) {
      setError("Selecciona el distrito");
      return;
    }

    const existe = zonas.some(
      (zona) =>
        normalizar(zona.nombre) === normalizar(nombre) &&
        normalizar(zona.distrito || "") === normalizar(distrito) &&
        normalizar(zona.canton) === normalizar(canton) &&
        normalizar(zona.provincia) === normalizar(provincia),
    );

    if (existe) {
      setError("Esa zona ya está registrada en ese distrito");
      return;
    }

    setSaving(true);

    try {
      await createZona({
        nombre: nombre.trim(),
        canton,
        provincia,
        distrito,
      });

      await cargar();
      limpiarFormulario();
      setModalAbierto(false);
      setMessage("Zona agregada correctamente al catálogo");
    } catch {
      setError("No se pudo agregar la zona. Revisa que no exista un duplicado.");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (zona: Zona) => {
    const confirmar = window.confirm(`Eliminar ${zona.nombre}, ${zona.canton}?`);

    if (!confirmar) return;

    setError(null);
    setMessage(null);

    try {
      await deleteZona(zona.id_zona);
      await cargar();
      setMessage("Zona eliminada correctamente");
    } catch {
      setError("No se puede eliminar porque la zona está en uso");
    }
  };

  return (
    <Page>
      <PageHeader
        title="Zonas"
        subtitle="Catálogo de zonas disponibles para perfiles y servicios."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 bg-accent-wash px-4 py-2.5 text-[13px] font-semibold text-accent-dark">
              <MapPin size={15} />
              {zonas.length} zonas
            </span>
            <button type="button" onClick={abrirModalAgregar} className={btnPrimary}>
              <Plus size={15} />
              Agregar zona
            </button>
          </div>
        }
      />

      <Section
        title="Zonas registradas"
        aside={
          <span className="text-[12px] text-ink-mute">
            {visibles.length} resultados
          </span>
        }
        bodyClass="px-4 py-4 sm:px-6"
      >
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px]">
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className={input}
            placeholder="Buscar zona, cantón o provincia"
            aria-label="Buscar zonas"
          />

          <select
            value={provinciaFiltro}
            onChange={(event) => cambiarProvinciaFiltro(event.target.value)}
            className={input}
            aria-label="Filtrar por provincia"
          >
            {provinciasFiltro.map((item) => (
              <option key={item} value={item}>
                {item === "Todas" ? "Todas las provincias" : item}
              </option>
            ))}
          </select>

          <select
            value={cantonFiltro}
            onChange={(event) => cambiarCantonFiltro(event.target.value)}
            className={input}
            aria-label="Filtrar por canton"
          >
            {cantonesFiltro.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todos los cantones" : item}
              </option>
            ))}
          </select>

          <select
            value={distritoFiltro}
            onChange={(event) => setDistritoFiltro(event.target.value)}
            className={input}
            aria-label="Filtrar por distrito"
          >
            {distritosFiltro.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todos los distritos" : item}
              </option>
            ))}
          </select>
        </div>

        <div aria-live="polite" className="min-h-5 py-3 text-[13px]">
          {message && <p className="text-ok">{message}</p>}
          {error && !modalAbierto && <p className="text-danger">{error}</p>}
        </div>

        {loading ? (
          <p className="py-8 text-[13px] text-ink-soft">Cargando zonas...</p>
        ) : visibles.length === 0 ? (
          <EmptyState
            title="No hay coincidencias"
            hint="Agrega una zona o cambia los filtros."
          />
        ) : (
          <>
            <Table
              caption="Zonas registradas"
              columnas={[
                { label: "Zona" },
                { label: "Provincia" },
                { label: "Cantón" },
                { label: "Distrito" },
                { label: "", align: "right" },
              ]}
            >
              {zonasPaginadas.map((zona) => (
                <tr key={zona.id_zona}>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center bg-accent-wash text-accent-dark">
                        <MapPin size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {zona.nombre}
                        </p>
                        <p className="mt-0.5 text-[12px] text-ink-mute">
                          {zona.distrito}, {zona.canton}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-[13px] font-medium text-ink-soft">
                    {zona.provincia}
                  </td>

                  <td className="px-6 py-4 text-[13px] text-ink-soft">
                    {zona.canton}
                  </td>

                  <td className="px-6 py-4 text-[13px] text-ink-soft">
                    {zona.distrito}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => eliminar(zona)}
                      className={btnDanger}
                      aria-label={`Eliminar ${zona.nombre}`}
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </Table>

            <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-ink-mute">
                Mostrando {inicio + 1} - {Math.min(fin, visibles.length)} de{" "}
                {visibles.length} zonas
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() =>
                    setPaginaActual((pagina) => Math.max(1, pagina - 1))
                  }
                  className={`${input} w-auto px-3 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Anterior
                </button>

                <span className="px-2 text-[13px] text-ink-soft">
                  Página {paginaActual} de {Math.max(totalPaginas, 1)}
                </span>

                <button
                  type="button"
                  disabled={paginaActual >= totalPaginas || totalPaginas === 0}
                  onClick={() =>
                    setPaginaActual((pagina) =>
                      Math.min(totalPaginas, pagina + 1),
                    )
                  }
                  className={`${input} w-auto px-3 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </Section>

      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cerrarModalAgregar();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-zona-title"
            className="w-full max-w-2xl bg-surface"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <h3
                  id="modal-zona-title"
                  className="text-[17px] font-semibold text-ink"
                >
                  Agregar zona
                </h3>
                <p className="mt-1 text-[13px] text-ink-soft">
                  Selecciona la ubicación y escribe el nombre visible.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalAgregar}
                className="inline-flex h-9 w-9 items-center justify-center bg-sunken text-ink-soft hover:bg-neutral-wash hover:text-ink"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={agregar} className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="zona-provincia"
                  className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase"
                >
                  Provincia
                </label>
                <select
                  id="zona-provincia"
                  value={provincia}
                  onChange={(event) => cambiarProvincia(event.target.value)}
                  className={`${input} mt-2`}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {provinciasBase.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="zona-canton"
                  className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase"
                >
                  Cantón
                </label>
                <select
                  id="zona-canton"
                  value={canton}
                  onChange={(event) => cambiarCanton(event.target.value)}
                  className={`${input} mt-2`}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {cantonesDisponibles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="zona-distrito"
                  className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase"
                >
                  Distrito
                </label>
                <select
                  id="zona-distrito"
                  value={distrito}
                  onChange={(event) => setDistrito(event.target.value)}
                  className={`${input} mt-2`}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {distritosDisponibles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="zona-nombre"
                  className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase"
                >
                  Nombre de la zona
                </label>
                <input
                  id="zona-nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className={`${input} mt-2`}
                  placeholder="Ej. Tamarindo"
                  maxLength={100}
                  required
                />
              </div>

              <div aria-live="polite" className="min-h-5 text-[13px] sm:col-span-2">
                {error && <p className="text-danger">{error}</p>}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalAgregar}
                  className="inline-flex items-center justify-center bg-neutral-wash px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-[#dcdfe2]"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  <Plus size={15} />
                  {saving ? "Agregando..." : "Crear zona"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Page>
  );
};

export default ZonasAdminPage;
