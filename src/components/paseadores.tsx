import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Loader,
  MapPin,
  PawPrint,
  Search,
  Star,
} from "../lib/iconos";
import { listPets } from "../services/pets.service";
import { listActiveWalkers, requestWalk } from "../services/walkers.service";
import { useAuth } from "../hooks/useAuth";
import type { PublicWalker, WalkRequestInput } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import {
  Avatar,
  Dialog,
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
import SelloVerificado from "./SelloVerificado";

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

/* ─────────────────────────────────────────────────────────────
   PIEZAS DE LA TARJETA

   Esta pantalla se había quedado fuera del pase de `.suave`: fotos
   cuadradas al lado de avatares redondos, el verificado dibujado con
   un ícono distinto al del resto del sistema, y dos ventanas modales
   armadas a mano. Lo de abajo es lo que faltaba, no adorno nuevo.
   ───────────────────────────────────────────────────────────── */

/** La foto con el sello en la esquina.

    `ProfileAvatar` no sirve acá: pide un `UserProfile` entero y esto
    es un `PublicWalker`. Lo que sí se conserva es el sello —el mismo
    de la barra, el riel y el perfil— en lugar del `BadgeCheck` suelto
    que había, que era la única marca de verificado distinta en todo
    el sistema.

    Va sello siempre y sin condición: `buscar_paseadores` solo
    devuelve paseadores con `estado_verificacion = 'aprobado'`, así
    que todo lo que llega a esta lista está verificado. */
const FotoPaseador = ({
  walker,
  medida,
}: {
  walker: PublicWalker;
  medida: number;
}) => {
  const [rota, setRota] = useState(false);

  return (
    <span
      className="relative flex-shrink-0"
      style={{ width: medida, height: medida }}
    >
      {walker.foto_perfil && !rota ? (
        <img
          src={walker.foto_perfil}
          alt=""
          aria-hidden
          onError={() => setRota(true)}
          style={{ width: medida, height: medida }}
          className="rounded-full bg-sunken object-cover"
        />
      ) : (
        <Avatar nombre={walker.nombre} size={medida} />
      )}

      <SelloVerificado
        size={Math.round(medida * 0.34)}
        title={`${walker.nombre} tiene la verificación aprobada`}
        className="pointer-events-none absolute right-0 bottom-0 translate-x-[12%] translate-y-[12%]"
      />
    </span>
  );
};

/** Disponible o no.

    Antes era una `Badge` en versalitas. Tres por fila en la rejilla
    gritaban más que el nombre de la persona. Un punto y una palabra
    dicen lo mismo y dejan que el precio mande.

    El turquesa acá está bien: es un disco, que es donde vive en la
    portada. Como texto sobre blanco no pasaría AA. */
const Disponibilidad = ({ disponible }: { disponible: boolean }) => (
  <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium">
    <span
      aria-hidden
      className={`h-2 w-2 rounded-full ${
        disponible ? "bg-accent" : "bg-ink-mute"
      }`}
    />
    <span className={disponible ? "text-ink" : "text-ink-mute"}>
      {disponible ? "Disponible" : "No disponible"}
    </span>
  </span>
);

const PildoraZona = ({ zona }: { zona: string }) => (
  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-[11.5px] font-medium text-ink-soft">
    <MapPin size={12} strokeWidth={2} aria-hidden className="shrink-0" />
    <span className="truncate">{zona}</span>
  </span>
);

/** El esqueleto de carga.

    Reemplaza al "Cargando paseadores..." suelto. No es cosmético: la
    rejilla ya ocupa su sitio antes de que lleguen los datos, así que
    el contenido no salta cuando aparecen. */
const Esqueleto = () => (
  <div
    aria-hidden
    className="flex animate-pulse flex-col bg-surface px-5 py-5 motion-reduce:animate-none"
  >
    <div className="flex items-start gap-3.5">
      <span className="h-[52px] w-[52px] shrink-0 rounded-full bg-sunken" />
      <div className="min-w-0 flex-1">
        <span className="block h-[14px] w-2/3 rounded-full bg-sunken" />
        <span className="mt-2.5 block h-[12px] w-1/2 rounded-full bg-sunken" />
        <span className="mt-2.5 block h-[22px] w-24 rounded-full bg-sunken" />
      </div>
    </div>
    <span className="mt-4 block h-[34px] rounded-[8px] bg-sunken" />
    <span className="mt-4 block h-[58px] rounded-[14px] bg-sunken" />
    <div className="mt-4 flex gap-2">
      <span className="h-[42px] flex-1 rounded-full bg-sunken" />
      <span className="h-[42px] flex-1 rounded-full bg-sunken" />
    </div>
  </div>
);

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

  const filtrando = zona !== "Todas" || busqueda.trim() !== "";

  const limpiarFiltros = () => {
    setZona("Todas");
    setBusqueda("");
  };

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
        action={
          loading ? null : (
            <p className="nums rounded-full bg-sunken px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft">
              {visibles.length}{" "}
              {visibles.length === 1 ? "paseador" : "paseadores"}
            </p>
          )
        }
      />

      <div className="flex flex-col gap-3 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[300px]">
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

        <FilterTabs
          label="Filtrar por zona"
          options={zonas}
          value={zona}
          onChange={setZona}
        />
      </div>

      {(error || message) && !solicitud && (
        <div
          aria-live="polite"
          className={`rounded-[14px] px-5 py-3 text-[13px] ${
            error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Esqueleto key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((w, i) => (
            <article
              key={w.id_usuario}
              /* La entrada escalonada llega hasta la novena tarjeta y
                 ahí se planta. Con cincuenta paseadores, un retraso
                 proporcional dejaría la última entrando tres segundos
                 tarde. */
              style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
              className="anim-rise flex flex-col bg-surface px-5 py-5"
            >
              <div className="flex items-start gap-3.5">
                <FotoPaseador walker={w} medida={52} />

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold text-ink">
                    {w.nombre}
                  </h3>

                  <div className="nums mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-ink-soft">
                    <span className="flex items-center gap-1">
                      <Star
                        size={13}
                        className="fill-warn text-warn"
                        aria-hidden
                      />
                      <span className="font-semibold text-ink">
                        {w.calificacion_promedio.toFixed(1)}
                      </span>
                      <span className="text-ink-mute">
                        ({w.total_resenas})
                      </span>
                    </span>
                    <span aria-hidden className="text-ink-mute">
                      ·
                    </span>
                    <span>{w.total_paseos} paseos</span>
                  </div>

                  <span className="mt-2 flex">
                    <PildoraZona zona={w.zona} />
                  </span>
                </div>
              </div>

              {/* El `min-h` mantiene alineadas las tarjetas de la fila
                  cuando una descripción ocupa una línea y la de al lado
                  dos; el `line-clamp` impide que una tercera las
                  desalinee al revés. */}
              <p className="mt-4 line-clamp-2 min-h-[34px] text-[12.5px] leading-snug text-ink-soft">
                {w.descripcion || "Paseador verificado por TuanisCan."}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-sunken px-4 py-3">
                <div>
                  <p className="nums text-[17px] leading-none font-semibold text-ink">
                    {colones(w.tarifa_base ?? 0)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-mute">por paseo</p>
                </div>
                <Disponibilidad disponible={w.disponible} />
              </div>

              <div className="mt-auto flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setPerfil(w)}
                  className={`${btnSecondary} flex-1`}
                >
                  Ver perfil
                </button>
                <button
                  type="button"
                  onClick={() => openRequest(w)}
                  disabled={!canOperate || !w.disponible || !w.tarifa_base}
                  className={`${btnPrimary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Solicitar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && visibles.length === 0 && (
        <EmptyState
          title={
            filtrando
              ? "No hay paseadores con ese criterio"
              : "Todavía no hay paseadores disponibles"
          }
          hint={
            filtrando
              ? "Probá con otra zona o quitá el texto de búsqueda."
              : "En cuanto administración apruebe los primeros perfiles, aparecen acá."
          }
          action={
            filtrando ? (
              <button
                type="button"
                onClick={limpiarFiltros}
                className={btnSecondary}
              >
                Ver todos
              </button>
            ) : undefined
          }
        />
      )}

      {perfil && (
        <Dialog title="Perfil del paseador" onClose={() => setPerfil(null)}>
          <div className="px-6 py-5">
            <div className="flex items-center gap-4">
              <FotoPaseador walker={perfil} medida={64} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[19px] font-semibold text-ink">
                  {perfil.nombre}
                </h3>
                <span className="mt-1.5 flex">
                  <PildoraZona zona={perfil.zona} />
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {[
                {
                  rotulo: "Calificación",
                  valor: perfil.calificacion_promedio.toFixed(1),
                },
                { rotulo: "Reseñas", valor: String(perfil.total_resenas) },
                { rotulo: "Paseos", valor: String(perfil.total_paseos) },
              ].map((dato) => (
                /* Antes estos tres eran `bg-surface` dentro de un panel
                   que también es `bg-surface`: cajas blancas invisibles
                   sobre blanco. */
                <div
                  key={dato.rotulo}
                  className="rounded-[14px] bg-sunken px-4 py-3.5"
                >
                  <p className="rotulo text-ink-mute">{dato.rotulo}</p>
                  <p className="nums mt-1.5 text-[20px] leading-none font-semibold text-ink">
                    {dato.valor}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-[13px] leading-relaxed text-ink-soft">
              {perfil.descripcion ||
                "Este paseador todavía no agregó una descripción pública."}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[14px] bg-sunken px-4 py-3">
              <div>
                <p className="nums text-[18px] leading-none font-semibold text-ink">
                  {colones(perfil.tarifa_base ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-ink-mute">por paseo</p>
              </div>
              {/* Acá decía "Disponible hoy" a secas, escrito a mano y
                  sin mirar el dato: un paseador no disponible se
                  anunciaba como disponible. */}
              <Disponibilidad disponible={perfil.disponible} />
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPerfil(null)}
                className={btnSecondary}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPerfil(null);
                  openRequest(perfil);
                }}
                disabled={
                  !canOperate || !perfil.disponible || !perfil.tarifa_base
                }
                className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Solicitar paseo
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {solicitud && (
        <Dialog title="Solicitar paseo" onClose={() => setSolicitud(null)}>
          <div className="px-6 py-5">
            {/* Con quién es el paseo va acá arriba y no en un subtítulo
                de la cabecera: es un dato, no el nombre de la ventana,
                y con la foto delante se confirma de un vistazo que se
                abrió la tarjeta que se quería. */}
            <div className="flex items-center gap-3 rounded-[14px] bg-sunken px-4 py-3">
              <FotoPaseador walker={solicitud} medida={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">
                  {solicitud.nombre}
                </p>
                <p className="truncate text-[12px] text-ink-soft">
                  {solicitud.zona}
                </p>
              </div>
              <Disponibilidad disponible={solicitud.disponible} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="rotulo text-ink-mute">Mascota</span>
                <Combo
                  className="mt-2"
                  value={form.id_mascota}
                  onChange={(v) => setForm({ ...form, id_mascota: v })}
                  disabled={!pets.length}
                  textoInactivo="No tienes mascotas registradas"
                  placeholder="Elegí una mascota"
                  options={pets.map((pet) => ({
                    value: pet.id_mascota,
                    label: pet.nombre,
                  }))}
                />
              </label>

              <label>
                <span className="rotulo flex items-center gap-1.5 text-ink-mute">
                  <CalendarDays size={13} /> Fecha
                </span>
                <input
                  type="date"
                  min={emptyRequest.fecha}
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className={`${input} mt-2`}
                />
              </label>

              <label>
                <span className="rotulo flex items-center gap-1.5 text-ink-mute">
                  <Clock size={13} /> Hora
                </span>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) =>
                    setForm({ ...form, hora_inicio: e.target.value })
                  }
                  className={`${input} mt-2`}
                />
              </label>

              <label>
                <span className="rotulo text-ink-mute">Duración</span>
                <Combo
                  className="mt-2"
                  value={form.duracion_min}
                  onChange={(v) => setForm({ ...form, duracion_min: v })}
                  options={[30, 45, 60, 90].map((m) => ({
                    value: String(m),
                    label: `${m} minutos`,
                  }))}
                />
              </label>

              <div className="rounded-[14px] bg-sunken px-4 py-3">
                <p className="rotulo text-ink-mute">Total</p>
                <p className="nums mt-1.5 text-[20px] leading-none font-semibold text-ink">
                  {colones(solicitud.tarifa_base ?? 0)}
                </p>
                {/* Dicho explícito porque el campo de al lado invita a
                    pensar lo contrario: `solicitar_paseo` copia el
                    precio de `paseadores.tarifa_base` sin mirar
                    `duracion_min`. */}
                <p className="mt-1.5 text-[11px] leading-snug text-ink-mute">
                  Tarifa única del paseador. No cambia con la duración.
                </p>
              </div>

              <label className="sm:col-span-2">
                <span className="rotulo text-ink-mute">
                  Dirección de encuentro
                </span>
                <textarea
                  rows={3}
                  value={form.direccion_encuentro}
                  onChange={(e) =>
                    setForm({ ...form, direccion_encuentro: e.target.value })
                  }
                  className={`${input} mt-2 resize-y`}
                  placeholder="Casa, condominio, parque o punto de referencia"
                />
              </label>

              {error && (
                <p
                  aria-live="polite"
                  className="rounded-[14px] bg-danger-wash px-4 py-2.5 text-[13px] text-danger sm:col-span-2"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setSolicitud(null)}
                  className={btnSecondary}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving || !pets.length}
                  onClick={() => void submitRequest()}
                  className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {saving ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <PawPrint size={14} />
                  )}
                  {saving ? "Enviando..." : "Confirmar solicitud"}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
};

export default Paseadores;
