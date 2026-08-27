export type PetSex = "macho" | "hembra";
export type VaccineStatus = "vigente" | "pendiente" | "vencida";

export interface Vaccine {
  id_vacuna: string;
  id_mascota: string;
  nombre_vacuna: string;
  fecha_aplicacion: string;
  fecha_vencimiento: string;
  estado: VaccineStatus;
  veterinaria: string | null;
  lote: string | null;
  notas: string | null;
}

export interface Pet {
  id_mascota: string;
  id_dueno: string;
  nombre: string;
  especie: string;
  raza: string;
  sexo: PetSex;
  fecha_nacimiento: string;
  peso: number;
  color: string;
  esterilizado: boolean;
  microchip: string | null;
  foto: string | null;
  fotoUrl: string | null;
  alergias: string | null;
  veterinaria: string | null;
  notas: string | null;
  vacunas: Vaccine[];
}

export type PetInput = Pick<
  Pet,
  | "nombre"
  | "especie"
  | "raza"
  | "sexo"
  | "fecha_nacimiento"
  | "peso"
  | "color"
  | "esterilizado"
  | "microchip"
  | "alergias"
  | "veterinaria"
  | "notas"
>;

export type VaccineInput = Pick<
  Vaccine,
  | "nombre_vacuna"
  | "fecha_aplicacion"
  | "fecha_vencimiento"
  | "veterinaria"
  | "lote"
  | "notas"
>;
