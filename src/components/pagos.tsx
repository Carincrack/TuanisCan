import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Download, Loader, Plus } from "../lib/iconos";
import { aviso } from "../lib/aviso";
import { CARD_NUMBER_LENGTH, cardBrand, cardDigits, formatCardNumber } from "../lib/payment-card";
import {
  listOwnerPayments,
  listPaymentMethods,
  processPayment,
  registerPaymentMethod,
  type PaymentMethod,
  type PaymentMovement,
  type PaymentStatus,
} from "../services/payments.service";
import {
  Badge,
  Dialog,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  Section,
  Stat,
  Table,
  btnPrimary,
  btnSecondary,
  colones,
  fieldLabel,
  input,
} from "./ui";

const filtros = ["Todos", "Pagados", "Pendientes", "Reembolsos"];

const estadoLabel: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  fallido: "Fallido",
  reembolsado: "Reembolsado",
};

const tonoEstado = (estado: PaymentStatus) => {
  if (estado === "pagado") return "ok";
  if (estado === "pendiente") return "warn";
  if (estado === "fallido") return "danger";
  return "neutral";
};

const messageFrom = (cause: unknown) =>
  cause instanceof Error
    ? cause.message
    : typeof cause === "object" && cause && "message" in cause
      ? String(cause.message)
      : "No se pudo completar la operación.";

const fechaCorta = (fecha: string) =>
  new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" }).format(
    new Date(`${fecha}T00:00:00`),
  );

