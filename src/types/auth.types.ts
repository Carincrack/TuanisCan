import type { Session, User } from "@supabase/supabase-js";
import type { Rol } from "../lib/nav";
import type { RecargosPaseador } from "../lib/precios";

export type RolPublico = Exclude<Rol, "admin">;
export type UserRole = RolPublico;
export type VerificationStatus = "sin_solicitud" | "pendiente" | "aprobado" | "rechazado";
export type VerificationDocumentType =
  | "cedula_frente"
  | "cedula_reverso"
  | "hoja_delincuencia"
  | "permiso_funcionamiento";

/** Códigos ISO 3166-1 alpha-2 disponibles en el selector. Las zonas solo
 * están catalogadas para CR por ahora; el resto queda sin zona. */
export const PAISES_DISPONIBLES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;
export type Pais = (typeof PAISES_DISPONIBLES)[number];
export const PAIS_PREDETERMINADO: Pais = "CR";

export interface RegistrationData {
  nombre: string;
  telefono?: string;
  foto_perfil?: string;
  pais?: string;
  zona_id?: string;
  tipo_usuario: RolPublico;
  roles?: RolPublico[];
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
  distrito?: string;
}

export type ZonaInput = Omit<Zona, "id_zona">;

export interface PaseadorProfile extends RecargosPaseador {
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

export interface VerificationDocument {
  id_documento: string;
  tipo_documento: VerificationDocumentType;
  nombre_archivo: string;
  ruta_storage: string;
  fecha_subida: string;
}

export interface UserVerification {
  estado: VerificationStatus;
  observacion: string | null;
  fecha_solicitud: string | null;
  fecha_revision: string | null;
  documentos: VerificationDocument[];
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
  foto: string | null;
}

export interface UserProfile {
  id_usuario: string;
  email: string;
  nombre: string;
  telefono: string | null;
  foto_perfil: string | null;
  pais: string;
  zona_id: string | null;
  roles: RolPublico[];
  isAdmin: boolean;
  fecha_registro: string;
  activo: boolean;
  zona: Zona | null;
  paseador: PaseadorProfile | null;
  negocio: NegocioProfile | null;
  verificacion: UserVerification;
}

export interface AdminVerificationRequest {
  id_usuario: string;
  nombre: string;
  correo: string;
  foto_perfil: string | null;
  zona: string;
  roles: RolPublico[];
  fecha_solicitud: string;
  documentos: VerificationDocument[];
}

export interface AdminUser {
  id_usuario: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  foto_perfil: string | null;
  roles: Rol[];
  estado_paseador: PaseadorProfile["estado_verificacion"] | null;
  fecha_registro: string;
  activo: boolean;
  zona: Pick<Zona, "nombre" | "canton" | "provincia"> | null;
}

export interface AdminWalker {
  id_usuario: string;
  nombre: string;
  foto_perfil: string | null;
  zona: string;
  paseos: number;
  rating: number;
  generado: number;
  estado: "activo" | "inactivo" | "suspendido";
}

export interface PublicWalker extends RecargosPaseador {
  id_usuario: string;
  nombre: string;
  foto_perfil: string | null;
  zona_id: string | null;
  zona: string;
  descripcion: string | null;
  tarifa_base: number | null;
  calificacion_promedio: number;
  disponible: boolean;
  total_resenas: number;
  total_paseos: number;
}

export interface WalkRequestInput {
  id_mascota: string;
  id_paseador: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  direccion_encuentro: string;
  /** Precio que ofrece el dueño; sin él se cobra la tarifa. */
  precio_ofrecido: number | null;
}

export interface ProfileUpdate {
  nombre: string;
  telefono: string | null;
  foto_perfil: string | null;
  pais: string;
  zona_id: string | null;
  /** La tarifa y los recargos se guardan aparte, desde Tarifas. */
  paseador?: Pick<PaseadorProfile, "descripcion" | "disponible">;
  negocio?: Pick<
    NegocioProfile,
    "zona_id" | "nombre" | "tipo" | "direccion" | "latitud" | "longitud" | "telefono" | "horario" | "foto"
  >;
}

export type { Session, User };

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Rol | null;
  roles: RolPublico[];
  isAdmin: boolean;
  loading: boolean;
  accessError: string | null;
}

export interface SessionProfile {
  usuario: Omit<UserProfile, "email" | "zona" | "paseador" | "negocio" | "roles" | "isAdmin" | "verificacion"> & {
    estado_verificacion: VerificationStatus;
    observacion_verificacion: string | null;
    fecha_solicitud_verificacion: string | null;
    fecha_revision_verificacion: string | null;
  } | null;
  roles: RolPublico[];
  is_admin: boolean;
}
