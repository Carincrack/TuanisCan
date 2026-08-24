import { useState } from "react";
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

  if (profile.foto_perfil && !imageError) {
    return (
      <img
        src={profile.foto_perfil}
        alt={`Foto de ${profile.nombre}`}
        onError={() => setImageError(true)}
        className={`${size} flex-shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${size} flex flex-shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white`}
      aria-label={`Iniciales de ${profile.nombre}`}
    >
      {iniciales(profile.nombre)}
    </span>
  );
};

export default ProfileAvatar;