const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const TarjetaVisual = ({
  marca,
  numero,
  titular,
  vencimiento,
}: {
  marca: string;
  numero: string;
  titular: string;
  vencimiento: string;
}) => (
  <div className="flex aspect-[1.62/1] w-full max-w-[360px] flex-col justify-between rounded-[22px] bg-rail p-5 text-white shadow-[0_16px_32px_rgba(15,35,55,0.18)]">
    <div className="flex items-start justify-between gap-3">
      <span className="grid h-9 w-12 place-items-center rounded-[10px] bg-accent/90 text-[9px] font-bold tracking-widest text-rail">
        CHIP
      </span>
      <span className="text-[15px] font-semibold">{marca || "TuanisCan"}</span>
    </div>
    <p className="nums text-[18px] tracking-[0.13em] sm:text-[20px]">
      {numero || "•••• •••• •••• ••••"}
    </p>
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[8px] tracking-[0.15em] text-rail-text uppercase">Titular</p>
        <p className="mt-1 truncate text-[11px] font-semibold tracking-[0.08em] uppercase">
          {titular || "Nombre del titular"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[8px] tracking-[0.15em] text-rail-text uppercase">Vence</p>
        <p className="nums mt-1 text-[11px] font-semibold">{vencimiento || "MM/AA"}</p>
      </div>
    </div>
  </div>
);

const Pagos = () => {
  const [metodos, setMetodos] = useState<PaymentMethod[]>([]);
  const [movimientos, setMovimientos] = useState<PaymentMovement[]>([]);
  const [filtro, setFiltro] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PaymentMovement | null>(null);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("");
  const [form, setForm] = useState({ titular: "", numero: "", vencimiento: "", cvv: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextMethods, nextPayments] = await Promise.all([
        listPaymentMethods(),
        listOwnerPayments(),
      ]);
      setMetodos(nextMethods);
      setMovimientos(nextPayments);
      setMetodoSeleccionado((current) =>
        nextMethods.some((method) => method.id_metodo_pago === current)
          ? current
          : nextMethods[0]?.id_metodo_pago ?? "",
      );
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibles = useMemo(
    () =>
      movimientos.filter((movement) => {
        if (filtro === "Pagados") return movement.estado_pago === "pagado";
        if (filtro === "Pendientes") return movement.estado_pago === "pendiente";
        if (filtro === "Reembolsos") return movement.estado_pago === "reembolsado";
        return true;
      }),
    [filtro, movimientos],
  );

  const stats = useMemo(() => {
    const today = new Date();
    const paidThisMonth = movimientos.filter((movement) => {
      if (movement.estado_pago !== "pagado" || !movement.fecha_pago) return false;
      const date = new Date(movement.fecha_pago);
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    });
    return {
      spent: paidThisMonth.reduce((sum, movement) => sum + movement.monto, 0),
      count: paidThisMonth.length,
      pending: movimientos
        .filter((movement) => movement.estado_pago === "pendiente")
        .reduce((sum, movement) => sum + movement.monto, 0),
      refunded: movimientos
        .filter((movement) => movement.estado_pago === "reembolsado")
        .reduce((sum, movement) => sum + movement.monto, 0),
    };
  }, [movimientos]);

  const saveCard = async () => {
    const digits = cardDigits(form.numero);
    if (digits.length !== CARD_NUMBER_LENGTH) {
      setDialogError("El número de tarjeta debe tener 16 dígitos.");
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      await registerPaymentMethod(form);
      setForm({ titular: "", numero: "", vencimiento: "", cvv: "" });
      setMostrarTarjeta(false);
      await load();
      aviso.ok("Tarjeta registrada", {
        detalle: "Guardamos únicamente la marca y los últimos cuatro dígitos.",
      });
    } catch (cause) {
      setDialogError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  };

  const pay = async () => {
    if (!pagoSeleccionado || !metodoSeleccionado) return;
    setSaving(true);
    setDialogError("");
    try {
      await processPayment(
        pagoSeleccionado.id_paseo,
        metodoSeleccionado,
      );
      setPagoSeleccionado(null);
      await load();
      aviso.ok("Pago registrado", {
        detalle: `Se pagaron ${colones(pagoSeleccionado.monto)}.`,
      });
    } catch (cause) {
      setDialogError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Paseo", "Fecha", "Método", "Estado", "Monto CRC"],
      ...visibles.map((movement) => [
        `${movement.mascota} con ${movement.paseador}`,
        movement.fecha,
        movement.metodo_pago,
        estadoLabel[movement.estado_pago],
        String(movement.monto),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pagos-tuaniscan.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const previewBrand = cardBrand(form.numero) ?? "";
  const previewNumber = formatCardNumber(form.numero);

  return (
    <Page>
      <PageHeader
        title="Pagos"
        subtitle="Tarjetas, cobros y comprobantes de tus paseos."
        action={
          <button type="button" className={btnPrimary} onClick={() => { setDialogError(""); setMostrarTarjeta(true); }}>
            <Plus size={15} strokeWidth={2} />
            Agregar tarjeta
          </button>
        }
      />

      {error && (
        <div role="alert" className="rounded-[18px] bg-danger-wash px-5 py-4 text-[13px] text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Stat etiqueta="Gasto del mes" valor={colones(stats.spent)} nota={`${stats.count} pagos`} />
        <Stat etiqueta="Pendiente de pago" valor={colones(stats.pending)} />
        <Stat etiqueta="Reembolsado" valor={colones(stats.refunded)} />
      </div>

      <Section title="Métodos de pago" bodyClass="px-6 pb-5">
        {loading ? (
          <div className="flex items-center gap-2 py-5 text-[13px] text-ink-soft">
            <Loader size={16} className="animate-spin" /> Cargando tarjetas…
          </div>
        ) : metodos.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metodos.map((method) => (
              <div key={method.id_metodo_pago} className="relative">
                <TarjetaVisual
                  marca={method.marca}
                  numero={`•••• •••• •••• ${method.ultimos4}`}
                  titular={method.titular}
                  vencimiento={`${String(method.exp_mes).padStart(2, "0")}/${String(method.exp_ano).slice(-2)}`}
                />
                {method.es_principal && (
                  <span className="absolute top-4 left-20 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white">
                    Principal
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No tienes tarjetas registradas"
            hint="Agrega una para pagar los paseos que acepte el paseador."
          />
        )}
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface p-4">
        <FilterTabs label="Filtrar movimientos" options={filtros} value={filtro} onChange={setFiltro} />
        <button type="button" className={btnSecondary} onClick={exportCsv} disabled={!visibles.length}>
          <Download size={14} strokeWidth={1.9} /> Exportar CSV
        </button>
      </div>

      <Section bodyClass="">
        {loading ? (
          <div className="flex items-center gap-2 px-6 py-8 text-[13px] text-ink-soft">
            <Loader size={16} className="animate-spin" /> Cargando movimientos…
          </div>
        ) : visibles.length ? (
          <Table
            caption={`Movimientos filtrados por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Paseo" },
              { label: "Fecha" },
              { label: "Método" },
              { label: "Estado" },
              { label: "Monto", align: "right" },
              { label: "Acción", align: "right" },
            ]}
          >
            {visibles.map((movement) => (
              <tr key={movement.id_pago}>
                <td className="px-6 py-3.5">
                  <p className="text-[13px] font-medium text-ink">Paseo · {movement.mascota}</p>
                  <p className="text-[11.5px] text-ink-mute">
                    {movement.paseador} · {movement.duracion_min} min
                  </p>
                </td>
                <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {fechaCorta(movement.fecha)}
                </td>
                <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {movement.metodo_pago}
                </td>
                <td className="px-6 py-3.5">
                  <Badge tono={tonoEstado(movement.estado_pago)}>
                    {estadoLabel[movement.estado_pago]}
                  </Badge>
                </td>
                <td className={`nums px-6 py-3.5 text-right text-[13px] font-semibold ${movement.estado_pago === "reembolsado" ? "text-ok" : "text-ink"}`}>
                  {movement.estado_pago === "reembolsado" ? "+" : "−"}
                  {colones(movement.monto)}
                </td>
                <td className="px-6 py-3.5 text-right">
                  {movement.estado_pago === "pendiente" && (
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => {
                        setDialogError("");
                        setPagoSeleccionado(movement);
                        setMetodoSeleccionado(metodos[0]?.id_metodo_pago ?? "");
                      }}
                    >
                      Pagar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Sin movimientos en este filtro"
            hint="Los paseos aceptados aparecerán aquí para pagarlos."
          />
        )}
      </Section>

      {mostrarTarjeta && (
        <Dialog title="Agregar tarjeta" ancho="max-w-[760px]" onClose={() => setMostrarTarjeta(false)}>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.05fr] md:items-center">
            <TarjetaVisual
              marca={previewBrand}
              numero={previewNumber}
              titular={form.titular}
              vencimiento={form.vencimiento}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] bg-accent-wash px-4 py-3 text-[12px] leading-relaxed text-accent sm:col-span-2">
                <p className="font-semibold mb-1">✓ Aceptamos:</p>
                <p>• <strong>Visa</strong>: números que comienzan con 4</p>
                <p>• <strong>Mastercard</strong>: números que comienzan con 51-55 o 2221-2720</p>
              </div>
              <label className={`${fieldLabel} sm:col-span-2`}>
                Nombre del titular
                <input autoComplete="cc-name" className={input} value={form.titular} onChange={(event) => setForm({ ...form, titular: event.target.value })} />
              </label>
              <label className={`${fieldLabel} sm:col-span-2`}>
                <span className="flex items-center justify-between">
                  <span>Número de tarjeta</span>
                  <span className="nums text-[10px] font-normal normal-case text-ink-mute">
                    {cardDigits(form.numero).length}/{CARD_NUMBER_LENGTH} dígitos
                  </span>
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  maxLength={19}
                  className={input}
                  placeholder="Número de tarjeta (16 dígitos)"
                  value={form.numero}
                  onChange={(event) =>
                    setForm({ ...form, numero: formatCardNumber(event.target.value) })
                  }
                  onPaste={(event) => {
                    event.preventDefault();
                    const pasted = event.clipboardData.getData("text");
                    setForm((prev) => ({ ...prev, numero: formatCardNumber(pasted) }));
                  }}
                />
              </label>
              <label className={fieldLabel}>
                Vencimiento
                <input inputMode="numeric" autoComplete="cc-exp" className={input} placeholder="MM/AA" value={form.vencimiento} onChange={(event) => setForm({ ...form, vencimiento: formatExpiryInput(event.target.value) })} />
              </label>
              <label className={fieldLabel}>
                CVV
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={4}
                  className={input}
                  placeholder="123"
                  value={form.cvv}
                  onChange={(event) =>
                    setForm({ ...form, cvv: event.target.value.replace(/\D/g, "").slice(0, 4) })
                  }
                />
              </label>
              <p className="text-[11px] leading-relaxed text-ink-mute sm:col-span-2">
                El número completo y el CVV se validan en este formulario, pero nunca se guardan en la base de datos.
              </p>
              {dialogError && (
                <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-2.5 text-[12px] text-danger sm:col-span-2">
                  {dialogError}
                </p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" className={btnSecondary} onClick={() => setMostrarTarjeta(false)}>Cancelar</button>
                <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveCard()}>
                  {saving && <Loader size={14} className="animate-spin" />} Guardar tarjeta
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {pagoSeleccionado && (
        <Dialog title="Confirmar pago" onClose={() => setPagoSeleccionado(null)}>
          <div className="p-6">
            <div className="rounded-[16px] bg-sunken p-4">
              <p className="text-[14px] font-semibold text-ink">Paseo de {pagoSeleccionado.mascota}</p>
              <p className="mt-1 text-[12px] text-ink-soft">
                {pagoSeleccionado.paseador} · {fechaCorta(pagoSeleccionado.fecha)} · {pagoSeleccionado.duracion_min} min
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="rotulo text-ink-mute">Total</p>
                  <p className="nums mt-1 text-[24px] font-semibold text-ink">{colones(pagoSeleccionado.monto)}</p>
                </div>
                <p className="text-right text-[11px] text-ink-mute">
                  Comisión TuanisCan: {colones(pagoSeleccionado.comision_plataforma)}<br />
                  Paseador: {colones(pagoSeleccionado.monto - pagoSeleccionado.comision_plataforma)}
                </p>
              </div>
            </div>

            {metodos.length ? (
              <fieldset className="mt-5 grid gap-2">
                <legend className="rotulo mb-2 text-ink-mute">Tarjeta</legend>
                {metodos.map((method) => (
                  <label key={method.id_metodo_pago} className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-sunken px-4 py-3 text-[13px] text-ink">
                    <input type="radio" name="metodo-pago" value={method.id_metodo_pago} checked={metodoSeleccionado === method.id_metodo_pago} onChange={() => setMetodoSeleccionado(method.id_metodo_pago)} />
                    <CreditCard size={17} />
                    <span className="flex-1">{method.marca} •••• {method.ultimos4}</span>
                    <span className="nums text-[11px] text-ink-mute">{String(method.exp_mes).padStart(2, "0")}/{String(method.exp_ano).slice(-2)}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="mt-5 rounded-[14px] bg-warn-wash px-4 py-3 text-[12.5px] text-warn">
                Agrega una tarjeta antes de confirmar el pago.
              </div>
            )}

            {dialogError && (
              <p role="alert" className="mt-4 rounded-[14px] bg-danger-wash px-4 py-2.5 text-[12px] text-danger">
                {dialogError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setPagoSeleccionado(null)}>Cancelar</button>
              {!metodos.length ? (
                <button type="button" className={btnPrimary} onClick={() => { setDialogError(""); setPagoSeleccionado(null); setMostrarTarjeta(true); }}>Agregar tarjeta</button>
              ) : (
                <button type="button" className={btnPrimary} disabled={saving || !metodoSeleccionado} onClick={() => void pay()}>
                  {saving && <Loader size={14} className="animate-spin" />} Confirmar pago
                </button>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
};

export default Pagos;
