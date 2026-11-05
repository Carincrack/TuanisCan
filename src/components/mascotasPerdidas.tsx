import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Camera, Check, CheckCircle2, Eye, MapPin, PawPrint, Phone, Search, Siren, X } from "../lib/iconos";
import { getZonas } from "../services/auth.service";
import { listPets } from "../services/pets.service";
import {
  listLostPetReports,
  listMyPetMatches,
  markLostPetFound,
  registerSighting,
  reportLostPet,
  resolveMatch,
} from "../services/lost-pets.service";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import type { I18nContextValue } from "../context/i18n-context";
import { useZonasEncadenadas } from "../hooks/useZonasEncadenadas";
import { distritoDe, normalizar as normalizarZona } from "../lib/zonas";
import type { Zona } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import type { LostPetInput, LostPetReport, PetMatch } from "../types/lost-pet.types";
import {
  Badge,
  BotonCerrarVentana,
  Confirmar,
  Dialog,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  btnPrimary,
  btnPrimaryCompacto,
  btnSecondary,
  btnSecondaryCompacto,
  colones,
  fieldLabel,
  input,
  useAvisarSiCambio,
} from "./ui";
import { Combo } from "./Combo";
import Collar, { type TonoEtiqueta } from "./Collar";
import Visor from "./Visor";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";

type T = I18nContextValue["t"];

/* El mapa para marcar el lugar. Leaflet pesa ~150 kB y solo hace falta
   cuando se abre uno de los tres formularios, no para ver la lista. */
const MapaPunto = lazy(() => import("./MapaPunto"));

/** Mientras baja el mapa: el mismo hueco que va a ocupar, sin saltos. */
const EsperaMapa = () => <div aria-hidden className="h-[330px] rounded-[14px] bg-sunken sm:h-[370px]" />;

/** Las columnas que quepan de al menos 260 px: el tamaño de la tarjeta
    lo decide ella y no el ancho de la pantalla. */
const REJILLA = "grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]";

/** Las ventanas con formulario y mapa, que van en dos columnas. */
const ANCHO_FORMULARIO = "max-w-[980px]";

/* Todas las fotos van en el mismo marco, así que se recortan. El
   recorte va cargado hacia arriba y no al centro: en una foto de una
   mascota la cara casi siempre está en la parte de arriba, y centrada
   se llevaba las orejas o media cabeza. */
const ENCUADRE = "object-cover object-[50%_25%]";

const filtros = ["Todas", "Mías", "Coincidencias", "Perdidas", "Encontradas", "Mi zona"];
const claveFiltroLabel: Record<string, string> = {
  Todas: "mascotasPerdidas.filters.all",
  Mías: "mascotasPerdidas.filters.mine",
  Coincidencias: "mascotasPerdidas.filters.matches",
  Perdidas: "mascotasPerdidas.filters.lost",
  Encontradas: "mascotasPerdidas.filters.found",
  "Mi zona": "mascotasPerdidas.filters.myZone",
};

const messageFrom = (error: unknown, t: T) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : t("mascotasPerdidas.errors.generic");

const numericValue = (value: string) => Number(value.replace(",", "."));
const parseCoords = (value: string) => {
  const match = value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  return {
    latitud: numericValue(match[1]),
    longitud: numericValue(match[2]),
  };
};

const formatDateTime = (value: string, localeTag: string) =>
  new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

/* Nicoya distrito está en Nicoya cantón, y así media Costa Rica:
   Alajuela, Cartago, Heredia, Puntarenas, Liberia, Quepos… Encadenar
   los tres niveles a secas escribía "Nicoya, Nicoya, Guanacaste". Se
   quitan las repeticiones seguidas y queda "Nicoya, Guanacaste". */
const zonaLabel = (zona: Zona | null | undefined, t: T) => {
  if (!zona) return t("mascotasPerdidas.zoneNotIndicated");

  const partes = [distritoDe(zona), zona.canton, zona.provincia]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));

  return partes
    .filter((parte, i) => i === 0 || normalizarZona(parte) !== normalizarZona(partes[i - 1]))
    .join(", ");
};

/** `id_mascota` nulo es un reporte de "encontré esta mascota, no sé
    de quién es": `nombre` ahí no es un nombre real, es el valor por
    defecto de `reportar_mascota_perdida`. Mostrarlo tal cual sonaba a
    que la mascota se llamaba "Mascota encontrada". Se titula con la
    especie, igual que en /perdidas, y la frase va en el detalle. */
const tituloReporte = (reporte: LostPetReport) => (reporte.id_mascota ? reporte.nombre : reporte.especie);

const detalleReporte = (reporte: LostPetReport, t: T) =>
  reporte.id_mascota
    ? [reporte.especie, reporte.raza].filter(Boolean).join(" · ")
    : t("mascotasPerdidas.card.someoneFound");

/* Los teléfonos se guardan tal como se escriban. Cuando la forma es
   la de Costa Rica se separa para poder leerla de un vistazo —un
   "+50688888888" seguido no se lee, se descifra—; cualquier otra cosa
   se deja intacta, que puede ser un número de otro país. */
const telefonoLegible = (valor: string) => {
  const limpio = valor.replace(/[\s.-]/g, "");
  const cr = /^(?:\+?506)?(\d{4})(\d{4})$/.exec(limpio);
  return cr ? `+506 ${cr[1]} ${cr[2]}` : valor;
};

/* Hace cuánto, para leer de un vistazo. La fecha exacta queda en el
   `title` y en la ficha. */
const haceTiempo = (valor: string, localeTag: string, estilo: Intl.RelativeTimeFormatStyle = "long") => {
  const minutos = Math.round((Date.now() - new Date(valor).getTime()) / 60_000);
  const relativo = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto", style: estilo });
  if (minutos < 60) return relativo.format(-Math.max(1, minutos), "minute");
  if (minutos < 48 * 60) return relativo.format(-Math.round(minutos / 60), "hour");
  return relativo.format(-Math.round(minutos / 1440), "day");
};

/* El estado, con la misma insignia de Mis mascotas. */
const EstadoReporte = ({ estado }: { estado: LostPetReport["estado"] }) => {
  const { t } = useTranslation();
  return (
    <Badge tono={estado === "perdida" ? "danger" : "ok"}>
      {estado === "perdida" ? t("mascotasPerdidas.card.statusLost") : t("mascotasPerdidas.card.statusFound")}
    </Badge>
  );
};

/* ── La armazón de las ventanas de esta pantalla ──
   El pie queda pegado abajo con `sticky`: la ventana hace scroll por
   dentro, y sin esto «Publicar» quedaba debajo del borde. El error va
   en el pie por lo mismo, al lado del botón que lo provocó. */
const PieVentana = ({ error, children }: { error?: string; children: ReactNode }) => (
  <footer className="sticky bottom-0 z-10 mt-auto rounded-none border-t border-sunken bg-surface px-5 py-3 sm:px-6">
    {error && (
      <p role="alert" className="mb-3 rounded-[12px] bg-danger-wash px-4 py-2.5 text-[13px] text-danger">
        {error}
      </p>
    )}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
  </footer>
);

