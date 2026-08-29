import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Check,
  FileText,
  Footprints,
  Lock,
  PawPrint,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Store,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  Badge,
  EmptyState,
  Page,
  PageHeader,
  Section,
  btnDanger,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  input,
} from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import {
  createBusinessProfile,
  deleteProfilePhoto,
  getZonas,
  refreshAuthSession,
  requestWalkerProfile,
  uploadProfilePhoto,
} from "../services/auth.service";
import {
  submitVerificationRequest,
  uploadVerificationDocument,
} from "../services/verification.service";
import type {
  ProfileUpdate,
  RolPublico,
  UserProfile,
  VerificationDocumentType,
  Zona,
} from "../types/auth.types";

interface ProfileForm {
  nombre: string;
  telefono: string;
  foto_perfil: string;
  zona_id: string;
  descripcion: string;
  tarifa_base: string;
  disponible: boolean;
  negocio_zona_id: string;
  nombre_negocio: string;
  tipo_negocio: "veterinaria" | "tienda" | "refugio";
  direccion: string;
  latitud: string;
  longitud: string;
  telefono_negocio: string;
  horario: string;
}

const emptyForm: ProfileForm = {
  nombre: "",
  telefono: "",
  foto_perfil: "",
  zona_id: "",
  descripcion: "",
  tarifa_base: "",
  disponible: false,
  negocio_zona_id: "",
  nombre_negocio: "",
  tipo_negocio: "veterinaria",
  direccion: "",
  latitud: "",
  longitud: "",
  telefono_negocio: "",
  horario: "",
};

const formFromProfile = (profile: UserProfile): ProfileForm => ({
  nombre: profile.nombre,
  telefono: profile.telefono ?? "",
  foto_perfil: profile.foto_perfil ?? "",
  zona_id: profile.zona_id ?? "",
  descripcion: profile.paseador?.descripcion ?? "",
  tarifa_base: profile.paseador?.tarifa_base?.toString() ?? "",
  disponible: profile.paseador?.disponible ?? false,
  negocio_zona_id: profile.negocio?.zona_id ?? "",
  nombre_negocio: profile.negocio?.nombre ?? "",
  tipo_negocio: profile.negocio?.tipo ?? "veterinaria",
  direccion: profile.negocio?.direccion ?? "",
  latitud: profile.negocio?.latitud?.toString() ?? "",
  longitud: profile.negocio?.longitud?.toString() ?? "",
  telefono_negocio: profile.negocio?.telefono ?? "",
  horario: profile.negocio?.horario ?? "",
});

const roleLabel = {
  dueno: "Dueño de mascota",
  paseador: "Paseador",
  negocio: "Cuenta de negocio",
  admin: "Administrador",
};

const roleMeta = {
  dueno: {
    title: "Perfil de dueño",
    text: "Registra mascotas, administra sus vacunas y genera carnés digitales.",
    Icon: PawPrint,
  },
  paseador: {
    title: "Perfil de paseador",
    text: "Publica tu experiencia y tarifa. Requiere aprobación administrativa.",
    Icon: Footprints,
  },
  negocio: {
    title: "Perfil de negocio",
    text: "Publica una veterinaria, tienda o refugio en el directorio.",
    Icon: Store,
  },
};

const publicRoles: RolPublico[] = ["dueno", "paseador", "negocio"];
const labelClass = "text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase";
const verificationDocumentLabels: Record<VerificationDocumentType, string> = {
  cedula_frente: "Cédula por el frente",
  cedula_reverso: "Cédula por el reverso",
  hoja_delincuencia: "Hoja de delincuencia",
  permiso_funcionamiento: "Permiso de funcionamiento",
};
const verificationStatusLabels = {
  sin_solicitud: "Sin solicitar",
  pendiente: "En revisión",
  aprobado: "Perfil verificado",
  rechazado: "Requiere correcciones",
};
const messageFrom = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "No se pudo completar la operación.";

