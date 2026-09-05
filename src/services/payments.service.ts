import { supabase } from "../lib/supabase";
import {
  CARD_NUMBER_LENGTH,
  cardBrand,
  cardDigits,
  parseExpiry,
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

export type PaymentStatus = "pendiente" | "pagado" | "fallido" | "reembolsado";

export interface PaymentMovement {
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
}

interface PaymentMovementRow extends Omit<PaymentMovement, "monto" | "comision_plataforma"> {
  monto: number | string;
  comision_plataforma: number | string;
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

export interface AdminFinanceMovement extends Omit<WalkerEarning, "neto"> {
  paseador: string;
  neto_paseador: number;
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

  if (input.titular.trim().length < 3) throw new Error("Indica el nombre del titular.");
  if (digits.length !== CARD_NUMBER_LENGTH) {
    throw new Error("El número de tarjeta debe tener 16 dígitos.");
  }
  if (!brand) throw new Error("La tarjeta no es válida. Solo aceptamos Visa (comienza con 4) o Mastercard (comienza con 51-55 o 2221-2720).");
  if (!expiry) throw new Error("La fecha de vencimiento no es válida.");
  if (!/^\d{3,4}$/.test(input.cvv)) throw new Error("El código de seguridad no es válido.");

  const { data, error } = await supabase.rpc("registrar_metodo_pago", {
    p_titular: input.titular.trim(),
    p_marca: brand,
    p_ultimos4: digits.slice(-4),
    p_exp_mes: expiry.month,
    p_exp_ano: expiry.year,
  });

  if (error) throw error;
  return data as string;
};

export const processPayment = async (walkId: string, methodId: string) => {
  const { data, error } = await supabase.rpc("procesar_pago", {
    p_id_paseo: walkId,
    p_id_metodo_pago: methodId,
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

  return ((data ?? []) as Array<Omit<AdminFinanceMovement, "bruto" | "comision" | "neto_paseador"> & {
    bruto: number | string;
    comision: number | string;
    neto_paseador: number | string;
  }>).map((movement) => ({
    ...movement,
    bruto: Number(movement.bruto),
    comision: Number(movement.comision),
    neto_paseador: Number(movement.neto_paseador),
  }));
};
