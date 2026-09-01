import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  Loader,
  MapPin,
  PawPrint,
  Search,
  Star,
  X,
} from "../lib/iconos";
import { listPets } from "../services/pets.service";
import { listActiveWalkers, requestWalk } from "../services/walkers.service";
import { useAuth } from "../hooks/useAuth";
import type { PublicWalker, WalkRequestInput } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import {
  Avatar,
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
import { Combo } from "./Combo";

interface RequestForm {
  id_mascota: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: string;
  direccion_encuentro: string;
}

const emptyRequest: RequestForm = {
  id_mascota: "",
  fecha: new Date().toISOString().slice(0, 10),
  hora_inicio: "08:00",
  duracion_min: "45",
  direccion_encuentro: "",
};

const messageFrom = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "No se pudo completar la operacion.";
};

const normalizar = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const Paseadores = () => {
  const { getProfile, isAdmin } = useAuth();
  const [walkers, setWalkers] = useState<PublicWalker[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [zona, setZona] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [perfil, setPerfil] = useState<PublicWalker | null>(null);
  const [solicitud, setSolicitud] = useState<PublicWalker | null>(null);
  const [form, setForm] = useState<RequestForm>(emptyRequest);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [canOperate, setCanOperate] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([listActiveWalkers(), listPets(), getProfile()])
      .then(([nextWalkers, nextPets, profile]) => {
        setWalkers(nextWalkers);
        setPets(nextPets);
        setCanOperate(isAdmin || profile?.verificacion.estado === "aprobado");
        setForm((current) => ({
          ...current,
          id_mascota: current.id_mascota || nextPets[0]?.id_mascota || "",
        }));
      })
      .catch((cause) => setError(messageFrom(cause)))
      .finally(() => setLoading(false));
  }, [getProfile, isAdmin]);

  const zonas = useMemo(
    () => ["Todas", ...Array.from(new Set(walkers.map((w) => w.zona))).sort()],
    [walkers]
  );

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return walkers.filter(
      (w) =>
        (zona === "Todas" || w.zona === zona) &&
        (q === "" ||
          normalizar(w.nombre).includes(q) ||
          normalizar(w.zona).includes(q))
    );
  }, [busqueda, walkers, zona]);

  const openRequest = (walker: PublicWalker) => {
    if (!canOperate) {
      setError("Debes verificar tu perfil antes de solicitar un paseo.");
      return;
    }
    setSolicitud(walker);
    setError(null);
    setMessage(null);
    setForm((current) => ({
      ...emptyRequest,
      id_mascota: current.id_mascota || pets[0]?.id_mascota || "",
    }));
  };

  const submitRequest = async () => {
    if (!solicitud) return;
    if (!form.id_mascota) {
      setError("Primero registra una mascota para solicitar un paseo.");
      return;
    }
    if (!form.direccion_encuentro.trim()) {
      setError("Indica la direccion de encuentro.");
      return;
    }

    const payload: WalkRequestInput = {
      id_mascota: form.id_mascota,
      id_paseador: solicitud.id_usuario,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      duracion_min: Number(form.duracion_min),
      direccion_encuentro: form.direccion_encuentro.trim(),
    };

    setSaving(true);
    setError(null);
    try {
      await requestWalk(payload);
      setSolicitud(null);
      setMessage(`Solicitud enviada a ${solicitud.nombre}.`);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  };

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
            className={`${input} pl-10`}
          />
          <Search
            size={15}
            strokeWidth={1.9}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute"
          />
        </div>

        <FilterTabs label="Filtrar por zona" options={zonas} value={zona} onChange={setZona} />
      </div>

      {(error || message) && !solicitud && (
        <div aria-live="polite" className={`px-6 py-3 text-[13px] ${error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"}`}>
          {error ?? message}
        </div>
      )}

      {loading ? (
        <p className="bg-surface px-6 py-8 text-[13px] text-ink-soft">
          Cargando paseadores...
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((w) => (
            <article key={w.id_usuario} className="flex flex-col bg-surface px-5 py-5">
              <div className="flex items-start gap-4">
                {w.foto_perfil ? (
                  <img
                    src={w.foto_perfil}
                    alt=""
                    aria-hidden
                    className="h-12 w-12 flex-shrink-0 bg-sunken object-cover"
                  />
                ) : (
                  <Avatar nombre={w.nombre} size={48} />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-[15px] font-semibold text-ink">
                      {w.nombre}
                    </h3>
                    <BadgeCheck
                      size={15}
                      strokeWidth={2}
                      className="flex-shrink-0 text-accent"
                      aria-label="Paseador verificado"
                    />
                  </div>

                  <p className="nums mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                    <Star size={13} className="fill-warn text-warn" aria-hidden />
                    <span className="font-semibold text-ink">
                      {w.calificacion_promedio.toFixed(1)}
                    </span>
                    <span className="text-ink-mute">({w.total_resenas} reseñas)</span>
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                    <MapPin size={13} strokeWidth={1.9} aria-hidden className="text-ink-mute" />
                    {w.zona}
                  </p>
                </div>
              </div>

              <p className="mt-4 min-h-[34px] text-[12.5px] leading-snug text-ink-soft">
                {w.descripcion || "Paseador verificado por TuanisCan."}
              </p>

              <div className="mt-4 flex items-end justify-between gap-3 bg-sunken px-4 py-3">
                <div>
                  <p className="nums text-[17px] font-semibold text-ink">
                    {colones(w.tarifa_base ?? 0)}
                  </p>
                  <p className="text-[11px] text-ink-mute">por paseo</p>
                </div>
                <Badge tono={w.disponible ? "ok" : "neutral"}>
                  {w.disponible ? "Disponible hoy" : "No disponible"}
                </Badge>
              </div>

              <div className="mt-auto flex gap-2 pt-4">
                <button type="button" onClick={() => setPerfil(w)} className={`${btnSecondary} flex-1`}>
                  Ver perfil
                </button>
                <button type="button" onClick={() => openRequest(w)} disabled={!canOperate || !w.disponible || !w.tarifa_base} className={`${btnPrimary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}>
                  Solicitar paseo
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && visibles.length === 0 && (
        <EmptyState
          title="No hay paseadores con ese criterio"
          hint="Prueba con otra zona o quita el filtro de búsqueda."
        />
      )}

      {perfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2331]/60 px-4" role="dialog" aria-modal="true" aria-labelledby="perfil-paseador-title">
          <div className="w-full max-w-[520px] bg-surface">
            <div className="flex items-start gap-4 px-6 py-5">
              {perfil.foto_perfil ? (
                <img src={perfil.foto_perfil} alt="" aria-hidden className="h-16 w-16 flex-shrink-0 bg-sunken object-cover" />
              ) : (
                <Avatar nombre={perfil.nombre} size={64} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 id="perfil-paseador-title" className="truncate text-[19px] font-semibold text-ink">{perfil.nombre}</h3>
                  <BadgeCheck size={16} className="text-accent" aria-label="Paseador verificado" />
                </div>
                <p className="mt-1 text-[13px] text-ink-soft">{perfil.zona}</p>
              </div>
              <button type="button" onClick={() => setPerfil(null)} aria-label="Cerrar perfil" className="p-2 text-ink-soft hover:bg-sunken hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="bg-surface px-6 py-4"><p className="rotulo text-ink-mute">Rating</p><p className="nums mt-1 text-[20px] font-semibold text-ink">{perfil.calificacion_promedio.toFixed(1)}</p></div>
              <div className="bg-surface px-6 py-4"><p className="rotulo text-ink-mute">Reseñas</p><p className="nums mt-1 text-[20px] font-semibold text-ink">{perfil.total_resenas}</p></div>
              <div className="bg-surface px-6 py-4"><p className="rotulo text-ink-mute">Paseos</p><p className="nums mt-1 text-[20px] font-semibold text-ink">{perfil.total_paseos}</p></div>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] leading-relaxed text-ink-soft">{perfil.descripcion || "Este paseador todavia no agregó una descripción pública."}</p>
              <div className="mt-5 flex items-center justify-between bg-sunken px-4 py-3">
                <span className="nums text-[18px] font-semibold text-ink">{colones(perfil.tarifa_base ?? 0)}</span>
                <Badge tono="ok">Disponible hoy</Badge>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setPerfil(null)} className={btnSecondary}>Cerrar</button>
                <button type="button" onClick={() => { setPerfil(null); openRequest(perfil); }} disabled={!canOperate || !perfil.tarifa_base} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}>Solicitar paseo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {solicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2331]/60 px-4" role="dialog" aria-modal="true" aria-labelledby="solicitar-paseo-title">
          <div className="w-full max-w-[520px] bg-surface">
            <div className="flex items-start justify-between gap-4 px-6 py-5">
              <div>
                <h3 id="solicitar-paseo-title" className="text-[19px] font-semibold text-ink">Solicitar paseo</h3>
                <p className="mt-1 text-[13px] text-ink-soft">Con {solicitud.nombre} · {colones(solicitud.tarifa_base ?? 0)}</p>
              </div>
              <button type="button" onClick={() => setSolicitud(null)} aria-label="Cerrar solicitud" className="p-2 text-ink-soft hover:bg-sunken hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="rotulo text-ink-mute">Mascota</span>
                <Combo
                  className="mt-2"
                  value={form.id_mascota}
                  onChange={(v) => setForm({ ...form, id_mascota: v })}
                  disabled={!pets.length}
                  textoInactivo="No tienes mascotas registradas"
                  placeholder="Elegí una mascota"
                  options={pets.map((pet) => ({ value: pet.id_mascota, label: pet.nombre }))}
                />
              </label>
              <label>
                <span className="flex items-center gap-1.5 rotulo text-ink-mute"><CalendarDays size={13} /> Fecha</span>
                <input type="date" min={emptyRequest.fecha} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={`${input} mt-2`} />
              </label>
              <label>
                <span className="flex items-center gap-1.5 rotulo text-ink-mute"><Clock size={13} /> Hora</span>
                <input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className={`${input} mt-2`} />
              </label>
              <label>
                <span className="rotulo text-ink-mute">Duración</span>
                <Combo
                  className="mt-2"
                  value={form.duracion_min}
                  onChange={(v) => setForm({ ...form, duracion_min: v })}
                  options={[30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} minutos` }))}
                />
              </label>
              <div className="bg-sunken px-4 py-3">
                <p className="rotulo text-ink-mute">Total</p>
                <p className="nums mt-1 text-[20px] font-semibold text-ink">{colones(solicitud.tarifa_base ?? 0)}</p>
              </div>
              <label className="sm:col-span-2">
                <span className="rotulo text-ink-mute">Dirección de encuentro</span>
                <textarea rows={3} value={form.direccion_encuentro} onChange={(e) => setForm({ ...form, direccion_encuentro: e.target.value })} className={`${input} mt-2 resize-y`} placeholder="Casa, condominio, parque o punto de referencia" />
              </label>

              {error && <p className="bg-danger-wash px-3 py-2 text-[13px] text-danger sm:col-span-2">{error}</p>}

              <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving} onClick={() => setSolicitud(null)} className={btnSecondary}>Cancelar</button>
                <button type="button" disabled={saving || !pets.length} onClick={() => void submitRequest()} className={btnPrimary}>
                  {saving ? <Loader size={14} className="animate-spin" /> : <PawPrint size={14} />}
                  {saving ? "Enviando..." : "Confirmar solicitud"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

export default Paseadores;
