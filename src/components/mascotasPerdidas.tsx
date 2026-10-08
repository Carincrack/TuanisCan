import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Camera, Check, CheckCircle2, Clock, Eye, Maximize2, MapPin, Phone, Search, Siren, Sparkles, X } from "../lib/iconos";
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

type T = I18nContextValue["t"];

/* El mapa para marcar el lugar. Leaflet pesa ~150 kB y solo hace falta
   cuando se abre uno de los tres formularios, no para ver la lista. */
const MapaPunto = lazy(() => import("./MapaPunto"));

/** Mientras baja el mapa: el mismo hueco que va a ocupar, sin saltos. */
const EsperaMapa = () => <div aria-hidden className="h-[330px] rounded-[14px] bg-sunken sm:h-[370px]" />;

const filtros = ["Todas", "Mías", "Perdidas", "Encontradas", "Mi zona"];
const claveFiltroLabel: Record<string, string> = {
  Todas: "mascotasPerdidas.filters.all",
  Mías: "mascotasPerdidas.filters.mine",
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

const coordsLabel = ({ latitud, longitud }: { latitud: number; longitud: number }) =>
  `${latitud.toFixed(6)}, ${longitud.toFixed(6)}`;

const pinAvistamiento = divIcon({
  className: "tsc-map-marker",
  html: '<span class="tsc-map-marker__pin is-active"><span></span></span>',
  iconSize: [44, 48],
  iconAnchor: [22, 44],
});

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

/* Los teléfonos se guardan tal como se escriban. Cuando la forma es
   la de Costa Rica se separa para poder leerla de un vistazo —un
   "+50688888888" seguido no se lee, se descifra—; cualquier otra cosa
   se deja intacta, que puede ser un número de otro país. */
const telefonoLegible = (valor: string) => {
  const limpio = valor.replace(/[\s.-]/g, "");
  const cr = /^(?:\+?506)?(\d{4})(\d{4})$/.exec(limpio);
  return cr ? `+506 ${cr[1]} ${cr[2]}` : valor;
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
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
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
        <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.name")}<input className={input} required disabled maxLength={100} value={values.nombre} onChange={(e) => update("nombre", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.species")}<input className={input} required disabled maxLength={50} value={values.especie} onChange={(e) => update("especie", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.breed")}<input className={input} disabled maxLength={100} value={values.raza} onChange={(e) => update("raza", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.contact")}<input className={input} required maxLength={50} value={values.contacto} onChange={(e) => update("contacto", e.target.value)} /></label>
        <div className="sm:col-span-2">
          <Suspense fallback={<EsperaMapa />}>
            <MapaPunto
              etiqueta={t("mascotasPerdidas.reportForm.whereLost")}
              pista={t("mascotasPerdidas.reportForm.whereLostHint")}
              texto={values.ubicacion}
              onTexto={(texto) => update("ubicacion", texto)}
              requerido
            />
          </Suspense>
        </div>
        <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.reward")}<input className={input} inputMode="numeric" value={values.recompensa} onChange={(e) => update("recompensa", e.target.value)} /></label>
        <label className={fieldLabel}><span className="flex items-center gap-2"><Camera size={15} /> {t("mascotasPerdidas.reportForm.photo")}</span><input className={input} required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
      </div>
      <label className={fieldLabel}>{t("mascotasPerdidas.reportForm.descriptionLabel")}<textarea className={`${input} min-h-24 resize-y`} required maxLength={2000} value={values.descripcion} onChange={(e) => update("descripcion", e.target.value)} /></label>
      {error && <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className={btnSecondary} onClick={onClose}>{t("mascotasPerdidas.cancel")}</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? t("mascotasPerdidas.reportForm.publishing") : t("mascotasPerdidas.reportForm.publish")}</button></div>
    </form>
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
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
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
        <div className="sm:col-span-2">
          <Suspense fallback={<EsperaMapa />}>
            <MapaPunto
              etiqueta={t("mascotasPerdidas.foundForm.whereFound")}
              pista={t("mascotasPerdidas.foundForm.whereFoundHint")}
              texto={values.ubicacion}
              onTexto={(texto) => update("ubicacion", texto)}
              requerido
            />
          </Suspense>
        </div>
        <label className={`${fieldLabel} sm:col-span-2`}><span className="flex items-center gap-2"><Camera size={15} /> {t("mascotasPerdidas.foundForm.photo")}</span><input className={input} required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
      </div>
      <label className={fieldLabel}>{t("mascotasPerdidas.foundForm.descriptionLabel")}<textarea className={`${input} min-h-24 resize-y`} required maxLength={2000} value={values.descripcion} onChange={(e) => update("descripcion", e.target.value)} /></label>
      {error && <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className={btnSecondary} onClick={onClose}>{t("mascotasPerdidas.cancel")}</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? t("mascotasPerdidas.foundForm.publishing") : t("mascotasPerdidas.foundForm.publish")}</button></div>
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
  const { t } = useTranslation();
  const [values, setValues] = useState({
    ubicacion: "",
    zona_id: report.zona_id,
    direccion: "",
    contacto: profilePhone ?? "",
    comentario: "",
  });
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
        detalle: t("mascotasPerdidas.sightingForm.registeredDetail", { nombre: report.nombre }),
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotasPerdidas.errors.registerSightingFailed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
      <div className="rounded-[14px] bg-sunken p-4"><p className="text-[14px] font-semibold text-ink">{report.nombre}</p><p className="mt-1 text-[12.5px] text-ink-soft">{zonaLabel(report.zona, t)}</p></div>
      <Suspense fallback={<EsperaMapa />}>
        <MapaPunto
          etiqueta={t("mascotasPerdidas.sightingForm.whereSeen")}
          pista={t("mascotasPerdidas.sightingForm.whereSeenHint")}
          texto={values.ubicacion}
          onTexto={(texto) => update("ubicacion", texto)}
          referencia={
            Number.isFinite(report.latitud) && Number.isFinite(report.longitud)
              ? { latitud: report.latitud, longitud: report.longitud, nombre: report.nombre }
              : null
          }
          requerido
        />
      </Suspense>
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
      {error && <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className={btnSecondary} onClick={onClose}>{t("mascotasPerdidas.cancel")}</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? t("mascotasPerdidas.sightingForm.registering") : t("mascotasPerdidas.sightingForm.register")}</button></div>
    </form>
  );
};

