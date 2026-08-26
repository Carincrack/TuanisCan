import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Lock, Save } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getZonas } from "../services/auth.service";
import type { ProfileUpdate, UserProfile, Zona } from "../types/auth.types";
import { Badge, Page, PageHeader, Section, btnPrimary, input } from "../components/ui";
import ProfileAvatar from "../components/ProfileAvatar";

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

const labelClass = "text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase";

const ProfilePage = () => {
  const { user, getProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    Promise.all([getProfile(), getZonas()])
      .then(([value, zoneList]) => {
        setProfile(value);
        setZonas(zoneList);
        if (value) setForm(formFromProfile(value));
      })
      .catch(() => setError("No se pudo cargar tu perfil"))
      .finally(() => setLoading(false));
  }, [getProfile]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (profile?.tipo_usuario === "paseador" && form.tarifa_base && Number(form.tarifa_base) < 0) {
      setError("La tarifa no puede ser negativa");
      return;
    }
    if (profile?.tipo_usuario === "negocio" && !form.nombre_negocio.trim()) {
      setError("El nombre del negocio es obligatorio");
      return;
    }

    const changes: ProfileUpdate = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      foto_perfil: form.foto_perfil.trim() || null,
      zona_id: form.zona_id || null,
    };

    if (profile?.tipo_usuario === "paseador") {
      changes.paseador = {
        descripcion: form.descripcion.trim() || null,
        tarifa_base: form.tarifa_base ? Number(form.tarifa_base) : null,
        disponible: form.disponible,
      };
    }

    if (profile?.tipo_usuario === "negocio") {
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

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProfile(changes);
      const updated = await getProfile();
      setProfile(updated);
      if (updated) setForm(formFromProfile(updated));
      setMessage("Perfil actualizado correctamente");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const zoneOptions = zonas.map((zona) => (
    <option key={zona.id_zona} value={zona.id_zona}>
      {zona.nombre}, {zona.canton} · {zona.provincia}
    </option>
  ));

  if (loading) return <Page><Section bodyClass="px-6 py-8">Cargando perfil...</Section></Page>;
  if (!profile && user) return <Page><Section bodyClass="px-6 py-8">No se encontró tu perfil.</Section></Page>;
  if (!profile) return null;

  return (
    <Page>
      <PageHeader
        title="Mis datos"
        subtitle="Consulta y actualiza la información asociada a tu cuenta."
        action={<button type="button" onClick={() => navigate({ to: "/actualizar-contrasena" })} className={btnPrimary}><Lock size={15} /> Cambiar contraseña</button>}
      />

      <Section bodyClass="px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar profile={{ ...profile, nombre: form.nombre, foto_perfil: form.foto_perfil || null }} size="h-20 w-20" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[18px] font-semibold text-ink">{form.nombre || profile.nombre}</p>
              <Badge tono={profile.activo ? "ok" : "danger"}>{profile.activo ? "Cuenta activa" : "Cuenta inactiva"}</Badge>
            </div>
            <p className="mt-1 text-[13px] text-ink-soft">{roleLabel[profile.tipo_usuario]} · {profile.email}</p>
            <p className="mt-1 text-[12px] text-ink-mute">Registro: {new Intl.DateTimeFormat("es-CR", { dateStyle: "long" }).format(new Date(profile.fecha_registro))}</p>
          </div>
        </div>
      </Section>

      <form onSubmit={save} className="flex flex-col gap-3">
        <Section title="Datos personales" bodyClass="grid gap-5 px-4 pb-6 sm:grid-cols-2 sm:px-6">
          <div><label htmlFor="perfil-nombre" className={labelClass}>Nombre completo</label><input id="perfil-nombre" value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} className={`${input} mt-2`} required maxLength={150} /></div>
          <div><label htmlFor="perfil-email" className={labelClass}>Correo electrónico</label><input id="perfil-email" value={profile.email} className={`${input} mt-2 opacity-70`} readOnly /></div>
          <div><label htmlFor="perfil-telefono" className={labelClass}>Teléfono</label><input id="perfil-telefono" type="tel" value={form.telefono} onChange={(e) => setField("telefono", e.target.value)} className={`${input} mt-2`} maxLength={20} /></div>
          <div><label htmlFor="perfil-zona" className={labelClass}>Zona</label><select id="perfil-zona" value={form.zona_id} onChange={(e) => setField("zona_id", e.target.value)} className={`${input} mt-2`}><option value="">Sin zona seleccionada</option>{zoneOptions}</select></div>
          <div className="sm:col-span-2"><label htmlFor="perfil-foto" className={labelClass}>URL de foto de perfil</label><input id="perfil-foto" type="url" value={form.foto_perfil} onChange={(e) => setField("foto_perfil", e.target.value)} className={`${input} mt-2`} placeholder="https://..." /></div>
        </Section>

        {profile.tipo_usuario === "paseador" && profile.paseador && (
          <Section title="Perfil de paseador" bodyClass="grid gap-5 px-4 pb-6 sm:grid-cols-2 sm:px-6">
            <div className="sm:col-span-2"><label htmlFor="perfil-descripcion" className={labelClass}>Descripción</label><textarea id="perfil-descripcion" rows={4} value={form.descripcion} onChange={(e) => setField("descripcion", e.target.value)} className={`${input} mt-2 resize-y`} maxLength={800} /></div>
            <div><label htmlFor="perfil-tarifa" className={labelClass}>Tarifa base (₡)</label><input id="perfil-tarifa" type="number" min="0" step="100" value={form.tarifa_base} onChange={(e) => setField("tarifa_base", e.target.value)} className={`${input} nums mt-2`} /></div>
            <label className="flex items-center gap-3 bg-sunken px-4 py-3 text-[13px] text-ink-soft sm:self-end"><input type="checkbox" checked={form.disponible} onChange={(e) => setField("disponible", e.target.checked)} className="h-4 w-4 accent-accent" />Disponible para recibir paseos</label>
            <div className="bg-sunken px-4 py-3"><p className={labelClass}>Verificación</p><p className="mt-1 text-[13px] text-ink">{profile.paseador.estado_verificacion}</p></div>
            <div className="bg-sunken px-4 py-3"><p className={labelClass}>Calificación</p><p className="nums mt-1 text-[13px] text-ink">{profile.paseador.calificacion_promedio.toFixed(2)} / 5</p></div>
            <div className="bg-sunken px-4 py-3 sm:col-span-2">
              <p className={labelClass}>Documentos de verificación</p>
              {profile.paseador.documentos.length ? (
                <ul className="mt-2 space-y-1">
                  {profile.paseador.documentos.map((documento) => (
                    <li key={documento.id_documento} className="flex flex-wrap justify-between gap-2 text-[13px] text-ink">
                      <span className="break-all">{documento.ruta_storage}</span>
                      <span className="text-ink-mute">{new Intl.DateTimeFormat("es-CR").format(new Date(documento.fecha_subida))}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-1 text-[13px] text-ink">No registrados</p>}
            </div>
          </Section>
        )}

        {profile.tipo_usuario === "negocio" && profile.negocio && (
          <Section title="Datos del negocio" bodyClass="grid gap-5 px-4 pb-6 sm:grid-cols-2 sm:px-6">
            <div><label htmlFor="negocio-nombre" className={labelClass}>Nombre del negocio</label><input id="negocio-nombre" value={form.nombre_negocio} onChange={(e) => setField("nombre_negocio", e.target.value)} className={`${input} mt-2`} required maxLength={150} /></div>
            <div><label htmlFor="negocio-tipo" className={labelClass}>Tipo</label><select id="negocio-tipo" value={form.tipo_negocio} onChange={(e) => setField("tipo_negocio", e.target.value as ProfileForm["tipo_negocio"])} className={`${input} mt-2`}><option value="veterinaria">Veterinaria</option><option value="tienda">Tienda</option><option value="refugio">Refugio</option></select></div>
            <div><label htmlFor="negocio-zona" className={labelClass}>Zona del negocio</label><select id="negocio-zona" value={form.negocio_zona_id} onChange={(e) => setField("negocio_zona_id", e.target.value)} className={`${input} mt-2`}><option value="">Sin zona seleccionada</option>{zoneOptions}</select></div>
            <div><label htmlFor="negocio-telefono" className={labelClass}>Teléfono del negocio</label><input id="negocio-telefono" type="tel" value={form.telefono_negocio} onChange={(e) => setField("telefono_negocio", e.target.value)} className={`${input} mt-2`} maxLength={20} /></div>
            <div className="sm:col-span-2"><label htmlFor="negocio-direccion" className={labelClass}>Dirección</label><input id="negocio-direccion" value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} className={`${input} mt-2`} /></div>
            <div><label htmlFor="negocio-latitud" className={labelClass}>Latitud</label><input id="negocio-latitud" type="number" min="-90" max="90" step="any" value={form.latitud} onChange={(e) => setField("latitud", e.target.value)} className={`${input} nums mt-2`} /></div>
            <div><label htmlFor="negocio-longitud" className={labelClass}>Longitud</label><input id="negocio-longitud" type="number" min="-180" max="180" step="any" value={form.longitud} onChange={(e) => setField("longitud", e.target.value)} className={`${input} nums mt-2`} /></div>
            <div className="sm:col-span-2"><label htmlFor="negocio-horario" className={labelClass}>Horario</label><input id="negocio-horario" value={form.horario} onChange={(e) => setField("horario", e.target.value)} className={`${input} mt-2`} /></div>
            <div className="bg-sunken px-4 py-3"><p className={labelClass}>ID del negocio</p><p className="mt-1 break-all text-[12px] text-ink">{profile.negocio.id_negocio}</p></div>
            <div className="bg-sunken px-4 py-3"><p className={labelClass}>Destacado</p><p className="mt-1 text-[13px] text-ink">{profile.negocio.destacado ? "Sí" : "No"}</p></div>
          </Section>
        )}

        <Section bodyClass="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div aria-live="polite">{(error || message) && <p className={`flex items-center gap-2 text-[13px] ${error ? "text-danger" : "text-ok"}`}>{message && <Check size={15} />}{error ?? message}</p>}</div>
          <button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}><Save size={15} /> {saving ? "Guardando..." : "Guardar cambios"}</button>
        </Section>
      </form>
    </Page>
  );
};

export default ProfilePage;
