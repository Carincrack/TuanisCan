import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
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

const provincias = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];

const ZonasAdminPage = () => {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nombre, setNombre] = useState("");
  const [canton, setCanton] = useState("");
  const [provincia, setProvincia] = useState(provincias[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const data = await getZonas();
    setZonas(data);
  };

  useEffect(() => {
    load()
      .catch(() => setError("No se pudieron cargar las zonas"))
      .finally(() => setLoading(false));
  }, []);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nombre.trim() || !canton.trim()) {
      setError("Completa el nombre y el cantón");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createZona({ nombre: nombre.trim(), canton: canton.trim(), provincia });
      await load();
      setNombre("");
      setCanton("");
      setMessage("Zona agregada al catálogo");
    } catch (saveError) {
      const detail = saveError instanceof Error ? saveError.message : "";
      setError(detail.includes("duplicate") ? "Esa zona ya existe" : "No se pudo agregar la zona");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (zona: Zona) => {
    if (!window.confirm(`¿Eliminar ${zona.nombre}, ${zona.canton}?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteZona(zona.id_zona);
      await load();
      setMessage("Zona eliminada");
    } catch {
      setError("No se puede eliminar porque la zona está en uso");
    }
  };

  return (
    <Page>
      <PageHeader
        title="Zonas"
        subtitle="Catálogo disponible en el registro y en los perfiles."
        action={<span className="flex items-center gap-2 bg-accent-wash px-4 py-2.5 text-[13px] font-semibold text-accent-dark"><MapPin size={15} /> {zonas.length} zonas</span>}
      />

      <Section title="Agregar zona" bodyClass="px-4 pb-6 sm:px-6">
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="zona-nombre" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Nombre de la zona</label>
            <input id="zona-nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} className={`${input} mt-2`} placeholder="Ej. San Pedro" maxLength={100} required />
          </div>
          <div>
            <label htmlFor="zona-canton" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Cantón</label>
            <input id="zona-canton" value={canton} onChange={(event) => setCanton(event.target.value)} className={`${input} mt-2`} placeholder="Ej. Montes de Oca" maxLength={100} required />
          </div>
          <div>
            <label htmlFor="zona-provincia" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Provincia</label>
            <select id="zona-provincia" value={provincia} onChange={(event) => setProvincia(event.target.value)} className={`${input} mt-2`}>
              {provincias.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className={`${btnPrimary} self-end`}><Plus size={15} /> {saving ? "Agregando..." : "Agregar zona"}</button>
        </form>
        <div aria-live="polite" className="mt-4 min-h-5 text-[13px]">
          {error && <p className="text-danger">{error}</p>}
          {message && <p className="text-ok">{message}</p>}
        </div>
      </Section>

      <Section title="Zonas disponibles" bodyClass="">
        {loading ? (
          <p className="px-6 py-8 text-[13px] text-ink-soft">Cargando zonas...</p>
        ) : zonas.length === 0 ? (
          <EmptyState title="Todavía no hay zonas" hint="Agrega la primera zona con el formulario superior." />
        ) : (
          <Table caption="Catálogo de zonas" columnas={[{ label: "Zona" }, { label: "Cantón" }, { label: "Provincia" }, { label: "", align: "right" }]}>
            {zonas.map((zona) => (
              <tr key={zona.id_zona}>
                <td className="px-6 py-3.5 text-[13px] font-medium text-ink">{zona.nombre}</td>
                <td className="px-6 py-3.5 text-[13px] text-ink-soft">{zona.canton}</td>
                <td className="px-6 py-3.5 text-[13px] text-ink-soft">{zona.provincia}</td>
                <td className="px-6 py-3 text-right"><button type="button" onClick={() => remove(zona)} className={btnDanger} aria-label={`Eliminar ${zona.nombre}`}><Trash2 size={14} /> Eliminar</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </Page>
  );
};

export default ZonasAdminPage;
