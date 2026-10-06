import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, IdCard, Pencil, Plus, Stethoscope, Trash2 } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import { formatDate, petAge } from "../lib/pets";
import {
  deleteCondition,
  deletePet,
  deleteVaccine,
  listPets,
  saveCondition,
  savePet,
  saveVaccine,
} from "../services/pets.service";
import type { Condition, ConditionInput, Pet, PetInput, Vaccine, VaccineInput } from "../types/pet.types";
import {
  Badge,
  Confirmar,
  Dialog,
  EmptyState,
  Page,
  PageHeader,
  Table,
  btnDangerCompacto,
  btnPrimary,
  btnQuiet,
  btnSecondaryCompacto,
  fieldLabel,
  btnSecondary,
  input,
} from "./ui";
import { Combo } from "./Combo";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";
import type { I18nContextValue } from "../context/i18n-context";

type T = I18nContextValue["t"];

const messageFrom = (error: unknown, t: T) =>
  error instanceof Error ? error.message : t("common.genericError");

/* La ventana es la del sistema (`ui.tsx`), no una copia propia. La
   que vivía acá tenía esquinas vivas, no se cerraba con Escape y no
   frenaba el scroll de atrás; además, ahora se apilan —la ficha abre
   "Editar" encima— y la del sistema sabe cuál es la de arriba. */
const ANCHO_FORMULARIO = "max-w-[720px]";

