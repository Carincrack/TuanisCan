import type { Zona } from "./auth.types";

export type LostPetStatus = "perdida" | "encontrada";

export interface LostPetReport {
  id_mascota_perdida: string;
  id_mascota: string | null;
  id_usuario_reporta: string;
  zona_id: string;
  estado: LostPetStatus;
  nombre: string;
  especie: string;
  raza: string | null;
  contacto: string | null;
  descripcion: string;
  foto: string;
  fotoUrl: string | null;
  latitud: number;
  longitud: number;
  recompensa: number | null;
  fecha_reporte: string;
  fecha_resuelto: string | null;
  distancia_km?: number | null;
  zona?: Zona | null;
}

export interface LostPetInput {
  id_mascota: string;
  especie: string;
  zona_id: string;
  nombre: string;
  raza: string | null;
  contacto: string | null;
  descripcion: string;
  latitud: number;
  longitud: number;
  recompensa: number | null;
}

export interface SightingInput {
  id_mascota_perdida: string;
  latitud: number;
  longitud: number;
  comentario: string | null;
}
