import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Camera, IdCard, Pencil, Plus, Syringe, Trash2, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { formatDate, petAge } from "../lib/pets";
import {
  deletePet,
  deleteVaccine,
  listPets,
  savePet,
  saveVaccine,
} from "../services/pets.service";
import type { Pet, PetInput, Vaccine, VaccineInput } from "../types/pet.types";
import {
  Badge,
  EmptyState,
  Page,
  PageHeader,
  Table,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  input,
} from "./ui";

const fieldLabel = "grid gap-1.5 text-[12px] font-medium text-ink-soft";
const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";

const Dialog = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
    <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-[#0b2331]/75" />
    <section role="dialog" aria-modal="true" aria-labelledby="pet-dialog-title" className="anim-rise relative max-h-[92dvh] w-full max-w-[720px] overflow-y-auto bg-surface">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-rail px-5 py-4">
        <h2 id="pet-dialog-title" className="text-[16px] font-semibold text-white">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 text-rail-text hover:bg-rail-hover hover:text-white"><X size={18} /></button>
      </header>
      {children}
    </section>
  </div>,
  document.body
);

const PetForm = ({ pet, userId, onClose, onSaved }: { pet: Pet | null; userId: string; onClose: () => void; onSaved: () => Promise<void> }) => {
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (name: string, value: string | boolean) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (photo && (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024)) {
      setError("La foto debe ser JPG, PNG o WebP y pesar menos de 5 MB.");
      return;
    }
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
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>Nombre *<input className={input} required maxLength={100} value={values.nombre} onChange={(e) => update("nombre", e.target.value)} /></label>
        <label className={fieldLabel}>Especie *<input className={input} required list="pet-species" maxLength={50} value={values.especie} onChange={(e) => update("especie", e.target.value)} /><datalist id="pet-species"><option value="Perro" /><option value="Gato" /><option value="Conejo" /><option value="Ave" /></datalist></label>
        <label className={fieldLabel}>Raza *<input className={input} required maxLength={100} value={values.raza} onChange={(e) => update("raza", e.target.value)} /></label>
        <label className={fieldLabel}>Sexo *<select className={input} value={values.sexo} onChange={(e) => update("sexo", e.target.value)}><option value="macho">Macho</option><option value="hembra">Hembra</option></select></label>
        <label className={fieldLabel}>Fecha de nacimiento *<input className={input} required type="date" max={new Date().toISOString().slice(0, 10)} value={values.fecha_nacimiento} onChange={(e) => update("fecha_nacimiento", e.target.value)} /></label>
        <label className={fieldLabel}>Peso (kg) *<input className={input} required type="number" min="0.01" max="9999" step="0.01" value={values.peso} onChange={(e) => update("peso", e.target.value)} /></label>
        <label className={fieldLabel}>Color *<input className={input} required maxLength={100} value={values.color} onChange={(e) => update("color", e.target.value)} /></label>
        <label className={fieldLabel}>Número de microchip<input className={input} maxLength={50} value={values.microchip} onChange={(e) => update("microchip", e.target.value)} /></label>
        <label className={fieldLabel}>Veterinaria habitual<input className={input} maxLength={150} value={values.veterinaria} onChange={(e) => update("veterinaria", e.target.value)} /></label>
        <label className={`${fieldLabel} justify-end`}><span className="flex min-h-10 items-center gap-2 bg-sunken px-3"><input type="checkbox" checked={values.esterilizado} onChange={(e) => update("esterilizado", e.target.checked)} />Está esterilizado/a</span></label>
      </div>
      <label className={fieldLabel}>Alergias o condiciones médicas<textarea className={`${input} min-h-20 resize-y`} maxLength={1000} value={values.alergias} onChange={(e) => update("alergias", e.target.value)} /></label>
      <label className={fieldLabel}>Cuidados, comportamiento y notas<textarea className={`${input} min-h-24 resize-y`} maxLength={2000} value={values.notas} onChange={(e) => update("notas", e.target.value)} /></label>
      <label className={fieldLabel}><span className="flex items-center gap-2"><Camera size={15} /> Foto de perfil</span><input className={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /><span className="font-normal text-ink-mute">JPG, PNG o WebP. Máximo 5 MB.</span></label>
      {error && <p role="alert" className="bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Guardando…" : "Guardar mascota"}</button></div>
    </form>
  );
};

