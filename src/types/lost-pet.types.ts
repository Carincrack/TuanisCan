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
  avistamientos: Sighting[];
}

export interface LostPetInput {
  /** Null para una mascota encontrada que no está registrada por quien
      reporta: el sistema busca a su posible dueño por coincidencia. */
  id_mascota: string | null;
  especie: string;
  zona_id: string;
  nombre: string | null;
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
  zona_id: string | null;
  direccion: string | null;
  contacto: string | null;
}

export type MatchStatus = "pendiente" | "confirmado" | "descartado";

/** Una coincidencia entre un reporte de mascota encontrada (sin dueño
    identificado) y una de las mascotas registradas de quien consulta. */
export interface PetMatch {
  id_match: string;
  id_reporte: string;
  id_mascota: string;
  mascotaNombre: string;
  especie: string;
  descripcion: string;
  fotoUrl: string | null;
  zona_id: string | null;
  latitud: number;
  longitud: number;
  recompensa: number | null;
  fecha_reporte: string;
  puntaje_coincidencia: number;
  estado_match: MatchStatus;
  estado_reporte: LostPetStatus;
  zona?: Zona | null;
}

export interface Sighting {
  id_avistamiento: string;
  id_reporte: string;
  id_usuario: string;
  latitud: number;
  longitud: number;
  comentario: string | null;
  fecha: string;
  zona_id: string | null;
  direccion: string | null;
  contacto: string | null;
  zona?: Zona | null;
}