const PetForm = ({ pet, userId, onClose, onSaved }: { pet: Pet | null; userId: string; onClose: () => void; onSaved: () => Promise<void> }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState({
    nombre: pet?.nombre ?? "",
    especie: pet?.especie ?? "Perro",
    raza: pet?.raza ?? "",
    sexo: pet?.sexo ?? "macho",
    fecha_nacimiento: pet?.fecha_nacimiento ?? "",
    peso: pet ? String(pet.peso) : "",
    color: pet?.color ?? "",
    esterilizado: pet?.esterilizado ?? false,
    microchip: pet?.microchip ?? "",
    alergias: pet?.alergias ?? "",
    veterinaria: pet?.veterinaria ?? "",
    notas: pet?.notas ?? "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (name: string, value: string | boolean) => setValues((current) => ({ ...current, [name]: value }));

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const selectPhoto = (file: File | null) => {
    setError("");
    if (file && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
      setError(t("mascotas.petForm.photoInvalid"));
      setPhoto(null);
      return;
    }
    setPhoto(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload: PetInput = {
      nombre: values.nombre.trim(),
      especie: values.especie.trim(),
      raza: values.raza.trim(),
      sexo: values.sexo as PetInput["sexo"],
      fecha_nacimiento: values.fecha_nacimiento,
      peso: Number(values.peso),
      color: values.color.trim(),
      esterilizado: values.esterilizado,
      microchip: values.microchip.trim() || null,
      alergias: values.alergias.trim() || null,
      veterinaria: values.veterinaria.trim() || null,
      notas: values.notas.trim() || null,
    };
    setBusy(true);
    try {
      await savePet(userId, payload, pet ?? undefined, photo);
      await onSaved();
      onClose();
      aviso.ok(pet ? t("mascotas.petForm.updated", { nombre: values.nombre }) : t("mascotas.petForm.created", { nombre: values.nombre }), {
        detalle: pet ? undefined : t("mascotas.petForm.createdDetail"),
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotas.petForm.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>{t("mascotas.petForm.name")}<input className={input} required maxLength={100} value={values.nombre} onChange={(e) => update("nombre", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.species")}<input className={input} required list="pet-species" maxLength={50} value={values.especie} onChange={(e) => update("especie", e.target.value)} /><datalist id="pet-species"><option value="Perro" /><option value="Gato" /><option value="Conejo" /><option value="Ave" /></datalist></label>
        <label className={fieldLabel}>{t("mascotas.petForm.breed")}<input className={input} required maxLength={100} value={values.raza} onChange={(e) => update("raza", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.sex")}<Combo required value={values.sexo} onChange={(v) => update("sexo", v)} options={[{ value: "macho", label: t("mascotas.basicData.male") }, { value: "hembra", label: t("mascotas.basicData.female") }]} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.birthDate")}<input className={input} required type="date" max={new Date().toISOString().slice(0, 10)} value={values.fecha_nacimiento} onChange={(e) => update("fecha_nacimiento", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.weight")}<input className={input} required type="number" min="0.01" max="9999" step="0.01" value={values.peso} onChange={(e) => update("peso", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.color")}<input className={input} required maxLength={100} value={values.color} onChange={(e) => update("color", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.microchipNumber")}<input className={input} maxLength={50} value={values.microchip} onChange={(e) => update("microchip", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.usualVet")}<input className={input} maxLength={150} value={values.veterinaria} onChange={(e) => update("veterinaria", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.petForm.reproductiveStatus")}<span className="flex min-h-10 items-center gap-2 bg-sunken px-3"><input type="checkbox" checked={values.esterilizado} onChange={(e) => update("esterilizado", e.target.checked)} />{t("mascotas.petForm.isSterilized")}</span></label>
      </div>
      <label className={fieldLabel}>{t("mascotas.petForm.allergies")}<textarea placeholder={t("mascotas.petForm.allergiesPlaceholder")} className={`${input} min-h-20 resize-y`} maxLength={1000} value={values.alergias} onChange={(e) => update("alergias", e.target.value)} /></label>
      <label className={fieldLabel}>{t("mascotas.petForm.careNotes")}<textarea className={`${input} min-h-24 resize-y`} maxLength={2000} value={values.notas} onChange={(e) => update("notas", e.target.value)} /></label>
      <div className={fieldLabel}>
        {t("mascotas.petForm.profilePhoto")}
        <div className="flex items-center gap-4">
          {photoPreview || pet?.fotoUrl ? (
            <img src={photoPreview ?? pet?.fotoUrl ?? undefined} alt="" className="h-16 w-16 flex-shrink-0 rounded-[14px] bg-sunken object-cover" />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[14px] bg-sunken text-ink-mute"><Camera size={20} strokeWidth={1.6} aria-hidden /></div>
          )}
          <label className={`${btnSecondary} cursor-pointer`}>
            {pet?.fotoUrl ? t("mascotas.petForm.changePhoto") : t("mascotas.petForm.choosePhoto")}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { selectPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </label>
          <span className="font-normal text-ink-mute">{t("mascotas.petForm.photoHint")}</span>
        </div>
      </div>
      {error && <p role="alert" className="bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>{t("common.cancel")}</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? t("mascotas.petForm.saving") : t("mascotas.petForm.save")}</button></div>
    </form>
  );
};

const VaccineForm = ({ pet, vaccine, onClose, onSaved }: { pet: Pet; vaccine: Vaccine | null; onClose: () => void; onSaved: () => Promise<void> }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState({
    nombre_vacuna: vaccine?.nombre_vacuna ?? "",
    fecha_aplicacion: vaccine?.fecha_aplicacion ?? "",
    fecha_vencimiento: vaccine?.fecha_vencimiento ?? "",
    veterinaria: vaccine?.veterinaria ?? pet.veterinaria ?? "",
    lote: vaccine?.lote ?? "",
    notas: vaccine?.notas ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (values.fecha_vencimiento < values.fecha_aplicacion) {
      setError(t("mascotas.vaccineForm.expirationBeforeApplication"));
      return;
    }
    const payload: VaccineInput = {
      nombre_vacuna: values.nombre_vacuna.trim(),
      fecha_aplicacion: values.fecha_aplicacion,
      fecha_vencimiento: values.fecha_vencimiento,
      veterinaria: values.veterinaria.trim() || null,
      lote: values.lote.trim() || null,
      notas: values.notas.trim() || null,
    };
    setBusy(true);
    setError("");
    try {
      await saveVaccine(pet.id_mascota, payload, vaccine ?? undefined);
      await onSaved();
      onClose();
      aviso.ok(vaccine ? t("mascotas.vaccineForm.updated") : t("mascotas.vaccineForm.created"), {
        detalle: `${values.nombre_vacuna} · ${pet.nombre}`,
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotas.vaccineForm.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
      <label className={fieldLabel}>{t("mascotas.vaccineForm.vaccineOrTreatment")}<input className={input} required maxLength={150} value={values.nombre_vacuna} onChange={(e) => update("nombre_vacuna", e.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>{t("mascotas.vaccineForm.applicationDate")}<input className={input} required type="date" value={values.fecha_aplicacion} onChange={(e) => update("fecha_aplicacion", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.vaccineForm.expirationDate")}<input className={input} required type="date" min={values.fecha_aplicacion} value={values.fecha_vencimiento} onChange={(e) => update("fecha_vencimiento", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.vaccineForm.vet")}<input className={input} maxLength={150} value={values.veterinaria} onChange={(e) => update("veterinaria", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.vaccineForm.batch")}<input className={input} maxLength={80} value={values.lote} onChange={(e) => update("lote", e.target.value)} /></label>
      </div>
      <label className={fieldLabel}>{t("mascotas.vaccineForm.notes")}<textarea className={`${input} min-h-20 resize-y`} maxLength={1000} value={values.notas} onChange={(e) => update("notas", e.target.value)} /></label>
      {error && <p role="alert" className="bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>{t("common.cancel")}</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? t("mascotas.vaccineForm.saving") : t("mascotas.vaccineForm.save")}</button></div>
    </form>
  );
};

/* Una enfermedad por registro: el nombre para reconocerla y los
   cuidados que necesita, que es lo que el paseador lee antes de
   aceptar el paseo. */
const ConditionForm = ({ pet, condition, onClose, onSaved }: { pet: Pet; condition: Condition | null; onClose: () => void; onSaved: () => Promise<void> }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState({
    nombre: condition?.nombre ?? "",
    cuidados: condition?.cuidados ?? "",
    fecha_diagnostico: condition?.fecha_diagnostico ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: ConditionInput = {
      nombre: values.nombre.trim(),
      cuidados: values.cuidados.trim() || null,
      fecha_diagnostico: values.fecha_diagnostico || null,
    };
    setBusy(true);
    setError("");
    try {
      await saveCondition(pet.id_mascota, payload, condition ?? undefined);
      await onSaved();
      onClose();
      aviso.ok(condition ? t("mascotas.conditionForm.updated") : t("mascotas.conditionForm.created"), {
        detalle: `${payload.nombre} · ${pet.nombre}`,
      });
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotas.conditionForm.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <label className={fieldLabel}>{t("mascotas.conditionForm.nameOrCondition")}<input className={input} required maxLength={150} placeholder={t("mascotas.conditionForm.namePlaceholder")} value={values.nombre} onChange={(e) => update("nombre", e.target.value)} /></label>
        <label className={fieldLabel}>{t("mascotas.conditionForm.diagnosisDate")}<input className={input} type="date" min={pet.fecha_nacimiento} max={new Date().toISOString().slice(0, 10)} value={values.fecha_diagnostico} onChange={(e) => update("fecha_diagnostico", e.target.value)} /></label>
      </div>
      <label className={fieldLabel}>
        {t("mascotas.conditionForm.careLabel")}
        <textarea className={`${input} min-h-24 resize-y`} maxLength={1000} placeholder={t("mascotas.conditionForm.carePlaceholder")} value={values.cuidados} onChange={(e) => update("cuidados", e.target.value)} />
        <span className="font-normal text-ink-mute">{t("mascotas.conditionForm.careHint")}</span>
      </label>
      {error && <p role="alert" className="bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>{t("common.cancel")}</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? t("mascotas.conditionForm.saving") : t("mascotas.conditionForm.save")}</button></div>
    </form>
  );
};

const petHealth = (pet: Pet, t: T) => {
  if (pet.vacunas.some((item) => item.estado === "vencida")) return { label: t("mascotas.health.expired"), tone: "danger" as const };
  if (pet.vacunas.some((item) => item.estado === "pendiente")) return { label: t("mascotas.health.upcoming"), tone: "warn" as const };
  if (!pet.vacunas.length) return { label: t("mascotas.health.none"), tone: "neutral" as const };
  return { label: t("mascotas.health.upToDate"), tone: "ok" as const };
};

const PetPhoto = ({ pet, className }: { pet: Pet; className: string }) => {
  const { t } = useTranslation();
  return pet.fotoUrl ? (
    <img src={pet.fotoUrl} alt={t("common.photoOf", { nombre: pet.nombre })} className={`${className} bg-sunken object-cover`} />
  ) : (
    <div className={`${className} flex items-center justify-center bg-sunken text-ink-mute`}><Camera size={32} strokeWidth={1.4} aria-hidden /></div>
  );
};

const Mascotas = () => {
  const { user, getProfile, isAdmin } = useAuth();
  const { t, localeTag } = useTranslation();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null | undefined>();
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null | undefined>();
  const [editingCondition, setEditingCondition] = useState<Condition | null | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canOperate, setCanOperate] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [next, profile] = await Promise.all([listPets(), getProfile()]);
      setPets(next);
      setCanOperate(isAdmin || profile?.verificacion.estado === "aprobado");
      setSelectedId((current) => current && next.some((pet) => pet.id_mascota === current) ? current : null);
    } catch (cause) {
      setError(messageFrom(cause, t));
    } finally {
      setLoading(false);
    }
  }, [getProfile, isAdmin, t]);
  useEffect(() => { void load(); }, [load]);
  const selected = pets.find((pet) => pet.id_mascota === selectedId) ?? null;


  /* Un solo estado para las dos confirmaciones: nunca hay dos
     abiertas a la vez, y así el diálogo se monta una sola vez. */
  const [porBorrar, setPorBorrar] = useState<
    | { tipo: "mascota"; pet: Pet }
    | { tipo: "vacuna"; vaccine: Vaccine }
    | { tipo: "padecimiento"; condition: Condition }
    | null
  >(null);
  const [borrando, setBorrando] = useState(false);

  const confirmarBorrado = async () => {
    if (!porBorrar) return;
    setBorrando(true);
    try {
      const nombreBorrado =
        porBorrar.tipo === "mascota"
          ? porBorrar.pet.nombre
          : porBorrar.tipo === "vacuna"
            ? porBorrar.vaccine.nombre_vacuna
            : porBorrar.condition.nombre;
      if (porBorrar.tipo === "mascota") await deletePet(porBorrar.pet);
      else if (porBorrar.tipo === "vacuna") await deleteVaccine(porBorrar.vaccine.id_vacuna);
      else await deleteCondition(porBorrar.condition.id_padecimiento);
      setPorBorrar(null);
      await load();
      aviso.ok(t("mascotas.delete.deleted", { nombre: nombreBorrado }));
    } catch (cause) {
      setError(messageFrom(cause, t));
      aviso.error(cause, { respaldo: t("mascotas.delete.deleteFailed") });
    } finally {
      setBorrando(false);
    }
  };

  const removePet = (pet: Pet) => setPorBorrar({ tipo: "mascota", pet });
  const removeVaccine = (vaccine: Vaccine) => setPorBorrar({ tipo: "vacuna", vaccine });
  const removeCondition = (condition: Condition) => setPorBorrar({ tipo: "padecimiento", condition });
  const openCard = (pet: Pet) => {
    sessionStorage.setItem("tuaniscan.carnetPetId", pet.id_mascota);
    void navigate({ to: "/carnet" });
  };

  return (
    <Page>
      <PageHeader title={t("mascotas.title")} subtitle={loading ? t("mascotas.loadingProfiles") : t(pets.length === 1 ? "mascotas.countSingular" : "mascotas.countPlural", { count: pets.length })} action={<button type="button" disabled={!canOperate} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => setEditingPet(null)}><Plus size={15} /> {t("mascotas.registerPet")}</button>} />
      {error && <p role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {loading ? (
        <Skeleton name="mascotas-rejilla" loading>
          <div />
        </Skeleton>
      ) : !pets.length ? (
        <div className="bg-surface p-5"><EmptyState title={t("mascotas.empty.title")} hint={t("mascotas.empty.hint")} /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pets.map((pet) => {
            const health = petHealth(pet, t);
            return (
              <article key={pet.id_mascota} className="flex flex-col bg-surface">
                <div className="relative"><PetPhoto pet={pet} className="aspect-[4/3] w-full" /><span className="absolute top-0 left-0"><Badge tono={health.tone}>{health.label}</Badge></span></div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-2"><h3 className="text-[17px] font-semibold text-ink">{pet.nombre}</h3><span className="text-[11.5px] text-ink-mute">{pet.especie}</span></div>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{pet.raza}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="bg-sunken p-3"><dt className="rotulo text-ink-mute">{t("mascotas.card.age")}</dt><dd className="mt-1 text-[12px] text-ink">{petAge(pet.fecha_nacimiento, t)}</dd></div>
                    <div className="bg-sunken p-3"><dt className="rotulo text-ink-mute">{t("mascotas.card.weight")}</dt><dd className="nums mt-1 text-[12px] text-ink">{pet.peso} kg</dd></div>
                    <div className="bg-sunken p-3"><dt className="rotulo text-ink-mute">{t("mascotas.card.vaccines")}</dt><dd className="nums mt-1 text-[12px] text-ink">{pet.vacunas.length}</dd></div>
                  </dl>
                  <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={() => setSelectedId(pet.id_mascota)}>{t("mascotas.manageProfile")}</button>
                </div>
              </article>
            );
          })}
          <button type="button" disabled={!canOperate} className="flex min-h-[240px] flex-col items-center justify-center gap-3 bg-sunken text-ink-mute hover:bg-neutral-wash hover:text-ink disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingPet(null)}><Plus size={22} aria-hidden /><span className="text-[13px] font-medium">{t("mascotas.registerAnother")}</span></button>
        </div>
      )}

      {/* ── La ficha de la mascota ──

          Antes "Gestionar perfil" no abría nada: desplegaba cinco
          bloques DEBAJO de la cuadrícula —una barra navy con las
          acciones, datos básicos, padecimientos, alergias y vacunas—
          y bajaba la página hasta ahí. Con varias mascotas la ficha
          quedaba lejos de la tarjeta que se tocó, mezclada con el
          resto de la pantalla, y no había un borde claro de dónde
          empezaba y terminaba.

          Ahora es una ventana: se abre encima, se lee entera, y se
          cierra con la X, con Escape o tocando afuera. Lo que se abre
          desde acá —editar, agregar una vacuna, confirmar un borrado—
          se apila encima, y Escape cierra solo la de arriba. */}
      {selected && (
        <Dialog
          title={t("mascotas.management.aria", { nombre: selected.nombre })}
          ancho="max-w-[880px]"
          onClose={() => setSelectedId(null)}
        >
          {/* Resumen y acciones. El nombre ya está en la barra de
              arriba; acá va lo que lo identifica de un vistazo. */}
          <div className="flex flex-wrap items-center gap-4 border-b border-sunken px-6 py-5">
            <PetPhoto pet={selected} className="h-16 w-16 flex-shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="titular truncate text-[19px] text-ink">{selected.nombre}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {selected.especie} · {selected.raza} · {petAge(selected.fecha_nacimiento, t)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondaryCompacto} onClick={() => openCard(selected)}>
                <IdCard size={14} /> {t("mascotas.management.card")}
              </button>
              <button type="button" disabled={!canOperate} className={`${btnSecondaryCompacto} disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => setEditingPet(selected)}>
                <Pencil size={14} /> {t("mascotas.management.edit")}
              </button>
              <button type="button" disabled={!canOperate} className={`${btnDangerCompacto} disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => void removePet(selected)}>
                <Trash2 size={14} /> {t("mascotas.management.delete")}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-7 px-6 py-6">
            {/* Datos básicos */}
            <section>
              <h3 className="rotulo text-ink-mute">{t("mascotas.basicData.title")}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  [t("mascotas.basicData.birth"), formatDate(selected.fecha_nacimiento, localeTag)],
                  [t("mascotas.basicData.sex"), selected.sexo === "macho" ? t("mascotas.basicData.male") : t("mascotas.basicData.female")],
                  [t("mascotas.basicData.color"), selected.color],
                  [t("mascotas.basicData.microchip"), selected.microchip || t("mascotas.basicData.notRegistered")],
                  [t("mascotas.basicData.sterilized"), selected.esterilizado ? t("mascotas.basicData.yes") : t("mascotas.basicData.no")],
                  [t("mascotas.basicData.vet"), selected.veterinaria || t("mascotas.basicData.notRegisteredF")],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[14px] bg-sunken px-4 py-3">
                    <dt className="rotulo text-ink-mute">{label}</dt>
                    <dd className="mt-1 break-words text-[13px] text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Padecimientos */}
            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="rotulo text-ink-mute">{t("mascotas.conditions.title")}</h3>
                <button type="button" disabled={!canOperate} className={`${btnSecondaryCompacto} shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => setEditingCondition(null)}>
                  <Plus size={14} /> {t("mascotas.conditions.add")}
                </button>
              </div>
              <div className="mt-3">
                {selected.padecimientos.length ? (
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {selected.padecimientos.map((condition) => (
                      <li key={condition.id_padecimiento} className="flex gap-3 rounded-[14px] bg-warn-wash/60 p-4">
                        <Stethoscope size={17} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-warn" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="break-words text-[14px] font-semibold text-ink">{condition.nombre}</h4>
                              {condition.fecha_diagnostico && <p className="nums mt-0.5 text-[11.5px] text-ink-mute">{t("mascotas.conditions.diagnosedOn", { fecha: formatDate(condition.fecha_diagnostico, localeTag) })}</p>}
                            </div>
                            <span className="-mt-1 -mr-2 flex shrink-0">
                              <button type="button" disabled={!canOperate} className={`${btnQuiet} px-2.5 disabled:cursor-not-allowed disabled:opacity-50`} aria-label={t("mascotas.conditions.edit", { nombre: condition.nombre })} onClick={() => setEditingCondition(condition)}><Pencil size={14} /></button>
                              <button type="button" disabled={!canOperate} className={`${btnQuiet} px-2.5 text-danger disabled:cursor-not-allowed disabled:opacity-50`} aria-label={t("mascotas.conditions.delete", { nombre: condition.nombre })} onClick={() => removeCondition(condition)}><Trash2 size={14} /></button>
                            </span>
                          </div>
                          <p className={`mt-2 whitespace-pre-wrap text-[13px] ${condition.cuidados ? "text-ink-soft" : "text-ink-mute italic"}`}>{condition.cuidados || t("mascotas.conditions.noCareNotes")}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={t("mascotas.conditions.empty.title")} hint={t("mascotas.conditions.empty.hint")} />
                )}
              </div>
            </section>

            {/* Alergias y cuidados */}
            {(selected.alergias || selected.notas) && (
              <section>
                <h3 className="rotulo text-ink-mute">{t("mascotas.allergies.title")}</h3>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-[14px] bg-sunken p-4"><h4 className="rotulo text-ink-mute">{t("mascotas.allergies.allergiesLabel")}</h4><p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{selected.alergias || t("mascotas.allergies.noneRegistered")}</p></div>
                  <div className="rounded-[14px] bg-sunken p-4"><h4 className="rotulo text-ink-mute">{t("mascotas.allergies.careLabel")}</h4><p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{selected.notas || t("mascotas.allergies.noNotes")}</p></div>
                </div>
              </section>
            )}

            {/* Vacunas */}
            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="rotulo text-ink-mute">{t("mascotas.vaccineHistory.title")}</h3>
                <button type="button" disabled={!canOperate} className={`${btnSecondaryCompacto} shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => setEditingVaccine(null)}>
                  <Plus size={14} /> {t("mascotas.vaccineHistory.add")}
                </button>
              </div>
              <div className="mt-3">
                {selected.vacunas.length ? (
                  <Table caption={t("mascotas.vaccineHistory.caption", { nombre: selected.nombre })} padX="px-4" columnas={[{ label: t("mascotas.vaccineHistory.columns.vaccine") }, { label: t("mascotas.vaccineHistory.columns.applied") }, { label: t("mascotas.vaccineHistory.columns.expires") }, { label: t("mascotas.vaccineHistory.columns.status") }, { label: t("mascotas.vaccineHistory.columns.actions"), align: "right", muda: true }]}>
                    {selected.vacunas.map((vaccine) => (
                      <tr key={vaccine.id_vacuna}>
                        <td className="px-4 py-3 text-[13px] font-medium text-ink"><span className="block">{vaccine.nombre_vacuna}</span>{vaccine.veterinaria && <span className="text-[11px] font-normal text-ink-mute">{vaccine.veterinaria}</span>}</td>
                        <td className="nums px-4 py-3 text-[12.5px] whitespace-nowrap text-ink-soft">{formatDate(vaccine.fecha_aplicacion, localeTag)}</td>
                        <td className="nums px-4 py-3 text-[12.5px] whitespace-nowrap text-ink-soft">{formatDate(vaccine.fecha_vencimiento, localeTag)}</td>
                        <td className="px-4 py-3"><Badge tono={vaccine.estado === "vigente" ? "ok" : vaccine.estado === "pendiente" ? "warn" : "danger"}>{vaccine.estado === "pendiente" ? t("mascotas.vaccineHistory.statusUpcoming") : vaccine.estado}</Badge></td>
                        <td className="px-2 py-2 text-right whitespace-nowrap"><button type="button" disabled={!canOperate} className={`${btnQuiet} px-2.5 disabled:cursor-not-allowed disabled:opacity-50`} aria-label={t("mascotas.vaccineHistory.edit", { nombre: vaccine.nombre_vacuna })} onClick={() => setEditingVaccine(vaccine)}><Pencil size={14} /></button><button type="button" disabled={!canOperate} className={`${btnQuiet} px-2.5 text-danger disabled:cursor-not-allowed disabled:opacity-50`} aria-label={t("mascotas.vaccineHistory.delete", { nombre: vaccine.nombre_vacuna })} onClick={() => removeVaccine(vaccine)}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </Table>
                ) : (
                  <EmptyState title={t("mascotas.vaccineHistory.empty.title")} hint={t("mascotas.vaccineHistory.empty.hint")} />
                )}
              </div>
            </section>
          </div>
        </Dialog>
      )}

      {editingPet !== undefined && user && <Dialog title={editingPet ? t("mascotas.dialogs.editPet", { nombre: editingPet.nombre }) : t("mascotas.dialogs.registerPet")} onClose={() => setEditingPet(undefined)} ancho={ANCHO_FORMULARIO}><PetForm pet={editingPet} userId={user.id} onClose={() => setEditingPet(undefined)} onSaved={load} /></Dialog>}
      {editingCondition !== undefined && selected && <Dialog title={editingCondition ? t("mascotas.dialogs.editCondition", { nombre: editingCondition.nombre }) : t("mascotas.dialogs.addCondition", { nombre: selected.nombre })} onClose={() => setEditingCondition(undefined)} ancho={ANCHO_FORMULARIO}><ConditionForm pet={selected} condition={editingCondition} onClose={() => setEditingCondition(undefined)} onSaved={load} /></Dialog>}
      {editingVaccine !== undefined && selected && <Dialog title={editingVaccine ? t("mascotas.dialogs.editVaccine") : t("mascotas.dialogs.addVaccine", { nombre: selected.nombre })} onClose={() => setEditingVaccine(undefined)} ancho={ANCHO_FORMULARIO}><VaccineForm pet={selected} vaccine={editingVaccine} onClose={() => setEditingVaccine(undefined)} onSaved={load} /></Dialog>}

      {/* Reemplaza a dos `window.confirm`. El de la mascota decía
          "Esta acción no se puede deshacer" y no podía decir mucho
          más; acá se nombra lo que se lleva por delante. */}
      {porBorrar && (
        <Confirmar
          tono="peligro"
          titulo={porBorrar.tipo === "mascota" ? t("mascotas.delete.petTitle", { nombre: porBorrar.pet.nombre }) : porBorrar.tipo === "vacuna" ? t("mascotas.delete.vaccineTitle") : t("mascotas.delete.conditionTitle")}
          cuerpo={
            porBorrar.tipo === "mascota"
              ? t(porBorrar.pet.vacunas.length === 1 ? "mascotas.delete.petBodySingular" : "mascotas.delete.petBodyPlural", { count: porBorrar.pet.vacunas.length })
              : porBorrar.tipo === "vacuna"
                ? t("mascotas.delete.vaccineBody", { nombre: porBorrar.vaccine.nombre_vacuna })
                : t("mascotas.delete.conditionBody", { nombre: porBorrar.condition.nombre })
          }
          confirmar={porBorrar.tipo === "mascota" ? t("mascotas.delete.confirmPet") : porBorrar.tipo === "vacuna" ? t("mascotas.delete.confirmVaccine") : t("mascotas.delete.confirmCondition")}
          ocupado={borrando}
          onConfirmar={() => void confirmarBorrado()}
          onCancelar={() => setPorBorrar(null)}
        />
      )}
    </Page>
  );
};

export default Mascotas;
