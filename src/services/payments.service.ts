import { supabase } from "../lib/supabase";
import {
  CARD_NUMBER_LENGTH,
  cardBrand,
  cardDigits,
  parseExpiry,
  sanitizeCardholderName,
} from "../lib/payment-card";

export interface PaymentMethod {
  id_metodo_pago: string;
  titular: string;
  marca: "Visa" | "Mastercard";
  ultimos4: string;
  exp_mes: number;
  exp_ano: number;
  es_principal: boolean;
}

/** `retenido`: el dueño confirmó el pago y el monto quedó reservado en
    su método; se cobra (`pagado`) cuando el paseo termina. */
export type PaymentStatus = "pendiente" | "retenido" | "pagado" | "fallido" | "reembolsado";

export type DigitalWallet = "PayPal" | "Google Pay" | "Apple Pay";

/** En qué paga el dueño. El precio del paseo, la comisión y lo que
    recibe el paseador siempre están en colones; con `USD` se guarda
    además cuánto se le cobró en dólares y con qué tipo de cambio. */
export type Moneda = "CRC" | "USD";

/** Cómo se pagó en dólares. `null` en los pagos en colones. */
interface Conversion {
  moneda?: Moneda;
  tipo_cambio?: number | null;
  monto_moneda?: number | null;
}

/** Los numéricos de Postgres llegan como texto. Los campos de moneda
    pueden faltar si la base todavía no tiene la migración: quedan como
    pago en colones. */
const conversionDe = (fila: {
  moneda?: string | null;
  tipo_cambio?: number | string | null;
  monto_moneda?: number | string | null;
}): Required<Conversion> => ({
  moneda: fila.moneda === "USD" ? "USD" : "CRC",
  tipo_cambio: fila.tipo_cambio == null ? null : Number(fila.tipo_cambio),
  monto_moneda: fila.monto_moneda == null ? null : Number(fila.monto_moneda),
});

export interface PaymentMovement extends Conversion {
  id_pago: string;
  id_paseo: string;
  mascota: string;
  paseador: string;
  fecha: string;
  duracion_min: number;
  monto: number;
  comision_plataforma: number;
  metodo_pago: string;
  estado_pago: PaymentStatus;
  fecha_pago: string | null;
  /** En qué está el paseo. Con el paseo ya terminado, confirmar el pago
      lo cobra en el acto en vez de reservarlo. */
  estado_paseo?: "solicitado" | "confirmado" | "en_curso" | "finalizado" | "cancelado";
  /** La referencia simulada de la autorización, «SIM-AAMMDD-XXXXXXXX». */
  referencia?: string | null;
  /** Cuándo se reservó el monto. El cobro queda en `fecha_pago`. */
  fecha_retencion?: string | null;
}

interface PaymentMovementRow extends Omit<PaymentMovement, "monto" | "comision_plataforma" | "tipo_cambio" | "monto_moneda"> {
  monto: number | string;
  comision_plataforma: number | string;
  tipo_cambio?: number | string | null;
  monto_moneda?: number | string | null;
}

export interface WalkerEarning {
  id_pago: string;
  fecha: string;
  mascota: string;
  dueno: string;
  bruto: number;
  comision: number;
  neto: number;
  estado_pago: PaymentStatus;
}

/** Un pago visto por el admin, con todo su rastro. Los campos desde
    `id_paseo` son opcionales: con la base sin la migración de monedas
    no llegan y la pantalla los omite. */
export interface AdminFinanceMovement extends Omit<WalkerEarning, "neto">, Conversion {
  paseador: string;
  neto_paseador: number;
  id_paseo?: string;
  hora_inicio?: string | null;
  duracion_min?: number | null;
  zona?: string | null;
  estado_paseo?: PaymentMovement["estado_paseo"];
  metodo_pago?: string | null;
  referencia?: string | null;
  creado_en?: string | null;
  fecha_retencion?: string | null;
  fecha_pago?: string | null;
}

export const listPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const { data, error } = await supabase
    .from("metodos_pago")
    .select("id_metodo_pago, titular, marca, ultimos4, exp_mes, exp_ano, es_principal")
    .order("es_principal", { ascending: false })
    .order("creado_en", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
};

export const listOwnerPayments = async (): Promise<PaymentMovement[]> => {
  const { data, error } = await supabase.rpc("listar_pagos_dueno");
  if (error) throw error;

  return ((data ?? []) as PaymentMovementRow[]).map((payment) => ({
    ...payment,
    monto: Number(payment.monto),
    comision_plataforma: Number(payment.comision_plataforma),
    ...conversionDe(payment),
  }));
};

