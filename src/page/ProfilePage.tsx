import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Footprints,
  Lock,
  MapPin,
  PawPrint,
  Phone,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
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

/* =========================================================
   TIPOS
   ========================================================= */

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

/* =========================================================
   FORMULARIO
   ========================================================= */

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

/* =========================================================
   ROLES
   ========================================================= */

const roleLabel = {
  dueno: "Dueño de mascota",
  paseador: "Paseador",
  negocio: "Cuenta de negocio",
  admin: "Administrador",
};

const roleMeta = {
  dueno: {
    title: "Perfil de dueño",
    text: "Registra tus mascotas y administra su información desde una misma cuenta.",
    Icon: PawPrint,
  },

  paseador: {
    title: "Perfil de paseador",
    text: "Ofrece paseos, establece tu tarifa y recibe solicitudes de otros usuarios.",
    Icon: Footprints,
  },

  negocio: {
    title: "Perfil de negocio",
    text: "Publica una veterinaria, tienda o refugio dentro del directorio.",
    Icon: Store,
  },
};

const roleRequirements: Record<RolPublico, string[]> = {
  dueno: [
    "Utiliza tus datos actuales",
    "Administra tus mascotas",
  ],

  paseador: [
    "Describe tu experiencia",
    "Define una tarifa base",
    "Requiere aprobación",
  ],

  negocio: [
    "Información del negocio",
    "Dirección y zona",
    "Horario de atención",
  ],
};

const publicRoles: RolPublico[] = [
  "dueno",
  "paseador",
  "negocio",
];

/* =========================================================
   VERIFICACIÓN
   ========================================================= */

const verificationDocumentLabels: Record<
  VerificationDocumentType,
  string
> = {
  cedula_frente: "Cédula por el frente",
  cedula_reverso: "Cédula por el reverso",
  hoja_delincuencia: "Hoja de delincuencia",
  permiso_funcionamiento: "Permiso de funcionamiento",
};

const verificationStatusLabels = {
  sin_solicitud: "Sin verificar",
  pendiente: "En revisión",
  aprobado: "Perfil verificado",
  rechazado: "Requiere correcciones",
};

/* =========================================================
   ESTILOS REUTILIZABLES
   ========================================================= */

const labelClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute";

const cardClass =
  "overflow-hidden rounded-2xl border border-black/[0.06] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_35px_rgb(0_0_0/0.025)]";

const softCardClass =
  "rounded-xl border border-black/[0.055] bg-sunken/50";

const fieldClass = `${input} rounded-xl border-black/[0.07] transition focus:border-accent focus:ring-2 focus:ring-accent/10`;

const messageFrom = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error &&
        "message" in error
      ? String(error.message)
      : "No se pudo completar la operación.";

/* =========================================================
   COMPONENTE
   ========================================================= */

