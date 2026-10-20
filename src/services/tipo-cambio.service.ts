/* ── Tipo de cambio del dólar ──
   Fuente principal: el Ministerio de Hacienda (api.hacienda.go.cr),
   que publica cada día la compra y la venta de referencia del Banco
   Central. Es pública, sin llave, y deja llamarla desde el navegador.
   Si no responde, ExchangeRate-API (open.er-api.com), que da un solo
   valor medio: se usa como compra y como venta.

   Al dueño que paga en dólares la plataforma le COMPRA esos dólares,
   así que la conversión usa el tipo de compra: `aDolares`. */

export interface TipoCambio {
  /** Colones por dólar. */
  compra: number;
  venta: number;
  /** AAAA-MM-DD, el día que publica la fuente. */
  fecha: string;
  fuente: "hacienda" | "exchangerate";
}

const HACIENDA = "https://api.hacienda.go.cr/indicadores/tc/dolar";
const RESPALDO = "https://open.er-api.com/v6/latest/USD";
const VIGENCIA_MS = 30 * 60 * 1000;

/** Fuera de este rango es un error de la consulta, no el mercado. El
    servidor revisa el mismo rango al reservar. */
const razonable = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isFinite(valor) && valor >= 300 && valor <= 1000;

const pedir = async (url: string) => {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), 8000);
  try {
    const respuesta = await fetch(url, { signal: control.signal });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return (await respuesta.json()) as unknown;
  } finally {
    clearTimeout(corte);
  }
};

const desdeHacienda = async (): Promise<TipoCambio> => {
  const datos = (await pedir(HACIENDA)) as {
    compra?: { fecha?: string; valor?: number };
    venta?: { fecha?: string; valor?: number };
  };
  const compra = datos.compra?.valor;
  const venta = datos.venta?.valor;
  if (!razonable(compra) || !razonable(venta)) throw new Error("Hacienda devolvió un tipo de cambio no válido");
  return { compra, venta, fecha: datos.compra?.fecha ?? new Date().toISOString().slice(0, 10), fuente: "hacienda" };
};

const desdeRespaldo = async (): Promise<TipoCambio> => {
  const datos = (await pedir(RESPALDO)) as { rates?: { CRC?: number }; time_last_update_unix?: number };
  const medio = datos.rates?.CRC;
  if (!razonable(medio)) throw new Error("El respaldo devolvió un tipo de cambio no válido");
  const valor = Math.round(medio * 100) / 100;
  const fecha = datos.time_last_update_unix
    ? new Date(datos.time_last_update_unix * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return { compra: valor, venta: valor, fecha, fuente: "exchangerate" };
};

let enMemoria: { pedido: Promise<TipoCambio>; desde: number } | null = null;

/** Una consulta cada media hora como mucho: todas las pantallas que lo
    pidan en ese rato comparten la misma respuesta. */
export const obtenerTipoCambio = (forzar = false): Promise<TipoCambio> => {
  if (!forzar && enMemoria && Date.now() - enMemoria.desde < VIGENCIA_MS) return enMemoria.pedido;

  const pedido = desdeHacienda().catch(() => desdeRespaldo());
  enMemoria = { pedido, desde: Date.now() };
  // Un fallo no se queda guardado: el próximo intento vuelve a consultar.
  pedido.catch(() => {
    if (enMemoria?.pedido === pedido) enMemoria = null;
  });
  return pedido;
};

/** Colones a dólares con el tipo de compra, a dos decimales. Es la
    misma cuenta que hace `retener_pago_paseo` en la base. */
export const aDolares = (colones: number, tipo: TipoCambio) =>
  Math.round((colones / tipo.compra) * 100) / 100;
