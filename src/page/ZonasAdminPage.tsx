import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { createZona, deleteZona, getZonas } from "../services/auth.service";
import type { Zona } from "../types/auth.types";
import { EmptyState, Page, PageHeader, Section, Table, btnDanger, btnPrimary, input } from "../components/ui";

const provinciasBase = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"];
const normalizar = (valor: string) => valor.trim().toLocaleLowerCase("es");

const ZonasAdminPage = () => {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nombre, setNombre] = useState("");
  const [canton, setCanton] = useState("");
  const [provincia, setProvincia] = useState(provinciasBase[0]);
  const [busqueda, setBusqueda] = useState("");
  const [provinciaFiltro, setProvinciaFiltro] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const cargar = async () => setZonas(await getZonas());

  useEffect(() => {
    cargar().catch(() => setError("No se pudo cargar el catálogo de zonas")).finally(() => setLoading(false));
  }, []);

  const provincias = useMemo(() => ["Todas", ...new Set([...provinciasBase, ...zonas.map((zona) => zona.provincia)])], [zonas]);
  const visibles = zonas.filter((zona) =>
    (provinciaFiltro === "Todas" || zona.provincia === provinciaFiltro) &&
    normalizar(`${zona.nombre} ${zona.canton} ${zona.provincia}`).includes(normalizar(busqueda)),
  );

  const agregar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!nombre.trim() || !canton.trim() || !provincia.trim()) {
      setError("Completa zona, cantón y provincia");
      return;
    }
    const existe = zonas.some((zona) => normalizar(zona.canton) === normalizar(canton) && normalizar(zona.provincia) === normalizar(provincia));
    if (existe) {
      setError("Ese cantón ya existe en esa provincia");
      return;
    }
    setSaving(true);
    try {
      await createZona({ nombre: nombre.trim(), canton: canton.trim(), provincia: provincia.trim() });
      await cargar();
      setNombre("");
      setCanton("");
      setMessage("Zona agregada al catálogo");
    } catch {
      setError("No se pudo agregar la zona. Revisa que no exista un duplicado.");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (zona: Zona) => {
    if (!window.confirm(`¿Eliminar ${zona.nombre}, ${zona.canton}?`)) return;
    setError(null);
    try {
      await deleteZona(zona.id_zona);
      await cargar();
      setMessage("Zona eliminada");
    } catch {
      setError("No se puede eliminar porque la zona está en uso");
    }
  };

  return (
    <Page>
      <PageHeader title="Zonas" subtitle="Catálogo editable de ubicaciones disponibles para perfiles y registros." action={<span className="flex items-center gap-2 bg-accent-wash px-4 py-2.5 text-[13px] font-semibold text-accent-dark"><MapPin size={15} /> {zonas.length} zonas</span>} />
      <Section title="Agregar zona" bodyClass="px-4 pb-6 sm:px-6">
        <form onSubmit={agregar} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><label htmlFor="zona-nombre" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Nombre visible</label><input id="zona-nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} className={`${input} mt-2`} placeholder="Ej. San Pedro" maxLength={100} required /></div>
          <div><label htmlFor="zona-canton" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Cantón oficial</label><input id="zona-canton" value={canton} onChange={(event) => setCanton(event.target.value)} className={`${input} mt-2`} placeholder="Ej. Montes de Oca" maxLength={100} required /></div>
          <div><label htmlFor="zona-provincia" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Provincia</label><input id="zona-provincia" list="provincias" value={provincia} onChange={(event) => setProvincia(event.target.value)} className={`${input} mt-2`} maxLength={100} required /><datalist id="provincias">{provinciasBase.map((item) => <option key={item} value={item} />)}</datalist></div>
          <button type="submit" disabled={saving} className={`${btnPrimary} self-end`}><Plus size={15} /> {saving ? "Agregando..." : "Agregar zona"}</button>
        </form>
        <p className="mt-3 text-[12px] text-ink-mute">Puedes agregar nuevos cantones cuando sea necesario. Usa el nombre oficial para mantener el catálogo consistente.</p>
        <div aria-live="polite" className="mt-3 min-h-5 text-[13px]">{error && <p className="text-danger">{error}</p>}{message && <p className="text-ok">{message}</p>}</div>
      </Section>
      <Section title="Buscar zonas" bodyClass="px-4 py-4 sm:px-6"><div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_220px]"><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} className={input} placeholder="Buscar zona, cantón o provincia" aria-label="Buscar zonas" /><select value={provinciaFiltro} onChange={(event) => setProvinciaFiltro(event.target.value)} className={input} aria-label="Filtrar por provincia">{provincias.map((item) => <option key={item}>{item}</option>)}</select></div></Section>
      <Section title="Zonas registradas" aside={<span className="text-[12px] text-ink-mute">{visibles.length} resultados</span>} bodyClass="">{loading ? <p className="px-6 py-8 text-[13px] text-ink-soft">Cargando zonas...</p> : visibles.length === 0 ? <EmptyState title="No hay coincidencias" hint="Agrega una zona o cambia los filtros." /> : <Table caption="Zonas registradas" columnas={[{ label: "Zona" }, { label: "Cantón" }, { label: "Provincia" }, { label: "", align: "right" }]}>{visibles.map((zona) => <tr key={zona.id_zona}><td className="px-6 py-3.5 text-[13px] font-medium text-ink">{zona.nombre}</td><td className="px-6 py-3.5 text-[13px] text-ink-soft">{zona.canton}</td><td className="px-6 py-3.5 text-[13px] text-ink-soft">{zona.provincia}</td><td className="px-6 py-3 text-right"><button type="button" onClick={() => eliminar(zona)} className={btnDanger} aria-label={`Eliminar ${zona.nombre}`}><Trash2 size={14} /> Eliminar</button></td></tr>)}</Table>}</Section>
    </Page>
  );
};

export default ZonasAdminPage;
