import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Camera, CheckCircle2, Clock, Eye, MapPin, Phone, Search, Siren, X } from "lucide-react";
import { getZonas } from "../services/auth.service";
import { listPets } from "../services/pets.service";
import { listLostPetReports, markLostPetFound, registerSighting, reportLostPet } from "../services/lost-pets.service";
import { useAuth } from "../hooks/useAuth";
import type { Zona } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import type { LostPetInput, LostPetReport } from "../types/lost-pet.types";
import {
  Badge,
  EmptyState,
  FilterTabs,
  MockPhoto,
  Page,
  PageHeader,
  btnPrimary,
  btnSecondary,
  colones,
  input,
} from "./ui";

const filtros = ["Todas", "Perdidas", "Encontradas", "Mi zona"];
const fieldLabel = "grid gap-1.5 text-[12px] font-medium text-ink-soft";
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
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const zonaLabel = (zona?: Zona | null) =>
  zona ? `${zona.nombre}, ${zona.canton}` : "Zona no indicada";

const Dialog = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) =>
  createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-[#0b2331]/75" />
      <section role="dialog" aria-modal="true" aria-labelledby="lost-pet-dialog-title" className="anim-rise relative max-h-[92dvh] w-full max-w-[760px] overflow-y-auto bg-surface">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-rail px-5 py-4">
          <h2 id="lost-pet-dialog-title" className="text-[16px] font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 text-rail-text hover:bg-rail-hover hover:text-white"><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>,
    document.body
  );

const useBrowserLocation = () => {
  const [locating, setLocating] = useState(false);
  const locate = (onLocation: (coords: { latitud: number; longitud: number }) => void, onError: (message: string) => void) => {
    if (!navigator.geolocation) {
      onError("Tu navegador no permite detectar ubicacion.");
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
        onError("No se pudo obtener tu ubicacion. Puedes escribir las coordenadas.");
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
      setError("Escribe la ubicacion como latitud, longitud. Ejemplo: 10.169410, -85.541761");
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
      setError("La latitud debe ser un numero entre -90 y 90.");
      return;
    }
    if (!Number.isFinite(payload.longitud) || payload.longitud < -180 || payload.longitud > 180) {
      setError("La longitud debe ser un numero entre -180 y 180.");
      return;
    }
    if (payload.recompensa != null && (!Number.isFinite(payload.recompensa) || payload.recompensa < 0)) {
      setError("La recompensa debe ser un numero positivo.");
      return;
    }
    setBusy(true);
    try {
      await reportLostPet(userId, payload, photo);
      await onSaved();
      onClose();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>Mascota registrada *
          <select className={input} required value={values.id_mascota} onChange={(e) => selectPet(e.target.value)}>
            <option value="">Selecciona tu mascota</option>
            {pets.map((pet) => <option key={pet.id_mascota} value={pet.id_mascota}>{pet.nombre} - {pet.especie}</option>)}
          </select>
        </label>
        <label className={fieldLabel}>Zona *
          <select className={input} required value={values.zona_id} onChange={(e) => update("zona_id", e.target.value)}>
            <option value="">Selecciona una zona</option>
            {zonas.map((zona) => <option key={zona.id_zona} value={zona.id_zona}>{zona.nombre} - {zona.canton}</option>)}
          </select>
        </label>
        <label className={fieldLabel}>Nombre *<input className={input} required disabled maxLength={100} value={values.nombre} onChange={(e) => update("nombre", e.target.value)} /></label>
        <label className={fieldLabel}>Especie *<input className={input} required disabled maxLength={50} value={values.especie} onChange={(e) => update("especie", e.target.value)} /></label>
        <label className={fieldLabel}>Raza<input className={input} disabled maxLength={100} value={values.raza} onChange={(e) => update("raza", e.target.value)} /></label>
        <label className={fieldLabel}>Contacto *<input className={input} required maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} /></label>
        <label className={`${fieldLabel} sm:col-span-2`}>Ubicacion *
          <input className={input} required inputMode="decimal" placeholder="10.169410, -85.541761" value={values.ubicacion} onChange={(e) => update("ubicacion", e.target.value)} />
        </label>
        <label className={fieldLabel}>Recompensa<input className={input} inputMode="numeric" value={values.recompensa} onChange={(e) => update("recompensa", e.target.value)} /></label>
        <label className={fieldLabel}><span className="flex items-center gap-2"><Camera size={15} /> Foto *</span><input className={input} required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
      </div>
      <button type="button" className={`${btnSecondary} justify-self-start`} onClick={fillLocation} disabled={locating}><MapPin size={14} />{locating ? "Detectando..." : "Usar ubicacion donde estoy"}</button>
      <label className={fieldLabel}>Senas, conducta y ultimo lugar visto *<textarea className={`${input} min-h-24 resize-y`} required maxLength={2000} value={values.descripcion} onChange={(e) => update("descripcion", e.target.value)} /></label>
      {error && <p role="alert" className="bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Publicando..." : "Publicar reporte"}</button></div>
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
      setError("Escribe la ubicacion como latitud, longitud. Ejemplo: 10.169410, -85.541761");
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
      setError("La latitud debe ser un numero entre -90 y 90.");
      setBusy(false);
      return;
    }
    if (!Number.isFinite(payload.longitud) || payload.longitud < -180 || payload.longitud > 180) {
      setError("La longitud debe ser un numero entre -180 y 180.");
      setBusy(false);
      return;
    }
    try {
      await registerSighting(payload);
      await onSaved();
      onClose();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
      <div className="bg-sunken p-4"><p className="text-[14px] font-semibold text-ink">{report.nombre}</p><p className="mt-1 text-[12.5px] text-ink-soft">{zonaLabel(report.zona)}</p></div>
      <label className={fieldLabel}>Ubicacion *
        <input className={input} required inputMode="decimal" placeholder="10.169410, -85.541761" value={values.ubicacion} onChange={(e) => update("ubicacion", e.target.value)} />
      </label>
      <button type="button" className={`${btnSecondary} justify-self-start`} onClick={fillLocation} disabled={locating}><MapPin size={14} />{locating ? "Detectando..." : "Usar ubicacion donde estoy"}</button>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>Zona
          <select className={input} value={values.zona_id} onChange={(e) => update("zona_id", e.target.value)}>
            <option value="">Sin zona</option>
            {zonas.map((zona) => <option key={zona.id_zona} value={zona.id_zona}>{zona.nombre} - {zona.canton}</option>)}
          </select>
        </label>
        <label className={fieldLabel}>Contacto
          <input className={input} maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} />
        </label>
      </div>
      <label className={fieldLabel}>Direccion o referencia
        <input className={input} maxLength={300} value={values.direccion} onChange={(e) => update("direccion", e.target.value)} />
      </label>
      <label className={fieldLabel}>Comentario<textarea className={`${input} min-h-24 resize-y`} maxLength={1000} value={values.comentario} onChange={(e) => update("comentario", e.target.value)} /></label>
      {error && <p role="alert" className="bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Registrando..." : "Registrar avistamiento"}</button></div>
    </form>
  );
};

