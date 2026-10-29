/* ─────────────────────────────────────────────────────────────
   PERIODOS: UN DÍA, UNA SEMANA, UN MES O UN RANGO

   Para filtrar y comparar cifras por fecha (Finanzas del admin). Todo
   va en fechas «AAAA-MM-DD» de Costa Rica, que es como llegan las de
   los paseos: así se comparan como texto —«2026-10-05» < «2026-10-12»—
   sin convertir zonas horarias. Para sumar días se pasa por UTC, que
   no tiene horario de verano ni saltos.

   La semana va de lunes a domingo.
   ───────────────────────────────────────────────────────────── */

import { hoyEnCostaRica } from "./fechas";

export type TipoPeriodo = "todo" | "dia" | "semana" | "mes" | "rango";

export interface Periodo {
  tipo: TipoPeriodo;
  /** Para «día» y «semana»: un día cualquiera de ese día o semana. */
  dia: string;
  /** Para «mes»: «AAAA-MM». */
  mes: string;
  /** Para «rango». */
  desde: string;
  hasta: string;
}

export interface Limites {
  desde: string;
  hasta: string;
}

const aFecha = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const aTexto = (fecha: Date) => fecha.toISOString().slice(0, 10);

export const sumarDias = (dia: string, n: number) => {
  const fecha = aFecha(dia);
  fecha.setUTCDate(fecha.getUTCDate() + n);
  return aTexto(fecha);
};

export const diasEntre = (desde: string, hasta: string) =>
  Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86_400_000);

export const lunesDe = (dia: string) => sumarDias(dia, -((aFecha(dia).getUTCDay() + 6) % 7));

export const sumarMeses = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  return aTexto(new Date(Date.UTC(a, m - 1 + n, 1))).slice(0, 7);
};

const finDeMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return aTexto(new Date(Date.UTC(a, m, 0)));
};

/** Del periodo, el primer y el último día. «Todo» no tiene límites. */
export const limitesDe = (p: Periodo): Limites | null => {
  switch (p.tipo) {
    case "todo":
      return null;
    case "dia":
      return { desde: p.dia, hasta: p.dia };
    case "semana": {
      const lunes = lunesDe(p.dia);
      return { desde: lunes, hasta: sumarDias(lunes, 6) };
    }
    case "mes":
      return { desde: `${p.mes}-01`, hasta: finDeMes(p.mes) };
    case "rango":
      return p.desde <= p.hasta ? { desde: p.desde, hasta: p.hasta } : { desde: p.hasta, hasta: p.desde };
  }
};

/** El periodo anterior equivalente, para comparar: el día de antes, la
    semana de antes, el mes de antes (entero, aunque sea más corto), o
    un rango del mismo largo que termina el día antes. */
export const anteriorDe = (p: Periodo): Limites | null => {
  const limites = limitesDe(p);
  if (!limites) return null;
  if (p.tipo === "mes") {
    const mes = sumarMeses(p.mes, -1);
    return { desde: `${mes}-01`, hasta: finDeMes(mes) };
  }
  const largo = diasEntre(limites.desde, limites.hasta) + 1;
  return { desde: sumarDias(limites.desde, -largo), hasta: sumarDias(limites.desde, -1) };
};

export const dentroDe = (dia: string, limites: Limites | null) =>
  !limites || (dia >= limites.desde && dia <= limites.hasta);

/** Mover el periodo uno para atrás (-1) o para adelante (1). */
export const moverPeriodo = (p: Periodo, paso: -1 | 1): Periodo => {
  if (p.tipo === "dia") return { ...p, dia: sumarDias(p.dia, paso) };
  if (p.tipo === "semana") return { ...p, dia: sumarDias(p.dia, 7 * paso) };
  if (p.tipo === "mes") return { ...p, mes: sumarMeses(p.mes, paso) };
  return p;
};

/* ── Las barras del gráfico ──
   Por hora si es un solo día, por día hasta 31 días, por semana hasta
   26 semanas y por mes de ahí en adelante: así nunca hay ni dos barras
   ni doscientas. */
export type Escala = "hora" | "dia" | "semana" | "mes";

export interface Cubeta {
  /** Lo que identifica la barra: «08» (hora), un día, el lunes de la
      semana o «AAAA-MM». */
  clave: string;
  desde: string;
  hasta: string;
}

export const cubetasDe = (limites: Limites, horas: string[] = []): { escala: Escala; cubetas: Cubeta[] } => {
  const dias = diasEntre(limites.desde, limites.hasta) + 1;

  if (dias === 1) {
    // De la primera a la última hora con paseos, y al menos de 6 a 18.
    const numeros = horas.map(Number).filter((h) => Number.isFinite(h));
    const primera = Math.min(6, ...numeros);
    const ultima = Math.max(18, ...numeros);
    const cubetas = Array.from({ length: ultima - primera + 1 }, (_, i) => {
      const clave = String(primera + i).padStart(2, "0");
      return { clave, desde: limites.desde, hasta: limites.hasta };
    });
    return { escala: "hora", cubetas };
  }

  if (dias <= 31) {
    const cubetas = Array.from({ length: dias }, (_, i) => {
      const dia = sumarDias(limites.desde, i);
      return { clave: dia, desde: dia, hasta: dia };
    });
    return { escala: "dia", cubetas };
  }

  if (dias <= 26 * 7) {
    const cubetas: Cubeta[] = [];
    for (let lunes = lunesDe(limites.desde); lunes <= limites.hasta; lunes = sumarDias(lunes, 7)) {
      cubetas.push({ clave: lunes, desde: lunes, hasta: sumarDias(lunes, 6) });
    }
    return { escala: "semana", cubetas };
  }

  const cubetas: Cubeta[] = [];
  for (let mes = limites.desde.slice(0, 7); mes <= limites.hasta.slice(0, 7); mes = sumarMeses(mes, 1)) {
    cubetas.push({ clave: mes, desde: `${mes}-01`, hasta: finDeMes(mes) });
  }
  return { escala: "mes", cubetas };
};

/** El periodo de arranque: todo, con el día y el mes de hoy listos para
    cuando se elija otro tipo, y un rango de los últimos 30 días. */
export const periodoInicial = (): Periodo => {
  const hoy = hoyEnCostaRica();
  return { tipo: "todo", dia: hoy, mes: hoy.slice(0, 7), desde: sumarDias(hoy, -29), hasta: hoy };
};
