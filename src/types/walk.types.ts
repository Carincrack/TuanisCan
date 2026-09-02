export type WalkStatus = "solicitado" | "confirmado" | "en_curso" | "finalizado" | "cancelado";

export type WalkStatusLabel = "Solicitado" | "Confirmado" | "En curso" | "Completado" | "Cancelado";

export const walkStatusLabel: Record<WalkStatus, WalkStatusLabel> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Completado",
  cancelado: "Cancelado",
};

export const walkStatusTono: Record<WalkStatus, "ok" | "warn" | "danger" | "accent" | "neutral"> = {
  solicitado: "warn",
  confirmado: "ok",
  en_curso: "accent",
  finalizado: "neutral",
  cancelado: "danger",
};

export interface Walk {
  id_paseo: string;
  id_mascota: string;
  id_dueno: string;
  id_paseador: string | null;
  zona_id: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  duracion_min: number;
  estado: WalkStatus;
  precio: number;
  direccion_encuentro: string;
}

export interface WalkWithDetails extends Walk {
  mascota_nombre: string;
  mascota_foto: string | null;
  paseador_nombre: string | null;
  paseador_foto: string | null;
  zona_nombre: string | null;
  zona: {
    id_zona: string;
    nombre: string;
    canton: string;
    provincia: string;
    distrito: string | null;
  } | null;
  resena?: {
    calificacion: number;
    comentario: string | null;
  } | null;
}

export type WalkWithPet = Omit<WalkWithDetails, "mascota_nombre" | "mascota_foto"> & {
  mascota: {
    id_mascota: string;
    nombre: string;
    fotoUrl: string | null;
  };
};

export interface WalkSummary {
  id_paseo: string;
  id_mascota: string;
  id_paseador: string | null;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  estado: WalkStatus;
  precio: number;
  mascota_nombre: string;
  mascota_foto: string | null;
  paseador_nombre: string | null;
  zona_nombre: string | null;
}