const SightingDetails = ({ report, onClose }: { report: LostPetReport; onClose: () => void }) => {
  const { t, localeTag } = useTranslation();
  return (
    <div className="grid gap-3 p-5 sm:p-6">
      {report.avistamientos.length === 0 ? (
        <EmptyState title={t("mascotasPerdidas.sightingDetails.empty.title")} hint={t("mascotasPerdidas.sightingDetails.empty.hint")} />
      ) : (
        report.avistamientos.map((item) => (
          <article key={item.id_avistamiento} className="rounded-[18px] bg-sunken p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-ink">{formatDateTime(item.fecha, localeTag)}</p>
                <p className="mt-1 text-[12.5px] text-ink-soft">{item.direccion || zonaLabel(item.zona, t)}</p>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${item.latitud},${item.longitud}`}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-semibold text-accent-dark hover:underline"
              >
                {t("mascotasPerdidas.sightingDetails.viewMap")}
              </a>
            </div>
            {/* Había una cuarta ficha, "Usuario", con el UUID crudo de
                quien reportó. A quien busca a su mascota no le dice nada y
                ocupa el mismo sitio que el contacto, que sí sirve. */}
            <dl className="mt-3 grid gap-2.5 text-[12.5px] text-ink-soft sm:grid-cols-3">
              <div className="rounded-[14px] bg-surface p-3"><dt className="rotulo text-ink-mute">{t("mascotasPerdidas.sightingDetails.location")}</dt><dd className="nums mt-1 break-all">{coordsLabel(item)}</dd></div>
              <div className="rounded-[14px] bg-surface p-3"><dt className="rotulo text-ink-mute">{t("mascotasPerdidas.sightingDetails.zone")}</dt><dd className="mt-1">{zonaLabel(item.zona, t)}</dd></div>
              <div className="rounded-[14px] bg-surface p-3"><dt className="rotulo text-ink-mute">{t("mascotasPerdidas.sightingDetails.contact")}</dt><dd className="nums mt-1 break-all">{item.contacto || t("mascotasPerdidas.sightingDetails.notIndicated")}</dd></div>
            </dl>
            <div className="mt-3 overflow-hidden rounded-[14px]">
              <MapContainer
                center={[item.latitud, item.longitud]}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                className="h-[140px] w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[item.latitud, item.longitud]} icon={pinAvistamiento} />
              </MapContainer>
            </div>
            <div className="mt-3 rounded-[14px] bg-surface p-3">
              <p className="rotulo text-ink-mute">{t("mascotasPerdidas.sightingDetails.comment")}</p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">{item.comentario || t("mascotasPerdidas.sightingDetails.noComment")}</p>
            </div>
          </article>
        ))
      )}
      <div className="flex justify-end">
        <button type="button" className={btnSecondary} onClick={onClose}>{t("mascotasPerdidas.sightingDetails.close")}</button>
      </div>
    </div>
  );
};

const MascotasPerdidas = () => {
  const { user, getProfile, isAdmin } = useAuth();
  const { t, localeTag } = useTranslation();
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
  const [sightingDetails, setSightingDetails] = useState<LostPetReport | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState<LostPetReport | null>(null);
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

  const loadReportes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (filtro === "Mi zona" && !profileZonaId) {
        setReportes([]);
        return;
      }

      const reportesData = await listLostPetReports({
        ...(filtro === "Mi zona" ? { zonaId: profileZonaId! } : {}),
        ...(territorio.provincia !== "Todas" ? { provincia: territorio.provincia } : {}),
        ...(territorio.canton !== "Todos" ? { canton: territorio.canton } : {}),
        ...(territorio.distrito !== "Todos" ? { distrito: territorio.distrito } : {}),
        ...(filtro === "Perdidas" ? { estado: "perdida" as const } : {}),
        ...(filtro === "Encontradas" ? { estado: "encontrada" as const } : {}),
      });
      setReportes(reportesData);
    } catch (cause) {
      setError(messageFrom(cause, t));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filtro,
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

  const pendingMatches = useMemo(
    () => matches.filter((match) => match.estado_match === "pendiente" && match.estado_reporte === "perdida"),
    [matches]
  );

  const resolveMyMatch = async (match: PetMatch, estado: "confirmado" | "descartado") => {
    setResolviendoMatch(match.id_match);
    try {
      await resolveMatch(match.id_match, estado);
      await refresh();
      aviso.ok(
        estado === "confirmado" ? t("mascotasPerdidas.matches.confirmed", { nombre: match.mascotaNombre }) : t("mascotasPerdidas.matches.discarded"),
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
      aviso.ok(t("mascotasPerdidas.closeDialog.closed", { nombre: report.nombre }), {
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

      {pendingMatches.length > 0 && (
        <section aria-label={t("mascotasPerdidas.matches.aria")} className="bg-accent-wash p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-dark" aria-hidden />
            <h3 className="text-[14px] font-semibold text-accent-deep">
              {pendingMatches.length === 1 ? t("mascotasPerdidas.matches.singular") : t("mascotasPerdidas.matches.plural")}
            </h3>
          </div>
          <p className="mt-1 text-[12.5px] text-accent-dark">
            {t("mascotasPerdidas.matches.hint")}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pendingMatches.map((match) => (
              <article key={match.id_match} className="flex gap-3 rounded-[18px] bg-surface p-3">
                <img
                  src={match.fotoUrl ?? "/mock/dog-nube.jpg"}
                  alt={t("mascotasPerdidas.matches.photoAlt", { nombre: match.mascotaNombre })}
                  className="size-20 shrink-0 rounded-[14px] bg-sunken object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">{t("mascotasPerdidas.matches.isThis", { nombre: match.mascotaNombre })}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-mute">
                    {match.especie} · {zonaLabel(match.zona, t)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{match.descripcion}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={`${btnSecondaryCompacto} flex-1`}
                      disabled={resolviendoMatch === match.id_match}
                      onClick={() => void resolveMyMatch(match, "confirmado")}
                    >
                      <Check size={13} />
                      {t("mascotasPerdidas.matches.yesItsHer")}
                    </button>
                    <button
                      type="button"
                      className={`${btnQuiet} flex-1`}
                      disabled={resolviendoMatch === match.id_match}
                      onClick={() => void resolveMyMatch(match, "descartado")}
                    >
                      <X size={13} />
                      {t("mascotasPerdidas.matches.notHer")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section aria-label={t("mascotasPerdidas.filters.aria")} className="bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">{visibles.length} {visibles.length === 1 ? t("mascotasPerdidas.filters.resultSingular") : t("mascotasPerdidas.filters.resultPlural")}</p>
            <p className="mt-0.5 text-[12px] text-ink-mute">{t("mascotasPerdidas.filters.hint")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs label={t("mascotasPerdidas.filters.label")} options={filtros.map((o) => ({ value: o, label: t(claveFiltroLabel[o]) }))} value={filtro} onChange={setFiltro} />
            {/* Limpiar es una acción sobre el conjunto de filtros, así que
                va con el resumen y no como quinta columna de la rejilla.
                Y aparece solo cuando hay algo que limpiar: un botón
                permanentemente apagado es ruido. */}
            {hasFilters && (
              <button type="button" className={btnQuiet} onClick={clearFilters}>
                {t("mascotasPerdidas.filters.clear")}
              </button>
            )}
          </div>
        </div>

        <label className={`${fieldLabel} mt-4 block`}>{t("mascotasPerdidas.filters.search")}
          <span className="relative block">
            <input id="buscar-reporte" type="search" className={`${input} pl-10`} placeholder={t("mascotasPerdidas.filters.searchPlaceholder")} value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
            <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute" />
          </span>
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className={fieldLabel}>{t("mascotasPerdidas.filters.province")}
            <Combo
              value={territorio.provincia}
              onChange={territorio.elegirProvincia}
              placeholder={t("mascotasPerdidas.filters.allProvinces")}
              options={territorio.provincias.map((item) => ({
                value: item,
                label: item === "Todas" ? t("mascotasPerdidas.filters.allProvinces") : item,
              }))}
            />
          </label>
          <label className={fieldLabel}>{t("mascotasPerdidas.filters.canton")}
            <Combo
              value={territorio.canton}
              onChange={territorio.elegirCanton}
              disabled={!territorio.filtrando}
              placeholder={t("mascotasPerdidas.filters.allCantons")}
              options={territorio.cantones.map((item) => ({
                value: item,
                label: item === "Todos" ? t("mascotasPerdidas.filters.allCantons") : item,
              }))}
            />
          </label>
          <label className={fieldLabel}>{t("mascotasPerdidas.filters.district")}
            <Combo
              value={territorio.distrito}
              onChange={territorio.elegirDistrito}
              disabled={territorio.canton === "Todos"}
              placeholder={t("mascotasPerdidas.filters.allDistricts")}
              options={territorio.distritos.map((item) => ({
                value: item,
                label: item === "Todos" ? t("mascotasPerdidas.filters.allDistricts") : item,
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
          title={hasFilters ? t("mascotasPerdidas.empty.withFiltersTitle") : t("mascotasPerdidas.empty.withoutFiltersTitle")}
          hint={hasFilters ? t("mascotasPerdidas.empty.withFiltersHint") : t("mascotasPerdidas.empty.withoutFiltersHint")}
          action={hasFilters ? <button type="button" className={btnSecondary} onClick={clearFilters}>{t("mascotasPerdidas.empty.clearFilters")}</button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((reporte) => {
            const canClose = reporte.id_usuario_reporta === user?.id || isAdmin;
            const puedeCerrar = canClose && reporte.estado === "perdida";
            const ultimoAvistamiento = reporte.avistamientos[0];
            return (
              <article key={reporte.id_mascota_perdida} className="flex flex-col overflow-hidden bg-surface">
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => setFotoAbierta(reporte)}
                    aria-label={t("mascotasPerdidas.card.viewPhotoAria", { nombre: reporte.nombre })}
                    className="relative block w-full cursor-zoom-in overflow-hidden focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
                  >
                    <img
                      src={reporte.fotoUrl ?? "/mock/dog-nube.jpg"}
                      alt={t("mascotasPerdidas.card.photoAlt", { nombre: reporte.nombre })}
                      loading="lazy"
                      className="aspect-[16/10] w-full bg-sunken object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />

                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgb(20_36_46/88%)] via-[rgb(20_36_46/38%)] to-transparent"
                    />

                    <span
                      aria-hidden
                      className="absolute right-3 bottom-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white opacity-70 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <Maximize2 size={14} strokeWidth={2.2} />
                    </span>
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                    <Badge tono={reporte.estado === "perdida" ? "danger" : "ok"}>{reporte.estado === "perdida" ? t("mascotasPerdidas.card.statusLost") : t("mascotasPerdidas.card.statusFound")}</Badge>
                    {reporte.recompensa != null && (
                      <span className="nums shrink-0 rounded-full bg-warn-wash px-2.5 py-1 text-[11.5px] font-semibold text-warn">
                        {t("mascotasPerdidas.card.reward", { monto: colones(reporte.recompensa) })}
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
                  <dl className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                    <div className="flex items-center gap-2"><MapPin size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" /><dt className="sr-only">{t("mascotasPerdidas.card.zoneLabel")}</dt><dd className="truncate">{t("mascotasPerdidas.card.seenIn", { zona: zonaLabel(reporte.zona, t) })}</dd></div>
                    <div className="flex items-center gap-2"><Clock size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" /><dt className="sr-only">{t("mascotasPerdidas.card.reportedLabel")}</dt><dd className="nums">{formatDateTime(reporte.fecha_reporte, localeTag)}</dd></div>
                    {reporte.contacto && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" />
                        <dt className="sr-only">{t("mascotasPerdidas.card.contactLabel")}</dt>
                        <dd className="min-w-0"><a href={`tel:${reporte.contacto.replace(/[^+\d]/g, "")}`} className="nums truncate hover:text-ink hover:underline">{telefonoLegible(reporte.contacto)}</a></dd>
                      </div>
                    )}
                  </dl>

                  {reporte.descripcion && (
                    <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-ink">
                      {reporte.descripcion}
                    </p>
                  )}

                  <div className="mt-3 rounded-[14px] bg-sunken px-3 py-2.5 text-[12px] text-ink-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {reporte.avistamientos.length} {reporte.avistamientos.length === 1 ? t("mascotasPerdidas.card.sightingSingular") : t("mascotasPerdidas.card.sightingPlural")}
                        </p>
                        {ultimoAvistamiento ? (
                          <p className="mt-1 line-clamp-2">
                            {t("mascotasPerdidas.card.lastSighting", { lugar: ultimoAvistamiento.direccion || zonaLabel(ultimoAvistamiento.zona, t), fecha: formatDateTime(ultimoAvistamiento.fecha, localeTag) })}
                          </p>
                        ) : (
                          <p className="mt-1 text-ink-mute">{t("mascotasPerdidas.card.noSightings")}</p>
                        )}
                      </div>
                      {canClose && ultimoAvistamiento && (
                        <button type="button" className="shrink-0 text-[12px] font-semibold text-accent-dark hover:underline" onClick={() => setSightingDetails(reporte)}>
                          {t("mascotasPerdidas.card.details")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto grid gap-2 pt-3.5">
                    <button type="button" disabled={reporte.estado === "encontrada"} className={`${reporte.estado === "encontrada" ? btnSecondary : btnPrimary} w-full disabled:cursor-default disabled:opacity-45 disabled:hover:bg-neutral-wash disabled:hover:brightness-100`} onClick={() => setSighting(reporte)}>
                      <Eye size={14} strokeWidth={1.9} />
                      {reporte.estado === "encontrada" ? t("mascotasPerdidas.card.caseClosed") : t("mascotasPerdidas.card.iSawThisPet")}
                    </button>

                    <div className={`grid gap-2 ${puedeCerrar ? "grid-cols-2" : "grid-cols-1"}`}>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${reporte.latitud},${reporte.longitud}`} target="_blank" rel="noreferrer" className={`${btnSecondaryCompacto} w-full`}>
                        <MapPin size={13} />
                        {t("mascotasPerdidas.card.location")}
                      </a>
                      {puedeCerrar && (
                        <button type="button" className={`${btnSecondaryCompacto} w-full`} onClick={() => setCerrandoCaso(reporte)}>
                          <CheckCircle2 size={13} />
                          {t("mascotasPerdidas.card.foundIt")}
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
        <Dialog ancho="max-w-[760px]" title={t("mascotasPerdidas.reportLostPet")} onClose={() => setReporting(false)}>
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
        <Dialog ancho="max-w-[760px]" title={t("mascotasPerdidas.foundPet")} onClose={() => setReportingFound(false)}>
          <FoundPetForm userId={user.id} zonas={zonas} profilePhone={profilePhone} profileZonaId={profileZonaId} onClose={() => setReportingFound(false)} onSaved={refresh} />
        </Dialog>
      )}
      {sighting && (
        <Dialog ancho="max-w-[760px]" title={t("mascotasPerdidas.sightingForm.register")} onClose={() => setSighting(null)}>
          <SightingForm report={sighting} zonas={zonas} profilePhone={profilePhone} onClose={() => setSighting(null)} onSaved={refresh} />
        </Dialog>
      )}
      <Visor
        abierto={fotoAbierta !== null}
        src={fotoAbierta?.fotoUrl ?? "/mock/dog-nube.jpg"}
        alt={fotoAbierta ? t("mascotasPerdidas.card.photoAlt", { nombre: fotoAbierta.nombre }) : ""}
        cerrar={() => setFotoAbierta(null)}
      />

      {cerrandoCaso && (
        <Confirmar
          titulo={t("mascotasPerdidas.closeDialog.title")}
          cuerpo={t("mascotasPerdidas.closeDialog.body", { nombre: cerrandoCaso.nombre })}
          confirmar={t("mascotasPerdidas.closeDialog.confirm")}
          ocupado={cerrandoOcupado}
          onConfirmar={() => void closeReport(cerrandoCaso)}
          onCancelar={() => setCerrandoCaso(null)}
        />
      )}
      {sightingDetails && (
        <Dialog ancho="max-w-[760px]" title={t("mascotasPerdidas.sightingDetails.title", { nombre: sightingDetails.nombre })} onClose={() => setSightingDetails(null)}>
          <SightingDetails report={sightingDetails} onClose={() => setSightingDetails(null)} />
        </Dialog>
      )}
    </Page>
  );
};

export default MascotasPerdidas;