const VaccineForm = ({ pet, vaccine, onClose, onSaved }: { pet: Pet; vaccine: Vaccine | null; onClose: () => void; onSaved: () => Promise<void> }) => {
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
      setError("La fecha de vencimiento no puede ser anterior a la aplicación.");
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
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
      <label className={fieldLabel}>Vacuna o tratamiento *<input className={input} required maxLength={150} value={values.nombre_vacuna} onChange={(e) => update("nombre_vacuna", e.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>Fecha de aplicación *<input className={input} required type="date" value={values.fecha_aplicacion} onChange={(e) => update("fecha_aplicacion", e.target.value)} /></label>
        <label className={fieldLabel}>Fecha de vencimiento *<input className={input} required type="date" min={values.fecha_aplicacion} value={values.fecha_vencimiento} onChange={(e) => update("fecha_vencimiento", e.target.value)} /></label>
        <label className={fieldLabel}>Veterinaria<input className={input} maxLength={150} value={values.veterinaria} onChange={(e) => update("veterinaria", e.target.value)} /></label>
        <label className={fieldLabel}>Lote o comprobante<input className={input} maxLength={80} value={values.lote} onChange={(e) => update("lote", e.target.value)} /></label>
      </div>
      <label className={fieldLabel}>Notas<textarea className={`${input} min-h-20 resize-y`} maxLength={1000} value={values.notas} onChange={(e) => update("notas", e.target.value)} /></label>
      {error && <p role="alert" className="bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Guardando…" : "Guardar registro"}</button></div>
    </form>
  );
};

const petHealth = (pet: Pet) => {
  if (pet.vacunas.some((item) => item.estado === "vencida")) return { label: "Vacuna vencida", tone: "danger" as const };
  if (pet.vacunas.some((item) => item.estado === "pendiente")) return { label: "Próxima a vencer", tone: "warn" as const };
  if (!pet.vacunas.length) return { label: "Sin vacunas", tone: "neutral" as const };
  return { label: "Al día", tone: "ok" as const };
};

const PetPhoto = ({ pet, className }: { pet: Pet; className: string }) => pet.fotoUrl ? (
  <img src={pet.fotoUrl} alt={`Foto de ${pet.nombre}`} className={`${className} bg-sunken object-cover`} />
) : (
  <div className={`${className} flex items-center justify-center bg-sunken text-ink-mute`}><Camera size={32} strokeWidth={1.4} aria-hidden /></div>
);

const Mascotas = () => {
  const { user, getProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null | undefined>();
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null | undefined>();
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
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, [getProfile, isAdmin]);
  useEffect(() => { void load(); }, [load]);
  const selected = pets.find((pet) => pet.id_mascota === selectedId) ?? null;

  const removePet = async (pet: Pet) => {
    if (!window.confirm(`¿Eliminar a ${pet.nombre} y todo su historial? Esta acción no se puede deshacer.`)) return;
    try { await deletePet(pet); await load(); } catch (cause) { setError(messageFrom(cause)); }
  };
  const removeVaccine = async (vaccine: Vaccine) => {
    if (!window.confirm(`¿Eliminar el registro de ${vaccine.nombre_vacuna}?`)) return;
    try { await deleteVaccine(vaccine.id_vacuna); await load(); } catch (cause) { setError(messageFrom(cause)); }
  };
  const openCard = (pet: Pet) => {
    sessionStorage.setItem("tuaniscan.carnetPetId", pet.id_mascota);
    void navigate({ to: "/carnet" });
  };

  return (
    <Page>
      <PageHeader title="Mis mascotas" subtitle={loading ? "Cargando perfiles…" : `${pets.length} ${pets.length === 1 ? "mascota registrada" : "mascotas registradas"} en tu cuenta.`} action={<button type="button" disabled={!canOperate} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => setEditingPet(null)}><Plus size={15} /> Registrar mascota</button>} />
      {error && <p role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {!loading && !pets.length ? (
        <div className="bg-surface p-5"><EmptyState title="Aún no tienes mascotas" hint="Registra su información para crear el carné digital y llevar el control de vacunas." /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pets.map((pet) => {
            const health = petHealth(pet);
            return (
              <article key={pet.id_mascota} className="flex flex-col bg-surface">
                <div className="relative"><PetPhoto pet={pet} className="aspect-[4/3] w-full" /><span className="absolute top-0 left-0"><Badge tono={health.tone}>{health.label}</Badge></span></div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-2"><h3 className="text-[17px] font-semibold text-ink">{pet.nombre}</h3><span className="text-[11.5px] text-ink-mute">{pet.especie}</span></div>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{pet.raza}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-px bg-canvas">
                    <div className="bg-sunken p-3"><dt className="text-[10px] uppercase text-ink-mute">Edad</dt><dd className="mt-1 text-[12px] text-ink">{petAge(pet.fecha_nacimiento)}</dd></div>
                    <div className="bg-sunken p-3"><dt className="text-[10px] uppercase text-ink-mute">Peso</dt><dd className="nums mt-1 text-[12px] text-ink">{pet.peso} kg</dd></div>
                    <div className="bg-sunken p-3"><dt className="text-[10px] uppercase text-ink-mute">Vacunas</dt><dd className="nums mt-1 text-[12px] text-ink">{pet.vacunas.length}</dd></div>
                  </dl>
                  <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={() => setSelectedId(pet.id_mascota)}>Gestionar perfil</button>
                </div>
              </article>
            );
          })}
          <button type="button" disabled={!canOperate} className="flex min-h-[240px] flex-col items-center justify-center gap-3 bg-sunken text-ink-mute hover:bg-neutral-wash hover:text-ink disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingPet(null)}><Plus size={22} aria-hidden /><span className="text-[13px] font-medium">Registrar otra mascota</span></button>
        </div>
      )}

      {selected && (
        <section className="anim-rise bg-surface" aria-label={`Gestión de ${selected.nombre}`}>
          <header className="flex flex-wrap items-center gap-4 bg-rail px-5 py-4">
            <PetPhoto pet={selected} className="h-14 w-14 flex-shrink-0" />
            <div className="min-w-0"><h3 className="truncate text-[18px] font-semibold text-white">{selected.nombre}</h3><p className="text-[12px] text-rail-text">{selected.especie} · {selected.raza}</p></div>
            <div className="ml-auto flex flex-wrap gap-1">
              <button type="button" className={btnQuiet + " text-rail-text hover:bg-rail-hover hover:text-white"} onClick={() => openCard(selected)}><IdCard size={15} /> Carné</button>
              <button type="button" disabled={!canOperate} className={btnQuiet + " text-rail-text hover:bg-rail-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50"} onClick={() => setEditingPet(selected)}><Pencil size={15} /> Editar</button>
              <button type="button" disabled={!canOperate} className={btnQuiet + " text-rail-text hover:bg-rail-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50"} onClick={() => void removePet(selected)}><Trash2 size={15} /> Eliminar</button>
              <button type="button" aria-label="Cerrar perfil" className="p-2 text-rail-text hover:bg-rail-hover hover:text-white" onClick={() => setSelectedId(null)}><X size={18} /></button>
            </div>
          </header>
          <dl className="grid gap-px bg-canvas sm:grid-cols-3">
            {[["Nacimiento", formatDate(selected.fecha_nacimiento)], ["Sexo", selected.sexo === "macho" ? "Macho" : "Hembra"], ["Color", selected.color], ["Microchip", selected.microchip || "No registrado"], ["Esterilizado", selected.esterilizado ? "Sí" : "No"], ["Veterinaria", selected.veterinaria || "No registrada"]].map(([label, value]) => <div key={label} className="bg-sunken px-5 py-3"><dt className="text-[10px] uppercase tracking-[0.08em] text-ink-mute">{label}</dt><dd className="mt-1 text-[13px] text-ink">{value}</dd></div>)}
          </dl>
          {(selected.alergias || selected.notas) && <div className="grid gap-px bg-canvas sm:grid-cols-2"><div className="bg-surface p-5"><h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Alergias y condiciones</h4><p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{selected.alergias || "Ninguna registrada"}</p></div><div className="bg-surface p-5"><h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Cuidados y notas</h4><p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{selected.notas || "Sin notas"}</p></div></div>}
          <div className="flex items-center justify-between gap-3 px-5 py-4"><h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-mute"><Syringe size={14} /> Historial de vacunas</h4><button type="button" disabled={!canOperate} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => setEditingVaccine(null)}><Plus size={14} /> Agregar vacuna</button></div>
          {selected.vacunas.length ? (
            <Table caption={`Vacunas de ${selected.nombre}`} columnas={[{ label: "Vacuna" }, { label: "Aplicada" }, { label: "Vence" }, { label: "Estado" }, { label: "Acciones", align: "right" }]}>
              {selected.vacunas.map((vaccine) => <tr key={vaccine.id_vacuna}>
                <td className="px-6 py-3 text-[13px] font-medium text-ink"><span className="block">{vaccine.nombre_vacuna}</span>{vaccine.veterinaria && <span className="text-[11px] font-normal text-ink-mute">{vaccine.veterinaria}</span>}</td>
                <td className="nums px-6 py-3 text-[12.5px] text-ink-soft">{formatDate(vaccine.fecha_aplicacion)}</td><td className="nums px-6 py-3 text-[12.5px] text-ink-soft">{formatDate(vaccine.fecha_vencimiento)}</td>
                <td className="px-6 py-3"><Badge tono={vaccine.estado === "vigente" ? "ok" : vaccine.estado === "pendiente" ? "warn" : "danger"}>{vaccine.estado === "pendiente" ? "Por vencer" : vaccine.estado}</Badge></td>
                <td className="px-4 py-2 text-right"><button type="button" disabled={!canOperate} className={`${btnQuiet} disabled:cursor-not-allowed disabled:opacity-50`} aria-label={`Editar ${vaccine.nombre_vacuna}`} onClick={() => setEditingVaccine(vaccine)}><Pencil size={14} /></button><button type="button" disabled={!canOperate} className={btnQuiet + " text-danger disabled:cursor-not-allowed disabled:opacity-50"} aria-label={`Eliminar ${vaccine.nombre_vacuna}`} onClick={() => void removeVaccine(vaccine)}><Trash2 size={14} /></button></td>
              </tr>)}
            </Table>
          ) : <div className="px-5 pb-5"><EmptyState title="Sin registros de vacunación" hint="Agrega la primera vacuna o desparasitación de esta mascota." /></div>}
        </section>
      )}

      {editingPet !== undefined && user && <Dialog title={editingPet ? `Editar a ${editingPet.nombre}` : "Registrar mascota"} onClose={() => setEditingPet(undefined)}><PetForm pet={editingPet} userId={user.id} onClose={() => setEditingPet(undefined)} onSaved={load} /></Dialog>}
      {editingVaccine !== undefined && selected && <Dialog title={editingVaccine ? "Editar vacuna" : `Agregar vacuna de ${selected.nombre}`} onClose={() => setEditingVaccine(undefined)}><VaccineForm pet={selected} vaccine={editingVaccine} onClose={() => setEditingVaccine(undefined)} onSaved={load} /></Dialog>}
    </Page>
  );
};

export default Mascotas;