/* Los tres formularios piden lo mismo: unos datos y un punto en el
   mapa. Lado a lado caben enteros en la ventana sin hacer scroll; uno
   debajo del otro, el mapa empujaba la mitad del formulario afuera. */
const FormularioConMapa = ({
  onSubmit,
  datos,
  mapa,
  error,
  ocupado,
  textoEnviar,
  textoEnviando,
}: {
  onSubmit: (evento: FormEvent) => void;
  datos: ReactNode;
  mapa: ReactNode;
  error: string;
  ocupado: boolean;
  textoEnviar: string;
  textoEnviando: string;
}) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} className="flex min-h-full flex-col">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2 lg:gap-6">
        <div className="grid content-start gap-4">{datos}</div>
        <div className="min-w-0">
          <Suspense fallback={<EsperaMapa />}>{mapa}</Suspense>
        </div>
      </div>
      <PieVentana error={error}>
        <BotonCerrarVentana className={btnSecondary}>{t("mascotasPerdidas.cancel")}</BotonCerrarVentana>
        <button type="submit" className={btnPrimary} disabled={ocupado}>
          {ocupado ? textoEnviando : textoEnviar}
        </button>
      </PieVentana>
    </form>
  );
};

/* La foto del reporte. El `<input type="file">` queda escondido y la
   etiqueta hace de botón: el control nativo no se deja vestir y decía
   «No se eligió ningún archivo». Acá se ve la foto elegida, que es lo
   que hay que confirmar. La validación sigue en cada `submit`. */
