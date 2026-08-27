import type { Session, User } from "@supabase/supabase-js";
import type { Rol } from "../lib/nav";

export type RolPublico = Exclude<Rol, "admin">;

export interface RegistrationData {
  nombre: string;
  telefono?: string;
  foto_perfil?: string;
  zona_id?: string;
  tipo_usuario: RolPublico;
  descripcion?: string;
  tarifa_base?: number;
  disponible?: boolean;
  nombre_negocio?: string;
  tipo_negocio?: "veterinaria" | "tienda" | "refugio";
  direccion?: string;
  latitud?: number;
  longitud?: number;
  horario?: string;
}

export interface Zona {
  id_zona: string;
  nombre: string;
  canton: string;
  provincia: string;
}

export type ZonaInput = Omit<Zona, "id_zona">;

export interface PaseadorProfile {
  descripcion: string | null;
  tarifa_base: number | null;
  calificacion_promedio: number;
  estado_verificacion: "pendiente" | "aprobado" | "rechazado";
  disponible: boolean;
  documentos: DocumentoPaseador[];
}

export interface DocumentoPaseador {
  id_documento: string;
  ruta_storage: string;
  fecha_subida: string;
}

export interface NegocioProfile {
  id_negocio: string;
  zona_id: string | null;
  nombre: string;
  tipo: "veterinaria" | "tienda" | "refugio";
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  horario: string | null;
  destacado: boolean;
}

export interface UserProfile {
  id_usuario: string;
  email: string;
  nombre: string;
  telefono: string | null;
  foto_perfil: string | null;
  zona_id: string | null;
  tipo_usuario: Rol;
  fecha_registro: string;
  activo: boolean;
  zona: Zona | null;
  paseador: PaseadorProfile | null;
  negocio: NegocioProfile | null;
}

export interface AdminUser {
  id_usuario: string;
  nombre: string;
  telefono: string | null;
  foto_perfil: string | null;
  tipo_usuario: RolPublico;
  fecha_registro: string;
  activo: boolean;
  zona: Pick<Zona, "nombre" | "canton" | "provincia"> | null;
}

export interface ProfileUpdate {
  nombre: string;
  telefono: string | null;
  foto_perfil: string | null;
  zona_id: string | null;
  paseador?: Pick<PaseadorProfile, "descripcion" | "tarifa_base" | "disponible">;
  negocio?: Pick<
    NegocioProfile,
    "zona_id" | "nombre" | "tipo" | "direccion" | "latitud" | "longitud" | "telefono" | "horario"
  >;
}

export type { Session, User };

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Rol | null;
  loading: boolean;
}
