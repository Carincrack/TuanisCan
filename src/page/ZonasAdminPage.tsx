import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import {
  createZona,
  deleteZona,
  getZonas,
} from "../services/auth.service";
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

/*
 * Catálogo de provincias y cantones de Costa Rica.
 *
 * La provincia y el cantón no se escriben manualmente.
 * El administrador únicamente selecciona ambos valores.
 *
 * Esto evita inconsistencias como:
 * - San Jose
 * - San José
 * - san jose
 */
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
  valor.trim().toLocaleLowerCase("es");

const ZonasAdminPage = () => {
  const [zonas, setZonas] = useState<Zona[]>([]);

  /*
   * Único dato que escribe el administrador.
   *
   * Ejemplos:
   * - Tamarindo
   * - San Pedro
   * - Guiones
   * - Playa Pelada
   */
  const [nombre, setNombre] = useState("");

  /*
   * Provincia seleccionada.
   */
  const [provincia, setProvincia] = useState(provinciasBase[0]);

  /*
   * Al iniciar seleccionamos automáticamente
   * el primer cantón de la primera provincia.
   */
  const [canton, setCanton] = useState(
    ubicacionesCostaRica[provinciasBase[0]][0],
  );

  const [busqueda, setBusqueda] = useState("");
  const [provinciaFiltro, setProvinciaFiltro] = useState("Todas");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /*
   * Estado de paginación.
   */
  const [paginaActual, setPaginaActual] = useState(1);

  /*
   * Cantidad de filas visibles por página.
   */
  const registrosPorPagina = 10;

  /*
   * Cantones disponibles según la provincia seleccionada.
   */
  const cantonesDisponibles =
    ubicacionesCostaRica[provincia] ?? [];

  /*
   * Carga todas las zonas desde el backend.
   */
  const cargar = async () => {
    const data = await getZonas();
    setZonas(data);
  };

  /*
   * Carga inicial.
   */
  useEffect(() => {
    cargar()
      .catch(() =>
        setError("No se pudo cargar el catálogo de zonas"),
      )
      .finally(() => setLoading(false));
  }, []);

  /*
   * Cuando cambia la provincia:
   *
   * 1. actualizamos la provincia,
   * 2. buscamos los cantones correspondientes,
   * 3. seleccionamos automáticamente el primero.
   */
  const cambiarProvincia = (nuevaProvincia: string) => {
    setProvincia(nuevaProvincia);

    const cantones =
      ubicacionesCostaRica[nuevaProvincia] ?? [];

    setCanton(cantones[0] ?? "");
  };

  /*
   * Provincias disponibles para el filtro de búsqueda.
   */
  const provinciasFiltro = useMemo(
    () => ["Todas", ...provinciasBase],
    [],
  );

  /*
   * Primero aplicamos filtros.
   *
   * La paginación se hace después de filtrar.
   */
  const visibles = zonas.filter((zona) => {
    const coincideProvincia =
      provinciaFiltro === "Todas" ||
      zona.provincia === provinciaFiltro;

    const contenidoZona = normalizar(
      `${zona.nombre} ${zona.canton} ${zona.provincia}`,
    );

    const coincideBusqueda = contenidoZona.includes(
      normalizar(busqueda),
    );

    return coincideProvincia && coincideBusqueda;
  });

  /*
   * Reiniciamos a página 1 cuando cambia:
   * - la búsqueda,
   * - el filtro de provincia.
   *
   * Esto evita quedar, por ejemplo, en página 5 cuando
   * el filtro solamente devuelve 1 página.
   */
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, provinciaFiltro]);

  /*
   * Cálculos de paginación.
   */
  const totalPaginas = Math.ceil(
    visibles.length / registrosPorPagina,
  );

  const inicio =
    (paginaActual - 1) * registrosPorPagina;

  const fin =
    inicio + registrosPorPagina;

  /*
   * Solamente las zonas que corresponden
   * a la página actualmente seleccionada.
   */
  const zonasPaginadas = visibles.slice(
    inicio,
    fin,
  );

  /*
   * Agrega una nueva zona.
   */
  const agregar = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError(null);
    setMessage(null);

    /*
     * Provincia y cantón vienen de los select,
     * por lo que solamente necesitamos validar
     * realmente el nombre ingresado.
     */
    if (!nombre.trim()) {
      setError("Ingresa el nombre de la zona");
      return;
    }

    /*
     * Permitimos varias zonas dentro del mismo cantón.
     *
     * Por ejemplo:
     *
     * Guanacaste
     * └── Santa Cruz
     *     ├── Tamarindo
     *     ├── Huacas
     *     └── Brasilito
     *
     * Por eso verificamos:
     *
     * nombre + cantón + provincia
     */
    const existe = zonas.some(
      (zona) =>
        normalizar(zona.nombre) === normalizar(nombre) &&
        normalizar(zona.canton) === normalizar(canton) &&
        normalizar(zona.provincia) ===
          normalizar(provincia),
    );

    if (existe) {
      setError(
        "Esa zona ya está registrada en ese cantón",
      );
      return;
    }

    setSaving(true);

    try {
      await createZona({
        nombre: nombre.trim(),
        canton,
        provincia,
      });

      await cargar();

      /*
       * Solamente limpiamos el nombre.
       *
       * Provincia y cantón se mantienen para que sea
       * cómodo agregar varias zonas del mismo lugar.
       */
      setNombre("");

      setMessage(
        "Zona agregada correctamente al catálogo",
      );
    } catch {
      setError(
        "No se pudo agregar la zona. Revisa que no exista un duplicado.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Elimina una zona.
   */
  const eliminar = async (zona: Zona) => {
    const confirmar = window.confirm(
      `¿Eliminar ${zona.nombre}, ${zona.canton}?`,
    );

    if (!confirmar) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await deleteZona(zona.id_zona);

      await cargar();

      setMessage("Zona eliminada correctamente");
    } catch {
      setError(
        "No se puede eliminar porque la zona está en uso",
      );
    }
  };

  return (
    <Page>
      {/* ENCABEZADO */}
      <PageHeader
        title="Zonas"
        subtitle="Catálogo de zonas disponibles para perfiles y servicios."
        action={
          <span className="flex items-center gap-2 bg-accent-wash px-4 py-2.5 text-[13px] font-semibold text-accent-dark">
            <MapPin size={15} />
            {zonas.length} zonas
          </span>
        }
      />

      {/* AGREGAR ZONA */}
      <Section
        title="Agregar zona"
        bodyClass="px-4 pb-6 sm:px-6"
      >
        <form
          onSubmit={agregar}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* PROVINCIA */}
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
              onChange={(event) =>
                cambiarProvincia(event.target.value)
              }
              className={`${input} mt-2`}
              required
            >
              {provinciasBase.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* CANTÓN */}
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
              onChange={(event) =>
                setCanton(event.target.value)
              }
              className={`${input} mt-2`}
              required
            >
              {cantonesDisponibles.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* NOMBRE */}
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
              onChange={(event) =>
                setNombre(event.target.value)
              }
              className={`${input} mt-2`}
              placeholder="Ej. Tamarindo"
              maxLength={100}
              required
            />
          </div>

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={saving}
            className={`${btnPrimary} self-end`}
          >
            <Plus size={15} />

            {saving
              ? "Agregando..."
              : "Agregar zona"}
          </button>
        </form>

        <p className="mt-3 text-[12px] text-ink-mute">
          Selecciona la provincia y el cantón.
          Solamente debes escribir el nombre de la zona.
        </p>

        <div
          aria-live="polite"
          className="mt-3 min-h-5 text-[13px]"
        >
          {error && (
            <p className="text-danger">
              {error}
            </p>
          )}

          {message && (
            <p className="text-ok">
              {message}
            </p>
          )}
        </div>
      </Section>

      {/* BUSCAR Y FILTRAR */}
      <Section
        title="Buscar zonas"
        bodyClass="px-4 py-4 sm:px-6"
      >
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_220px]">
          <input
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
            className={input}
            placeholder="Buscar zona, cantón o provincia"
            aria-label="Buscar zonas"
          />

          <select
            value={provinciaFiltro}
            onChange={(event) =>
              setProvinciaFiltro(event.target.value)
            }
            className={input}
            aria-label="Filtrar por provincia"
          >
            {provinciasFiltro.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* TABLA */}
      <Section
        title="Zonas registradas"
        aside={
          <span className="text-[12px] text-ink-mute">
            {visibles.length} resultados
          </span>
        }
        bodyClass=""
      >
        {loading ? (
          <p className="px-6 py-8 text-[13px] text-ink-soft">
            Cargando zonas...
          </p>
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
                { label: "Cantón" },
                { label: "Provincia" },
                {
                  label: "",
                  align: "right",
                },
              ]}
            >
              {zonasPaginadas.map((zona) => (
                <tr key={zona.id_zona}>
                  <td className="px-6 py-3.5 text-[13px] font-medium text-ink">
                    {zona.nombre}
                  </td>

                  <td className="px-6 py-3.5 text-[13px] text-ink-soft">
                    {zona.canton}
                  </td>

                  <td className="px-6 py-3.5 text-[13px] text-ink-soft">
                    {zona.provincia}
                  </td>

                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        eliminar(zona)
                      }
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

            {/* PAGINACIÓN */}
            <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              {/* INFORMACIÓN */}
              <p className="text-[12px] text-ink-mute">
                Mostrando{" "}
                {inicio + 1}
                {" - "}
                {Math.min(
                  fin,
                  visibles.length,
                )}{" "}
                de {visibles.length} zonas
              </p>

              {/* CONTROLES */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() =>
                    setPaginaActual(
                      (pagina) =>
                        Math.max(
                          1,
                          pagina - 1,
                        ),
                    )
                  }
                  className={`${input} w-auto px-3 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Anterior
                </button>

                <span className="px-2 text-[13px] text-ink-soft">
                  Página {paginaActual} de{" "}
                  {Math.max(
                    totalPaginas,
                    1,
                  )}
                </span>

                <button
                  type="button"
                  disabled={
                    paginaActual >=
                      totalPaginas ||
                    totalPaginas === 0
                  }
                  onClick={() =>
                    setPaginaActual(
                      (pagina) =>
                        Math.min(
                          totalPaginas,
                          pagina + 1,
                        ),
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
    </Page>
  );
};

export default ZonasAdminPage;