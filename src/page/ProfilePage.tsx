import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CircleCheckBig,
  FileText,
  Footprints,
  Globe,
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
  Upload,
  UserPlus,
  UserRound,
  X,
} from "../lib/iconos";

import ProfileAvatar from "../components/ProfileAvatar";
import SelloVerificado from "../components/SelloVerificado";
import Visor from "../components/Visor";

/* Leaflet pesa ~150 kB y solo hace falta en las pestañas de negocio:
   se carga aparte para no sumarle peso al perfil de cuentas que nunca
   tocan un mapa. Mismo criterio que en el registro. */
const SelectorUbicacion = lazy(() =>
  import("../components/SelectorUbicacion").then((m) => ({ default: m.SelectorUbicacion }))
);
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";

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
import { Combo } from "../components/Combo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import type { I18nContextValue } from "../context/i18n-context";

import {
  createBusinessProfile,
  deleteNegocioPhoto,
  deleteProfilePhoto,
  getZonas,
  refreshAuthSession,
  requestWalkerProfile,
  uploadNegocioPhoto,
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
  foto_negocio: string;
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
  foto_negocio: "",
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
  foto_negocio: profile.negocio?.foto ?? "",
});

/* =========================================================
   ROLES
   ========================================================= */

const claveRoleLabel = {
  dueno: "profile.roles.dueno",
  paseador: "profile.roles.paseador",
  negocio: "profile.roles.negocio",
  admin: "profile.roles.admin",
};

const roleMeta = {
  dueno: {
    claveTitulo: "profile.roleMeta.dueno.title",
    claveTexto: "profile.roleMeta.dueno.text",
    Icon: PawPrint,
  },

  paseador: {
    claveTitulo: "profile.roleMeta.paseador.title",
    claveTexto: "profile.roleMeta.paseador.text",
    Icon: Footprints,
  },

  negocio: {
    claveTitulo: "profile.roleMeta.negocio.title",
    claveTexto: "profile.roleMeta.negocio.text",
    Icon: Store,
  },
};

const roleRequirementClaveRaiz: Record<RolPublico, string> = {
  dueno: "profile.roleRequirements.dueno",
  paseador: "profile.roleRequirements.paseador",
  negocio: "profile.roleRequirements.negocio",
};

const publicRoles: RolPublico[] = [
  "dueno",
  "paseador",
  "negocio",
];

/* =========================================================
   VERIFICACIÓN
   ========================================================= */

const claveVerificationDocumentLabel: Record<
  VerificationDocumentType,
  string
> = {
  cedula_frente: "profile.verification.documentLabels.cedula_frente",
  cedula_reverso: "profile.verification.documentLabels.cedula_reverso",
  hoja_delincuencia: "profile.verification.documentLabels.hoja_delincuencia",
  permiso_funcionamiento: "profile.verification.documentLabels.permiso_funcionamiento",
};

const claveVerificationStatusLabel = {
  sin_solicitud: "profile.verification.statusLabels.sin_solicitud",
  pendiente: "profile.verification.statusLabels.pendiente",
  aprobado: "profile.verification.statusLabels.aprobado",
  rechazado: "profile.verification.statusLabels.rechazado",
};

/* =========================================================
   LAS PESTAÑAS

   El perfil traía seis tarjetas apiladas: identidad, datos
   personales, verificación, el perfil activo, los perfiles
   disponibles y el formulario del perfil nuevo. Todas abiertas,
   todas a la vez, una debajo de la otra. En un teléfono eso son
   más de seis pantallas de recorrido, y las tres cosas que se
   vienen a hacer acá —corregir un dato, mandar la cédula, pedir
   otro perfil— no tienen nada que ver entre sí: nadie hace dos
   en la misma visita.

   Separarlas en tres pestañas no esconde nada; pone lo que se
   vino a buscar arriba en vez de a cuatro rodadas de distancia.
   La identidad —foto, nombre, estado— queda fuera de las
   pestañas: es de quién es esta pantalla, no una de sus partes.
   ========================================================= */

const pestanas = [
  { id: "datos", rotuloClave: "profile.tabs.datos", Icon: UserRound },
  { id: "verificacion", rotuloClave: "profile.tabs.verificacion", Icon: ShieldCheck },
  { id: "perfiles", rotuloClave: "profile.tabs.perfiles", Icon: Sparkles },
  { id: "configuracion", rotuloClave: "profile.tabs.configuracion", Icon: Globe },
] as const;

type Pestana = (typeof pestanas)[number]["id"];

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

const messageFrom = (error: unknown, t: I18nContextValue["t"]) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error &&
        "message" in error
      ? String(error.message)
      : t("profile.errors.generic");

/* =========================================================
   COMPONENTE
   ========================================================= */