const ProfilePage = () => {
  const { user, role, getProfile, updateProfile, addRole } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [roleSetup, setRoleSetup] = useState<RolPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingRole, setAddingRole] = useState<RolPublico | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<VerificationDocumentType | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const applyProfile = (next: UserProfile | null) => {
    setProfile(next);
    if (next) setForm(formFromProfile(next));
  };

  const load = useCallback(async (refreshSession = false) => {
    setLoading(true);
    setError(null);
    try {
      if (refreshSession) await refreshAuthSession();
      const [nextProfile, nextZones] = await Promise.all([getProfile(), getZonas()]);
      setProfile(nextProfile);
      if (nextProfile) setForm(formFromProfile(nextProfile));
      setZonas(nextZones);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, [getProfile]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const selectPhoto = (file: File | null) => {
    setError(null);
    if (file && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
      setError("La imagen debe ser JPG, PNG o WebP y pesar menos de 5 MB.");
      setPhotoFile(null);
      return;
    }
    setPhotoFile(file);
    if (file) setRemovePhoto(false);
  };

  const validatePersonal = (complete = false) => {
    if (!form.nombre.trim()) return "El nombre completo es obligatorio.";
    if (complete && !form.telefono.trim()) return "Agrega tu teléfono antes de activar otro perfil.";
    if (complete && !form.zona_id) return "Selecciona tu zona antes de activar otro perfil.";
    return null;
  };

  const persistProfile = async (includeActiveRole: boolean) => {
    if (!profile || !user) throw new Error("No hay una sesión activa.");
    let uploadedUrl: string | null = null;
    let nextPhoto = removePhoto ? null : form.foto_perfil || null;

    if (photoFile) {
      uploadedUrl = await uploadProfilePhoto(user.id, photoFile);
      nextPhoto = uploadedUrl;
    }

    const changes: ProfileUpdate = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      foto_perfil: nextPhoto,
      zona_id: form.zona_id || null,
    };

    if (includeActiveRole && role === "paseador" && profile.paseador) {
      changes.paseador = {
        descripcion: form.descripcion.trim() || null,
        tarifa_base: form.tarifa_base ? Number(form.tarifa_base) : null,
        disponible: form.disponible,
      };
    }
    if (includeActiveRole && role === "negocio" && profile.negocio) {
      changes.negocio = {
        zona_id: form.negocio_zona_id || null,
        nombre: form.nombre_negocio.trim(),
        tipo: form.tipo_negocio,
        direccion: form.direccion.trim() || null,
        latitud: form.latitud ? Number(form.latitud) : null,
        longitud: form.longitud ? Number(form.longitud) : null,
        telefono: form.telefono_negocio.trim() || null,
        horario: form.horario.trim() || null,
      };
    }

    try {
      await updateProfile(changes);
    } catch (cause) {
      if (uploadedUrl) await deleteProfilePhoto(uploadedUrl);
      throw cause;
    }

    if ((uploadedUrl || removePhoto) && profile.foto_perfil) {
      await deleteProfilePhoto(profile.foto_perfil);
    }
    setPhotoFile(null);
    setRemovePhoto(false);
    const updated = await getProfile();
    applyProfile(updated);
    return updated;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const personalError = validatePersonal();
    if (personalError) { setError(personalError); return; }
    if (role === "paseador" && form.tarifa_base && Number(form.tarifa_base) < 0) {
      setError("La tarifa no puede ser negativa.");
      return;
    }
    if (role === "negocio" && profile?.negocio && !form.nombre_negocio.trim()) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await persistProfile(true);
      setMessage("Perfil actualizado correctamente.");
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  };

  const activateOwner = async () => {
    const personalError = validatePersonal(true);
    if (personalError) { setError(personalError); return; }
    setAddingRole("dueno");
    setError(null);
    setMessage(null);
    try {
      await persistProfile(false);
      await addRole("dueno");
      applyProfile(await getProfile());
      setRoleSetup(null);
      setMessage("Perfil de dueño activado. Ya puedes cambiar a ese perfil.");
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setAddingRole(null);
    }
  };

  const requestPaseador = async () => {
    const personalError = validatePersonal(true);
    if (personalError) { setError(personalError); return; }
    if (form.descripcion.trim().length < 20) {
      setError("Describe tu experiencia con al menos 20 caracteres.");
      return;
    }
    if (!form.tarifa_base || Number(form.tarifa_base) <= 0) {
      setError("La tarifa base debe ser mayor a cero.");
      return;
    }
    const walkerData = {
      descripcion: form.descripcion.trim(),
      tarifa_base: Number(form.tarifa_base),
      disponible: form.disponible,
    };
    setAddingRole("paseador");
    setError(null);
    setMessage(null);
    try {
      await persistProfile(false);
      await requestWalkerProfile(walkerData);
      applyProfile(await getProfile());
      setRoleSetup(null);
      setMessage("Solicitud de paseador enviada. El perfil se activará cuando administración la apruebe.");
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setAddingRole(null);
    }
  };

  const activateBusiness = async () => {
    const personalError = validatePersonal(true);
    if (personalError) { setError(personalError); return; }
    if (!form.nombre_negocio.trim() || !form.negocio_zona_id || !form.telefono_negocio.trim() || !form.direccion.trim() || !form.horario.trim()) {
      setError("Completa nombre, zona, teléfono, dirección y horario del negocio.");
      return;
    }
    const businessData = {
      zona_id: form.negocio_zona_id,
      nombre: form.nombre_negocio.trim(),
      tipo: form.tipo_negocio,
      direccion: form.direccion.trim(),
      latitud: form.latitud ? Number(form.latitud) : null,
      longitud: form.longitud ? Number(form.longitud) : null,
      telefono: form.telefono_negocio.trim(),
      horario: form.horario.trim(),
    };
    setAddingRole("negocio");
    setError(null);
    setMessage(null);
    try {
      await persistProfile(false);
      await createBusinessProfile(businessData);
      await addRole("negocio");
      applyProfile(await getProfile());
      setRoleSetup(null);
      setMessage("Perfil de negocio activado. Ya puedes cambiar a ese perfil.");
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setAddingRole(null);
    }
  };

  const uploadDocument = async (type: VerificationDocumentType, file: File | null) => {
    if (!file || !user) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("El documento debe ser PDF, JPG, PNG o WebP y pesar menos de 10 MB.");
      return;
    }

    setUploadingDocument(type);
    setError(null);
    setMessage(null);
    try {
      await uploadVerificationDocument(user.id, type, file);
      applyProfile(await getProfile());
      setMessage(`${verificationDocumentLabels[type]} guardado correctamente.`);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setUploadingDocument(null);
    }
  };

  const submitVerification = async () => {
    setSubmittingVerification(true);
    setError(null);
    setMessage(null);
    try {
      await submitVerificationRequest();
      applyProfile(await getProfile());
      setMessage("Solicitud de verificación enviada a administración.");
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSubmittingVerification(false);
    }
  };

  const zoneOptions = zonas.map((zona) => (
    <option key={zona.id_zona} value={zona.id_zona}>{zona.nombre}, {zona.canton} · {zona.provincia}</option>
  ));

  if (loading) return <Page><Section bodyClass="px-6 py-8">Cargando perfil…</Section></Page>;
  if (!profile && user) return (
    <Page><Section bodyClass="flex flex-col items-start gap-4 px-6 py-8"><p className="text-[13px] text-danger">{error ?? "No se encontró tu perfil."}</p><button type="button" onClick={() => void load(true)} className={btnPrimary}><RefreshCw size={15} /> Renovar sesión y reintentar</button></Section></Page>
  );
  if (!profile) return null;

  const missingRoles = publicRoles.filter((item) => !profile.roles.includes(item));
  const avatarUrl = photoPreview || (removePhoto ? "" : form.foto_perfil);
  const requiredVerificationDocuments: VerificationDocumentType[] = [
    "cedula_frente",
    "cedula_reverso",
    ...(profile.paseador ? (["hoja_delincuencia"] as const) : []),
    ...(profile.negocio ? (["permiso_funcionamiento"] as const) : []),
  ];
  const uploadedTypes = new Set(profile.verificacion.documentos.map((document) => document.tipo_documento));
  const verificationEditable = profile.verificacion.estado === "sin_solicitud" || profile.verificacion.estado === "rechazado";
  const missingDocuments = requiredVerificationDocuments.filter((type) => !uploadedTypes.has(type));

  return (
    <Page>
      <PageHeader title="Mis datos" subtitle="Administra tu información y los perfiles asociados a la misma cuenta." action={<button type="button" onClick={() => navigate({ to: "/actualizar-contrasena" })} className={btnSecondary}><Lock size={15} /> Cambiar contraseña</button>} />

      {(error || message) && <div aria-live="polite" className={`flex items-center gap-2 px-5 py-4 text-[13px] ${error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"}`}>{message && <Check size={15} />}{error ?? message}</div>}

      {!profile.isAdmin && (
        <Section
          title="Verificación de identidad"
          aside={
            <Badge tono={profile.verificacion.estado === "aprobado" ? "ok" : profile.verificacion.estado === "rechazado" ? "danger" : "warn"}>
              {verificationStatusLabels[profile.verificacion.estado]}
            </Badge>
          }
          bodyClass="grid gap-4 px-4 pb-6 sm:px-6"
        >
          <div className="flex gap-3 bg-sunken px-4 py-4 text-[13px] text-ink-soft">
            <ShieldCheck size={20} className="mt-0.5 flex-shrink-0 text-accent-dark" aria-hidden />
            <p>Sube los documentos requeridos. Mientras administración los revisa puedes consultar la plataforma, pero no crear ni modificar información.</p>
          </div>

          {profile.verificacion.estado === "rechazado" && profile.verificacion.observacion && (
            <div className="bg-danger-wash px-4 py-3 text-[13px] text-danger" role="alert">
              <span className="font-semibold">Observación de administración:</span> {profile.verificacion.observacion}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {requiredVerificationDocuments.map((type) => {
              const document = profile.verificacion.documentos.find((item) => item.tipo_documento === type);
              return (
                <div key={type} className="flex min-h-24 flex-col gap-2 bg-sunken px-4 py-3">
                  <div className="flex items-start gap-2">
                    <FileText size={17} className="mt-0.5 flex-shrink-0 text-accent-dark" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink">{verificationDocumentLabels[type]}</span>
                      <span className="block truncate text-[11.5px] text-ink-mute">{document?.nombre_archivo ?? "Pendiente de subir"}</span>
                    </span>
                    {document && <Check size={16} className="text-ok" aria-label="Documento cargado" />}
                  </div>
                  {verificationEditable && (
                    <label className={`${btnSecondary} mt-auto cursor-pointer self-start`}>
                      {uploadingDocument === type ? "Subiendo…" : document ? "Reemplazar" : "Subir documento"}
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={uploadingDocument !== null}
                        onChange={(event) => {
                          void uploadDocument(type, event.target.files?.[0] ?? null);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {verificationEditable && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11.5px] text-ink-mute">PDF, JPG, PNG o WebP. Máximo 10 MB por archivo.</p>
              <button
                type="button"
                onClick={() => void submitVerification()}
                disabled={submittingVerification || uploadingDocument !== null || missingDocuments.length > 0}
                className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Send size={15} />
                {submittingVerification ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
          )}
        </Section>
      )}

      <form onSubmit={save} className="flex flex-col gap-3">
        <Section title="Información personal" bodyClass="grid gap-6 px-4 pb-6 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProfileAvatar key={avatarUrl || form.nombre} profile={{ ...profile, nombre: form.nombre, foto_perfil: avatarUrl || null }} size="h-24 w-24" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="truncate text-[18px] font-semibold text-ink">{form.nombre || profile.nombre}</p><Badge tono={profile.activo ? "ok" : "danger"}>{profile.activo ? "Cuenta activa" : "Cuenta inactiva"}</Badge></div>
              <p className="mt-1 text-[13px] text-ink-soft">{profile.roles.map((item) => roleLabel[item]).join(" + ") || (profile.isAdmin ? roleLabel.admin : "Sin perfil")} · {profile.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={btnPrimary}><Camera size={15} /> Elegir imagen<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { selectPhoto(event.target.files?.[0] ?? null); event.target.value = ""; }} /></label>
                {(form.foto_perfil || photoFile) && <button type="button" className={btnDanger} onClick={() => { setPhotoFile(null); setRemovePhoto(true); }}><Trash2 size={14} /> Quitar</button>}
              </div>
              <p className="mt-2 text-[11px] text-ink-mute">JPG, PNG o WebP. Máximo 5 MB.</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="perfil-nombre" className={labelClass}>Nombre completo</label><input id="perfil-nombre" value={form.nombre} onChange={(event) => setField("nombre", event.target.value)} className={`${input} mt-2`} required maxLength={150} /></div>
            <div><label htmlFor="perfil-email" className={labelClass}>Correo electrónico</label><input id="perfil-email" value={profile.email} className={`${input} mt-2 opacity-70`} readOnly /></div>
            <div><label htmlFor="perfil-telefono" className={labelClass}>Teléfono</label><input id="perfil-telefono" type="tel" value={form.telefono} onChange={(event) => setField("telefono", event.target.value)} className={`${input} mt-2`} maxLength={20} /></div>
            <div><label htmlFor="perfil-zona" className={labelClass}>Zona</label><select id="perfil-zona" value={form.zona_id} onChange={(event) => setField("zona_id", event.target.value)} className={`${input} mt-2`}><option value="">Seleccionar zona</option>{zoneOptions}</select></div>
          </div>
        </Section>

        {role === "dueno" && (
          <Section title="Perfil de dueño" bodyClass="flex flex-col items-start gap-3 px-4 pb-6 sm:px-6">
            <p className="text-[13px] text-ink-soft">Los datos de tus mascotas, vacunas y carnés se administran desde su sección dedicada.</p>
            <button type="button" className={btnSecondary} onClick={() => void navigate({ to: "/mascotas" })}><PawPrint size={15} /> Gestionar mis mascotas</button>
          </Section>
        )}

        {role === "paseador" && profile.paseador && (
          <Section title="Datos del perfil de paseador" bodyClass="grid gap-5 px-4 pb-6 sm:grid-cols-2 sm:px-6">
            <div className="sm:col-span-2"><label htmlFor="perfil-descripcion" className={labelClass}>Experiencia y descripción</label><textarea id="perfil-descripcion" rows={4} value={form.descripcion} onChange={(event) => setField("descripcion", event.target.value)} className={`${input} mt-2 resize-y`} maxLength={800} /></div>
            <div><label htmlFor="perfil-tarifa" className={labelClass}>Tarifa base (₡)</label><input id="perfil-tarifa" type="number" min="0" step="100" value={form.tarifa_base} onChange={(event) => setField("tarifa_base", event.target.value)} className={`${input} nums mt-2`} /></div>
            <label className="flex items-center gap-3 bg-sunken px-4 py-3 text-[13px] text-ink-soft sm:self-end"><input type="checkbox" checked={form.disponible} onChange={(event) => setField("disponible", event.target.checked)} className="h-4 w-4 accent-accent" />Disponible para recibir paseos</label>
            <div className="bg-sunken px-4 py-3"><p className={labelClass}>Verificación</p><p className="mt-1 text-[13px] capitalize text-ink">{profile.paseador.estado_verificacion}</p></div>
            <div className="bg-sunken px-4 py-3"><p className={labelClass}>Calificación</p><p className="nums mt-1 text-[13px] text-ink">{profile.paseador.calificacion_promedio.toFixed(2)} / 5</p></div>
          </Section>
        )}

        {role === "negocio" && profile.negocio && (
          <Section title="Datos del negocio" bodyClass="grid gap-5 px-4 pb-6 sm:grid-cols-2 sm:px-6">
            <div><label htmlFor="negocio-nombre" className={labelClass}>Nombre del negocio</label><input id="negocio-nombre" value={form.nombre_negocio} onChange={(event) => setField("nombre_negocio", event.target.value)} className={`${input} mt-2`} required maxLength={150} /></div>
            <div><label htmlFor="negocio-tipo" className={labelClass}>Tipo</label><select id="negocio-tipo" value={form.tipo_negocio} onChange={(event) => setField("tipo_negocio", event.target.value as ProfileForm["tipo_negocio"])} className={`${input} mt-2`}><option value="veterinaria">Veterinaria</option><option value="tienda">Tienda</option><option value="refugio">Refugio</option></select></div>
            <div><label htmlFor="negocio-zona" className={labelClass}>Zona</label><select id="negocio-zona" value={form.negocio_zona_id} onChange={(event) => setField("negocio_zona_id", event.target.value)} className={`${input} mt-2`}><option value="">Seleccionar zona</option>{zoneOptions}</select></div>
            <div><label htmlFor="negocio-telefono" className={labelClass}>Teléfono</label><input id="negocio-telefono" type="tel" value={form.telefono_negocio} onChange={(event) => setField("telefono_negocio", event.target.value)} className={`${input} mt-2`} maxLength={20} /></div>
            <div className="sm:col-span-2"><label htmlFor="negocio-direccion" className={labelClass}>Dirección</label><input id="negocio-direccion" value={form.direccion} onChange={(event) => setField("direccion", event.target.value)} className={`${input} mt-2`} /></div>
            <div><label htmlFor="negocio-latitud" className={labelClass}>Latitud</label><input id="negocio-latitud" type="number" min="-90" max="90" step="any" value={form.latitud} onChange={(event) => setField("latitud", event.target.value)} className={`${input} nums mt-2`} /></div>
            <div><label htmlFor="negocio-longitud" className={labelClass}>Longitud</label><input id="negocio-longitud" type="number" min="-180" max="180" step="any" value={form.longitud} onChange={(event) => setField("longitud", event.target.value)} className={`${input} nums mt-2`} /></div>
            <div className="sm:col-span-2"><label htmlFor="negocio-horario" className={labelClass}>Horario</label><input id="negocio-horario" value={form.horario} onChange={(event) => setField("horario", event.target.value)} className={`${input} mt-2`} /></div>
          </Section>
        )}

        <Section bodyClass="flex justify-end px-4 py-5 sm:px-6"><button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}><Save size={15} /> {saving ? "Guardando…" : "Guardar cambios"}</button></Section>
      </form>

      <Section title="Agregar otro perfil a esta cuenta" bodyClass="grid gap-3 px-4 pb-6 sm:grid-cols-3 sm:px-6">
        {missingRoles.length ? missingRoles.map((item) => {
          const meta = roleMeta[item];
          const pending = item === "paseador" && profile.paseador?.estado_verificacion === "pendiente";
          const rejected = item === "paseador" && profile.paseador?.estado_verificacion === "rechazado";
          return (
            <button key={item} type="button" disabled={rejected} onClick={() => { setRoleSetup(item); setError(null); setMessage(null); }} className={`flex min-h-40 flex-col items-start bg-sunken p-5 text-left transition-colors hover:bg-neutral-wash disabled:cursor-not-allowed disabled:opacity-60 ${roleSetup === item ? "outline-2 -outline-offset-2 outline-accent" : ""}`}>
              <meta.Icon size={24} className="text-accent-dark" />
              <span className="mt-4 text-[14px] font-semibold text-ink">{meta.title}</span>
              <span className="mt-1 text-[12px] leading-relaxed text-ink-soft">{rejected ? "Solicitud rechazada. Contacta a administración." : pending ? "Solicitud pendiente. Puedes actualizarla." : meta.text}</span>
              <span className="mt-auto pt-4 text-[12px] font-semibold text-accent-dark">{pending ? "Editar solicitud" : "Configurar perfil"}</span>
            </button>
          );
        }) : <div className="sm:col-span-3"><EmptyState title="Todos los perfiles están activos" hint="Puedes cambiar entre ellos desde el selector de la barra lateral." /></div>}
      </Section>

      {roleSetup && (
        <Section title={`Configurar ${roleMeta[roleSetup].title.toLowerCase()}`} aside={<button type="button" className={btnQuiet} onClick={() => setRoleSetup(null)}><X size={15} /> Cerrar</button>} bodyClass="grid gap-5 px-4 pb-6 sm:grid-cols-2 sm:px-6">
          {roleSetup === "dueno" && <><div className="bg-sunken px-4 py-4 sm:col-span-2"><p className="text-[13px] font-medium text-ink">Usaremos tu nombre, teléfono y zona de la información personal.</p><p className="mt-1 text-[12px] text-ink-soft">Completa esos campos arriba; el perfil solo se agrega después de validarlos.</p></div><div className="sm:col-span-2"><button type="button" onClick={() => void activateOwner()} disabled={addingRole !== null} className={btnPrimary}><UserPlus size={15} /> {addingRole === "dueno" ? "Activando…" : "Activar perfil de dueño"}</button></div></>}

          {roleSetup === "paseador" && <><div className="sm:col-span-2"><label htmlFor="solicitud-descripcion" className={labelClass}>Experiencia como paseador *</label><textarea id="solicitud-descripcion" rows={4} value={form.descripcion} onChange={(event) => setField("descripcion", event.target.value)} className={`${input} mt-2 resize-y`} maxLength={800} /></div><div><label htmlFor="solicitud-tarifa" className={labelClass}>Tarifa base (₡) *</label><input id="solicitud-tarifa" type="number" min="1" step="100" value={form.tarifa_base} onChange={(event) => setField("tarifa_base", event.target.value)} className={`${input} nums mt-2`} /></div><label className="flex items-center gap-3 bg-sunken px-4 py-3 text-[13px] text-ink-soft sm:self-end"><input type="checkbox" checked={form.disponible} onChange={(event) => setField("disponible", event.target.checked)} className="h-4 w-4 accent-accent" />Disponible cuando se apruebe</label><div className="sm:col-span-2"><button type="button" onClick={() => void requestPaseador()} disabled={addingRole !== null} className={btnPrimary}><UserPlus size={15} /> {addingRole === "paseador" ? "Enviando…" : profile.paseador ? "Actualizar solicitud" : "Enviar solicitud"}</button></div></>}

          {roleSetup === "negocio" && <><div><label htmlFor="activar-negocio-nombre" className={labelClass}>Nombre del negocio *</label><input id="activar-negocio-nombre" value={form.nombre_negocio} onChange={(event) => setField("nombre_negocio", event.target.value)} className={`${input} mt-2`} maxLength={150} /></div><div><label htmlFor="activar-negocio-tipo" className={labelClass}>Tipo *</label><select id="activar-negocio-tipo" value={form.tipo_negocio} onChange={(event) => setField("tipo_negocio", event.target.value as ProfileForm["tipo_negocio"])} className={`${input} mt-2`}><option value="veterinaria">Veterinaria</option><option value="tienda">Tienda</option><option value="refugio">Refugio</option></select></div><div><label htmlFor="activar-negocio-zona" className={labelClass}>Zona *</label><select id="activar-negocio-zona" value={form.negocio_zona_id} onChange={(event) => setField("negocio_zona_id", event.target.value)} className={`${input} mt-2`}><option value="">Seleccionar zona</option>{zoneOptions}</select></div><div><label htmlFor="activar-negocio-telefono" className={labelClass}>Teléfono *</label><input id="activar-negocio-telefono" type="tel" value={form.telefono_negocio} onChange={(event) => setField("telefono_negocio", event.target.value)} className={`${input} mt-2`} maxLength={20} /></div><div className="sm:col-span-2"><label htmlFor="activar-negocio-direccion" className={labelClass}>Dirección *</label><input id="activar-negocio-direccion" value={form.direccion} onChange={(event) => setField("direccion", event.target.value)} className={`${input} mt-2`} /></div><div><label htmlFor="activar-negocio-latitud" className={labelClass}>Latitud</label><input id="activar-negocio-latitud" type="number" min="-90" max="90" step="any" value={form.latitud} onChange={(event) => setField("latitud", event.target.value)} className={`${input} nums mt-2`} /></div><div><label htmlFor="activar-negocio-longitud" className={labelClass}>Longitud</label><input id="activar-negocio-longitud" type="number" min="-180" max="180" step="any" value={form.longitud} onChange={(event) => setField("longitud", event.target.value)} className={`${input} nums mt-2`} /></div><div className="sm:col-span-2"><label htmlFor="activar-negocio-horario" className={labelClass}>Horario *</label><input id="activar-negocio-horario" value={form.horario} onChange={(event) => setField("horario", event.target.value)} className={`${input} mt-2`} /></div><div className="sm:col-span-2"><button type="button" onClick={() => void activateBusiness()} disabled={addingRole !== null} className={btnPrimary}><UserPlus size={15} /> {addingRole === "negocio" ? "Activando…" : "Crear y activar negocio"}</button></div></>}
        </Section>
      )}
    </Page>
  );
};

export default ProfilePage;