const ProfilePage = () => {
  const {
    user,
    role,
    getProfile,
    updateProfile,
    addRole,
  } = useAuth();

  const navigate = useNavigate();

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [form, setForm] =
    useState<ProfileForm>(emptyForm);

  const [zonas, setZonas] =
    useState<Zona[]>([]);

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  const [removePhoto, setRemovePhoto] =
    useState(false);

  const [roleSetup, setRoleSetup] =
    useState<RolPublico | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [addingRole, setAddingRole] =
    useState<RolPublico | null>(null);

  const [
    uploadingDocument,
    setUploadingDocument,
  ] =
    useState<VerificationDocumentType | null>(
      null,
    );

  const [
    submittingVerification,
    setSubmittingVerification,
  ] = useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  /* =========================================================
     HELPERS
     ========================================================= */

  const setField = <
    K extends keyof ProfileForm,
  >(
    field: K,
    value: ProfileForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const applyProfile = (
    next: UserProfile | null,
  ) => {
    setProfile(next);

    if (next) {
      setForm(formFromProfile(next));
    }
  };

  /* =========================================================
     CARGA
     ========================================================= */

  const load = useCallback(
    async (refreshSession = false) => {
      setLoading(true);
      setError(null);

      try {
        if (refreshSession) {
          await refreshAuthSession();
        }

        const [
          nextProfile,
          nextZones,
        ] = await Promise.all([
          getProfile(),
          getZonas(),
        ]);

        setProfile(nextProfile);

        if (nextProfile) {
          setForm(
            formFromProfile(nextProfile),
          );
        }

        setZonas(nextZones);
      } catch (cause) {
        setError(messageFrom(cause));
      } finally {
        setLoading(false);
      }
    },
    [getProfile],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /* =========================================================
     PREVIEW FOTO
     ========================================================= */

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const url =
      URL.createObjectURL(photoFile);

    setPhotoPreview(url);

    return () =>
      URL.revokeObjectURL(url);
  }, [photoFile]);

  const selectPhoto = (
    file: File | null,
  ) => {
    setError(null);

    if (
      file &&
      (!file.type.startsWith(
        "image/",
      ) ||
        file.size >
          5 * 1024 * 1024)
    ) {
      setError(
        "La imagen debe ser JPG, PNG o WebP y pesar menos de 5 MB.",
      );

      setPhotoFile(null);

      return;
    }

    setPhotoFile(file);

    if (file) {
      setRemovePhoto(false);
    }
  };

  /* =========================================================
     VALIDACIÓN
     ========================================================= */

  const validatePersonal = (
    complete = false,
  ) => {
    if (!form.nombre.trim()) {
      return "El nombre completo es obligatorio.";
    }

    if (
      complete &&
      !form.telefono.trim()
    ) {
      return "Agrega tu teléfono antes de activar otro perfil.";
    }

    if (
      complete &&
      !form.zona_id
    ) {
      return "Selecciona tu zona antes de activar otro perfil.";
    }

    return null;
  };

  /* =========================================================
     ACTUALIZAR PERFIL
     ========================================================= */

  const persistProfile = async (
    includeActiveRole: boolean,
  ) => {
    if (!profile || !user) {
      throw new Error(
        "No hay una sesión activa.",
      );
    }

    let uploadedUrl:
      | string
      | null = null;

    let nextPhoto =
      removePhoto
        ? null
        : form.foto_perfil || null;

    if (photoFile) {
      uploadedUrl =
        await uploadProfilePhoto(
          user.id,
          photoFile,
        );

      nextPhoto = uploadedUrl;
    }

    const changes: ProfileUpdate = {
      nombre: form.nombre.trim(),

      telefono:
        form.telefono.trim() || null,

      foto_perfil: nextPhoto,

      zona_id:
        form.zona_id || null,
    };

    if (
      includeActiveRole &&
      role === "paseador" &&
      profile.paseador
    ) {
      changes.paseador = {
        descripcion:
          form.descripcion.trim() ||
          null,

        tarifa_base:
          form.tarifa_base
            ? Number(
                form.tarifa_base,
              )
            : null,

        disponible:
          form.disponible,
      };
    }

    if (
      includeActiveRole &&
      role === "negocio" &&
      profile.negocio
    ) {
      changes.negocio = {
        zona_id:
          form.negocio_zona_id ||
          null,

        nombre:
          form.nombre_negocio.trim(),

        tipo: form.tipo_negocio,

        direccion:
          form.direccion.trim() ||
          null,

        latitud:
          form.latitud
            ? Number(form.latitud)
            : null,

        longitud:
          form.longitud
            ? Number(form.longitud)
            : null,

        telefono:
          form.telefono_negocio.trim() ||
          null,

        horario:
          form.horario.trim() ||
          null,
      };
    }

    try {
      await updateProfile(changes);
    } catch (cause) {
      if (uploadedUrl) {
        await deleteProfilePhoto(
          uploadedUrl,
        );
      }

      throw cause;
    }

    if (
      (uploadedUrl ||
        removePhoto) &&
      profile.foto_perfil
    ) {
      await deleteProfilePhoto(
        profile.foto_perfil,
      );
    }

    setPhotoFile(null);
    setRemovePhoto(false);

    const updated =
      await getProfile();

    applyProfile(updated);

    return updated;
  };

  const save = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const personalError =
      validatePersonal();

    if (personalError) {
      setError(personalError);
      return;
    }

    if (
      role === "paseador" &&
      form.tarifa_base &&
      Number(
        form.tarifa_base,
      ) < 0
    ) {
      setError(
        "La tarifa no puede ser negativa.",
      );

      return;
    }

    if (
      role === "negocio" &&
      profile?.negocio &&
      !form.nombre_negocio.trim()
    ) {
      setError(
        "El nombre del negocio es obligatorio.",
      );

      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await persistProfile(true);

      setMessage(
        "Perfil actualizado correctamente.",
      );
    } catch (cause) {
      setError(
        messageFrom(cause),
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     PERFIL DUEÑO
     ========================================================= */

  const activateOwner =
    async () => {
      const personalError =
        validatePersonal(true);

      if (personalError) {
        setError(personalError);
        return;
      }

      setAddingRole("dueno");
      setError(null);
      setMessage(null);

      try {
        await persistProfile(
          false,
        );

        await addRole("dueno");

        applyProfile(
          await getProfile(),
        );

        setRoleSetup(null);

        setMessage(
          "Perfil de dueño activado correctamente.",
        );
      } catch (cause) {
        setError(
          messageFrom(cause),
        );
      } finally {
        setAddingRole(null);
      }
    };

  /* =========================================================
     PERFIL PASEADOR
     ========================================================= */

  const requestPaseador =
    async () => {
      const personalError =
        validatePersonal(true);

      if (personalError) {
        setError(personalError);
        return;
      }

      if (
        form.descripcion.trim()
          .length < 20
      ) {
        setError(
          "Describe tu experiencia con al menos 20 caracteres.",
        );

        return;
      }

      if (
        !form.tarifa_base ||
        Number(
          form.tarifa_base,
        ) <= 0
      ) {
        setError(
          "La tarifa base debe ser mayor a cero.",
        );

        return;
      }

      const walkerData = {
        descripcion:
          form.descripcion.trim(),

        tarifa_base: Number(
          form.tarifa_base,
        ),

        disponible:
          form.disponible,
      };

      setAddingRole(
        "paseador",
      );

      setError(null);
      setMessage(null);

      try {
        await persistProfile(
          false,
        );

        await requestWalkerProfile(
          walkerData,
        );

        applyProfile(
          await getProfile(),
        );

        setRoleSetup(null);

        setMessage(
          "Solicitud de paseador enviada. Administración revisará tu información.",
        );
      } catch (cause) {
        setError(
          messageFrom(cause),
        );
      } finally {
        setAddingRole(null);
      }
    };

  /* =========================================================
     PERFIL NEGOCIO
     ========================================================= */

  const activateBusiness =
    async () => {
      const personalError =
        validatePersonal(true);

      if (personalError) {
        setError(personalError);
        return;
      }

      if (
        !form.nombre_negocio.trim() ||
        !form.negocio_zona_id ||
        !form.telefono_negocio.trim() ||
        !form.direccion.trim() ||
        !form.horario.trim()
      ) {
        setError(
          "Completa nombre, zona, teléfono, dirección y horario del negocio.",
        );

        return;
      }

      const businessData = {
        zona_id:
          form.negocio_zona_id,

        nombre:
          form.nombre_negocio.trim(),

        tipo:
          form.tipo_negocio,

        direccion:
          form.direccion.trim(),

        latitud:
          form.latitud
            ? Number(
                form.latitud,
              )
            : null,

        longitud:
          form.longitud
            ? Number(
                form.longitud,
              )
            : null,

        telefono:
          form.telefono_negocio.trim(),

        horario:
          form.horario.trim(),
      };

      setAddingRole(
        "negocio",
      );

      setError(null);
      setMessage(null);

      try {
        await persistProfile(
          false,
        );

        await createBusinessProfile(
          businessData,
        );

        await addRole(
          "negocio",
        );

        applyProfile(
          await getProfile(),
        );

        setRoleSetup(null);

        setMessage(
          "Perfil de negocio activado correctamente.",
        );
      } catch (cause) {
        setError(
          messageFrom(cause),
        );
      } finally {
        setAddingRole(null);
      }
    };

  /* =========================================================
     VERIFICACIÓN
     ========================================================= */

  const uploadDocument = async (
    type: VerificationDocumentType,
    file: File | null,
  ) => {
    if (!file || !user) {
      return;
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowed.includes(
        file.type,
      ) ||
      file.size >
        10 * 1024 * 1024
    ) {
      setError(
        "El documento debe ser PDF, JPG, PNG o WebP y pesar menos de 10 MB.",
      );

      return;
    }

    setUploadingDocument(
      type,
    );

    setError(null);
    setMessage(null);

    try {
      await uploadVerificationDocument(
        user.id,
        type,
        file,
      );

      applyProfile(
        await getProfile(),
      );

      setMessage(
        `${verificationDocumentLabels[type]} guardado correctamente.`,
      );
    } catch (cause) {
      setError(
        messageFrom(cause),
      );
    } finally {
      setUploadingDocument(
        null,
      );
    }
  };

  const submitVerification =
    async () => {
      setSubmittingVerification(
        true,
      );

      setError(null);
      setMessage(null);

      try {
        await submitVerificationRequest();

        applyProfile(
          await getProfile(),
        );

        setMessage(
          "Solicitud de verificación enviada a administración.",
        );
      } catch (cause) {
        setError(
          messageFrom(cause),
        );
      } finally {
        setSubmittingVerification(
          false,
        );
      }
    };

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <Page>
        <div
          className={`${cardClass} flex min-h-44 items-center justify-center`}
        >
          <div className="flex flex-col items-center gap-3">
            <RefreshCw
              size={21}
              className="animate-spin text-accent"
            />

            <p className="text-[13px] text-ink-soft">
              Cargando tu perfil…
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (!profile && user) {
    return (
      <Page>
        <div
          className={`${cardClass} flex flex-col items-start gap-4 p-6`}
        >
          <p className="text-[13px] text-danger">
            {error ??
              "No se encontró tu perfil."}
          </p>

          <button
            type="button"
            onClick={() =>
              void load(true)
            }
            className={
              btnPrimary
            }
          >
            <RefreshCw
              size={15}
            />

            Renovar sesión y
            reintentar
          </button>
        </div>
      </Page>
    );
  }

  if (!profile) {
    return null;
  }

  /* =========================================================
     DATOS CALCULADOS
     ========================================================= */

  const missingRoles =
    publicRoles.filter(
      (item) =>
        !profile.roles.includes(
          item,
        ),
    );

  const avatarUrl =
    photoPreview ||
    (removePhoto
      ? ""
      : form.foto_perfil);

  const requiredVerificationDocuments: VerificationDocumentType[] =
    [
      "cedula_frente",
      "cedula_reverso",

      ...(profile.paseador
        ? ([
            "hoja_delincuencia",
          ] as const)
        : []),

      ...(profile.negocio
        ? ([
            "permiso_funcionamiento",
          ] as const)
        : []),
    ];

  const uploadedTypes =
    new Set(
      profile.verificacion.documentos.map(
        (document) =>
          document.tipo_documento,
      ),
    );

  const verificationEditable =
    profile.verificacion
      .estado ===
      "sin_solicitud" ||
    profile.verificacion
      .estado ===
      "rechazado";

  const missingDocuments =
    requiredVerificationDocuments.filter(
      (type) =>
        !uploadedTypes.has(
          type,
        ),
    );

  const selectedZone =
    zonas.find(
      (zona) =>
        zona.id_zona ===
        form.zona_id,
    );

  /* =========================================================
     UI
     ========================================================= */

  return (
    <Page>
      <PageHeader
        title="Mi perfil"
        subtitle="Administra tu información personal, verificación y perfiles asociados."
        action={
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/actualizar-contrasena",
              })
            }
            className={
              btnSecondary
            }
          >
            <Lock size={15} />
            Cambiar contraseña
          </button>
        }
      />

      {/* =====================================================
          MENSAJES
         ===================================================== */}

      {(error || message) && (
        <div
          aria-live="polite"
          className={`
            flex items-start gap-3
            rounded-xl border
            px-4 py-3.5
            text-[13px]
            ${
              error
                ? "border-danger/10 bg-danger-wash text-danger"
                : "border-ok/10 bg-ok-wash text-ok"
            }
          `}
        >
          {error ? (
            <X
              size={17}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <CheckCircle2
              size={17}
              className="mt-0.5 shrink-0"
            />
          )}

          <span>
            {error ?? message}
          </span>
        </div>
      )}

      {/* =====================================================
          CABECERA DEL PERFIL
         ===================================================== */}

      <div className={cardClass}>
        <div
          className="
            relative
            overflow-hidden
            border-b border-black/[0.05]
            bg-gradient-to-br
            from-accent/[0.09]
            via-surface
            to-accent/[0.025]
            px-5 py-6
            sm:px-7 sm:py-7
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-20 -top-24
              h-56 w-56
              rounded-full
              bg-accent/[0.07]
              blur-3xl
            "
          />

          <div
            className="
              relative
              flex flex-col
              gap-5
              sm:flex-row
              sm:items-center
            "
          >
            {/* FOTO */}

            <div className="group relative self-start">
              <ProfileAvatar
                key={
                  avatarUrl ||
                  form.nombre
                }
                profile={{
                  ...profile,

                  nombre:
                    form.nombre,

                  foto_perfil:
                    avatarUrl ||
                    null,
                }}
                size="h-24 w-24 sm:h-28 sm:w-28"
              />

              {/* 
                La cámara cubre el avatar pero permanece oculta.
                Aparece solamente al hacer hover o focus.
              */}
              <label
                title="Cambiar foto de perfil"
                className="
                  absolute inset-0
                  z-10
                  flex cursor-pointer
                  items-center
                  justify-center
                  rounded-full
                  bg-black/0
                  opacity-0
                  transition-all
                  duration-200
                  group-hover:bg-black/35
                  group-hover:opacity-100
                  focus-within:bg-black/35
                  focus-within:opacity-100
                "
              >
                <span
                  className="
                    flex h-10 w-10
                    scale-90
                    items-center
                    justify-center
                    rounded-full
                    bg-white/95
                    text-ink
                    shadow-lg
                    backdrop-blur-sm
                    transition-transform
                    duration-200
                    group-hover:scale-100
                  "
                >
                  <Camera
                    size={17}
                    strokeWidth={2}
                  />
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(
                    event,
                  ) => {
                    selectPhoto(
                      event.target
                        .files?.[0] ??
                        null,
                    );

                    event.target.value =
                      "";
                  }}
                />
              </label>
            </div>

            {/* INFORMACIÓN */}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2
                  className="
                    truncate
                    text-[21px]
                    font-semibold
                    tracking-[-0.025em]
                    text-ink
                    sm:text-[24px]
                  "
                >
                  {form.nombre ||
                    profile.nombre}
                </h2>

                <Badge
                  tono={
                    profile.activo
                      ? "ok"
                      : "danger"
                  }
                >
                  {profile.activo
                    ? "Cuenta activa"
                    : "Cuenta inactiva"}
                </Badge>

                {/* VERIFICACIÓN EN CABECERA */}

                {!profile.isAdmin && (
                  <span
                    className={`
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      px-2.5 py-1
                      text-[11px]
                      font-semibold
                      ${
                        profile
                          .verificacion
                          .estado ===
                        "aprobado"
                          ? "border-accent/15 bg-accent/[0.08] text-accent-dark"
                          : profile
                                .verificacion
                                .estado ===
                              "pendiente"
                            ? "border-warn/15 bg-warn/10 text-warn"
                            : profile
                                  .verificacion
                                  .estado ===
                                "rechazado"
                              ? "border-danger/15 bg-danger-wash text-danger"
                              : "border-black/[0.06] bg-sunken text-ink-mute"
                      }
                    `}
                  >
                    <ShieldCheck
                      size={13}
                      strokeWidth={2.2}
                    />

                    {
                      verificationStatusLabels[
                        profile
                          .verificacion
                          .estado
                      ]
                    }
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[13px] text-ink-soft">
                {profile.email}
              </p>

              {/* ROLES */}

              <div className="mt-3 flex flex-wrap gap-2">
                {profile.isAdmin && (
                  <span className="rounded-lg bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-dark">
                    Administrador
                  </span>
                )}

                {profile.roles.map(
                  (item) => (
                    <span
                      key={item}
                      className="
                        rounded-lg
                        border border-black/[0.05]
                        bg-surface/80
                        px-2.5 py-1
                        text-[11px]
                        font-medium
                        text-ink-soft
                      "
                    >
                      {
                        roleLabel[
                          item
                        ]
                      }
                    </span>
                  ),
                )}
              </div>

              {/* FOTO */}

              {(form.foto_perfil ||
                photoFile) && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(
                      null,
                    );

                    setRemovePhoto(
                      true,
                    );
                  }}
                  className="
                    mt-4
                    inline-flex
                    items-center
                    gap-1.5
                    text-[11.5px]
                    font-medium
                    text-ink-mute
                    transition
                    hover:text-danger
                  "
                >
                  <Trash2
                    size={13}
                  />

                  Quitar foto
                </button>
              )}

              <p className="mt-1 text-[10.5px] text-ink-mute">
                Pasa el cursor sobre
                la foto para
                cambiarla · JPG, PNG
                o WebP · Máximo 5 MB.
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            INFORMACIÓN PERSONAL
           =================================================== */}

        <form
          onSubmit={save}
          className="p-5 sm:p-7"
        >
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-ink">
              Información personal
            </h3>

            <p className="mt-1 text-[12px] text-ink-mute">
              Estos datos se
              comparten entre todos
              los perfiles asociados
              a tu cuenta.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="perfil-nombre"
                className={labelClass}
              >
                Nombre completo
              </label>

              <input
                id="perfil-nombre"
                value={form.nombre}
                onChange={(
                  event,
                ) =>
                  setField(
                    "nombre",
                    event.target
                      .value,
                  )
                }
                className={
                  fieldClass
                }
                required
                maxLength={150}
              />
            </div>

            <div>
              <label
                htmlFor="perfil-email"
                className={labelClass}
              >
                Correo electrónico
              </label>

              <input
                id="perfil-email"
                value={
                  profile.email
                }
                className={`${fieldClass} cursor-not-allowed bg-sunken/70 opacity-70`}
                readOnly
              />
            </div>

            <div>
              <label
                htmlFor="perfil-telefono"
                className={labelClass}
              >
                Teléfono
              </label>

              <div className="relative">
                <Phone
                  size={15}
                  className="
                    pointer-events-none
                    absolute left-3
                    top-1/2
                    -translate-y-1/2
                    text-ink-mute
                  "
                />

                <input
                  id="perfil-telefono"
                  type="tel"
                  value={
                    form.telefono
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "telefono",
                      event.target
                        .value,
                    )
                  }
                  className={`${fieldClass} pl-9`}
                  maxLength={20}
                  placeholder="Ej. 8888-8888"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="perfil-zona"
                className={labelClass}
              >
                Zona
              </label>

              <div className="relative">
                <MapPin
                  size={15}
                  className="
                    pointer-events-none
                    absolute left-3
                    top-1/2
                    -translate-y-1/2
                    text-ink-mute
                  "
                />

                <select
                  id="perfil-zona"
                  value={
                    form.zona_id
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "zona_id",
                      event.target
                        .value,
                    )
                  }
                  className={`${fieldClass} pl-9`}
                >
                  <option value="">
                    Seleccionar zona
                  </option>

                  {zonas.map(
                    (zona) => (
                      <option
                        key={
                          zona.id_zona
                        }
                        value={
                          zona.id_zona
                        }
                      >
                        {
                          zona.nombre
                        }
                        ,{" "}
                        {
                          zona.canton
                        }{" "}
                        ·{" "}
                        {
                          zona.provincia
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-7 flex justify-end border-t border-black/[0.05] pt-5">
            <button
              type="submit"
              disabled={saving}
              className={`${btnPrimary} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Save size={15} />

              {saving
                ? "Guardando…"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>

      {/* =====================================================
          VERIFICACIÓN
         ===================================================== */}

      {!profile.isAdmin && (
        <div className={cardClass}>
          <div
            className="
              flex flex-col gap-3
              border-b border-black/[0.05]
              px-5 py-5
              sm:flex-row
              sm:items-center
              sm:justify-between
              sm:px-6
            "
          >
            <div className="flex items-start gap-3">
              <span
                className="
                  flex h-10 w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-accent/10
                  text-accent-dark
                "
              >
                <ShieldCheck
                  size={19}
                />
              </span>

              <div>
                <h3 className="text-[15px] font-semibold text-ink">
                  Verificación de
                  identidad
                </h3>

                <p className="mt-1 text-[12px] text-ink-mute">
                  Protege tu cuenta
                  y genera confianza
                  dentro de la
                  comunidad.
                </p>
              </div>
            </div>

            <Badge
              tono={
                profile.verificacion
                  .estado ===
                "aprobado"
                  ? "ok"
                  : profile
                        .verificacion
                        .estado ===
                      "rechazado"
                    ? "danger"
                    : "warn"
              }
            >
              {
                verificationStatusLabels[
                  profile
                    .verificacion
                    .estado
                ]
              }
            </Badge>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {profile.verificacion
              .estado !==
              "aprobado" && (
              <div className="flex gap-3 rounded-xl border border-accent/10 bg-accent/[0.04] px-4 py-3.5">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-accent-dark"
                />

                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  Sube los documentos
                  requeridos para
                  confirmar tu
                  identidad.
                  Administración los
                  revisará antes de
                  aprobar tu cuenta.
                </p>
              </div>
            )}

            {profile.verificacion
              .estado ===
              "rechazado" &&
              profile.verificacion
                .observacion && (
                <div
                  role="alert"
                  className="rounded-xl border border-danger/10 bg-danger-wash px-4 py-3 text-[12.5px] text-danger"
                >
                  <span className="font-semibold">
                    Observación:
                  </span>{" "}
                  {
                    profile
                      .verificacion
                      .observacion
                  }
                </div>
              )}

            <div className="grid gap-3 sm:grid-cols-2">
              {requiredVerificationDocuments.map(
                (type) => {
                  const document =
                    profile.verificacion.documentos.find(
                      (item) =>
                        item.tipo_documento ===
                        type,
                    );

                  return (
                    <div
                      key={type}
                      className={`
                        flex min-h-[132px]
                        flex-col
                        rounded-xl border
                        p-4
                        transition
                        ${
                          document
                            ? "border-ok/15 bg-ok/[0.025]"
                            : "border-black/[0.06] bg-sunken/45"
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`
                            flex h-9 w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            ${
                              document
                                ? "bg-ok/10 text-ok"
                                : "bg-surface text-accent-dark"
                            }
                          `}
                        >
                          <FileText
                            size={
                              16
                            }
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink">
                            {
                              verificationDocumentLabels[
                                type
                              ]
                            }
                          </p>

                          <p className="mt-1 truncate text-[11px] text-ink-mute">
                            {document?.nombre_archivo ??
                              "Pendiente de subir"}
                          </p>
                        </div>

                        {document && (
                          <CheckCircle2
                            size={
                              17
                            }
                            className="shrink-0 text-ok"
                          />
                        )}
                      </div>

                      {verificationEditable && (
                        <label
                          className={`${btnSecondary} mt-auto cursor-pointer self-start`}
                        >
                          {uploadingDocument ===
                          type
                            ? "Subiendo…"
                            : document
                              ? "Reemplazar"
                              : "Subir documento"}

                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={
                              uploadingDocument !==
                              null
                            }
                            onChange={(
                              event,
                            ) => {
                              void uploadDocument(
                                type,

                                event
                                  .target
                                  .files?.[0] ??
                                  null,
                              );

                              event.target.value =
                                "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                },
              )}
            </div>

            {verificationEditable && (
              <div
                className="
                  flex flex-col gap-3
                  border-t border-black/[0.05]
                  pt-5
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <p className="text-[11px] text-ink-mute">
                  PDF, JPG, PNG o
                  WebP · Máximo 10 MB
                  por archivo.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void submitVerification()
                  }
                  disabled={
                    submittingVerification ||
                    uploadingDocument !==
                      null ||
                    missingDocuments.length >
                      0
                  }
                  className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Send
                    size={15}
                  />

                  {submittingVerification
                    ? "Enviando…"
                    : "Enviar verificación"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          PERFIL ACTUAL: DUEÑO
         ===================================================== */}

      {role === "dueno" && (
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
              <PawPrint size={22} />
            </div>

            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-ink">
                Perfil de dueño
              </h3>

              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                Administra tus
                mascotas, vacunas,
                información y carnés
                desde una sección
                dedicada.
              </p>
            </div>

            <button
              type="button"
              className={
                btnSecondary
              }
              onClick={() =>
                void navigate({
                  to: "/mascotas",
                })
              }
            >
              <PawPrint
                size={15}
              />

              Gestionar mascotas
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          PERFIL ACTUAL: PASEADOR
         ===================================================== */}

      {role === "paseador" &&
        profile.paseador && (
          <div className={cardClass}>
            <div className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-5 sm:px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
                <Footprints
                  size={19}
                />
              </div>

              <div>
                <h3 className="text-[15px] font-semibold text-ink">
                  Perfil de
                  paseador
                </h3>

                <p className="mt-0.5 text-[11.5px] text-ink-mute">
                  Información que
                  verán los dueños.
                </p>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div className="sm:col-span-2">
                <label
                  htmlFor="perfil-descripcion"
                  className={
                    labelClass
                  }
                >
                  Experiencia y
                  descripción
                </label>

                <textarea
                  id="perfil-descripcion"
                  rows={4}
                  value={
                    form.descripcion
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "descripcion",
                      event.target
                        .value,
                    )
                  }
                  className={`${fieldClass} resize-y`}
                  maxLength={800}
                  placeholder="Cuéntales a los dueños sobre tu experiencia con mascotas..."
                />
              </div>

              <div>
                <label
                  htmlFor="perfil-tarifa"
                  className={
                    labelClass
                  }
                >
                  Tarifa base por
                  paseo
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-mute">
                    ₡
                  </span>

                  <input
                    id="perfil-tarifa"
                    type="number"
                    min="0"
                    step="100"
                    value={
                      form.tarifa_base
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "tarifa_base",
                        event.target
                          .value,
                      )
                    }
                    className={`${fieldClass} nums pl-7`}
                  />
                </div>
              </div>

              <label
                className={`${softCardClass} flex cursor-pointer items-center gap-3 px-4 py-3.5 sm:self-end`}
              >
                <input
                  type="checkbox"
                  checked={
                    form.disponible
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "disponible",
                      event.target
                        .checked,
                    )
                  }
                  className="h-4 w-4 accent-accent"
                />

                <div>
                  <p className="text-[12px] font-medium text-ink">
                    Disponible
                  </p>

                  <p className="mt-0.5 text-[10.5px] text-ink-mute">
                    Permitir nuevas
                    solicitudes de
                    paseo.
                  </p>
                </div>
              </label>

              <div
                className={`${softCardClass} p-4`}
              >
                <p className={
                  labelClass
                }>
                  Verificación
                </p>

                <p className="text-[13px] font-medium capitalize text-ink">
                  {
                    profile
                      .paseador
                      .estado_verificacion
                  }
                </p>
              </div>

              <div
                className={`${softCardClass} p-4`}
              >
                <p className={
                  labelClass
                }>
                  Calificación
                </p>

                <p className="nums text-[20px] font-semibold tracking-tight text-ink">
                  {profile.paseador.calificacion_promedio.toFixed(
                    2,
                  )}

                  <span className="ml-1 text-[12px] font-normal text-ink-mute">
                    / 5
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          PERFIL ACTUAL: NEGOCIO
         ===================================================== */}

      {role === "negocio" &&
        profile.negocio && (
          <div className={cardClass}>
            <div className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-5 sm:px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
                <Building2
                  size={19}
                />
              </div>

              <div>
                <h3 className="text-[15px] font-semibold text-ink">
                  Datos del negocio
                </h3>

                <p className="mt-0.5 text-[11.5px] text-ink-mute">
                  Información pública
                  dentro del
                  directorio.
                </p>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <label
                  htmlFor="negocio-nombre"
                  className={
                    labelClass
                  }
                >
                  Nombre del negocio
                </label>

                <input
                  id="negocio-nombre"
                  value={
                    form.nombre_negocio
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "nombre_negocio",
                      event.target
                        .value,
                    )
                  }
                  className={
                    fieldClass
                  }
                  required
                  maxLength={150}
                />
              </div>

              <div>
                <label
                  htmlFor="negocio-tipo"
                  className={
                    labelClass
                  }
                >
                  Tipo
                </label>

                <select
                  id="negocio-tipo"
                  value={
                    form.tipo_negocio
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "tipo_negocio",
                      event.target
                        .value as ProfileForm["tipo_negocio"],
                    )
                  }
                  className={
                    fieldClass
                  }
                >
                  <option value="veterinaria">
                    Veterinaria
                  </option>

                  <option value="tienda">
                    Tienda
                  </option>

                  <option value="refugio">
                    Refugio
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="negocio-zona"
                  className={
                    labelClass
                  }
                >
                  Zona
                </label>

                <select
                  id="negocio-zona"
                  value={
                    form.negocio_zona_id
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "negocio_zona_id",
                      event.target
                        .value,
                    )
                  }
                  className={
                    fieldClass
                  }
                >
                  <option value="">
                    Seleccionar zona
                  </option>

                  {zonas.map(
                    (zona) => (
                      <option
                        key={
                          zona.id_zona
                        }
                        value={
                          zona.id_zona
                        }
                      >
                        {
                          zona.nombre
                        }
                        ,{" "}
                        {
                          zona.canton
                        }{" "}
                        ·{" "}
                        {
                          zona.provincia
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="negocio-telefono"
                  className={
                    labelClass
                  }
                >
                  Teléfono
                </label>

                <input
                  id="negocio-telefono"
                  type="tel"
                  value={
                    form.telefono_negocio
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "telefono_negocio",
                      event.target
                        .value,
                    )
                  }
                  className={
                    fieldClass
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="negocio-direccion"
                  className={
                    labelClass
                  }
                >
                  Dirección
                </label>

                <input
                  id="negocio-direccion"
                  value={
                    form.direccion
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "direccion",
                      event.target
                        .value,
                    )
                  }
                  className={
                    fieldClass
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="negocio-latitud"
                  className={
                    labelClass
                  }
                >
                  Latitud
                </label>

                <input
                  id="negocio-latitud"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={
                    form.latitud
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "latitud",
                      event.target
                        .value,
                    )
                  }
                  className={`${fieldClass} nums`}
                />
              </div>

              <div>
                <label
                  htmlFor="negocio-longitud"
                  className={
                    labelClass
                  }
                >
                  Longitud
                </label>

                <input
                  id="negocio-longitud"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={
                    form.longitud
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "longitud",
                      event.target
                        .value,
                    )
                  }
                  className={`${fieldClass} nums`}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="negocio-horario"
                  className={
                    labelClass
                  }
                >
                  Horario
                </label>

                <input
                  id="negocio-horario"
                  value={
                    form.horario
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "horario",
                      event.target
                        .value,
                    )
                  }
                  className={
                    fieldClass
                  }
                  placeholder="Ej. Lunes a sábado, 8:00 a.m. – 5:00 p.m."
                />
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          AGREGAR OTRO PERFIL
         ===================================================== */}

      <div className={cardClass}>
        <div className="border-b border-black/[0.05] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
              <Sparkles
                size={18}
              />
            </span>

            <div>
              <h3 className="text-[15px] font-semibold text-ink">
                Agregar otro
                perfil
              </h3>

              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                Utiliza la misma
                cuenta para
                diferentes funciones
                dentro de TuanisCan.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {missingRoles.length >
          0 ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {missingRoles.map(
                (item) => {
                  const meta =
                    roleMeta[item];

                  const pending =
                    item ===
                      "paseador" &&
                    profile
                      .paseador
                      ?.estado_verificacion ===
                      "pendiente";

                  const rejected =
                    item ===
                      "paseador" &&
                    profile
                      .paseador
                      ?.estado_verificacion ===
                      "rechazado";

                  const selected =
                    roleSetup ===
                    item;

                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={
                        rejected
                      }
                      onClick={() => {
                        setRoleSetup(
                          item,
                        );

                        setError(
                          null,
                        );

                        setMessage(
                          null,
                        );
                      }}
                      className={`
                        group
                        relative
                        flex min-h-[220px]
                        flex-col
                        rounded-2xl border
                        p-5 text-left
                        transition-all
                        duration-200
                        ${
                          selected
                            ? "border-accent/40 bg-accent/[0.04] shadow-[0_8px_30px_rgb(0_0_0/0.05)]"
                            : "border-black/[0.06] bg-surface hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-[0_8px_25px_rgb(0_0_0/0.05)]"
                        }
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      `}
                    >
                      <span
                        className={`
                          flex h-11 w-11
                          items-center
                          justify-center
                          rounded-xl
                          transition-all
                          ${
                            selected
                              ? "bg-accent text-white shadow-sm"
                              : "bg-accent/10 text-accent-dark group-hover:bg-accent group-hover:text-white"
                          }
                        `}
                      >
                        <meta.Icon
                          size={
                            20
                          }
                          strokeWidth={
                            1.9
                          }
                        />
                      </span>

                      <span className="mt-4 text-[14px] font-semibold text-ink">
                        {
                          meta.title
                        }
                      </span>

                      <span className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
                        {rejected
                          ? "La solicitud anterior fue rechazada."
                          : pending
                            ? "Tu solicitud está siendo revisada."
                            : meta.text}
                      </span>

                      {!rejected && (
                        <div className="mt-4 space-y-1.5">
                          {roleRequirements[
                            item
                          ].map(
                            (
                              requirement,
                            ) => (
                              <span
                                key={
                                  requirement
                                }
                                className="flex items-center gap-1.5 text-[10.5px] text-ink-mute"
                              >
                                <Check
                                  size={
                                    11
                                  }
                                  strokeWidth={
                                    2.5
                                  }
                                  className="text-accent"
                                />

                                {
                                  requirement
                                }
                              </span>
                            ),
                          )}
                        </div>
                      )}

                      <span className="mt-auto pt-5 text-[11.5px] font-semibold text-accent-dark">
                        {pending
                          ? "Revisar solicitud"
                          : selected
                            ? "Configurando"
                            : "Comenzar configuración →"}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          ) : (
            <EmptyState
              title="Todos los perfiles están activos"
              hint="Puedes cambiar entre ellos desde el selector de la barra lateral."
            />
          )}
        </div>
      </div>

      {/* =====================================================
          CONFIGURACIÓN DE NUEVO PERFIL
         ===================================================== */}

      {roleSetup && (
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-4 border-b border-black/[0.05] px-5 py-5 sm:px-6">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-accent-dark">
                Nuevo perfil
              </p>

              <h3 className="mt-1 text-[16px] font-semibold text-ink">
                Configurar{" "}
                {roleMeta[
                  roleSetup
                ].title.toLowerCase()}
              </h3>
            </div>

            <button
              type="button"
              className={
                btnQuiet
              }
              onClick={() =>
                setRoleSetup(null)
              }
            >
              <X size={15} />
              Cerrar
            </button>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            {/* =================================================
                DUEÑO
               ================================================= */}

            {roleSetup ===
              "dueno" && (
              <>
                <div className="sm:col-span-2">
                  <div className="rounded-2xl border border-accent/10 bg-accent/[0.035] p-5">
                    <div className="flex gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
                        <PawPrint
                          size={
                            20
                          }
                        />
                      </span>

                      <div>
                        <h4 className="text-[14px] font-semibold text-ink">
                          Activar
                          perfil de
                          dueño
                        </h4>

                        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                          No
                          necesitas
                          llenar otro
                          formulario.
                          Utilizaremos
                          tu
                          información
                          personal
                          actual.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-black/[0.04] bg-surface p-3.5">
                        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-mute">
                          Nombre
                        </p>

                        <p className="mt-1 truncate text-[12px] font-medium text-ink">
                          {form.nombre ||
                            "Sin completar"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-black/[0.04] bg-surface p-3.5">
                        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-mute">
                          Teléfono
                        </p>

                        <p className="mt-1 truncate text-[12px] font-medium text-ink">
                          {form.telefono ||
                            "Sin completar"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-black/[0.04] bg-surface p-3.5">
                        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-mute">
                          Zona
                        </p>

                        <p className="mt-1 truncate text-[12px] font-medium text-ink">
                          {selectedZone
                            ? `${selectedZone.nombre}, ${selectedZone.canton}`
                            : "Sin completar"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-black/[0.05] pt-5 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      void activateOwner()
                    }
                    disabled={
                      addingRole !==
                      null
                    }
                    className={
                      btnPrimary
                    }
                  >
                    <PawPrint
                      size={15}
                    />

                    {addingRole ===
                    "dueno"
                      ? "Activando…"
                      : "Activar perfil de dueño"}
                  </button>
                </div>
              </>
            )}

            {/* =================================================
                PASEADOR
               ================================================= */}

            {roleSetup ===
              "paseador" && (
              <>
                <div className="sm:col-span-2">
                  <div className="rounded-xl border border-accent/10 bg-accent/[0.035] p-4">
                    <div className="flex gap-3">
                      <Footprints
                        size={19}
                        className="mt-0.5 shrink-0 text-accent-dark"
                      />

                      <div>
                        <p className="text-[13px] font-semibold text-ink">
                          Solicitud
                          para ser
                          paseador
                        </p>

                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                          Cuéntanos
                          sobre tu
                          experiencia
                          y define tu
                          tarifa
                          inicial.
                          Administración
                          revisará la
                          solicitud.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="solicitud-descripcion"
                    className={
                      labelClass
                    }
                  >
                    Experiencia como
                    paseador *
                  </label>

                  <textarea
                    id="solicitud-descripcion"
                    rows={5}
                    value={
                      form.descripcion
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "descripcion",
                        event.target
                          .value,
                      )
                    }
                    className={`${fieldClass} resize-y`}
                    maxLength={800}
                    placeholder="Ej. Tengo 3 años de experiencia paseando perros de diferentes tamaños. También tengo experiencia con perros nerviosos y cachorros..."
                  />

                  <div className="mt-1.5 flex justify-between gap-3">
                    <p className="text-[10.5px] text-ink-mute">
                      Mínimo 20
                      caracteres.
                    </p>

                    <p className="text-[10.5px] text-ink-mute">
                      {
                        form
                          .descripcion
                          .length
                      }
                      /800
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="solicitud-tarifa"
                    className={
                      labelClass
                    }
                  >
                    Tarifa base por
                    paseo *
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-mute">
                      ₡
                    </span>

                    <input
                      id="solicitud-tarifa"
                      type="number"
                      min="1"
                      step="100"
                      value={
                        form.tarifa_base
                      }
                      onChange={(
                        event,
                      ) =>
                        setField(
                          "tarifa_base",
                          event
                            .target
                            .value,
                        )
                      }
                      className={`${fieldClass} nums pl-7`}
                      placeholder="4500"
                    />
                  </div>

                  <p className="mt-1.5 text-[10.5px] text-ink-mute">
                    Podrás
                    modificarla
                    posteriormente.
                  </p>
                </div>

                <label
                  className="
                    flex cursor-pointer
                    items-center gap-3
                    rounded-xl
                    border border-black/[0.06]
                    bg-sunken/50
                    px-4 py-3.5
                    sm:self-end
                  "
                >
                  <input
                    type="checkbox"
                    checked={
                      form.disponible
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "disponible",
                        event.target
                          .checked,
                      )
                    }
                    className="h-4 w-4 accent-accent"
                  />

                  <div>
                    <p className="text-[12px] font-medium text-ink">
                      Disponible al
                      ser aprobado
                    </p>

                    <p className="mt-0.5 text-[10.5px] text-ink-mute">
                      Podrás recibir
                      solicitudes
                      inmediatamente.
                    </p>
                  </div>
                </label>

                <div className="flex flex-col gap-3 border-t border-black/[0.05] pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-[10.5px] leading-relaxed text-ink-mute">
                    Al enviar la
                    solicitud tu
                    perfil quedará
                    pendiente hasta
                    que
                    administración
                    lo apruebe.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void requestPaseador()
                    }
                    disabled={
                      addingRole !==
                      null
                    }
                    className={
                      btnPrimary
                    }
                  >
                    <Send
                      size={15}
                    />

                    {addingRole ===
                    "paseador"
                      ? "Enviando…"
                      : profile.paseador
                        ? "Actualizar solicitud"
                        : "Enviar solicitud"}
                  </button>
                </div>
              </>
            )}

            {/* =================================================
                NEGOCIO
               ================================================= */}

            {roleSetup ===
              "negocio" && (
              <>
                {/* INTRODUCCIÓN */}

                <div className="sm:col-span-2">
                  <div className="rounded-xl border border-accent/10 bg-accent/[0.035] p-4">
                    <div className="flex gap-3">
                      <Store
                        size={19}
                        className="mt-0.5 shrink-0 text-accent-dark"
                      />

                      <div>
                        <p className="text-[13px] font-semibold text-ink">
                          Registrar
                          un negocio
                        </p>

                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                          Completa la
                          información
                          que los
                          usuarios
                          verán en el
                          directorio
                          de
                          TuanisCan.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PASO 1 */}

                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 text-[10px] font-bold text-accent-dark">
                      1
                    </span>

                    <div>
                      <p className="text-[12px] font-semibold text-ink">
                        Información
                        básica
                      </p>

                      <p className="text-[10.5px] text-ink-mute">
                        Identifica
                        tu negocio
                        dentro del
                        directorio.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-nombre"
                    className={
                      labelClass
                    }
                  >
                    Nombre del
                    negocio *
                  </label>

                  <input
                    id="activar-negocio-nombre"
                    value={
                      form.nombre_negocio
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "nombre_negocio",
                        event.target
                          .value,
                      )
                    }
                    className={
                      fieldClass
                    }
                    maxLength={150}
                    placeholder="Ej. Veterinaria Huellitas"
                  />
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-tipo"
                    className={
                      labelClass
                    }
                  >
                    Tipo de negocio
                    *
                  </label>

                  <select
                    id="activar-negocio-tipo"
                    value={
                      form.tipo_negocio
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "tipo_negocio",

                        event.target
                          .value as ProfileForm["tipo_negocio"],
                      )
                    }
                    className={
                      fieldClass
                    }
                  >
                    <option value="veterinaria">
                      Veterinaria
                    </option>

                    <option value="tienda">
                      Tienda para
                      mascotas
                    </option>

                    <option value="refugio">
                      Refugio
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-telefono"
                    className={
                      labelClass
                    }
                  >
                    Teléfono *
                  </label>

                  <div className="relative">
                    <Phone
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
                    />

                    <input
                      id="activar-negocio-telefono"
                      type="tel"
                      value={
                        form.telefono_negocio
                      }
                      onChange={(
                        event,
                      ) =>
                        setField(
                          "telefono_negocio",
                          event
                            .target
                            .value,
                        )
                      }
                      className={`${fieldClass} pl-9`}
                      maxLength={
                        20
                      }
                      placeholder="Ej. 2222-2222"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-horario"
                    className={
                      labelClass
                    }
                  >
                    Horario de
                    atención *
                  </label>

                  <input
                    id="activar-negocio-horario"
                    value={
                      form.horario
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "horario",
                        event.target
                          .value,
                      )
                    }
                    className={
                      fieldClass
                    }
                    placeholder="Ej. Lun - Sáb, 8:00 a.m. - 5:00 p.m."
                  />
                </div>

                {/* PASO 2 */}

                <div className="mt-2 border-t border-black/[0.05] pt-5 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 text-[10px] font-bold text-accent-dark">
                      2
                    </span>

                    <div>
                      <p className="text-[12px] font-semibold text-ink">
                        Ubicación
                      </p>

                      <p className="text-[10.5px] text-ink-mute">
                        Ayuda a los
                        usuarios a
                        encontrar tu
                        negocio.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-zona"
                    className={
                      labelClass
                    }
                  >
                    Zona *
                  </label>

                  <select
                    id="activar-negocio-zona"
                    value={
                      form.negocio_zona_id
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "negocio_zona_id",
                        event.target
                          .value,
                      )
                    }
                    className={
                      fieldClass
                    }
                  >
                    <option value="">
                      Seleccionar zona
                    </option>

                    {zonas.map(
                      (zona) => (
                        <option
                          key={
                            zona.id_zona
                          }
                          value={
                            zona.id_zona
                          }
                        >
                          {
                            zona.nombre
                          }
                          ,{" "}
                          {
                            zona.canton
                          }{" "}
                          ·{" "}
                          {
                            zona.provincia
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-direccion"
                    className={
                      labelClass
                    }
                  >
                    Dirección *
                  </label>

                  <input
                    id="activar-negocio-direccion"
                    value={
                      form.direccion
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "direccion",
                        event.target
                          .value,
                      )
                    }
                    className={
                      fieldClass
                    }
                    placeholder="Ej. 100 m norte del parque central"
                  />
                </div>

                {/* PASO 3 OPCIONAL */}

                <div className="mt-2 border-t border-black/[0.05] pt-5 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sunken text-[10px] font-bold text-ink-mute">
                      3
                    </span>

                    <div>
                      <p className="text-[12px] font-semibold text-ink">
                        Coordenadas
                      </p>

                      <p className="text-[10.5px] text-ink-mute">
                        Opcional ·
                        Úsalas si
                        quieres una
                        ubicación más
                        precisa en el
                        mapa.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-latitud"
                    className={
                      labelClass
                    }
                  >
                    Latitud
                  </label>

                  <input
                    id="activar-negocio-latitud"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={
                      form.latitud
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "latitud",
                        event.target
                          .value,
                      )
                    }
                    className={`${fieldClass} nums`}
                    placeholder="10.000000"
                  />
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-longitud"
                    className={
                      labelClass
                    }
                  >
                    Longitud
                  </label>

                  <input
                    id="activar-negocio-longitud"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={
                      form.longitud
                    }
                    onChange={(
                      event,
                    ) =>
                      setField(
                        "longitud",
                        event.target
                          .value,
                      )
                    }
                    className={`${fieldClass} nums`}
                    placeholder="-85.000000"
                  />
                </div>

                <div className="flex justify-end border-t border-black/[0.05] pt-5 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      void activateBusiness()
                    }
                    disabled={
                      addingRole !==
                      null
                    }
                    className={
                      btnPrimary
                    }
                  >
                    <UserPlus
                      size={15}
                    />

                    {addingRole ===
                    "negocio"
                      ? "Creando negocio…"
                      : "Crear y activar negocio"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Page>
  );
};

export default ProfilePage;