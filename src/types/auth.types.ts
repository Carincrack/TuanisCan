import type { Session, User } from "@supabase/supabase-js";
import type { Rol } from "../lib/nav";

export type RolPublico = Exclude<Rol, "admin">;

export interface RegistrationData {
  nombre: string;
  telefono?: string;
  foto_perfil?: string;
  zona_id?: string;
  tipo_usuario: RolPublico;
  nombre_negocio?: string;
  tipo_negocio?: "veterinaria" | "tienda" | "refugio";
}

export interface UserProfile {
  id_usuario: string;
  nombre: string;
  telefono: string | null;
  foto_perfil: string | null;
  zona_id: string | null;
  tipo_usuario: Rol;
}

export type { Session, User };

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Rol | null;
  loading: boolean;
}