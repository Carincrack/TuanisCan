import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Camera, CheckCircle2, Clock, Eye, Maximize2, MapPin, Phone, Search, Siren } from "../lib/iconos";
import { getZonas } from "../services/auth.service";
import { listPets } from "../services/pets.service";
import { listLostPetReports, markLostPetFound, registerSighting, reportLostPet } from "../services/lost-pets.service";
import { useAuth } from "../hooks/useAuth";
import { useZonasEncadenadas } from "../hooks/useZonasEncadenadas";
import { distritoDe, normalizar as normalizarZona } from "../lib/zonas";
import type { Zona } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import type { LostPetInput, LostPetReport } from "../types/lost-pet.types";
import {
  Badge,
  Confirmar,
  Dialog,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  btnSecondaryCompacto,
  colones,
  fieldLabel,
  input,
} from "./ui";
import { Combo } from "./Combo";
import Visor from "./Visor";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";

const filtros = ["Todas", "Perdidas", "Encontradas", "Mi zona"];
const messageFrom = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "No se pudo completar la operacion.";

const numericValue = (value: string) => Number(value.replace(",", "."));
const parseCoords = (value: string) => {
  const match = value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  return {
    latitud: numericValue(match[1]),
    longitud: numericValue(match[2]),
  };
};

const coordsLabel = ({ latitud, longitud }: { latitud: number; longitud: number }) =>
  `${latitud.toFixed(6)}, ${longitud.toFixed(6)}`;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

/* Nicoya distrito está en Nicoya cantón, y así media Costa Rica:
   Alajuela, Cartago, Heredia, Puntarenas, Liberia, Quepos… Encadenar
   los tres niveles a secas escribía "Nicoya, Nicoya, Guanacaste". Se
   quitan las repeticiones seguidas y queda "Nicoya, Guanacaste". */
const zonaLabel = (zona?: Zona | null) => {
  if (!zona) return "Zona no indicada";

  const partes = [distritoDe(zona), zona.canton, zona.provincia]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));

  return partes
    .filter((parte, i) => i === 0 || normalizarZona(parte) !== normalizarZona(partes[i - 1]))
    .join(", ");
};

/* Los teléfonos se guardan tal como se escriban. Cuando la forma es
   la de Costa Rica se separa para poder leerla de un vistazo —un
   "+50688888888" seguido no se lee, se descifra—; cualquier otra cosa
   se deja intacta, que puede ser un número de otro país. */
const telefonoLegible = (valor: string) => {
  const limpio = valor.replace(/[\s.-]/g, "");
  const cr = /^(?:\+?506)?(\d{4})(\d{4})$/.exec(limpio);
  return cr ? `+506 ${cr[1]} ${cr[2]}` : valor;
};

