/* El precio de un paseo según la configuración de CADA paseador.

   Espeja `calcular_precio_paseo` en Supabase: la tarifa base (pensada
   para 45 min) escala con la duración, y los recargos que el paseador
   eligió se SUMAN —nunca se multiplican entre sí—. El backend es quien
   de verdad cobra; esto es para que el dueño vea el total antes de
   pedir y el paseador vea el efecto de lo que configura. */

export interface RecargosPaseador {
  /** Porcentajes, de 0 a 100. */
  recargo_nocturno: number;
  recargo_fin_semana: number;
  recargo_mismo_dia: number;
  /** "HH:MM". El rango puede cruzar la medianoche (19:00 a 06:00). */
  nocturno_desde: string;
  nocturno_hasta: string;
}

/** Lo que tiene todo paseador que no tocó su configuración: las reglas
    fijas que había antes. */
export const RECARGOS_POR_DEFECTO: RecargosPaseador = {
  recargo_nocturno: 8,
  recargo_fin_semana: 12,
  recargo_mismo_dia: 10,
  nocturno_desde: "19:00",
  nocturno_hasta: "06:00",
};

/** Postgres devuelve `time` como "19:00:00". */
export const horaCorta = (hora: string) => hora.slice(0, 5);

export type RecargosPaseadorRow = {
  recargo_nocturno: number | string;
  recargo_fin_semana: number | string;
  recargo_mismo_dia: number | string;
  nocturno_desde: string;
  nocturno_hasta: string;
};

/** Lo que llega de Supabase: numeric puede venir como texto y time
    como "19:00:00". */
export const normalizarRecargos = (row: RecargosPaseadorRow): RecargosPaseador => ({
  recargo_nocturno: Number(row.recargo_nocturno),
  recargo_fin_semana: Number(row.recargo_fin_semana),
  recargo_mismo_dia: Number(row.recargo_mismo_dia),
  nocturno_desde: horaCorta(row.nocturno_desde),
  nocturno_hasta: horaCorta(row.nocturno_hasta),
});

export const esHorarioNocturno = (hora: string, desde: string, hasta: string) => {
  const h = horaCorta(hora);
  const d = horaCorta(desde);
  const a = horaCorta(hasta);
  return d > a ? h >= d || h < a : h >= d && h < a;
};

export interface RecargoAplicado {
  nombre: string;
  porcentaje: number;
}

export interface Condiciones {
  nocturno: boolean;
  finDeSemana: boolean;
  mismoDia: boolean;
}

/** La fórmula en sí, a partir de qué condiciones se cumplen. */
export const precioSegunCondiciones = (
  tarifaBase: number,
  recargos: RecargosPaseador,
  duracionMin: number,
  condiciones: Condiciones,
) => {
  const aplicados: RecargoAplicado[] = [
    condiciones.nocturno && { nombre: "horario nocturno", porcentaje: recargos.recargo_nocturno },
    condiciones.finDeSemana && { nombre: "fin de semana", porcentaje: recargos.recargo_fin_semana },
    condiciones.mismoDia && { nombre: "mismo día", porcentaje: recargos.recargo_mismo_dia },
  ].filter((r): r is RecargoAplicado => Boolean(r) && (r as RecargoAplicado).porcentaje > 0);

  const suma = aplicados.reduce((total, r) => total + r.porcentaje, 0) / 100;
  const total = Math.round(tarifaBase * (duracionMin / 45) * (1 + suma) * 100) / 100;
  return { total, aplicados };
};

export const estimarPrecioPaseo = (
  tarifaBase: number,
  recargos: RecargosPaseador,
  fecha: string,
  horaInicio: string,
  duracionMin: number,
) => {
  const dia = new Date(`${fecha}T00:00:00`).getDay();
  return precioSegunCondiciones(tarifaBase, recargos, duracionMin, {
    nocturno: esHorarioNocturno(horaInicio, recargos.nocturno_desde, recargos.nocturno_hasta),
    finDeSemana: dia === 0 || dia === 6,
    mismoDia: fecha === new Date().toISOString().slice(0, 10),
  });
};