const CampoFoto = ({ etiqueta, foto, onFoto }: { etiqueta: string; foto: File | null; onFoto: (foto: File | null) => void }) => {
  const { t } = useTranslation();
  const vista = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  return (
    <label className={fieldLabel}>
      {etiqueta}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="peer sr-only"
        onChange={(evento) => onFoto(evento.target.files?.[0] ?? null)}
      />
      <span className="campo-libre flex cursor-pointer items-center gap-3 rounded-[14px] bg-sunken p-2 pr-4 transition-[filter] duration-150 hover:brightness-[0.97] peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-accent">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-surface text-accent-dark">
          {vista ? <img src={vista} alt="" className="h-full w-full object-cover" /> : <Camera size={20} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-ink">
            {foto ? foto.name : t("mascotasPerdidas.photoField.choose")}
          </span>
          <span className="mt-0.5 block text-[12px] text-ink-soft">
            {foto ? t("mascotasPerdidas.photoField.change") : t("mascotasPerdidas.photoField.hint")}
          </span>
        </span>
      </span>
    </label>
  );
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
  const { t } = useTranslation();
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
  useAvisarSiCambio(values, Boolean(photo));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedPet = pets.find((pet) => pet.id_mascota === values.id_mascota) ?? null;
  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

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
      setError(t("mascotasPerdidas.errors.chooseLostPet"));
      return;
    }
    if (!values.zona_id) {
      setError(t("mascotasPerdidas.errors.chooseLostZone"));
      return;
    }
    if (!photo) {
      setError(t("mascotasPerdidas.errors.addPhoto"));
      return;
    }
    if (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024) {
      setError(t("mascotasPerdidas.errors.invalidPhoto"));
      return;
    }
    const coords = parseCoords(values.ubicacion);
    if (!coords) {
      setError(t("mascotasPerdidas.errors.invalidLocation"));
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
      setError(t("mascotasPerdidas.errors.selectRegisteredPet"));
      return;
    }
    if (!Number.isFinite(payload.latitud) || payload.latitud < -90 || payload.latitud > 90) {
      setError(t("mascotasPerdidas.errors.invalidLatitude"));
      return;
    }
    if (!Number.isFinite(payload.longitud) || payload.longitud < -180 || payload.longitud > 180) {
      setError(t("mascotasPerdidas.errors.invalidLongitude"));
      return;
    }
    if (payload.recompensa != null && (!Number.isFinite(payload.recompensa) || payload.recompensa < 0)) {
      setError(t("mascotasPerdidas.errors.invalidReward"));
      return;
    }
    setBusy(true);
    try {
      await reportLostPet(userId, payload, photo);
      await onSaved();
      onClose();
      /* El aviso va DESPUÉS de cerrar la ventana. Al revés queda
         tapado por el modal que se está yendo. */
      aviso.ok(t("mascotasPerdidas.reportForm.published", { nombre: values.nombre }), {
        detalle: t("mascotasPerdidas.reportForm.publishedDetail"),
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotasPerdidas.errors.publishFailed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormularioConMapa
      onSubmit={submit}
      error={error}
      ocupado={busy}
      textoEnviar={t("mascotasPerdidas.reportForm.publish")}
      textoEnviando={t("mascotasPerdidas.reportForm.publishing")}
      datos={
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.registeredPet")}
              <Combo
                required
                value={values.id_mascota}
                onChange={selectPet}
                placeholder={t("mascotasPerdidas.reportForm.choosePet")}
                options={pets.map((pet) => ({
                  value: pet.id_mascota,
                  label: `${pet.nombre} · ${pet.especie}`,
                }))}
              />
            </label>
            <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.zone")}
              <Combo
                required
                value={values.zona_id}
                onChange={(v) => update("zona_id", v)}
                placeholder={t("mascotasPerdidas.reportForm.chooseZone")}
                options={zonas.map((zona) => ({
                  value: zona.id_zona,
                  label: `${zona.nombre} · ${zona.canton}`,
                }))}
              />
            </label>
            <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.contact")}<input className={input} required maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} /></label>
            <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.reward")}<input className={input} inputMode="numeric" value={values.recompensa} onChange={(e) => update("recompensa", e.target.value)} /></label>
          </div>
          <CampoFoto etiqueta={t("mascotasPerdidas.reportForm.photo")} foto={photo} onFoto={setPhoto} />
          <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.descriptionLabel")}<textarea className={`${input} min-h-28 resize-y`} required maxLength={2000} value={values.descripcion} onChange={(e) => update("descripcion", e.target.value)} /></label>
        </>
      }
      mapa={
        <MapaPunto
          etiqueta={t("mascotasPerdidas.reportForm.whereLost")}
          pista={t("mascotasPerdidas.reportForm.whereLostHint")}
          texto={values.ubicacion}
          onTexto={(texto) => update("ubicacion", texto)}
          requerido
        />
      }
    />
  );
};

/* No pide elegir una mascota propia: es justo lo contrario del reporte
   de arriba, alguien encontró un animal que no es suyo. Con especie,
   zona y señas alcanza para que el sistema busque coincidencias entre
   las mascotas perdidas registradas de esa zona (`generar_matches_reporte`)
   y avise a un posible dueño. */
const FoundPetForm = ({
  userId,
  zonas,
  profilePhone,
  profileZonaId,
  onClose,
  onSaved,
}: {
  userId: string;
  zonas: Zona[];
  profilePhone?: string | null;
  profileZonaId?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [values, setValues] = useState({
    especie: "Perro",
    raza: "",
    zona_id: profileZonaId ?? "",
    contacto: profilePhone ?? "",
    descripcion: "",
    ubicacion: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  useAvisarSiCambio(values, Boolean(photo));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!values.zona_id) {
      setError(t("mascotasPerdidas.errors.chooseFoundZone"));
      return;
    }
    if (!photo) {
      setError(t("mascotasPerdidas.errors.addPhoto"));
      return;
    }
    if (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024) {
      setError(t("mascotasPerdidas.errors.invalidPhoto"));
      return;
    }
    const coords = parseCoords(values.ubicacion);
    if (!coords) {
      setError(t("mascotasPerdidas.errors.invalidLocation"));
      return;
    }
    const payload: LostPetInput = {
      id_mascota: null,
      nombre: null,
      especie: values.especie.trim(),
      raza: values.raza.trim() || null,
      zona_id: values.zona_id,
      contacto: values.contacto.trim() || null,
      descripcion: values.descripcion.trim(),
      latitud: coords.latitud,
      longitud: coords.longitud,
      recompensa: null,
    };
    if (!payload.especie) {
      setError(t("mascotasPerdidas.errors.missingSpecies"));
      return;
    }
    if (!Number.isFinite(payload.latitud) || payload.latitud < -90 || payload.latitud > 90) {
      setError(t("mascotasPerdidas.errors.invalidLatitude"));
      return;
    }
    if (!Number.isFinite(payload.longitud) || payload.longitud < -180 || payload.longitud > 180) {
      setError(t("mascotasPerdidas.errors.invalidLongitude"));
      return;
    }
    setBusy(true);
    try {
      await reportLostPet(userId, payload, photo);
      await onSaved();
      onClose();
      aviso.ok(t("mascotasPerdidas.foundForm.published"), {
        detalle: t("mascotasPerdidas.foundForm.publishedDetail"),
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotasPerdidas.errors.publishFailed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormularioConMapa
      onSubmit={submit}
      error={error}
      ocupado={busy}
      textoEnviar={t("mascotasPerdidas.foundForm.publish")}
      textoEnviando={t("mascotasPerdidas.foundForm.publishing")}
      datos={
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabel}>{t("mascotasPerdidas.foundForm.species")}<input className={input} required maxLength={50} value={values.especie} onChange={(e) => update("especie", e.target.value)} /></label>
            <label className={fieldLabel}>{t("mascotasPerdidas.foundForm.breed")}<input className={input} maxLength={100} placeholder={t("mascotasPerdidas.foundForm.breedPlaceholder")} value={values.raza} onChange={(e) => update("raza", e.target.value)} /></label>
            <label className={fieldLabel}>{t("mascotasPerdidas.foundForm.zone")}
              <Combo
                required
                value={values.zona_id}
                onChange={(v) => update("zona_id", v)}
                placeholder={t("mascotasPerdidas.foundForm.chooseZone")}
                options={zonas.map((zona) => ({
                  value: zona.id_zona,
                  label: `${zona.nombre} · ${zona.canton}`,
                }))}
              />
            </label>
            <label className={fieldLabel}>{t("mascotasPerdidas.foundForm.contact")}<input className={input} required maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} /></label>
          </div>
          <CampoFoto etiqueta={t("mascotasPerdidas.foundForm.photo")} foto={photo} onFoto={setPhoto} />
          <label className={fieldLabel}>{t("mascotasPerdidas.foundForm.descriptionLabel")}<textarea className={`${input} min-h-28 resize-y`} required maxLength={2000} value={values.descripcion} onChange={(e) => update("descripcion", e.target.value)} /></label>
        </>
      }
      mapa={
        <MapaPunto
          etiqueta={t("mascotasPerdidas.foundForm.whereFound")}
          pista={t("mascotasPerdidas.foundForm.whereFoundHint")}
          texto={values.ubicacion}
          onTexto={(texto) => update("ubicacion", texto)}
          requerido
        />
      }
    />
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
  const { t } = useTranslation();
  const [values, setValues] = useState({
    ubicacion: "",
    zona_id: report.zona_id,
    direccion: "",
    contacto: profilePhone ?? "",
    comentario: "",
  });
  useAvisarSiCambio(values);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const coords = parseCoords(values.ubicacion);
    if (!coords) {
      setError(t("mascotasPerdidas.errors.invalidLocation"));
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
      setError(t("mascotasPerdidas.errors.invalidLatitude"));
      setBusy(false);
      return;
    }
    if (!Number.isFinite(payload.longitud) || payload.longitud < -180 || payload.longitud > 180) {
      setError(t("mascotasPerdidas.errors.invalidLongitude"));
      setBusy(false);
      return;
    }
    try {
      await registerSighting(payload);
      await onSaved();
      onClose();
      aviso.ok(t("mascotasPerdidas.sightingForm.registered"), {
        detalle: t("mascotasPerdidas.sightingForm.registeredDetail", { nombre: tituloReporte(report) }),
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotasPerdidas.errors.registerSightingFailed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormularioConMapa
      onSubmit={submit}
      error={error}
      ocupado={busy}
      textoEnviar={t("mascotasPerdidas.sightingForm.register")}
      textoEnviando={t("mascotasPerdidas.sightingForm.registering")}
      datos={
        <>
          {/* La foto a la vista: quien avisa tiene que poder comparar
              con el animal que vio antes de mandar nada. */}
          <div className="flex items-center gap-3 rounded-[14px] bg-accent-wash p-2.5">
            <img src={report.fotoUrl ?? "/mock/dog-nube.jpg"} alt="" className={`size-16 shrink-0 rounded-[10px] bg-sunken ${ENCUADRE}`} />
            <div className="min-w-0 text-accent-deep">
              <p className="truncate text-[15px] font-semibold">{tituloReporte(report)}</p>
              <p className="mt-0.5 truncate text-[12.5px]">{detalleReporte(report, t)}</p>
              <p className="truncate text-[12.5px]">{zonaLabel(report.zona, t)}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabel}>{t("mascotasPerdidas.sightingForm.zone")}
              <Combo
                value={values.zona_id}
                onChange={(v) => update("zona_id", v)}
                vacio
                placeholder={t("mascotasPerdidas.sightingForm.noZone")}
                options={zonas.map((zona) => ({
                  value: zona.id_zona,
                  label: `${zona.nombre} · ${zona.canton}`,
                }))}
              />
            </label>
            <label className={fieldLabel}>{t("mascotasPerdidas.sightingForm.contact")}
              <input className={input} maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} />
            </label>
          </div>
          <label className={fieldLabel}>{t("mascotasPerdidas.sightingForm.address")}
            <input className={input} maxLength={300} value={values.direccion} onChange={(e) => update("direccion", e.target.value)} />
          </label>
          <label className={fieldLabel}>{t("mascotasPerdidas.sightingForm.comment")}<textarea className={`${input} min-h-24 resize-y`} maxLength={1000} value={values.comentario} onChange={(e) => update("comentario", e.target.value)} /></label>
        </>
      }
      mapa={
        <MapaPunto
          etiqueta={t("mascotasPerdidas.sightingForm.whereSeen")}
          pista={t("mascotasPerdidas.sightingForm.whereSeenHint")}
          texto={values.ubicacion}
          onTexto={(texto) => update("ubicacion", texto)}
          referencia={
            Number.isFinite(report.latitud) && Number.isFinite(report.longitud)
              ? { latitud: report.latitud, longitud: report.longitud, nombre: tituloReporte(report) }
              : null
          }
          requerido
        />
      }
    />
  );
};

/* ── Los avistamientos ──
   Un solo mapa con todos los puntos numerados: a quien busca a su
   mascota le sirve ver hacia dónde se movió, y eso no se lee en un
   mapita por avistamiento. El número enlaza cada punto con su renglón
   de abajo; el 1 es el más reciente y va en turquesa. */
const pinNumerado = (numero: number) =>
  divIcon({
    className: "",
    html: `<span class="pin-avistamiento${numero === 1 ? " is-ultimo" : ""}">${numero}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const SightingDetails = ({ report }: { report: LostPetReport }) => {
  const { t, localeTag } = useTranslation();
  const lista = report.avistamientos;

  if (lista.length === 0) {
    return <EmptyState title={t("mascotasPerdidas.sightingDetails.empty.title")} hint={t("mascotasPerdidas.sightingDetails.empty.hint")} />;
  }

  return (
    <div className="grid gap-4">
      {/* `isolate`: los paneles de Leaflet llevan z-index 400 y, sin una
          capa propia, se montan sobre lo demás. */}
      <div className="isolate overflow-hidden rounded-[14px] bg-sunken">
        <MapContainer
          bounds={latLngBounds(lista.map((item) => [item.latitud, item.longitud]))}
          boundsOptions={{ padding: [40, 40], maxZoom: 15 }}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          className="h-[220px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {lista.map((item, indice) => (
            <Marker
              key={item.id_avistamiento}
              position={[item.latitud, item.longitud]}
              icon={pinNumerado(indice + 1)}
              zIndexOffset={lista.length - indice}
              keyboard={false}
            />
          ))}
        </MapContainer>
      </div>

      <ol className="divide-y divide-sunken">
        {lista.map((item, indice) => (
          <li key={item.id_avistamiento} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span
              aria-hidden
              className={`nums grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white ${
                indice === 0 ? "bg-accent-dark" : "bg-rail"
              }`}
            >
              {indice + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-[14px] font-semibold text-ink">{item.direccion || zonaLabel(item.zona, t)}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${item.latitud},${item.longitud}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12.5px] font-semibold text-accent-dark hover:underline"
                >
                  {t("mascotasPerdidas.sightingDetails.viewMap")}
                </a>
              </div>
              <p className="nums mt-0.5 text-[12.5px] text-ink-soft">
                {formatDateTime(item.fecha, localeTag)}
                {item.direccion ? ` · ${zonaLabel(item.zona, t)}` : ""}
              </p>
              {item.comentario && <p className="mt-1.5 text-[13.5px] leading-snug whitespace-pre-wrap text-ink">{item.comentario}</p>}
              {item.contacto && (
                <a
                  href={`tel:${item.contacto.replace(/[^+\d]/g, "")}`}
                  className="nums mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink hover:underline"
                >
                  <Phone size={13} aria-hidden />
                  {telefonoLegible(item.contacto)}
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

/* ── La ficha de un reporte ──
   Armada como la ventana «Gestión» de Mis mascotas: arriba el resumen
   con la foto y las acciones, y debajo secciones con sus casillas. La
   tarjeta de la rejilla solo dice lo que hace falta para reconocer a
   la mascota; todo lo demás vive acá, y por eso la tarjeta puede ser
   chica. */
const FichaReporte = ({
  reporte,
  verAvistamientos,
  puedeCerrar,
  onVerFoto,
  onVi,
  onCerrarCaso,
}: {
  reporte: LostPetReport;
  /** Solo quien reportó y el administrador: traen datos de contacto. */
  verAvistamientos: boolean;
  puedeCerrar: boolean;
  onVerFoto: () => void;
  onVi: () => void;
  onCerrarCaso: () => void;
}) => {
  const { t, localeTag } = useTranslation();
  const titulo = tituloReporte(reporte);
  const cuantos = reporte.avistamientos.length;
  const ultimo = reporte.avistamientos[0];
  const sinDato = t("mascotasPerdidas.ficha.notIndicated");

  const datos: [string, ReactNode][] = [
    [t("mascotasPerdidas.ficha.species"), reporte.especie],
    [t("mascotasPerdidas.ficha.breed"), reporte.raza || sinDato],
    [t("mascotasPerdidas.card.zoneLabel"), zonaLabel(reporte.zona, t)],
    [t("mascotasPerdidas.card.reportedLabel"), <span className="nums">{formatDateTime(reporte.fecha_reporte, localeTag)}</span>],
    [
      t("mascotasPerdidas.card.contactLabel"),
      reporte.contacto ? (
        <a href={`tel:${reporte.contacto.replace(/[^+\d]/g, "")}`} className="nums hover:underline">{telefonoLegible(reporte.contacto)}</a>
      ) : (
        sinDato
      ),
    ],
    [
      t("mascotasPerdidas.ficha.reward"),
      reporte.recompensa != null ? <span className="nums">{colones(reporte.recompensa)}</span> : t("mascotasPerdidas.ficha.noReward"),
    ],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-sunken px-6 py-5">
        <button
          type="button"
          onClick={onVerFoto}
          aria-label={t("mascotasPerdidas.card.viewPhotoAria", { nombre: titulo })}
          className="size-20 shrink-0 cursor-zoom-in overflow-hidden rounded-full bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <img
            src={reporte.fotoUrl ?? "/mock/dog-nube.jpg"}
            alt={t("mascotasPerdidas.card.photoAlt", { nombre: titulo })}
            className={`h-full w-full ${ENCUADRE}`}
          />
        </button>
        <div className="min-w-0 flex-1 basis-[180px]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="titular truncate text-[19px] text-ink">{titulo}</p>
            <EstadoReporte estado={reporte.estado} />
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            {reporte.id_mascota
              ? t("mascotasPerdidas.matches.reportedAgo", { cuando: haceTiempo(reporte.fecha_reporte, localeTag) })
              : t("mascotasPerdidas.card.someoneFound")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`https://www.google.com/maps/search/?api=1&query=${reporte.latitud},${reporte.longitud}`} target="_blank" rel="noreferrer" className={btnSecondaryCompacto}>
            <MapPin size={14} />
            {t("mascotasPerdidas.card.location")}
          </a>
          {puedeCerrar && (
            <button type="button" className={btnSecondaryCompacto} onClick={onCerrarCaso}>
              <CheckCircle2 size={14} />
              {t("mascotasPerdidas.card.foundIt")}
            </button>
          )}
          {reporte.estado === "perdida" && (
            <button type="button" className={btnPrimaryCompacto} onClick={onVi}>
              <Eye size={14} />
              {t("mascotasPerdidas.card.iSawThisPet")}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-7 px-6 py-6">
        <section>
          <h3 className="rotulo text-ink-mute">{t("mascotasPerdidas.ficha.data")}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {datos.map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-[14px] bg-sunken px-4 py-3">
                <dt className="rotulo text-ink-mute">{rotulo}</dt>
                <dd className="mt-1 text-[13px] break-words text-ink">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        {reporte.descripcion && (
          <section>
            <h3 className="rotulo text-ink-mute">{t("mascotasPerdidas.ficha.description")}</h3>
            <p className="mt-3 rounded-[14px] bg-sunken px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{reporte.descripcion}</p>
          </section>
        )}

        <section>
          <h3 className="rotulo text-ink-mute">{t("mascotasPerdidas.ficha.sightings")}</h3>
          <div className="mt-3">
            {verAvistamientos ? (
              <SightingDetails report={reporte} />
            ) : (
              <div className="rounded-[14px] bg-sunken px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">
                  {cuantos} {cuantos === 1 ? t("mascotasPerdidas.card.sightingSingular") : t("mascotasPerdidas.card.sightingPlural")}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">
                  {ultimo
                    ? t("mascotasPerdidas.card.lastSighting", { lugar: ultimo.direccion || zonaLabel(ultimo.zona, t), fecha: formatDateTime(ultimo.fecha, localeTag) })
                    : t("mascotasPerdidas.card.noSightings")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

/* ── Las etiquetas de las tarjetas ──
   Hay dos, y las dos saben hablar de los tres casos: `tono` decide el
   color. Quedan por fuera de la foto porque se salen de la tarjeta, y
   dejan pasar los clics para no taparla.

   La cinta va cosida a la tarjeta y le da la vuelta al borde izquierdo,
   como la tela de un collar. Su forma está en `.cinta-estado`. El
   collar vive en `Collar.tsx`, porque también lo usa /perdidas. */
const Cinta = ({ texto, tono }: { texto: string; tono: TonoEtiqueta }) => (
  <span className={`cinta-estado cinta-estado--${tono}`}>
    <span className="cinta-estado__tira">
      <PawPrint size={14} strokeWidth={2.4} aria-hidden />
      {texto}
    </span>
  </span>
);

/* La etiqueta que llevan todas las tarjetas. Están las dos listas: para
   volver a la cinta basta cambiar `collar` por `cinta` en la última
   línea. */
const ETIQUETAS = { cinta: Cinta, collar: Collar };
const Etiqueta = ETIQUETAS.collar;

const EtiquetaEstado = ({ estado }: { estado: LostPetReport["estado"] }) => {
  const { t } = useTranslation();
  return estado === "perdida" ? (
    <Etiqueta texto={t("mascotasPerdidas.card.statusLost")} tono="perdida" />
  ) : (
    <Etiqueta texto={t("mascotasPerdidas.card.statusFound")} tono="encontrada" />
  );
};

/* ── La tarjeta de la rejilla ──
   La misma de Mis mascotas —foto limpia, insignia, nombre con la
   especie a la derecha, tres casillas y la acción abajo— en una talla
   menor: acá hay muchas más y se recorren buscando. Sin giro ni
   rebote; lo que se mueve distrae de lo que se busca. Tocar la foto la
   abre a pantalla completa, sin recortar: acá se recorta para que
   todas compartan el marco, y allá se ve entera para reconocerla. */
const TarjetaReporte = ({
  reporte,
  onVerFoto,
  onAbrir,
  onVi,
}: {
  reporte: LostPetReport;
  onVerFoto: () => void;
  onAbrir: () => void;
  onVi: () => void;
}) => {
  const { t, localeTag } = useTranslation();
  const titulo = tituloReporte(reporte);
  const cuantos = reporte.avistamientos.length;
  const perdida = reporte.estado === "perdida";

  return (
    <article className="relative flex min-w-0 flex-col rounded-[18px] bg-surface">
      <button
        type="button"
        onClick={onVerFoto}
        aria-label={t("mascotasPerdidas.card.viewPhotoAria", { nombre: titulo })}
        className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-t-[18px] bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <img
          src={reporte.fotoUrl ?? "/mock/dog-nube.jpg"}
          alt={t("mascotasPerdidas.card.photoAlt", { nombre: titulo })}
          loading="lazy"
          className={`h-full w-full ${ENCUADRE}`}
        />
        {/* La recompensa es un hueso: el premio de la historia. */}
        {reporte.recompensa != null && (
          <span className="hueso-recompensa nums" title={t("mascotasPerdidas.card.reward", { monto: colones(reporte.recompensa) })}>
            {colones(reporte.recompensa)}
          </span>
        )}
      </button>
      <EtiquetaEstado estado={reporte.estado} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-[17px] font-semibold text-ink">{titulo}</h3>
          {reporte.id_mascota && <span className="shrink-0 text-[11.5px] text-ink-mute">{reporte.especie}</span>}
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">
          {reporte.id_mascota ? reporte.raza || reporte.especie : t("mascotasPerdidas.card.someoneFound")}
        </p>

        <dl className="mt-3 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-2">
          <div className="rounded-[10px] bg-sunken px-2.5 py-2" title={zonaLabel(reporte.zona, t)}>
            <dt className="rotulo text-ink-mute">{t("mascotasPerdidas.card.zoneLabel")}</dt>
            <dd className="mt-0.5 truncate text-[12px] text-ink">{reporte.zona?.canton || zonaLabel(reporte.zona, t)}</dd>
          </div>
          <div className="rounded-[10px] bg-sunken px-2.5 py-2" title={formatDateTime(reporte.fecha_reporte, localeTag)}>
            <dt className="rotulo text-ink-mute">{t("mascotasPerdidas.card.whenLabel")}</dt>
            <dd className="nums mt-0.5 truncate text-[12px] text-ink">{haceTiempo(reporte.fecha_reporte, localeTag, "narrow")}</dd>
          </div>
          <div
            className="rounded-[10px] bg-sunken px-2.5 py-2"
            title={`${cuantos} ${cuantos === 1 ? t("mascotasPerdidas.card.sightingSingular") : t("mascotasPerdidas.card.sightingPlural")}`}
          >
            <dt className="rotulo text-ink-mute">{t("mascotasPerdidas.card.seenLabel")}</dt>
            <dd className="nums mt-0.5 text-[12px] text-ink">{cuantos}</dd>
          </div>
        </dl>

        <div className="mt-auto flex gap-2 pt-3">
          <button type="button" className={`${btnSecondaryCompacto} ${perdida ? "" : "flex-1"}`} onClick={onAbrir}>
            {t("mascotasPerdidas.card.openDetails")}
          </button>
          {perdida && (
            <button type="button" className={`${btnPrimaryCompacto} flex-1 whitespace-nowrap`} onClick={onVi}>
              <Eye size={14} />
              {t("mascotasPerdidas.card.iSawThisPet")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

/* ── Una coincidencia por reporte ──
   La tabla `matches` guarda una fila por cada par reporte + mascota, y
   la base toma como candidata a toda mascota de la misma especie cuyo
   dueño viva en la zona del reporte, esté perdida o no. Con varias
   mascotas en casa, un solo reporte llegaba como varias coincidencias.

   Acá se juntan por reporte y se pregunta por una sola mascota: la que
   sí está reportada como perdida y, si ninguna lo está, la de mayor
   puntaje. `grupo` guarda todas, para descartarlas juntas. */
interface Coincidencia {
  principal: PetMatch;
  grupo: PetMatch[];
}

const primeroLaReportada = (a: PetMatch, b: PetMatch) =>
  Number(b.mascotaReportada) - Number(a.mascotaReportada) || b.puntaje_coincidencia - a.puntaje_coincidencia;

const agruparCoincidencias = (matches: PetMatch[]): Coincidencia[] => {
  const porReporte = new Map<string, PetMatch[]>();
  for (const match of matches) {
    if (match.estado_match !== "pendiente" || match.estado_reporte !== "perdida") continue;
    porReporte.set(match.id_reporte, [...(porReporte.get(match.id_reporte) ?? []), match]);
  }
  return [...porReporte.values()]
    .map((grupo) => ({ principal: [...grupo].sort(primeroLaReportada)[0], grupo }))
    .sort((a, b) => primeroLaReportada(a.principal, b.principal));
};

/* La tarjeta de una coincidencia. Hermana de `TarjetaReporte`: misma
   foto, misma etiqueta y mismas casillas, pero acá la pregunta es el
   título y las dos respuestas nombran a la mascota. La descripción va
   a la vista porque es lo que hay que comparar. */
const TarjetaCoincidencia = ({
  match,
  zona,
  ocupada,
  onVerFoto,
  onResolver,
}: {
  match: PetMatch;
  zona: Zona | null;
  ocupada: boolean;
  onVerFoto: () => void;
  onResolver: (estado: "confirmado" | "descartado") => void;
}) => {
  const { t, localeTag } = useTranslation();

  return (
    <article className="relative flex min-w-0 flex-col rounded-[18px] bg-surface">
      <button
        type="button"
        onClick={onVerFoto}
        aria-label={t("mascotasPerdidas.matches.viewPhotoAria")}
        className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-t-[18px] bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <img
          src={match.fotoUrl ?? "/mock/dog-nube.jpg"}
          alt={t("mascotasPerdidas.matches.photoAlt", { nombre: match.mascotaNombre })}
          loading="lazy"
          className={`h-full w-full ${ENCUADRE}`}
        />
      </button>
      <Etiqueta texto={t("mascotasPerdidas.matches.singular")} tono="coincidencia" />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-[17px] font-semibold text-ink">{t("mascotasPerdidas.matches.isThis", { nombre: match.mascotaNombre })}</h3>
          <span className="shrink-0 text-[11.5px] text-ink-mute">{match.especie}</span>
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">{t("mascotasPerdidas.card.someoneFound")}</p>

        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[10px] bg-sunken px-2.5 py-2" title={zonaLabel(zona, t)}>
            <dt className="rotulo text-ink-mute">{t("mascotasPerdidas.card.zoneLabel")}</dt>
            <dd className="mt-0.5 truncate text-[12px] text-ink">{zona?.canton || zonaLabel(zona, t)}</dd>
          </div>
          <div className="rounded-[10px] bg-sunken px-2.5 py-2" title={formatDateTime(match.fecha_reporte, localeTag)}>
            <dt className="rotulo text-ink-mute">{t("mascotasPerdidas.card.whenLabel")}</dt>
            <dd className="nums mt-0.5 truncate text-[12px] text-ink">{haceTiempo(match.fecha_reporte, localeTag, "narrow")}</dd>
          </div>
        </dl>

        {match.descripcion && (
          <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-snug text-ink" title={match.descripcion}>
            {match.descripcion}
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <button
            type="button"
            className={`${btnSecondaryCompacto} min-w-0 disabled:opacity-60`}
            disabled={ocupada}
            onClick={() => onResolver("descartado")}
          >
            <X size={14} className="shrink-0" />
            <span className="truncate">{t("mascotasPerdidas.matches.notHer", { nombre: match.mascotaNombre })}</span>
          </button>
          <button
            type="button"
            className={`${btnPrimaryCompacto} min-w-0 disabled:opacity-60`}
            disabled={ocupada}
            onClick={() => onResolver("confirmado")}
          >
            <Check size={14} className="shrink-0" />
            <span className="truncate">{t("mascotasPerdidas.matches.yesItsHer", { nombre: match.mascotaNombre })}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

const MascotasPerdidas = () => {
  const { user, getProfile, isAdmin } = useAuth();
  const { t } = useTranslation();
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
  const [reportingFound, setReportingFound] = useState(false);
  const [sighting, setSighting] = useState<LostPetReport | null>(null);
  const [ficha, setFicha] = useState<LostPetReport | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState<{ src: string; alt: string } | null>(null);
  const [cerrandoCaso, setCerrandoCaso] = useState<LostPetReport | null>(null);
  const [cerrandoOcupado, setCerrandoOcupado] = useState(false);
  const [matches, setMatches] = useState<PetMatch[]>([]);
  const [resolviendoMatch, setResolviendoMatch] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [zonasData, petsData, profile] = await Promise.all([
        getZonas(),
        listPets().catch(() => []),
        getProfile(),
      ]);
      setZonas(zonasData);
      setPets(petsData);
      setProfileZonaId(profile?.zona_id ?? null);
      setProfilePhone(profile?.telefono ?? null);
      // Que esto falle no debe tumbar la pantalla: es un extra sobre
      // el listado, no el listado en sí.
      setMatches(await listMyPetMatches(petsData).catch(() => []));
    } catch (cause) {
      setError(messageFrom(cause, t));
    }
  }, [getProfile, t]);

  useEffect(() => { void load(); }, [load]);

  const territorio = useZonasEncadenadas(zonas);

  /* Las coincidencias ya están cargadas y no dependen de los reportes:
     para la consulta esa pestaña cuenta como «Todas». Así, entrar y
     salir de ella no vuelve a pedir la lista. */
  const filtroReportes = filtro === "Coincidencias" ? "Todas" : filtro;

  const loadReportes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (filtroReportes === "Mi zona" && !profileZonaId) {
        setReportes([]);
        return;
      }

      const reportesData = await listLostPetReports({
        ...(filtroReportes === "Mi zona" ? { zonaId: profileZonaId! } : {}),
        ...(territorio.provincia !== "Todas" ? { provincia: territorio.provincia } : {}),
        ...(territorio.canton !== "Todos" ? { canton: territorio.canton } : {}),
        ...(territorio.distrito !== "Todos" ? { distrito: territorio.distrito } : {}),
        ...(filtroReportes === "Perdidas" ? { estado: "perdida" as const } : {}),
        ...(filtroReportes === "Encontradas" ? { estado: "encontrada" as const } : {}),
      });
      setReportes(reportesData);
    } catch (cause) {
      setError(messageFrom(cause, t));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filtroReportes,
    profileZonaId,
    territorio.provincia,
    territorio.canton,
    territorio.distrito,
  ]);

  useEffect(() => { void loadReportes(); }, [loadReportes]);

  const refresh = useCallback(async () => {
    await Promise.all([load(), loadReportes()]);
  }, [load, loadReportes]);

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
          (filtro === "Mías" && Boolean(user) && reporte.id_usuario_reporta === user?.id) ||
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
    user,
    territorio.provincia,
    territorio.canton,
    territorio.distrito,
  ]);

  const coincidencias = useMemo(() => agruparCoincidencias(matches), [matches]);
  const zonaDe = useCallback((id: string | null) => zonas.find((zona) => zona.id_zona === id) ?? null, [zonas]);

  /* La búsqueda y la zona de la barra también filtran esta pestaña:
     con muchas coincidencias, es como se llega a la que importa. */
  const coincidenciasVisibles = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase("es");
    return coincidencias.filter(({ principal }) => {
      const zona = zonaDe(principal.zona_id);
      const text = [principal.mascotaNombre, principal.especie, principal.descripcion, zona?.nombre, zona?.canton, zona?.provincia, zona?.distrito]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");
      return territorio.cubre(zona) && (!query || text.includes(query));
    });
  // `territorio` is recreated on render; its primitive selections are the real dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, coincidencias, zonaDe, territorio.provincia, territorio.canton, territorio.distrito]);

  const enCoincidencias = filtro === "Coincidencias";
  const cuantosResultados = enCoincidencias ? coincidenciasVisibles.length : visibles.length;

  const verFotoReporte = (reporte: LostPetReport) =>
    setFotoAbierta({
      src: reporte.fotoUrl ?? "/mock/dog-nube.jpg",
      alt: t("mascotasPerdidas.card.photoAlt", { nombre: tituloReporte(reporte) }),
    });

  /* Confirmar es sobre una mascota: la base descarta sola a las demás
     candidatas del reporte. Descartar es sobre el reporte entero: si
     no, «No es Luna» traería enseguida «¿Es Toby?» por la misma foto. */
  const resolveMyMatch = async ({ principal, grupo }: Coincidencia, estado: "confirmado" | "descartado") => {
    setResolviendoMatch(principal.id_match);
    try {
      if (estado === "confirmado") {
        await resolveMatch(principal.id_match, "confirmado");
      } else {
        await Promise.all(grupo.map((match) => resolveMatch(match.id_match, "descartado")));
      }
      await refresh();
      aviso.ok(
        estado === "confirmado" ? t("mascotasPerdidas.matches.confirmed", { nombre: principal.mascotaNombre }) : t("mascotasPerdidas.matches.discarded"),
        {
          detalle:
            estado === "confirmado"
              ? t("mascotasPerdidas.matches.confirmedDetail")
              : undefined,
        }
      );
    } catch (cause) {
      aviso.error(cause, { respaldo: t("mascotasPerdidas.errors.updateMatchFailed") });
    } finally {
      setResolviendoMatch(null);
    }
  };

  const closeReport = async (report: LostPetReport) => {
    setCerrandoOcupado(true);
    try {
      await markLostPetFound(report.id_mascota_perdida);
      setCerrandoCaso(null);
      await refresh();
      aviso.ok(t("mascotasPerdidas.closeDialog.closed", { nombre: tituloReporte(report) }), {
        detalle: t("mascotasPerdidas.closeDialog.closedDetail"),
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotasPerdidas.errors.closeFailed") });
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
        title={t("mascotasPerdidas.title")}
        subtitle={loading ? t("mascotasPerdidas.loadingReports") : t("mascotasPerdidas.statsSummary", { perdidas: stats.perdidas, encontradas: stats.encontradas, avistamientos: stats.avistamientos })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnSecondary} onClick={() => setReportingFound(true)}>
              <Eye size={15} strokeWidth={2} />
              {t("mascotasPerdidas.foundPet")}
            </button>
            <button type="button" className={btnPrimary} onClick={() => setReporting(true)}><Siren size={15} strokeWidth={2} />{t("mascotasPerdidas.reportLostPet")}</button>
          </div>
        }
      />

      {/* Los filtros son una barra, no una sección: sin rótulos, cada
          control dice lo que filtra con su propio valor («Todas las
          provincias») y lleva su nombre en `aria-label`. Antes ocupaban
          más de 200 px antes de la primera tarjeta. En el teléfono,
          cantón y distrito aparecen cuando ya se pueden usar. */}
      <section aria-label={t("mascotasPerdidas.filters.aria")} className="bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <div className="-mx-1 max-w-full overflow-x-auto px-1">
            {/* Sin mascotas registradas no puede haber coincidencias. */}
            <FilterTabs
              desplazable
              label={t("mascotasPerdidas.filters.label")}
              options={filtros
                .filter((o) => o !== "Coincidencias" || pets.length > 0)
                .map((o) => ({ value: o, label: t(claveFiltroLabel[o]) }))}
              value={filtro}
              onChange={setFiltro}
              cuentas={coincidencias.length > 0 ? { Coincidencias: coincidencias.length } : undefined}
              alerta="Coincidencias"
            />
          </div>
          <div className="flex items-center gap-3 px-1" aria-live="polite">
            <p className="nums text-[13px] font-semibold text-ink">{cuantosResultados} {cuantosResultados === 1 ? t("mascotasPerdidas.filters.resultSingular") : t("mascotasPerdidas.filters.resultPlural")}</p>
            {/* Aparece solo cuando hay algo que limpiar: un botón
                permanentemente apagado es ruido. */}
            {hasFilters && (
              <button type="button" className="text-[13px] font-semibold text-accent-dark hover:underline" onClick={clearFilters}>
                {t("mascotasPerdidas.filters.clear")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative sm:col-span-3 xl:col-span-1">
            <input
              id="buscar-reporte"
              type="search"
              aria-label={t("mascotasPerdidas.filters.search")}
              className={`${input} pl-10`}
              placeholder={t("mascotasPerdidas.filters.searchPlaceholder")}
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
            <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute" />
          </div>
          <Combo
            aria-label={t("mascotasPerdidas.filters.province")}
            value={territorio.provincia}
            onChange={territorio.elegirProvincia}
            placeholder={t("mascotasPerdidas.filters.allProvinces")}
            options={territorio.provincias.map((item) => ({
              value: item,
              label: item === "Todas" ? t("mascotasPerdidas.filters.allProvinces") : item,
            }))}
          />
          <div className={territorio.filtrando ? "" : "max-sm:hidden"}>
            <Combo
              aria-label={t("mascotasPerdidas.filters.canton")}
              value={territorio.canton}
              onChange={territorio.elegirCanton}
              disabled={!territorio.filtrando}
              placeholder={t("mascotasPerdidas.filters.allCantons")}
              options={territorio.cantones.map((item) => ({
                value: item,
                label: item === "Todos" ? t("mascotasPerdidas.filters.allCantons") : item,
              }))}
            />
          </div>
          <div className={territorio.canton === "Todos" ? "max-sm:hidden" : ""}>
            <Combo
              aria-label={t("mascotasPerdidas.filters.district")}
              value={territorio.distrito}
              onChange={territorio.elegirDistrito}
              disabled={territorio.canton === "Todos"}
              placeholder={t("mascotasPerdidas.filters.allDistricts")}
              options={territorio.distritos.map((item) => ({
                value: item,
                label: item === "Todos" ? t("mascotasPerdidas.filters.allDistricts") : item,
              }))}
            />
          </div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-[14px] bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {enCoincidencias ? (
        coincidenciasVisibles.length === 0 ? (
          coincidencias.length === 0 ? (
            <EmptyState title={t("mascotasPerdidas.matches.emptyTitle")} hint={t("mascotasPerdidas.matches.emptyHint")} />
          ) : (
            <EmptyState title={t("mascotasPerdidas.empty.withFiltersTitle")} hint={t("mascotasPerdidas.empty.withFiltersHint")} />
          )
        ) : (
          <div className={REJILLA}>
            {coincidenciasVisibles.map((coincidencia) => (
              <TarjetaCoincidencia
                key={coincidencia.principal.id_match}
                match={coincidencia.principal}
                zona={zonaDe(coincidencia.principal.zona_id)}
                ocupada={resolviendoMatch === coincidencia.principal.id_match}
                onVerFoto={() =>
                  setFotoAbierta({
                    src: coincidencia.principal.fotoUrl ?? "/mock/dog-nube.jpg",
                    alt: t("mascotasPerdidas.matches.photoAlt", { nombre: coincidencia.principal.mascotaNombre }),
                  })
                }
                onResolver={(estado) => void resolveMyMatch(coincidencia, estado)}
              />
            ))}
          </div>
        )
      ) : loading ? (
        <Skeleton name="perdidas-rejilla" loading>
          <div />
        </Skeleton>
      ) : visibles.length === 0 ? (
        <EmptyState
          title={hasFilters ? t("mascotasPerdidas.empty.withFiltersTitle") : t("mascotasPerdidas.empty.withoutFiltersTitle")}
          hint={hasFilters ? t("mascotasPerdidas.empty.withFiltersHint") : t("mascotasPerdidas.empty.withoutFiltersHint")}
          action={hasFilters ? <button type="button" className={btnSecondary} onClick={clearFilters}>{t("mascotasPerdidas.empty.clearFilters")}</button> : undefined}
        />
      ) : (
        <div className={REJILLA}>
          {visibles.map((reporte) => (
            <TarjetaReporte
              key={reporte.id_mascota_perdida}
              reporte={reporte}
              onVerFoto={() => verFotoReporte(reporte)}
              onAbrir={() => setFicha(reporte)}
              onVi={() => setSighting(reporte)}
            />
          ))}
        </div>
      )}

      {ficha && (
        <Dialog ancho="max-w-[880px]" title={t("mascotasPerdidas.ficha.title")} onClose={() => setFicha(null)}>
          <FichaReporte
            reporte={ficha}
            verAvistamientos={ficha.id_usuario_reporta === user?.id || isAdmin}
            puedeCerrar={(ficha.id_usuario_reporta === user?.id || isAdmin) && ficha.estado === "perdida"}
            onVerFoto={() => verFotoReporte(ficha)}
            onVi={() => { setFicha(null); setSighting(ficha); }}
            onCerrarCaso={() => { setFicha(null); setCerrandoCaso(ficha); }}
          />
        </Dialog>
      )}
      {reporting && user && (
        <Dialog ancho={ANCHO_FORMULARIO} title={t("mascotasPerdidas.reportLostPet")} contexto={t("mascotasPerdidas.reportForm.context")} onClose={() => setReporting(false)}>
          {pets.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                title={t("mascotasPerdidas.noRegisteredPetsTitle")}
                hint={t("mascotasPerdidas.noRegisteredPetsHint")}
                action={
                  <button type="button" className={btnPrimary} onClick={() => { setReporting(false); window.location.href = "/mascotas"; }}>
                    {t("mascotasPerdidas.registerPet")}
                  </button>
                }
              />
            </div>
          ) : (
            <ReportForm userId={user.id} pets={pets} zonas={zonas} profilePhone={profilePhone} profileZonaId={profileZonaId} onClose={() => setReporting(false)} onSaved={refresh} />
          )}
        </Dialog>
      )}
      {reportingFound && user && (
        <Dialog ancho={ANCHO_FORMULARIO} title={t("mascotasPerdidas.foundPet")} contexto={t("mascotasPerdidas.foundForm.context")} onClose={() => setReportingFound(false)}>
          <FoundPetForm userId={user.id} zonas={zonas} profilePhone={profilePhone} profileZonaId={profileZonaId} onClose={() => setReportingFound(false)} onSaved={refresh} />
        </Dialog>
      )}
      {sighting && (
        <Dialog ancho={ANCHO_FORMULARIO} title={t("mascotasPerdidas.sightingForm.register")} contexto={t("mascotasPerdidas.sightingForm.context")} onClose={() => setSighting(null)}>
          <SightingForm report={sighting} zonas={zonas} profilePhone={profilePhone} onClose={() => setSighting(null)} onSaved={refresh} />
        </Dialog>
      )}
      <Visor
        completa
        abierto={fotoAbierta !== null}
        src={fotoAbierta?.src ?? ""}
        alt={fotoAbierta?.alt ?? ""}
        cerrar={() => setFotoAbierta(null)}
      />

      {cerrandoCaso && (
        <Confirmar
          titulo={t("mascotasPerdidas.closeDialog.title")}
          cuerpo={t("mascotasPerdidas.closeDialog.body", { nombre: tituloReporte(cerrandoCaso) })}
          confirmar={t("mascotasPerdidas.closeDialog.confirm")}
          ocupado={cerrandoOcupado}
          onConfirmar={() => void closeReport(cerrandoCaso)}
          onCancelar={() => setCerrandoCaso(null)}
        />
      )}
    </Page>
  );
};

export default MascotasPerdidas;
