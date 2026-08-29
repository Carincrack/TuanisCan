import { useState } from "react";
import { Check } from "lucide-react";
import type { UserProfile } from "../types/auth.types";

const iniciales = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "U";

const ProfileAvatar = ({
  profile,
  size = "h-9 w-9",
}: {
  profile: UserProfile;
  size?: string;
}) => {
  const [imageError, setImageError] = useState(false);

  const verified =
    profile.isAdmin || profile.verificacion.estado === "aprobado";

  const avatar = profile.foto_perfil && !imageError ? (
    <img
      src={profile.foto_perfil}
      alt={`Foto de ${profile.nombre}`}
      onError={() => setImageError(true)}
      className={`${size} flex-shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${size} flex flex-shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white`}
      aria-label={`Iniciales de ${profile.nombre}`}
    >
      {iniciales(profile.nombre)}
    </span>
  );

  return (
    <span className="relative inline-flex flex-shrink-0">
      {avatar}

    {verified && (
  <span
    title="Perfil verificado"
    aria-label="Perfil verificado"
    className="
      verified-badge-shape
      absolute -right-1 -bottom-1
      flex h-5 w-5
      items-center justify-center
      shadow-sm
    "
  >
    <Check
      size={11}
      strokeWidth={3.4}
      className="text-white"
      aria-hidden
    />
  </span>
)}
    </span>
  );
};

export default ProfileAvatar;