const useBrowserLocation = () => {
  const [locating, setLocating] = useState(false);
  const locate = (onLocation: (coords: { latitud: number; longitud: number }) => void, onError: (message: string) => void) => {
    if (!navigator.geolocation) {
      onError("Tu navegador no permite detectar tu ubicación.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onLocation({
          latitud: Number(coords.latitude.toFixed(6)),
          longitud: Number(coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => {
        onError("No se pudo obtener tu ubicación. Puedes escribir las coordenadas.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };
  return { locating, locate };
};

const ReportForm = ({
  userId,
  pets,
  zonas,
  profilePhone,
  profileZonaId,
  onClose,
  onSaved,
}: {
  userId: string;
  pets: Pet[];
  zonas: Zona[];
  profilePhone?: string | null;
  profileZonaId?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  const [values, setValues] = useState({
    id_mascota: "",
    nombre: "",
    especie: "Perro",
    raza: "",
    zona_id: profileZonaId ?? "",
    contacto: profilePhone ?? "",
    descripcion: "",
    ubicacion: "",
    recompensa: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { locating, locate } = useBrowserLocation();

  const selectedPet = pets.find((pet) => pet.id_mascota === values.id_mascota) ?? null;
  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const fillLocation = () =>
    locate(
      (coords) => setValues((current) => ({ ...current, ubicacion: coordsLabel(coords) })),
      setError
    );

  const selectPet = (petId: string) => {
    const pet = pets.find((item) => item.id_mascota === petId);
    setValues((current) => ({
      ...current,
      id_mascota: petId,
      nombre: pet?.nombre ?? "",
      especie: pet?.especie ?? current.especie,
      raza: pet?.raza ?? "",
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    /* La mascota y la zona se comprueban acá y no con `required`. El
       combo box de `Combo.tsx` no es un `<select>` —la lista de uno
       nativo la dibuja el sistema operativo y no hay CSS que la
       toque—, así que la validación del navegador no le llega. Estas
       dos líneas la reemplazan, en el mismo sitio donde ya se
       comprueban la foto y las coordenadas. */
    if (!values.id_mascota) {
      setError("Elige cuál de tus mascotas se perdió.");
      return;
    }
    if (!values.zona_id) {
      setError("Elige la zona donde se perdió.");
      return;
    }
    if (!photo) {
      setError("Agrega una foto clara de la mascota.");
      return;
    }
    if (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024) {
      setError("La foto debe ser JPG, PNG o WebP y pesar menos de 5 MB.");
      return;
    }
    const coords = parseCoords(values.ubicacion);
    if (!coords) {
      setError("Escribe la ubicación como latitud, longitud. Ejemplo: 10.169410, -85.541761");
      return;
    }
    const payload: LostPetInput = {
      id_mascota: values.id_mascota,
      nombre: (selectedPet?.nombre ?? values.nombre).trim(),
      especie: (selectedPet?.especie ?? values.especie).trim(),
      raza: (selectedPet?.raza ?? values.raza).trim() || "Desconocida",
      zona_id: values.zona_id,
      contacto: values.contacto.trim() || null,
      descripcion: values.descripcion.trim(),
      latitud: coords.latitud,
      longitud: coords.longitud,
      recompensa: values.recompensa ? numericValue(values.recompensa) : null,
    };
    if (!selectedPet) {
      setError("Selecciona una mascota registrada de tu cuenta.");
      return;
    }
    if (!Number.isFinite(payload.latitud) || payload.latitud < -90 || payload.latitud > 90) {
      setError("La latitud debe ser un número entre -90 y 90.");
      return;
    }
    if (!Number.isFinite(payload.longitud) || payload.longitud < -180 || payload.longitud > 180) {
      setError("La longitud debe ser un número entre -180 y 180.");
      return;
    }
    if (payload.recompensa != null && (!Number.isFinite(payload.recompensa) || payload.recompensa < 0)) {
      setError("La recompensa debe ser un número positivo.");
      return;
    }
    setBusy(true);
    try {
      await reportLostPet(userId, payload, photo);
      await onSaved();
      onClose();
      /* El aviso va DESPUÉS de cerrar la ventana. Al revés queda
         tapado por el modal que se está yendo. */
      aviso.ok(`${values.nombre} quedó publicada`, {
        detalle: "Ya aparece en el listado. Te avisamos de cada avistamiento.",
      });
    } catch (cause) {
      setError(messageFrom(cause));
      aviso.error(cause, { respaldo: "No se pudo publicar el reporte." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>Mascota registrada *
          <Combo
            required
            value={values.id_mascota}
            onChange={selectPet}
            placeholder="Selecciona tu mascota"
            options={pets.map((pet) => ({
              value: pet.id_mascota,
              label: `${pet.nombre} · ${pet.especie}`,
            }))}
          />
        </label>
        <label className={fieldLabel}>Zona *
          <Combo
            required
            value={values.zona_id}
            onChange={(v) => update("zona_id", v)}
            placeholder="Selecciona una zona"
            options={zonas.map((zona) => ({
              value: zona.id_zona,
              label: `${zona.nombre} · ${zona.canton}`,
            }))}
          />
        </label>
        <label className={fieldLabel}>Nombre *<input className={input} required disabled maxLength={100} value={values.nombre} onChange={(e) => update("nombre", e.target.value)} /></label>
        <label className={fieldLabel}>Especie *<input className={input} required disabled maxLength={50} value={values.especie} onChange={(e) => update("especie", e.target.value)} /></label>
        <label className={fieldLabel}>Raza<input className={input} disabled maxLength={100} value={values.raza} onChange={(e) => update("raza", e.target.value)} /></label>
        <label className={fieldLabel}>Contacto *<input className={input} required maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} /></label>
        <label className={`${fieldLabel} sm:col-span-2`}>Ubicación *
          <input className={input} required inputMode="decimal" placeholder="10.169410, -85.541761" value={values.ubicacion} onChange={(e) => update("ubicacion", e.target.value)} />
        </label>
        <label className={fieldLabel}>Recompensa<input className={input} inputMode="numeric" value={values.recompensa} onChange={(e) => update("recompensa", e.target.value)} /></label>
        <label className={fieldLabel}><span className="flex items-center gap-2"><Camera size={15} /> Foto *</span><input className={input} required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
      </div>
      <button type="button" className={`${btnSecondary} justify-self-start`} onClick={fillLocation} disabled={locating}><MapPin size={14} />{locating ? "Detectando…" : "Usar la ubicación donde estoy"}</button>
      <label className={fieldLabel}>Señas, conducta y último lugar visto *<textarea className={`${input} min-h-24 resize-y`} required maxLength={2000} value={values.descripcion} onChange={(e) => update("descripcion", e.target.value)} /></label>
      {error && <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Publicando…" : "Publicar reporte"}</button></div>
    </form>
  );
};

const SightingForm = ({
  report,
  zonas,
  profilePhone,
  onClose,
  onSaved,
}: {
  report: LostPetReport;
  zonas: Zona[];
  profilePhone?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  const [values, setValues] = useState({
    ubicacion: "",
    zona_id: report.zona_id,
    direccion: "",
    contacto: profilePhone ?? "",
    comentario: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { locating, locate } = useBrowserLocation();
  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const fillLocation = () =>
    locate(
      (coords) => setValues((current) => ({ ...current, ubicacion: coordsLabel(coords) })),
      setError
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const coords = parseCoords(values.ubicacion);
    if (!coords) {
      setError("Escribe la ubicación como latitud, longitud. Ejemplo: 10.169410, -85.541761");
      setBusy(false);
      return;
    }
    const payload = {
        id_mascota_perdida: report.id_mascota_perdida,
        latitud: coords.latitud,
        longitud: coords.longitud,
        comentario: values.comentario.trim() || null,
        zona_id: values.zona_id || null,
        direccion: values.direccion.trim() || null,
        contacto: values.contacto.trim() || null,
      };
    if (!Number.isFinite(payload.latitud) || payload.latitud < -90 || payload.latitud > 90) {
      setError("La latitud debe ser un número entre -90 y 90.");
      setBusy(false);
      return;
    }
    if (!Number.isFinite(payload.longitud) || payload.longitud < -180 || payload.longitud > 180) {
      setError("La longitud debe ser un número entre -180 y 180.");
      setBusy(false);
      return;
    }
    try {
      await registerSighting(payload);
      await onSaved();
      onClose();
      aviso.ok("Avistamiento registrado", {
        detalle: `Le avisamos a quien reportó a ${report.nombre}.`,
      });
    } catch (cause) {
      setError(messageFrom(cause));
      aviso.error(cause, { respaldo: "No se pudo registrar el avistamiento." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
      <div className="rounded-[14px] bg-sunken p-4"><p className="text-[14px] font-semibold text-ink">{report.nombre}</p><p className="mt-1 text-[12.5px] text-ink-soft">{zonaLabel(report.zona)}</p></div>
      <label className={fieldLabel}>Ubicación *
        <input className={input} required inputMode="decimal" placeholder="10.169410, -85.541761" value={values.ubicacion} onChange={(e) => update("ubicacion", e.target.value)} />
      </label>
      <button type="button" className={`${btnSecondary} justify-self-start`} onClick={fillLocation} disabled={locating}><MapPin size={14} />{locating ? "Detectando…" : "Usar la ubicación donde estoy"}</button>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>Zona
          <Combo
            value={values.zona_id}
            onChange={(v) => update("zona_id", v)}
            vacio
            placeholder="Sin zona"
            options={zonas.map((zona) => ({
              value: zona.id_zona,
              label: `${zona.nombre} · ${zona.canton}`,
            }))}
          />
        </label>
        <label className={fieldLabel}>Contacto
          <input className={input} maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} />
        </label>
      </div>
      <label className={fieldLabel}>Dirección o referencia
        <input className={input} maxLength={300} value={values.direccion} onChange={(e) => update("direccion", e.target.value)} />
      </label>
      <label className={fieldLabel}>Comentario<textarea className={`${input} min-h-24 resize-y`} maxLength={1000} value={values.comentario} onChange={(e) => update("comentario", e.target.value)} /></label>
      {error && <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Registrando…" : "Registrar avistamiento"}</button></div>
    </form>
  );
};

const SightingDetails = ({ report, onClose }: { report: LostPetReport; onClose: () => void }) => (
  <div className="grid gap-3 p-5 sm:p-6">
    {report.avistamientos.length === 0 ? (
      <EmptyState title="Sin avistamientos" hint="Cuando alguien reporte que vio tu mascota, aparecerá acá." />
    ) : (
      report.avistamientos.map((item) => (
        <article key={item.id_avistamiento} className="rounded-[18px] bg-sunken p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-ink">{formatDateTime(item.fecha)}</p>
              <p className="mt-1 text-[12.5px] text-ink-soft">{item.direccion || zonaLabel(item.zona)}</p>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${item.latitud},${item.longitud}`}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-semibold text-accent-dark hover:underline"
            >
              Ver mapa
            </a>
          </div>
          {/* Había una cuarta ficha, "Usuario", con el UUID crudo de
              quien reportó. A quien busca a su mascota no le dice nada y
              ocupa el mismo sitio que el contacto, que sí sirve. */}
          <dl className="mt-3 grid gap-2.5 text-[12.5px] text-ink-soft sm:grid-cols-3">
            <div className="rounded-[14px] bg-surface p-3"><dt className="rotulo text-ink-mute">Ubicación</dt><dd className="nums mt-1 break-all">{coordsLabel(item)}</dd></div>
            <div className="rounded-[14px] bg-surface p-3"><dt className="rotulo text-ink-mute">Zona</dt><dd className="mt-1">{zonaLabel(item.zona)}</dd></div>
            <div className="rounded-[14px] bg-surface p-3"><dt className="rotulo text-ink-mute">Contacto</dt><dd className="nums mt-1 break-all">{item.contacto || "No indicado"}</dd></div>
          </dl>
          <div className="mt-3 rounded-[14px] bg-surface p-3">
            <p className="rotulo text-ink-mute">Comentario</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">{item.comentario || "Sin comentario"}</p>
          </div>
        </article>
      ))
    )}
    <div className="flex justify-end">
      <button type="button" className={btnSecondary} onClick={onClose}>Cerrar</button>
    </div>
  </div>
);

const MascotasPerdidas = () => {
  const { user, getProfile, isAdmin } = useAuth();
  const [filtro, setFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [reportes, setReportes] = useState<LostPetReport[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [profileZonaId, setProfileZonaId] = useState<string | null>(null);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [sighting, setSighting] = useState<LostPetReport | null>(null);
  const [sightingDetails, setSightingDetails] = useState<LostPetReport | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState<LostPetReport | null>(null);
  const [cerrandoCaso, setCerrandoCaso] = useState<LostPetReport | null>(null);
  const [cerrandoOcupado, setCerrandoOcupado] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [reportesData, zonasData, petsData, profile] = await Promise.all([
        listLostPetReports(),
        getZonas(),
        listPets().catch(() => []),
        getProfile(),
      ]);
      setReportes(reportesData);
      setZonas(zonasData);
      setPets(petsData);
      setProfileZonaId(profile?.zona_id ?? null);
      setProfilePhone(profile?.telefono ?? null);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, [getProfile]);

  useEffect(() => { void load(); }, [load]);

  const territorio = useZonasEncadenadas(zonas);

  const stats = useMemo(() => ({
    perdidas: reportes.filter((reporte) => reporte.estado === "perdida").length,
    encontradas: reportes.filter((reporte) => reporte.estado === "encontrada").length,
    avistamientos: reportes.reduce((total, reporte) => total + reporte.avistamientos.length, 0),
  }), [reportes]);

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase("es");
    return reportes.filter((reporte) => {
      const text = [
        reporte.nombre,
        reporte.especie,
        reporte.raza,
        reporte.descripcion,
        reporte.zona?.nombre,
        reporte.zona?.canton,
        reporte.zona?.provincia,
        reporte.zona?.distrito,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");
      return (
        (filtro === "Todas" ||
          (filtro === "Perdidas" && reporte.estado === "perdida") ||
          (filtro === "Encontradas" && reporte.estado === "encontrada") ||
          (filtro === "Mi zona" && Boolean(profileZonaId) && reporte.zona_id === profileZonaId)) &&
        territorio.cubre(reporte.zona) &&
        (!query || text.includes(query))
      );
    });
  // `territorio` is recreated on render; its primitive selections are the real dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    busqueda,
    filtro,
    profileZonaId,
    reportes,
    territorio.provincia,
    territorio.canton,
    territorio.distrito,
  ]);

  const closeReport = async (report: LostPetReport) => {
    setCerrandoOcupado(true);
    try {
      await markLostPetFound(report.id_mascota_perdida);
      setCerrandoCaso(null);
      await load();
      aviso.ok(`${report.nombre} apareció`, {
        detalle: "El reporte se cerró y sale del listado.",
      });
    } catch (cause) {
      setError(messageFrom(cause));
      aviso.error(cause, { respaldo: "No se pudo cerrar el reporte." });
    } finally {
      setCerrandoOcupado(false);
    }
  };

  const hasFilters = Boolean(
    busqueda ||
      filtro !== "Todas" ||
      territorio.provincia !== "Todas" ||
      territorio.canton !== "Todos" ||
      territorio.distrito !== "Todos"
  );
  const clearFilters = () => {
    setBusqueda("");
    setFiltro("Todas");
    territorio.limpiar();
  };

  return (
    <Page>
      <PageHeader
        title="Mascotas perdidas"
        subtitle={loading ? "Cargando reportes…" : `${stats.perdidas} activas · ${stats.encontradas} encontradas · ${stats.avistamientos} avistamientos`}
        action={<button type="button" className={btnPrimary} onClick={() => setReporting(true)} disabled={!pets.length} title={!pets.length ? "Registra primero una mascota" : undefined}><Siren size={15} strokeWidth={2} />Reportar mascota perdida</button>}
      />

      <section aria-label="Filtros de mascotas perdidas" className="bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">{visibles.length} {visibles.length === 1 ? "resultado" : "resultados"}</p>
            <p className="mt-0.5 text-[12px] text-ink-mute">Filtrá por estado, provincia, cantón, distrito o texto.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs label="Filtrar reportes" options={filtros} value={filtro} onChange={setFiltro} />
            {/* Limpiar es una acción sobre el conjunto de filtros, así que
                va con el resumen y no como quinta columna de la rejilla.
                Y aparece solo cuando hay algo que limpiar: un botón
                permanentemente apagado es ruido. */}
            {hasFilters && (
              <button type="button" className={btnQuiet} onClick={clearFilters}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Antes esto era una sola fila de cinco columnas con mínimos de
            240 + 180×3 + auto. Sumado a las separaciones pide unos 918 px,
            y el contenido de la aplicación mide 900 (`AppShell`): se salía
            justo en el ancho en el que se usa. La búsqueda va sola arriba
            —es la que necesita sitio para escribir— y los tres escalones
            territoriales debajo, a tercios. */}
        <label className={`${fieldLabel} mt-4 block`}>Buscar
          <span className="relative block">
            <input id="buscar-reporte" type="search" className={`${input} pl-10`} placeholder="Nombre, zona o señas" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
            <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute" />
          </span>
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className={fieldLabel}>Provincia
            <Combo
              value={territorio.provincia}
              onChange={territorio.elegirProvincia}
              placeholder="Todas las provincias"
              options={territorio.provincias.map((item) => ({
                value: item,
                label: item === "Todas" ? "Todas las provincias" : item,
              }))}
            />
          </label>
          <label className={fieldLabel}>Cantón
            <Combo
              value={territorio.canton}
              onChange={territorio.elegirCanton}
              disabled={!territorio.filtrando}
              placeholder="Todos los cantones"
              options={territorio.cantones.map((item) => ({
                value: item,
                label: item === "Todos" ? "Todos los cantones" : item,
              }))}
            />
          </label>
          <label className={fieldLabel}>Distrito
            <Combo
              value={territorio.distrito}
              onChange={territorio.elegirDistrito}
              disabled={territorio.canton === "Todos"}
              placeholder="Todos los distritos"
              options={territorio.distritos.map((item) => ({
                value: item,
                label: item === "Todos" ? "Todos los distritos" : item,
              }))}
            />
          </label>
        </div>
      </section>

      {error && <p role="alert" className="rounded-[14px] bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {loading ? (
        <Skeleton name="perdidas-rejilla" loading>
          <div />
        </Skeleton>
      ) : visibles.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Sin reportes en este filtro" : "Todavía no hay reportes"}
          hint={hasFilters ? "Probá con otra zona o quitá el texto de búsqueda." : "Cuando alguien reporte una mascota perdida, aparece acá."}
          action={hasFilters ? <button type="button" className={btnSecondary} onClick={clearFilters}>Limpiar filtros</button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((reporte) => {
            const canClose = reporte.id_usuario_reporta === user?.id || isAdmin;
            const puedeCerrar = canClose && reporte.estado === "perdida";
            const ultimoAvistamiento = reporte.avistamientos[0];
            return (
              /* `overflow-hidden`: la foto va pegada al borde de arriba y
                 sin esto asoma en cuadrado por fuera del radio de la
                 tarjeta. Y por eso mismo no se usa `MockPhoto`, que trae
                 su propio radio de 14 y dejaba una doble esquina. */
              <article key={reporte.id_mascota_perdida} className="flex flex-col overflow-hidden bg-surface">
                {/* El nombre va SOBRE la foto, no debajo.

                    La tarjeta medía cerca de 520 px de alto por 280 de
                    ancho: una columna, no una tarjeta. La foto 4:3 se
                    llevaba 210 y la cabecera de texto otros 46 más,
                    y las dos decían lo mismo —quién es— una encima de
                    la otra. Encimando el rótulo y pasando la foto a
                    16:10 se recuperan unos 80 px sin quitar un dato.

                    El degradado no es adorno: la foto la sube
                    cualquiera y puede venir clara, oscura o con un
                    cielo blanco detrás. Sin él, el nombre en blanco
                    desaparece la mitad de las veces. */}
                <div className="group relative">
                  {/* La foto abre en grande.

                      En un reporte de mascota perdida la foto ES el
                      dato: quien cree haberla visto necesita comparar
                      manchas, orejas y cola, y en una tarjeta de 280 px
                      recortada a 16:10 eso no se puede.

                      Las capas de encima llevan `pointer-events-none`
                      para dejar pasar el clic. Sin eso, la mitad de
                      abajo —justo donde está el nombre— no abriría
                      nada, que es donde el ojo va primero. */}
                  {/* El degradado y el icono van DENTRO del botón, no
                      al lado.

                      Los iconos propios de `lib/iconos` no se animan
                      solos: `useRoce` sube por el DOM con `closest`
                      buscando el elemento interactivo que los contiene
                      —un `button`, un `a[href]`, una `label`— y engancha
                      la animación al hover DE ESE. Es lo que hace que
                      el dibujo reaccione al pasar por la píldora
                      entera y no solo por sus dieciséis píxeles.

                      Puesto como hermano del botón, `closest` no
                      encontraba anfitrión y el icono se quedaba quieto.
                      Adentro también resuelve el apilado: el degradado
                      tiene que pintar sobre la foto pero por debajo del
                      icono, y siendo hermanos posteriores tapaban. */}
                  <button
                    type="button"
                    onClick={() => setFotoAbierta(reporte)}
                    aria-label={`Ver la foto de ${reporte.nombre} en grande`}
                    className="relative block w-full cursor-zoom-in overflow-hidden focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
                  >
                    <img
                      src={reporte.fotoUrl ?? "/mock/dog-nube.jpg"}
                      alt={`Foto de ${reporte.nombre}`}
                      loading="lazy"
                      className="aspect-[16/10] w-full bg-sunken object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />

                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgb(20_36_46/88%)] via-[rgb(20_36_46/38%)] to-transparent"
                    />

                    {/* Tenue siempre y no solo al pasar el cursor: en un
                        teléfono no hay cursor que pasar. */}
                    <span
                      aria-hidden
                      className="absolute right-3 bottom-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white opacity-70 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <Maximize2 size={14} strokeWidth={2.2} />
                    </span>
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                    <Badge tono={reporte.estado === "perdida" ? "danger" : "ok"}>{reporte.estado === "perdida" ? "Perdida" : "Encontrada"}</Badge>
                    {reporte.recompensa != null && (
                      /* Con la cifra sola quedaba un número amarillo
                         suelto sobre la foto: podía leerse como el peso
                         o la edad. La palabra es la que lo convierte en
                         un motivo para llamar. */
                      <span className="nums shrink-0 rounded-full bg-warn-wash px-2.5 py-1 text-[11.5px] font-semibold text-warn">
                        Recompensa {colones(reporte.recompensa)}
                      </span>
                    )}
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 right-12 bottom-0 p-4">
                    <h3 className="truncate text-[17px] font-semibold text-white">{reporte.nombre}</h3>
                    <p className="mt-0.5 truncate text-[12.5px] text-white/85">
                      {reporte.especie}
                      {reporte.raza ? ` · ${reporte.raza}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-5 py-4">
                  {/* Cada fila tiene su `dt` en `sr-only`: una lista de
                      definiciones con `dd` sueltos no es válida, y quien
                      navega con lector de pantalla oía tres datos sin
                      saber de qué eran. El ícono no sirve de etiqueta. */}
                  <dl className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                    <div className="flex items-center gap-2"><MapPin size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" /><dt className="sr-only">Zona</dt><dd className="truncate">Visto en {zonaLabel(reporte.zona)}</dd></div>
                    <div className="flex items-center gap-2"><Clock size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" /><dt className="sr-only">Reportado</dt><dd className="nums">{formatDateTime(reporte.fecha_reporte)}</dd></div>
                    {reporte.contacto && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" />
                        <dt className="sr-only">Contacto</dt>
                        {/* Enlace `tel:`: en el teléfono, que es donde se
                            va a ver esto, llamar es la acción del caso. */}
                        <dd className="min-w-0"><a href={`tel:${reporte.contacto.replace(/[^+\d]/g, "")}`} className="nums truncate hover:text-ink hover:underline">{telefonoLegible(reporte.contacto)}</a></dd>
                      </div>
                    )}
                  </dl>

                  {/* Lo que escribió quien la perdió. Va en tinta plena y
                      separado del bloque de datos: es un mensaje, no una
                      cuarta fila de la lista. Recortado a tres líneas
                      para que una descripción larga no estire toda la
                      fila de la rejilla. */}
                  {reporte.descripcion && (
                    <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-ink">
                      {reporte.descripcion}
                    </p>
                  )}

                  {/* Sin avistamientos el recuadro decía dos veces lo
                      mismo —"0 avistamientos" arriba y "Sin
                      avistamientos reportados" debajo— y ocupaba el
                      mismo sitio que cuando sí los hay. Una línea. */}
                  {/* El recuento va siempre, también en cero: "0
                      avistamientos" no es lo mismo que no decir nada
                      —significa que nadie la ha visto todavía, y eso es
                      un dato del caso—. */}
                  <div className="mt-3 rounded-[14px] bg-sunken px-3 py-2.5 text-[12px] text-ink-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {reporte.avistamientos.length} {reporte.avistamientos.length === 1 ? "avistamiento" : "avistamientos"}
                        </p>
                        {ultimoAvistamiento ? (
                          <p className="mt-1 line-clamp-2">
                            Último: {ultimoAvistamiento.direccion || zonaLabel(ultimoAvistamiento.zona)} · {formatDateTime(ultimoAvistamiento.fecha)}
                          </p>
                        ) : (
                          <p className="mt-1 text-ink-mute">Sin avistamientos reportados.</p>
                        )}
                      </div>
                      {canClose && ultimoAvistamiento && (
                        <button type="button" className="shrink-0 text-[12px] font-semibold text-accent-dark hover:underline" onClick={() => setSightingDetails(reporte)}>
                          Detalles
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tres botones a lo alto y todos secundarios: ni
                      jerarquía ni sitio. La acción que mueve el caso
                      —avisar que se vio al animal— manda y ocupa la
                      fila entera; las otras dos se reparten la de
                      abajo, con las etiquetas cortas para que entren en
                      una tarjeta de 280 px. */}
                  <div className="mt-auto grid gap-2 pt-3.5">
                    <button type="button" disabled={reporte.estado === "encontrada"} className={`${reporte.estado === "encontrada" ? btnSecondary : btnPrimary} w-full disabled:cursor-default disabled:opacity-45 disabled:hover:bg-neutral-wash disabled:hover:brightness-100`} onClick={() => setSighting(reporte)}>
                      <Eye size={14} strokeWidth={1.9} />
                      {reporte.estado === "encontrada" ? "Caso cerrado" : "Vi a esta mascota"}
                    </button>

                    <div className={`grid gap-2 ${puedeCerrar ? "grid-cols-2" : "grid-cols-1"}`}>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${reporte.latitud},${reporte.longitud}`} target="_blank" rel="noreferrer" className={`${btnSecondaryCompacto} w-full`}>
                        <MapPin size={13} />
                        Ubicación
                      </a>
                      {puedeCerrar && (
                        <button type="button" className={`${btnSecondaryCompacto} w-full`} onClick={() => setCerrandoCaso(reporte)}>
                          <CheckCircle2 size={13} />
                          Ya apareció
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {reporting && user && (
        <Dialog ancho="max-w-[760px]" title="Reportar mascota perdida" onClose={() => setReporting(false)}>
          <ReportForm userId={user.id} pets={pets} zonas={zonas} profilePhone={profilePhone} profileZonaId={profileZonaId} onClose={() => setReporting(false)} onSaved={load} />
        </Dialog>
      )}
      {sighting && (
        <Dialog ancho="max-w-[760px]" title="Registrar avistamiento" onClose={() => setSighting(null)}>
          <SightingForm report={sighting} zonas={zonas} profilePhone={profilePhone} onClose={() => setSighting(null)} onSaved={load} />
        </Dialog>
      )}
      <Visor
        abierto={fotoAbierta !== null}
        src={fotoAbierta?.fotoUrl ?? "/mock/dog-nube.jpg"}
        alt={fotoAbierta ? `Foto de ${fotoAbierta.nombre}` : ""}
        cerrar={() => setFotoAbierta(null)}
      />

      {cerrandoCaso && (
        <Confirmar
          titulo="Marcar como encontrada"
          cuerpo={
            <>
              Vas a cerrar el reporte de <strong className="font-semibold text-ink">{cerrandoCaso.nombre}</strong>. Deja de
              aparecer entre las mascotas perdidas y nadie va a poder registrar
              más avistamientos.
            </>
          }
          confirmar="Sí, apareció"
          ocupado={cerrandoOcupado}
          onConfirmar={() => void closeReport(cerrandoCaso)}
          onCancelar={() => setCerrandoCaso(null)}
        />
      )}
      {sightingDetails && (
        <Dialog ancho="max-w-[760px]" title={`Avistamientos de ${sightingDetails.nombre}`} onClose={() => setSightingDetails(null)}>
          <SightingDetails report={sightingDetails} onClose={() => setSightingDetails(null)} />
        </Dialog>
      )}
    </Page>
  );
};

export default MascotasPerdidas;
