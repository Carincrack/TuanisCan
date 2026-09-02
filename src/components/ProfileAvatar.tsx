import { useState } from "react";
import type { UserProfile } from "../types/auth.types";
import SelloVerificado from "./SelloVerificado";

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
  sello = true,
  tamanoSello = 18,
}: {
  profile: UserProfile;
  size?: string;
  /** El sello de verificado en la esquina. Se apaga donde el estado ya
      se dice con palabras al lado —la cabecera del perfil tiene su
      propia píldora— para no decir lo mismo dos veces. */
  sello?: boolean;
  /** El sello no puede medir lo mismo en un avatar de 32 px que en uno
      de 112: en el chico taparía media cara y en el grande sería una
      mota. Va como número y no derivado de `size`, que es una cadena
      de clases y no se puede medir. */
  tamanoSello?: number;
}) => {
  const [imageError, setImageError] = useState(false);

  const verified =
    profile.isAdmin || profile.verificacion.estado === "aprobado";

  const avatar =
    profile.foto_perfil && !imageError ? (
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

      {sello && verified && (
        <span className="pointer-events-none absolute right-0 bottom-0 translate-x-[15%] translate-y-[15%]">
          <SelloVerificado size={tamanoSello} />
        </span>
      )}
    </span>
  );
};

export default ProfileAvatar;