const SightingDetails = ({ report, onClose }: { report: LostPetReport; onClose: () => void }) => (
  <div className="grid gap-3 p-5 sm:p-6">
    {report.avistamientos.length === 0 ? (
      <EmptyState title="Sin avistamientos" hint="Cuando alguien reporte que vio tu mascota, aparecera aqui." />
    ) : (
      report.avistamientos.map((item) => (
        <article key={item.id_avistamiento} className="bg-sunken p-4">
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
          <dl className="mt-3 grid gap-2.5 text-[12.5px] text-ink-soft sm:grid-cols-2">
            <div className="bg-surface p-3"><dt className="text-[10px] uppercase text-ink-mute">Ubicacion</dt><dd className="nums mt-1">{coordsLabel(item)}</dd></div>
            <div className="bg-surface p-3"><dt className="text-[10px] uppercase text-ink-mute">Zona</dt><dd className="mt-1">{zonaLabel(item.zona)}</dd></div>
            <div className="bg-surface p-3"><dt className="text-[10px] uppercase text-ink-mute">Contacto</dt><dd className="nums mt-1">{item.contacto || "No indicado"}</dd></div>
            <div className="bg-surface p-3"><dt className="text-[10px] uppercase text-ink-mute">Usuario</dt><dd className="nums mt-1">{item.id_usuario}</dd></div>
          </dl>
          <div className="mt-3 bg-surface p-3">
            <p className="text-[10px] font-semibold uppercase text-ink-mute">Comentario</p>
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
  const [especie, setEspecie] = useState("");
  const [zonaId, setZonaId] = useState("");
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

  const especies = useMemo(
    () => Array.from(new Set(reportes.map((reporte) => reporte.especie).filter(Boolean))).sort(),
    [reportes]
  );

  const stats = useMemo(() => ({
    perdidas: reportes.filter((reporte) => reporte.estado === "perdida").length,
    encontradas: reportes.filter((reporte) => reporte.estado === "encontrada").length,
    avistamientos: reportes.reduce((total, reporte) => total + reporte.avistamientos.length, 0),
  }), [reportes]);

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase("es");
    return reportes.filter((reporte) => {
      const text = [reporte.nombre, reporte.especie, reporte.raza, reporte.descripcion, zonaLabel(reporte.zona)]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");
      return (
        (filtro === "Todas" ||
          (filtro === "Perdidas" && reporte.estado === "perdida") ||
          (filtro === "Encontradas" && reporte.estado === "encontrada") ||
          (filtro === "Mi zona" && Boolean(profileZonaId) && reporte.zona_id === profileZonaId)) &&
        (!zonaId || reporte.zona_id === zonaId) &&
        (!especie || reporte.especie.toLocaleLowerCase("es") === especie.toLocaleLowerCase("es")) &&
        (!query || text.includes(query))
      );
    });
  }, [busqueda, especie, filtro, profileZonaId, reportes, zonaId]);

  const closeReport = async (report: LostPetReport) => {
    if (!window.confirm(`Marcar a ${report.nombre} como encontrada?`)) return;
    try {
      await markLostPetFound(report.id_mascota_perdida);
      await load();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  };

  const hasFilters = Boolean(busqueda || especie || zonaId || filtro !== "Todas");
  const clearFilters = () => {
    setBusqueda("");
    setEspecie("");
    setZonaId("");
    setFiltro("Todas");
  };

  return (
    <Page>
      <PageHeader
        title="Mascotas perdidas"
        subtitle={loading ? "Cargando reportes..." : `${stats.perdidas} activas · ${stats.encontradas} encontradas · ${stats.avistamientos} avistamientos`}
        action={<button type="button" className={btnPrimary} onClick={() => setReporting(true)} disabled={!pets.length} title={!pets.length ? "Registra primero una mascota" : undefined}><Siren size={15} strokeWidth={2} />Reportar mascota perdida</button>}
      />

      <section aria-label="Filtros de mascotas perdidas" className="bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">{visibles.length} {visibles.length === 1 ? "resultado" : "resultados"}</p>
            <p className="mt-0.5 text-[12px] text-ink-mute">Filtra por estado, zona, especie o texto.</p>
          </div>
          <FilterTabs label="Filtrar reportes" options={filtros} value={filtro} onChange={setFiltro} />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(190px,0.45fr)_minmax(190px,0.45fr)_auto] lg:items-end">
          <label className={fieldLabel}>Buscar
            <span className="relative">
              <input id="buscar-reporte" type="search" className={`${input} pl-9`} placeholder="Nombre, zona o señas" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
              <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-mute" />
            </span>
          </label>
          <label className={fieldLabel}>Zona
            <select className={input} value={zonaId} onChange={(event) => setZonaId(event.target.value)}>
              <option value="">Todas las zonas</option>
              {zonas.map((zona) => <option key={zona.id_zona} value={zona.id_zona}>{zona.nombre} - {zona.canton}</option>)}
            </select>
          </label>
          <label className={fieldLabel}>Especie
            <select className={input} value={especie} onChange={(event) => setEspecie(event.target.value)}>
              <option value="">Todas las especies</option>
              {especies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <button type="button" className={btnSecondary} onClick={clearFilters} disabled={!hasFilters}>
            Limpiar
          </button>
        </div>
      </section>

      {error && <p role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {loading ? (
        <div className="bg-surface px-6 py-16 text-center text-[13px] text-ink-soft">Cargando reportes...</div>
      ) : visibles.length === 0 ? (
        <EmptyState title="Sin reportes en este filtro" hint="Prueba con otro filtro para ver el resto." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((reporte) => {
            const canClose = reporte.id_usuario_reporta === user?.id || isAdmin;
            const ultimoAvistamiento = reporte.avistamientos[0];
            return (
              <article key={reporte.id_mascota_perdida} className="flex flex-col bg-surface">
                <div className="relative">
                  <MockPhoto src={reporte.fotoUrl ?? "/mock/dog-nube.jpg"} alt={`Foto de ${reporte.nombre}`} />
                  <span className="absolute top-0 left-0"><Badge tono={reporte.estado === "perdida" ? "danger" : "ok"}>{reporte.estado === "perdida" ? "Perdida" : "Encontrada"}</Badge></span>
                </div>

                <div className="flex flex-1 flex-col px-5 py-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-[16px] font-semibold text-ink">{reporte.nombre}</h3>
                    <span className="text-[11.5px] text-ink-mute">{reporte.especie}</span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">{reporte.raza || "Raza no indicada"}</p>

                  {reporte.recompensa != null && (
                    <p className="nums mt-3 bg-warn-wash px-3 py-1.5 text-[12px] font-semibold text-warn">
                      Recompensa {colones(reporte.recompensa)}
                    </p>
                  )}

                  <dl className="mt-3 flex flex-col gap-1.5 text-[12.5px] text-ink-soft">
                    <div className="flex items-center gap-2"><MapPin size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" /><dd>Visto en {zonaLabel(reporte.zona)}</dd></div>
                    <div className="flex items-center gap-2"><Clock size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" /><dd className="nums">{formatDateTime(reporte.fecha_reporte)}</dd></div>
                    {reporte.contacto && <div className="flex items-center gap-2"><Phone size={13} strokeWidth={1.8} aria-hidden className="text-ink-mute" /><dd className="nums">{reporte.contacto}</dd></div>}
                  </dl>

                  <p className="mt-3 text-[12.5px] leading-snug text-ink-soft">{reporte.descripcion}</p>

                  <div className="mt-3 bg-sunken px-3 py-2 text-[12px] text-ink-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">
                          {reporte.avistamientos.length} {reporte.avistamientos.length === 1 ? "avistamiento" : "avistamientos"}
                        </p>
                        {ultimoAvistamiento ? (
                          <p className="mt-1 line-clamp-2">
                            Ultimo: {ultimoAvistamiento.direccion || zonaLabel(ultimoAvistamiento.zona)} · {formatDateTime(ultimoAvistamiento.fecha)}
                          </p>
                        ) : <p className="mt-1 text-ink-mute">Sin avistamientos reportados.</p>}
                      </div>
                      {canClose && reporte.avistamientos.length > 0 && (
                        <button type="button" className="shrink-0 text-[12px] font-semibold text-accent-dark hover:underline" onClick={() => setSightingDetails(reporte)}>
                          Detalles
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto grid gap-2 pt-4">
                    <a href={`https://www.google.com/maps/search/?api=1&query=${reporte.latitud},${reporte.longitud}`} target="_blank" rel="noreferrer" className={`${btnSecondary} w-full`}>
                      <MapPin size={14} />
                      Ver ubicacion
                    </a>
                    <button type="button" disabled={reporte.estado === "encontrada"} className={`${btnSecondary} w-full disabled:cursor-default disabled:opacity-45 disabled:hover:bg-neutral-wash`} onClick={() => setSighting(reporte)}>
                      <Eye size={14} strokeWidth={1.9} />
                      {reporte.estado === "encontrada" ? "Caso cerrado" : "Vi a esta mascota"}
                    </button>
                    {canClose && reporte.estado === "perdida" && <button type="button" className={`${btnSecondary} w-full`} onClick={() => void closeReport(reporte)}><CheckCircle2 size={14} />Marcar encontrada</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {reporting && user && (
        <Dialog title="Reportar mascota perdida" onClose={() => setReporting(false)}>
          <ReportForm userId={user.id} pets={pets} zonas={zonas} profilePhone={profilePhone} profileZonaId={profileZonaId} onClose={() => setReporting(false)} onSaved={load} />
        </Dialog>
      )}
      {sighting && (
        <Dialog title="Registrar avistamiento" onClose={() => setSighting(null)}>
          <SightingForm report={sighting} zonas={zonas} profilePhone={profilePhone} onClose={() => setSighting(null)} onSaved={load} />
        </Dialog>
      )}
      {sightingDetails && (
        <Dialog title={`Avistamientos de ${sightingDetails.nombre}`} onClose={() => setSightingDetails(null)}>
          <SightingDetails report={sightingDetails} onClose={() => setSightingDetails(null)} />
        </Dialog>
      )}
    </Page>
  );
};

export default MascotasPerdidas;