const ProfilePage = () => {
  /* La pestaña inicial puede venir en el fragmento de la URL: el
     aviso de "verifica tu perfil" que vive en la cabecera de toda la
     aplicación enlaza a /perfil#verificacion y tiene que caer en la
     pestaña correcta, no en la primera. */
  const [pestana, setPestana] = useState<Pestana>(() =>
    typeof window !== "undefined" &&
    window.location.hash === "#verificacion"
      ? "verificacion"
      : "datos",
  );

  const [verFoto, setVerFoto] = useState(false);

  /* Leer el fragmento una sola vez al montar no alcanza. El aviso de
     "verifica tu perfil" vive en la cabecera de TODA la aplicación,
     /perfil incluido: desde acá el enlace no remonta nada —el
     enrutador cambia la dirección con la API de historial, que ni
     siquiera dispara `hashchange`— y el clic se quedaba sin efecto
     visible justo en la pantalla donde el usuario ya estaba. */
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === "verificacion" || hash === "#verificacion") {
      setPestana("verificacion");
    }
  }, [hash]);

  const {
    user,
    role,
    getProfile,
    updateProfile,
    addRole,
  } = useAuth();

  const { t, tRaw, localeTag } = useTranslation();

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

  const [negocioPhotoFile, setNegocioPhotoFile] =
    useState<File | null>(null);

  const [negocioPhotoPreview, setNegocioPhotoPreview] =
    useState<string | null>(null);

  const [removeNegocioPhoto, setRemoveNegocioPhoto] =
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
        setError(messageFrom(cause, t));
      } finally {
        setLoading(false);
      }
    },
    [getProfile, t],
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
        t("profile.errors.photoInvalid"),
      );

      setPhotoFile(null);

      return;
    }

    setPhotoFile(file);

    if (file) {
      setRemovePhoto(false);
    }
  };

  useEffect(() => {
    if (!negocioPhotoFile) {
      setNegocioPhotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(negocioPhotoFile);
    setNegocioPhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [negocioPhotoFile]);

  const selectNegocioPhoto = (file: File | null) => {
    setError(null);

    if (
      file &&
      (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)
    ) {
      setError(
        t("profile.errors.photoInvalid"),
      );

      setNegocioPhotoFile(null);
      return;
    }

    setNegocioPhotoFile(file);

    if (file) {
      setRemoveNegocioPhoto(false);
    }
  };

  /* =========================================================
     VALIDACIÓN
     ========================================================= */

  const validatePersonal = (
    complete = false,
  ) => {
    if (!form.nombre.trim()) {
      return t("profile.errors.nameRequired");
    }

    if (
      complete &&
      !form.telefono.trim()
    ) {
      return t("profile.errors.phoneRequiredForRole");
    }

    if (
      complete &&
      !form.zona_id
    ) {
      return t("profile.errors.zoneRequiredForRole");
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
        t("profile.errors.noActiveSession"),
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

    let uploadedNegocioUrl: string | null = null;

    let nextNegocioFoto = removeNegocioPhoto
      ? null
      : form.foto_negocio || null;

    if (negocioPhotoFile) {
      uploadedNegocioUrl = await uploadNegocioPhoto(
        user.id,
        negocioPhotoFile,
      );

      nextNegocioFoto = uploadedNegocioUrl;
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

        foto: nextNegocioFoto,
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

      if (uploadedNegocioUrl) {
        await deleteNegocioPhoto(uploadedNegocioUrl);
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

    if (
      (uploadedNegocioUrl || removeNegocioPhoto) &&
      profile.negocio?.foto
    ) {
      await deleteNegocioPhoto(profile.negocio.foto);
    }

    setPhotoFile(null);
    setRemovePhoto(false);
    setNegocioPhotoFile(null);
    setRemoveNegocioPhoto(false);

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
      role === "negocio" &&
      profile?.negocio &&
      !form.nombre_negocio.trim()
    ) {
      setError(
        t("profile.errors.businessNameRequired"),
      );

      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await persistProfile(true);

      aviso.ok(t("profile.toasts.profileUpdated"), {
        detalle: t("profile.toasts.profileUpdatedDetail"),
      });
    } catch (cause) {
      setError(
        messageFrom(cause, t),
      );
      aviso.error(cause, { respaldo: t("profile.toasts.profileSaveFailed") });
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

        aviso.ok(t("profile.toasts.ownerActivated"), {
          detalle: t("profile.toasts.ownerActivatedDetail"),
        });
      } catch (cause) {
        setError(
          messageFrom(cause, t),
        );
        aviso.error(cause, { respaldo: t("profile.toasts.ownerActivateFailed") });
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
          t("profile.errors.descriptionTooShort"),
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
          t("profile.errors.rateMustBePositive"),
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

        aviso.ok(t("profile.toasts.walkerRequested"), {
          detalle: t("profile.toasts.walkerRequestedDetail"),
        });
      } catch (cause) {
        setError(
          messageFrom(cause, t),
        );
        aviso.error(cause, { respaldo: t("profile.toasts.walkerRequestFailed") });
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
          t("profile.errors.businessFieldsRequired"),
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

        aviso.ok(t("profile.toasts.businessActivated"), {
          detalle: t("profile.toasts.businessActivatedDetail"),
        });
      } catch (cause) {
        setError(
          messageFrom(cause, t),
        );
        aviso.error(cause, { respaldo: t("profile.toasts.businessActivateFailed") });
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
        t("profile.errors.documentInvalid"),
      );

      return;
    }

    setUploadingDocument(
      type,
    );

    setError(null);
    setMessage(null);

    try {
      /* Un aviso solo, que pasa de "subiendo" a "subido" o a la
         falla. Es el caso de espera de verdad de todo el sistema: un
         archivo de hasta diez megas viajando, y hasta ahora lo único
         que lo contaba era un rótulo chiquito dentro de la ficha del
         documento, que en el teléfono queda fuera de pantalla si se
         eligió el de más abajo. */
      await aviso.proceso(
        (async () => {
          await uploadVerificationDocument(user.id, type, file, t);
          applyProfile(await getProfile());
        })(),
        {
          esperando: t("profile.toasts.uploadingDocument", {
            documento: t(claveVerificationDocumentLabel[type]).toLowerCase(),
          }),
          bien: t("profile.toasts.documentUploaded", {
            documento: t(claveVerificationDocumentLabel[type]),
          }),
          mal: t("profile.toasts.documentUploadFailed", {
            documento: t(claveVerificationDocumentLabel[type]).toLowerCase(),
          }),
        },
      );
    } catch (cause) {
      setError(
        messageFrom(cause, t),
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
        await submitVerificationRequest(t);

        applyProfile(
          await getProfile(),
        );

        aviso.ok(t("profile.toasts.verificationSent"), {
          detalle: t("profile.toasts.verificationSentDetail"),
        });
      } catch (cause) {
        setError(
          messageFrom(cause, t),
        );
        aviso.error(cause, { respaldo: t("profile.toasts.verificationSendFailed") });
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
    /* Era una tarjeta de 176 px con una rueda girando, y debajo
       aparecía de golpe una pantalla de mil. El esqueleto de esta
       pantalla no es una rejilla repetida: es la cabecera de
       identidad con su degradado, la tira de pestañas y el panel de
       datos, que es lo que se está esperando. */
    return (
      <Page>
        <Skeleton name="perfil-cuenta" loading>
          <div />
        </Skeleton>
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
              t("profile.errors.profileNotFound")}
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

            {t("profile.profileNotFoundRetry")}
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

  /* En qué escalón va la verificación. Los tres pasos son subir los
     documentos, mandarlos y esperar el fallo de administración; el 4
     no es un paso sino el final, y sirve para que el tercero también
     se dibuje como cumplido. */
  const pasoVerificacion =
    profile.verificacion.estado === "aprobado"
      ? 4
      : profile.verificacion.estado === "pendiente"
        ? 3
        : missingDocuments.length === 0
          ? 2
          : 1;

  const documentosListos =
    requiredVerificationDocuments.length - missingDocuments.length;

  const pasosVerificacion = [
    {
      titulo: t("profile.steps.uploadDocuments"),
      detalle: t("profile.steps.uploadDocumentsDetail", {
        listos: documentosListos,
        total: requiredVerificationDocuments.length,
      }),
    },
    {
      titulo: t("profile.steps.sendForReview"),
      detalle:
        pasoVerificacion >= 3
          ? t("profile.steps.alreadySent")
          : t("profile.steps.enabledWithAllDocuments"),
    },
    {
      titulo: t("profile.steps.response"),
      detalle:
        profile.verificacion.estado === "aprobado"
          ? t("profile.steps.verifiedAccount")
          : t("profile.steps.reviewTime"),
    },
  ];

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
        title={t("profile.header.title")}
        subtitle={t("profile.header.subtitle")}
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
            {t("profile.header.changePassword")}
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
            {/* FOTO

                Mirar y cambiar son dos gestos distintos. Antes había
                uno solo: un `<label>` con `inset-0` cubría la foto
                entera, así que el único clic disponible abría el
                selector de archivos. Para VER la foto de uno había
                que estar dispuesto a reemplazarla.

                Y el aviso decía "pasa el cursor sobre la foto", que
                en un teléfono no significa nada: no hay cursor y no
                hay hover, de modo que en móvil el botón de cambiar
                foto era invisible hasta que se tocaba a ciegas. */}

            <div className="relative self-start">
              <button
                type="button"
                onClick={() => setVerFoto(true)}
                disabled={!avatarUrl}
                aria-label={
                  avatarUrl
                    ? t("profile.header.viewPhoto")
                    : t("profile.header.noPhotoYet")
                }
                className="block rounded-full transition-transform duration-200 ease-out focus:outline-2 focus:outline-offset-4 focus:outline-accent enabled:cursor-zoom-in enabled:hover:brightness-[0.97] enabled:active:scale-[0.98]"
              >
                <ProfileAvatar
                  key={avatarUrl || form.nombre}
                  profile={{
                    ...profile,
                    nombre: form.nombre,
                    foto_perfil: avatarUrl || null,
                  }}
                  size="h-24 w-24 sm:h-28 sm:w-28"
                  /* El sello no va acá: el estado ya está escrito con
                     todas sus letras en la píldora de al lado, y dos
                     veces lo mismo a diez píxeles de distancia no
                     informa, solo ocupa. */
                  sello={false}
                />
              </button>

              <label
                title={t("profile.header.changePhoto")}
                className="flota absolute right-0 bottom-0 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-surface text-rail transition-[background-color,transform] duration-200 ease-out hover:bg-sunken active:scale-[0.94] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
              >
                <Camera size={17} strokeWidth={2} aria-hidden />

                <span className="sr-only">{t("profile.header.changePhoto")}</span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    selectPhoto(event.target.files?.[0] ?? null);
                    event.target.value = "";
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
                    ? t("profile.header.accountActive")
                    : t("profile.header.accountInactive")}
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
                    {profile.verificacion.estado === "aprobado" ? (
                      <SelloVerificado size={14} aro={false} />
                    ) : (
                      <ShieldCheck
                        size={13}
                        strokeWidth={2.2}
                      />
                    )}

                    {
                      t(claveVerificationStatusLabel[
                        profile
                          .verificacion
                          .estado
                      ])
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
                    {t("profile.header.administrator")}
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
                        t(claveRoleLabel[
                          item
                        ])
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

                  {t("profile.header.removePhoto")}
                </button>
              )}

              <p className="mt-1 text-[10.5px] text-ink-mute">
                {t("profile.header.photoHint")}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* =====================================================
          PESTAÑAS
         ===================================================== */}

      <div
        role="tablist"
        aria-label={t("profile.tablist.ariaLabel")}
        className="inline-flex flex-wrap gap-1 rounded-full bg-sunken p-1"
      >
        {pestanas
          .filter(({ id }) => !(id === "verificacion" && profile.isAdmin))
          .map(({ id, rotuloClave, Icon }) => {
            const activa = pestana === id;

            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setPestana(id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                  activa
                    ? "bg-rail text-white"
                    : "text-ink-soft hover:bg-white/70 hover:text-ink"
                }`}
              >
                <Icon size={15} strokeWidth={1.9} aria-hidden />
                {t(rotuloClave)}

                {/* El punto solo aparece donde hay algo que hacer.
                    Una insignia permanente deja de significar nada
                    en dos días. */}
                {id === "verificacion" &&
                  !profile.isAdmin &&
                  verificationEditable && (
                    <span
                      aria-label={t("profile.tablist.pendingStepsAria")}
                      className={`h-1.5 w-1.5 rounded-full ${
                        activa ? "bg-accent" : "bg-warn"
                      }`}
                    />
                  )}
              </button>
            );
          })}
      </div>

      {/* =====================================================
          MIS DATOS
         ===================================================== */}

      {(pestana === "datos" ||
        (pestana === "verificacion" && profile.isAdmin)) && (
      <div className={cardClass}>
        <form
          onSubmit={save}
          className="p-5 sm:p-7"
        >
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-ink">
              {t("profile.dataTab.title")}
            </h3>

            <p className="mt-1 text-[12px] text-ink-mute">
              {t("profile.dataTab.subtitle")}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="perfil-nombre"
                className={labelClass}
              >
                {t("profile.dataTab.fullName")}
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
                {t("profile.dataTab.email")}
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
                {t("profile.dataTab.phone")}
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
                  placeholder={t("profile.dataTab.phonePlaceholder")}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="perfil-zona"
                className={labelClass}
              >
                {t("profile.dataTab.zone")}
              </label>

              <div className="relative">
                <Combo
                  id="perfil-zona"
                  Icon={MapPin}
                  vacio
                  placeholder={t("profile.dataTab.selectZone")}
                  value={form.zona_id}
                  onChange={(v) => setField("zona_id", v)}
                  options={zonas.map((zona) => ({
                    value: zona.id_zona,
                    label: `${zona.nombre}, ${zona.canton} · ${zona.provincia}`,
                  }))}
                />
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
                ? t("profile.dataTab.saving")
                : t("profile.dataTab.saveChanges")}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* =====================================================
          VERIFICACIÓN
         ===================================================== */}

      {/* =====================================================
          VERIFICACIÓN

          Venía como una lista larga hacia abajo sin decir nunca en
          qué punto del trámite estaba uno: un párrafo, cuatro cajas
          de documentos y un botón que a veces se dejaba pulsar y a
          veces no, sin explicar por qué. Ahora el trámite se declara
          —tres pasos, cuál está cumplido, cuál toca— y el botón dice
          en el sitio qué le falta para encenderse.

          Los datos y las funciones son los mismos: los mismos tipos
          de documento según los perfiles, la misma subida, el mismo
          envío. Lo que cambia es que se ve dónde estás.
         ===================================================== */}

      {pestana === "verificacion" && !profile.isAdmin && (
        <div className={cardClass}>
          <div className="flex flex-col gap-4 border-b border-black/[0.05] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent-dark">
                <ShieldCheck size={20} />
              </span>

              <div>
                <h3 className="text-[15px] font-semibold text-ink">
                  {t("profile.verificationTab.title")}
                </h3>

                <p className="mt-1 max-w-md text-[12px] leading-relaxed text-ink-mute">
                  {t("profile.verificationTab.subtitle")}
                </p>
              </div>
            </div>

            <Badge
              tono={
                profile.verificacion.estado === "aprobado"
                  ? "ok"
                  : profile.verificacion.estado === "rechazado"
                    ? "danger"
                    : "warn"
              }
            >
              {t(claveVerificationStatusLabel[profile.verificacion.estado])}
            </Badge>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {/* ─── El trámite, declarado ─── */}

            <ol className="grid gap-2 sm:grid-cols-3">
              {pasosVerificacion.map((paso, indice) => {
                const numero = indice + 1;
                const hecho = pasoVerificacion > numero;
                const actual = pasoVerificacion === numero;

                return (
                  <li
                    key={paso.titulo}
                    aria-current={actual ? "step" : undefined}
                    className={`rounded-[18px] px-4 py-3.5 transition-colors duration-200 ${
                      hecho
                        ? "bg-ok-wash"
                        : actual
                          ? "bg-accent-wash"
                          : "bg-sunken"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                          hecho
                            ? "bg-ok text-white"
                            : actual
                              ? "bg-rail text-white"
                              : "bg-surface text-ink-mute"
                        }`}
                      >
                        {hecho ? (
                          <Check size={13} strokeWidth={3.2} />
                        ) : (
                          numero
                        )}
                      </span>

                      <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                        {paso.titulo}
                      </p>
                    </div>

                    <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">
                      {paso.detalle}
                    </p>
                  </li>
                );
              })}
            </ol>

            {/* ─── Lo que administración devolvió ─── */}

            {profile.verificacion.estado === "rechazado" &&
              profile.verificacion.observacion && (
                <div
                  role="alert"
                  className="flex gap-3 rounded-[18px] bg-danger-wash px-4 py-3.5"
                >
                  <X size={17} className="mt-0.5 shrink-0 text-danger" />

                  <p className="text-[12.5px] leading-relaxed text-danger">
                    <span className="font-semibold">
                      {t("profile.verificationTab.needsFix")}
                    </span>{" "}
                    {profile.verificacion.observacion}
                  </p>
                </div>
              )}

            {profile.verificacion.estado === "aprobado" && (
              <div className="flex items-center gap-3 rounded-[18px] bg-ok-wash px-4 py-3.5">
                <SelloVerificado size={22} aro={false} />

                <p className="text-[12.5px] leading-relaxed text-ok">
                  {t("profile.verificationTab.verifiedMessage")}
                </p>
              </div>
            )}

            {/* ─── Los documentos ─── */}

            <div>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="rotulo text-ink-mute">{t("profile.verificationTab.documents")}</h4>

                <p className="text-[11.5px] text-ink-mute">
                  {t("profile.verificationTab.documentsCount", {
                    listos: documentosListos,
                    total: requiredVerificationDocuments.length,
                  })}
                </p>
              </div>

              {/* La barra dice lo mismo que el "3 de 4" de al lado,
                  pero sin leer. Es la única pieza de la pantalla que
                  se puede entender de reojo. */}
              <div
                aria-hidden
                className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunken"
              >
                <span
                  className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.round(
                      (documentosListos /
                        Math.max(requiredVerificationDocuments.length, 1)) *
                        100,
                    )}%`,
                  }}
                />
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {requiredVerificationDocuments.map((type) => {
                  const document = profile.verificacion.documentos.find(
                    (item) => item.tipo_documento === type,
                  );

                  return (
                    <div
                      key={type}
                      className={`flex items-start gap-3 rounded-[18px] p-4 transition-colors duration-200 ${
                        document ? "bg-ok-wash" : "bg-sunken"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          document
                            ? "bg-ok text-white"
                            : "bg-surface text-accent-dark"
                        }`}
                      >
                        {document ? (
                          <CircleCheckBig size={16} strokeWidth={2.2} />
                        ) : (
                          <FileText size={16} />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink">
                          {t(claveVerificationDocumentLabel[type])}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-ink-mute">
                          {document?.nombre_archivo ?? t("profile.verificationTab.missingFile")}
                        </p>

                        {verificationEditable && (
                          <label
                            className={`${btnQuiet} mt-2.5 cursor-pointer`}
                          >
                            <Upload size={13} />

                            {uploadingDocument === type
                              ? t("profile.verificationTab.uploading")
                              : document
                                ? t("profile.verificationTab.replace")
                                : t("profile.verificationTab.upload")}

                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              className="sr-only"
                              disabled={uploadingDocument !== null}
                              onChange={(event) => {
                                void uploadDocument(
                                  type,
                                  event.target.files?.[0] ?? null,
                                );

                                event.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── El envío ─── */}

            {verificationEditable && (
              <div className="flex flex-col gap-3 border-t border-black/[0.05] pt-5 sm:flex-row sm:items-center sm:justify-between">
                {/* Un botón apagado sin motivo escrito al lado es una
                    puerta cerrada sin cartel: se prueba, no pasa nada
                    y no queda claro si está roto. */}
                <p className="text-[11.5px] text-ink-mute">
                  {missingDocuments.length > 0
                    ? t("profile.verificationTab.missingDocuments", {
                        documentos: missingDocuments
                          .map((type) => t(claveVerificationDocumentLabel[type]))
                          .join(", "),
                      })
                    : t("profile.verificationTab.allReady")}
                </p>

                <button
                  type="button"
                  onClick={() => void submitVerification()}
                  disabled={
                    submittingVerification ||
                    uploadingDocument !== null ||
                    missingDocuments.length > 0
                  }
                  className={`${btnPrimary} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Send size={15} />

                  {submittingVerification
                    ? t("profile.verificationTab.sending")
                    : t("profile.verificationTab.sendVerification")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          CONFIGURACIÓN

          Por ahora solo vive acá el idioma. El selector mismo no
          sabe nada del perfil: es `LanguageSwitcher`, reutilizable
          en cualquier otra pantalla que llegue a necesitarlo.
         ===================================================== */}

      {pestana === "configuracion" && (
        /* Sin `overflow-hidden`: a diferencia del resto de las
           tarjetas, esta termina justo donde termina el selector de
           idioma, y su lista desplegable —que no usa portal, como sí
           hacen otros combos del armazón— necesita salir por encima
           del borde inferior sin que la tarjeta se la recorte. */
        <div className="rounded-2xl border border-black/[0.06] bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_35px_rgb(0_0_0/0.025)] sm:p-7">
          <div className="mb-5">
            <h3 className="text-[15px] font-semibold text-ink">
              {t("settings.tab")}
            </h3>
          </div>

          <LanguageSwitcher />
        </div>
      )}

      {/* =====================================================
          MIS PERFILES

          Todo lo que sigue —el perfil activo, los que se pueden
          activar y el formulario del que se está creando— es una
          sola conversación: qué soy en esta aplicación. Va junto.
         ===================================================== */}

      {pestana === "perfiles" && (
        <>

      {role === "dueno" && (
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
              <PawPrint size={22} />
            </div>

            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-ink">
                {t("profile.ownerCard.title")}
              </h3>

              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                {t("profile.ownerCard.text")}
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

              {t("profile.ownerCard.manage")}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          PERFIL ACTUAL: PASEADOR Y NEGOCIO

          Las dos tarjetas de acá abajo tenían campos editables —tarifa,
          disponibilidad, dirección, mapa, horario— sin ningún botón que
          los guardara: se podía cambiar el mapa del negocio y no pasaba
          nada al salir de la pantalla. El `<form>` las envuelve a las
          dos y comparte el mismo `save` que ya usa "Mis datos" —ya sabe
          incluir paseador o negocio según el rol activo, así que no
          hace falta otra función.
         ===================================================== */}

      <form onSubmit={save}>

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
                  {t("profile.walkerCard.title")}
                </h3>

                <p className="mt-0.5 text-[11.5px] text-ink-mute">
                  {t("profile.walkerCard.subtitle")}
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
                  {t("profile.walkerCard.experience")}
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
                  placeholder={t("profile.walkerCard.experiencePlaceholder")}
                />
              </div>

              {/* La tarifa y los recargos se configuran en su propia
                  vista (/p/tarifas): acá solo se muestra la tarifa y se
                  lleva hasta allá, para no tener el precio editable en
                  dos lugares. */}
              <div className={`${softCardClass} flex items-center justify-between gap-3 p-4`}>
                <div>
                  <p className={labelClass}>
                    {t("profile.walkerCard.baseRate")}
                  </p>

                  <p className="nums text-[18px] font-semibold tracking-tight text-ink">
                    {profile.paseador.tarifa_base
                      ? `₡${profile.paseador.tarifa_base.toLocaleString(localeTag)}`
                      : t("profile.walkerCard.undefinedRate")}
                  </p>

                  <p className="mt-0.5 text-[10.5px] text-ink-mute">
                    {t("profile.walkerCard.ratesHint")}
                  </p>
                </div>

                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() =>
                    void navigate({
                      to: "/p/tarifas",
                    })
                  }
                >
                  {t("profile.walkerCard.configure")}
                </button>
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
                    {t("profile.walkerCard.available")}
                  </p>

                  <p className="mt-0.5 text-[10.5px] text-ink-mute">
                    {t("profile.walkerCard.availableHint")}
                  </p>
                </div>
              </label>

              <div
                className={`${softCardClass} p-4`}
              >
                <p className={
                  labelClass
                }>
                  {t("profile.walkerCard.verification")}
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
                  {t("profile.walkerCard.rating")}
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
                  {t("profile.businessCard.title")}
                </h3>

                <p className="mt-0.5 text-[11.5px] text-ink-mute">
                  {t("profile.businessCard.subtitle")}
                </p>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div className="sm:col-span-2">
                <span className={labelClass}>{t("profile.businessCard.photo")}</span>

                {(() => {
                  const negocioFotoUrl = removeNegocioPhoto
                    ? ""
                    : negocioPhotoPreview || form.foto_negocio;

                  return (
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sunken text-accent-dark">
                        {negocioFotoUrl ? (
                          <img
                            src={negocioFotoUrl}
                            alt={t("profile.businessCard.photoOf", {
                              nombre: form.nombre_negocio || t("profile.businessCard.theBusiness"),
                            })}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building2 size={26} />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className={`${btnQuiet} cursor-pointer`}>
                          <Camera size={14} strokeWidth={2} aria-hidden />
                          {negocioFotoUrl ? t("profile.businessCard.changePhoto") : t("profile.businessCard.uploadPhoto")}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) => {
                              selectNegocioPhoto(event.target.files?.[0] ?? null);
                              event.target.value = "";
                            }}
                          />
                        </label>

                        {negocioFotoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setNegocioPhotoFile(null);
                              setRemoveNegocioPhoto(true);
                            }}
                            className={btnQuiet}
                          >
                            <Trash2 size={14} strokeWidth={2} aria-hidden />
                            {t("profile.businessCard.remove")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <p className="mt-2 text-[11px] text-ink-mute">
                  {t("profile.businessCard.photoHint")}
                </p>
              </div>

              <div>
                <label
                  htmlFor="negocio-nombre"
                  className={
                    labelClass
                  }
                >
                  {t("profile.businessCard.name")}
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
                  {t("profile.businessCard.type")}
                </label>

                <Combo
                  id="negocio-tipo"
                  value={form.tipo_negocio}
                  onChange={(v) => setField("tipo_negocio", v as ProfileForm["tipo_negocio"])}
                  options={[
                    { value: "veterinaria", label: t("profile.businessCard.types.veterinaria") },
                    { value: "tienda", label: t("profile.businessCard.types.tienda") },
                    { value: "refugio", label: t("profile.businessCard.types.refugio") },
                  ]}
                />
              </div>

              <div>
                <label
                  htmlFor="negocio-zona"
                  className={
                    labelClass
                  }
                >
                  {t("profile.businessCard.zone")}
                </label>

                <Combo
                  id="negocio-zona"
                  vacio
                  placeholder={t("profile.businessCard.selectZone")}
                  value={form.negocio_zona_id}
                  onChange={(v) => setField("negocio_zona_id", v)}
                  options={zonas.map((zona) => ({
                    value: zona.id_zona,
                    label: `${zona.nombre}, ${zona.canton} · ${zona.provincia}`,
                  }))}
                />
              </div>

              <div>
                <label
                  htmlFor="negocio-telefono"
                  className={
                    labelClass
                  }
                >
                  {t("profile.businessCard.phone")}
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
                  {t("profile.businessCard.address")}
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

              <div className="sm:col-span-2">
                <span className={labelClass}>
                  {t("profile.businessCard.mapLocation")}
                </span>
                <Suspense
                  fallback={
                    <div className="flex h-[200px] w-full items-center justify-center rounded-2xl bg-slate-50 text-[11.5px] text-slate-400">
                      {t("profile.businessCard.loadingMap")}
                    </div>
                  }
                >
                  <SelectorUbicacion
                    latitud={form.latitud}
                    longitud={form.longitud}
                    onChange={(lat, lng) => {
                      setField("latitud", String(lat));
                      setField("longitud", String(lng));
                    }}
                  />
                </Suspense>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="negocio-horario"
                  className={
                    labelClass
                  }
                >
                  {t("profile.businessCard.schedule")}
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
                  placeholder={t("profile.businessCard.schedulePlaceholder")}
                />
              </div>
            </div>
          </div>
        )}

      {(role === "paseador" || role === "negocio") && (
        <div className="flex justify-end border-t border-black/[0.05] pt-5">
          <button
            type="submit"
            disabled={saving}
            className={`${btnPrimary} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Save size={15} />
            {saving ? t("profile.dataTab.saving") : t("profile.dataTab.saveChanges")}
          </button>
        </div>
      )}

      </form>

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
                {t("profile.addRole.title")}
              </h3>

              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                {t("profile.addRole.subtitle")}
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
                          t(meta.claveTitulo)
                        }
                      </span>

                      <span className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
                        {rejected
                          ? t("profile.addRole.rejected")
                          : pending
                            ? t("profile.addRole.pendingReview")
                            : t(meta.claveTexto)}
                      </span>

                      {!rejected && (
                        <div className="mt-4 space-y-1.5">
                          {(tRaw(roleRequirementClaveRaiz[item]) as string[] ?? []).map(
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
                          ? t("profile.addRole.reviewRequest")
                          : selected
                            ? t("profile.addRole.configuring")
                            : t("profile.addRole.startSetup")}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          ) : (
            <EmptyState
              title={t("profile.addRole.allActiveTitle")}
              hint={t("profile.addRole.allActiveHint")}
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
                {t("profile.roleSetup.newProfile")}
              </p>

              <h3 className="mt-1 text-[16px] font-semibold text-ink">
                {t("profile.roleSetup.configuring", {
                  perfil: t(roleMeta[roleSetup].claveTitulo).toLowerCase(),
                })}
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
              {t("profile.roleSetup.close")}
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
                          {t("profile.roleSetup.owner.activate")}
                        </h4>

                        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                          {t("profile.roleSetup.owner.activateHint")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-black/[0.04] bg-surface p-3.5">
                        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-mute">
                          {t("profile.roleSetup.owner.name")}
                        </p>

                        <p className="mt-1 truncate text-[12px] font-medium text-ink">
                          {form.nombre ||
                            t("profile.roleSetup.owner.incomplete")}
                        </p>
                      </div>

                      <div className="rounded-xl border border-black/[0.04] bg-surface p-3.5">
                        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-mute">
                          {t("profile.roleSetup.owner.phone")}
                        </p>

                        <p className="mt-1 truncate text-[12px] font-medium text-ink">
                          {form.telefono ||
                            t("profile.roleSetup.owner.incomplete")}
                        </p>
                      </div>

                      <div className="rounded-xl border border-black/[0.04] bg-surface p-3.5">
                        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-mute">
                          {t("profile.roleSetup.owner.zone")}
                        </p>

                        <p className="mt-1 truncate text-[12px] font-medium text-ink">
                          {selectedZone
                            ? `${selectedZone.nombre}, ${selectedZone.canton}`
                            : t("profile.roleSetup.owner.incomplete")}
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
                      ? t("profile.roleSetup.owner.activating")
                      : t("profile.roleSetup.owner.activate")}
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
                          {t("profile.roleSetup.walker.requestTitle")}
                        </p>

                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                          {t("profile.roleSetup.walker.requestText")}
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
                    {t("profile.roleSetup.walker.experienceLabel")}
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
                    placeholder={t("profile.roleSetup.walker.experiencePlaceholder")}
                  />

                  <div className="mt-1.5 flex justify-between gap-3">
                    <p className="text-[10.5px] text-ink-mute">
                      {t("profile.roleSetup.walker.minChars")}
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
                    {t("profile.roleSetup.walker.baseRate")}
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
                      placeholder={t("profile.roleSetup.walker.ratePlaceholder")}
                    />
                  </div>

                  <p className="mt-1.5 text-[10.5px] text-ink-mute">
                    {t("profile.roleSetup.walker.rateHint")}
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
                      {t("profile.roleSetup.walker.availableOnApproval")}
                    </p>

                    <p className="mt-0.5 text-[10.5px] text-ink-mute">
                      {t("profile.roleSetup.walker.availableOnApprovalHint")}
                    </p>
                  </div>
                </label>

                <div className="flex flex-col gap-3 border-t border-black/[0.05] pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-[10.5px] leading-relaxed text-ink-mute">
                    {t("profile.roleSetup.walker.submitHint")}
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
                      ? t("profile.roleSetup.walker.sending")
                      : profile.paseador
                        ? t("profile.roleSetup.walker.updateRequest")
                        : t("profile.roleSetup.walker.sendRequest")}
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
                          {t("profile.roleSetup.business.registerTitle")}
                        </p>

                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                          {t("profile.roleSetup.business.registerText")}
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
                        {t("profile.roleSetup.business.basicInfoTitle")}
                      </p>

                      <p className="text-[10.5px] text-ink-mute">
                        {t("profile.roleSetup.business.basicInfoText")}
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
                    {t("profile.roleSetup.business.name")}
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
                    placeholder={t("profile.roleSetup.business.namePlaceholder")}
                  />
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-tipo"
                    className={
                      labelClass
                    }
                  >
                    {t("profile.roleSetup.business.type")}
                  </label>

                  <Combo
                    id="activar-negocio-tipo"
                    value={form.tipo_negocio}
                    onChange={(v) => setField("tipo_negocio", v as ProfileForm["tipo_negocio"])}
                    options={[
                      { value: "veterinaria", label: t("profile.roleSetup.business.types.veterinaria") },
                      { value: "tienda", label: t("profile.roleSetup.business.types.tienda") },
                      { value: "refugio", label: t("profile.roleSetup.business.types.refugio") },
                    ]}
                  />
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-telefono"
                    className={
                      labelClass
                    }
                  >
                    {t("profile.roleSetup.business.phone")}
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
                      placeholder={t("profile.roleSetup.business.phonePlaceholder")}
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
                    {t("profile.roleSetup.business.schedule")}
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
                    placeholder={t("profile.roleSetup.business.schedulePlaceholder")}
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
                        {t("profile.roleSetup.business.locationTitle")}
                      </p>

                      <p className="text-[10.5px] text-ink-mute">
                        {t("profile.roleSetup.business.locationText")}
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
                    {t("profile.roleSetup.business.zone")}
                  </label>

                  <Combo
                    id="activar-negocio-zona"
                    required
                    vacio
                    placeholder={t("profile.roleSetup.business.selectZone")}
                    value={form.negocio_zona_id}
                    onChange={(v) => setField("negocio_zona_id", v)}
                    options={zonas.map((zona) => ({
                    value: zona.id_zona,
                    label: `${zona.nombre}, ${zona.canton} · ${zona.provincia}`,
                  }))}
                  />
                </div>

                <div>
                  <label
                    htmlFor="activar-negocio-direccion"
                    className={
                      labelClass
                    }
                  >
                    {t("profile.roleSetup.business.address")}
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
                    placeholder={t("profile.roleSetup.business.addressPlaceholder")}
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
                        {t("profile.roleSetup.business.coordsTitle")}
                      </p>

                      <p className="text-[10.5px] text-ink-mute">
                        {t("profile.roleSetup.business.coordsText")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Suspense
                    fallback={
                      <div className="flex h-[200px] w-full items-center justify-center rounded-2xl bg-slate-50 text-[11.5px] text-slate-400">
                        {t("profile.roleSetup.business.loadingMap")}
                      </div>
                    }
                  >
                    <SelectorUbicacion
                      latitud={form.latitud}
                      longitud={form.longitud}
                      onChange={(lat, lng) => {
                        setField("latitud", String(lat));
                        setField("longitud", String(lng));
                      }}
                    />
                  </Suspense>
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
                      ? t("profile.roleSetup.business.creating")
                      : t("profile.roleSetup.business.createAndActivate")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
        </>
      )}

      <Visor
        abierto={verFoto && Boolean(avatarUrl)}
        src={avatarUrl || ""}
        alt={t("profile.photoAlt", { nombre: form.nombre || profile.nombre })}
        cerrar={() => setVerFoto(false)}
      />
    </Page>
  );
};

export default ProfilePage;