export const registerPaymentMethod = async (input: {
  titular: string;
  numero: string;
  vencimiento: string;
  cvv: string;
}) => {
  const digits = cardDigits(input.numero);
  const brand = cardBrand(digits);
  const expiry = parseExpiry(input.vencimiento);
  const titular = sanitizeCardholderName(input.titular).trim();

  if (titular.length < 3) throw new Error("Indica el nombre del titular, solo letras.");
  if (digits.length !== CARD_NUMBER_LENGTH) {
    throw new Error("El número de tarjeta debe tener 16 dígitos.");
  }
  if (!brand) throw new Error("La tarjeta no es válida. Solo aceptamos Visa (comienza con 4) o Mastercard (comienza con 51-55 o 2221-2720).");
  if (!expiry) throw new Error("La fecha de vencimiento no es válida.");
  if (!/^\d{3,4}$/.test(input.cvv)) throw new Error("El código de seguridad no es válido.");

  const { data, error } = await supabase.rpc("registrar_metodo_pago", {
    p_titular: titular,
    p_marca: brand,
    p_ultimos4: digits.slice(-4),
    p_exp_mes: expiry.month,
    p_exp_ano: expiry.year,
  });

  if (error) throw error;
  return data as string;
};

/** Nunca se edita una tarjeta -no es común ni seguro cambiar el número o
    la marca de algo ya guardado-, así que la única operación que existe
    además de registrar es borrar. El backend impide dejar la cuenta sin
    ninguna tarjeta y reasigna la principal si hacía falta. */
export const deletePaymentMethod = async (methodId: string) => {
  const { error } = await supabase.rpc("eliminar_metodo_pago", {
    p_id_metodo_pago: methodId,
  });

  if (error) throw error;
};

/* ── Confirmar el pago: retener, no cobrar ──
   El dueño elige con qué paga y el monto queda RESERVADO
   (`retener_pago_paseo`). No se cobra todavía: se cobra cuando el
   paseador termina el paseo. Con el pago reservado, el paseador ya puede
   iniciarlo. Se puede volver a llamar para cambiar de método mientras el
   paseo no empezó.

   `enDolares` trae el tipo de cambio que se le mostró al dueño. Sin
   él, el pago va en colones y la llamada es la misma de siempre. */

export interface PagoEnDolares {
  tipoCambio: number;
}

const parametrosDeMoneda = (enDolares?: PagoEnDolares) =>
  enDolares ? { p_moneda: "USD", p_tipo_cambio: enDolares.tipoCambio } : {};

export const retenerPagoConTarjeta = async (walkId: string, methodId: string, enDolares?: PagoEnDolares) => {
  const { data, error } = await supabase.rpc("retener_pago_paseo", {
    p_id_paseo: walkId,
    p_id_metodo_pago: methodId,
    ...parametrosDeMoneda(enDolares),
  });

  if (error) throw error;
  return data as PaymentStatus;
};

export const retenerPagoConBilletera = async (walkId: string, wallet: DigitalWallet, enDolares?: PagoEnDolares) => {
  const { data, error } = await supabase.rpc("retener_pago_paseo", {
    p_id_paseo: walkId,
    p_billetera: wallet,
    ...parametrosDeMoneda(enDolares),
  });

  if (error) throw error;
  return data as PaymentStatus;
};

export const listWalkerEarnings = async (): Promise<WalkerEarning[]> => {
  const { data, error } = await supabase.rpc("listar_ganancias_paseador");
  if (error) throw error;

  return ((data ?? []) as Array<Omit<WalkerEarning, "bruto" | "comision" | "neto"> & {
    bruto: number | string;
    comision: number | string;
    neto: number | string;
  }>).map((earning) => ({
    ...earning,
    bruto: Number(earning.bruto),
    comision: Number(earning.comision),
    neto: Number(earning.neto),
  }));
};

export const listAdminFinances = async (): Promise<AdminFinanceMovement[]> => {
  const { data, error } = await supabase.rpc("listar_finanzas_admin");
  if (error) throw error;

  return ((data ?? []) as Array<Omit<AdminFinanceMovement, "bruto" | "comision" | "neto_paseador" | "tipo_cambio" | "monto_moneda"> & {
    bruto: number | string;
    comision: number | string;
    neto_paseador: number | string;
    tipo_cambio?: number | string | null;
    monto_moneda?: number | string | null;
  }>).map((movement) => ({
    ...movement,
    bruto: Number(movement.bruto),
    comision: Number(movement.comision),
    neto_paseador: Number(movement.neto_paseador),
    ...conversionDe(movement),
  }));
};
