import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Lock, Save } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import type { UserProfile } from "../types/auth.types";
import { Page, PageHeader, Section, btnPrimary, input } from "../components/ui";
import ProfileAvatar from "../components/ProfileAvatar";

const ProfilePage = () => {
  const { user, role, getProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((value) => {
        setProfile(value);
        setNombre(value?.nombre ?? "");
        setTelefono(value?.telefono ?? "");
        setFotoPerfil(value?.foto_perfil ?? "");
        setZonaId(value?.zona_id ?? "");
      })
      .catch(() => setError("No se pudo cargar tu perfil"))
      .finally(() => setLoading(false));
  }, [getProfile]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProfile({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        foto_perfil: fotoPerfil.trim() || null,
        zona_id: zonaId.trim() || null,
      });
      setMessage("Datos personales actualizados");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Page><Section bodyClass="px-6 py-8">Cargando perfil...</Section></Page>;
  if (!profile && user) return <Page><Section bodyClass="px-6 py-8">No se encontró tu perfil.</Section></Page>;

  return (
    <Page>
      <PageHeader
        title="Mis datos"
        subtitle={`Información de tu cuenta ${role ?? ""}.`}
        action={<button type="button" onClick={() => navigate({ to: "/actualizar-contrasena" })} className={btnPrimary}><Lock size={15} /> Cambiar contraseña</button>}
      />
      {profile && (
        <Section bodyClass="flex items-center gap-4 px-6 py-5">
          <ProfileAvatar profile={{ ...profile, nombre }} size="h-16 w-16" />
          <div>
            <p className="text-[16px] font-semibold text-ink">{nombre}</p>
            <p className="mt-1 text-[13px] text-ink-soft">{profile.tipo_usuario}</p>
          </div>
        </Section>
      )}
      <Section title="Datos personales" bodyClass="px-6 pb-6">
        <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="perfil-nombre" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Nombre</label>
            <input id="perfil-nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} className={`${input} mt-2`} required maxLength={150} />
          </div>
          <div>
            <label htmlFor="perfil-telefono" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Teléfono</label>
            <input id="perfil-telefono" type="tel" value={telefono} onChange={(event) => setTelefono(event.target.value)} className={`${input} mt-2`} maxLength={20} />
          </div>
          <div>
            <label htmlFor="perfil-foto" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">Foto de perfil</label>
            <input id="perfil-foto" type="url" value={fotoPerfil} onChange={(event) => setFotoPerfil(event.target.value)} className={`${input} mt-2`} placeholder="https://..." />
          </div>
          <div>
            <label htmlFor="perfil-zona" className="text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase">ID de zona</label>
            <input id="perfil-zona" value={zonaId} onChange={(event) => setZonaId(event.target.value)} className={`${input} mt-2`} placeholder="UUID opcional" />
          </div>
          {(error || message) && <p className={`sm:col-span-2 flex items-center gap-2 text-[13px] ${error ? "text-danger" : "text-emerald-700"}`}>{message && <Check size={15} />}{error ?? message}</p>}
          <div className="sm:col-span-2"><button type="submit" disabled={saving} className={btnPrimary}><Save size={15} /> {saving ? "Guardando..." : "Guardar cambios"}</button></div>
        </form>
      </Section>
    </Page>
  );
};

export default ProfilePage;
