import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader,
  PawPrint,
  Plus,
  Repeat,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  User,
  Wallet,
} from "../lib/iconos";
import { aviso } from "../lib/aviso";
import {
  CARD_NUMBER_LENGTH,
  cardBrand,
  cardDigits,
  formatCardNumber,
  type CardBrand,
} from "../lib/payment-card";
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
  Page,
  PageHeader,
  Section,
  btnPrimary,
  btnSecondary,
  colones,
  fieldLabel,
  input,
} from "./ui";

type FiltroTipo = "Todos" | "Pagados" | "Pendientes" | "Reembolsos";

const estadoConfig: Record<
  PaymentStatus,
  {
    label: string;
    tono: "ok" | "warn" | "danger" | "neutral";
    badgeClass: string;
    icon: typeof CheckCircle2;
  }
> = {
  pagado: {
    label: "Pagado",
    tono: "ok",
    badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-300/70",
    icon: CheckCircle2,
  },
  pendiente: {
    label: "Pendiente",
    tono: "warn",
    badgeClass: "bg-amber-100 text-amber-900 border border-amber-300 font-semibold",
    icon: Clock,
  },
  fallido: {
    label: "Fallido",
    tono: "danger",
    badgeClass: "bg-rose-50 text-rose-800 border border-rose-300/70",
    icon: AlertTriangle,
  },
  reembolsado: {
    label: "Reembolsado",
    tono: "neutral",
    badgeClass: "bg-sky-50 text-sky-900 border border-sky-300/70",
    icon: Repeat,
  },
};

const fechaFormateada = (fecha: string) => {
  try {
    return new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${fecha}T00:00:00`));
  } catch {
    return fecha;
  }
};

const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const messageFrom = (cause: unknown) =>
  cause instanceof Error
    ? cause.message
    : typeof cause === "object" && cause && "message" in cause
      ? String(cause.message)
      : "No se pudo completar la operación.";

/**
 * Componente visual de tarjeta de crédito con estilos diferenciados por marca,
 * chip EMV metálico detallado, indicador NFC contactless y distintivo de tarjeta principal.
 */
const TarjetaVisual = ({
  marca,
  numero,
  titular,
  vencimiento,
  esPrincipal = false,
  className = "",
}: {
  marca: CardBrand | string;
  numero: string;
  titular: string;
  vencimiento: string;
  esPrincipal?: boolean;
  className?: string;
}) => {
  const brandName = (marca || "TuanisCan").trim();
  const isVisa = brandName.toLowerCase().includes("visa");
  const isMastercard = brandName.toLowerCase().includes("mastercard");

  // Temas visuales diferenciados según marca
  const cardTheme = isVisa
    ? {
        bg: "bg-gradient-to-br from-[#0c2438] via-[#14425e] to-[#1c5d85]",
        border: "border-sky-400/20",
        chip: "from-amber-200 via-amber-300 to-amber-500 border-amber-600/50",
        accent: "text-sky-300",
        logo: (
          <span className="font-sans text-[19px] font-black italic tracking-wider text-white select-none">
            VISA
          </span>
        ),
      }
    : isMastercard
      ? {
          bg: "bg-gradient-to-br from-[#181a20] via-[#242833] to-[#382d33]",
          border: "border-amber-500/20",
          chip: "from-amber-100 via-amber-200 to-amber-400 border-amber-500/50",
          accent: "text-amber-300",
          logo: (
            <div className="flex items-center -space-x-2.5 select-none" aria-label="Mastercard">
              <span className="h-6 w-6 rounded-full bg-[#eb001b] opacity-90" />
              <span className="h-6 w-6 rounded-full bg-[#f79e1b] opacity-90" />
            </div>
          ),
        }
      : {
          bg: "bg-gradient-to-br from-[#0f2a3a] via-[#1a4257] to-[#285d79]",
          border: "border-cyan-400/20",
          chip: "from-amber-200 via-amber-300 to-amber-400 border-amber-500/50",
          accent: "text-cyan-300",
          logo: (
            <span className="titular text-[15px] font-bold tracking-tight text-white select-none">
              TuanisCan
            </span>
          ),
        };

  return (
    <div
      className={`relative flex aspect-[1.62/1] w-full max-w-[360px] flex-col justify-between overflow-hidden rounded-[22px] border ${cardTheme.border} ${cardTheme.bg} p-5 text-white shadow-[0_16px_34px_rgba(15,35,55,0.22)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(15,35,55,0.28)] ${className}`}
    >
      {/* Reflejo decorativo de iluminación prémium */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/15 blur-2xl" />

      {/* Cabecera de la tarjeta: Chip EMV, Contactless y Marca */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Chip EMV realista */}
          <div
            className={`relative grid h-8 w-11 place-items-center rounded-[7px] border bg-gradient-to-br ${cardTheme.chip} shadow-sm`}
            aria-hidden="true"
          >
            <div className="absolute inset-1 rounded-[4px] border border-amber-900/30 opacity-60" />
            <div className="h-full w-[1px] bg-amber-900/30" />
            <div className="absolute h-[1px] w-full bg-amber-900/30" />
          </div>

          {/* Icono de pago Contactless */}
          <svg
            className="h-5 w-5 text-white/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M8.5 16.5a5 5 0 0 1 0-7" />
            <path d="M12 19a8.5 8.5 0 0 1 0-14" />
            <path d="M15.5 21.5a12 12 0 0 1 0-19" />
          </svg>
        </div>

        <div className="flex flex-col items-end gap-1">
          {cardTheme.logo}
          {esPrincipal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-white backdrop-blur-sm border border-white/25">
              <Star size={9} className="fill-amber-300 text-amber-300" /> Principal
            </span>
          )}
        </div>
      </div>

      {/* Número de tarjeta con relieve visual */}
      <div className="relative z-10 my-auto pt-2">
        <p className="nums text-[18px] font-medium tracking-[0.14em] text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] sm:text-[20px]">
          {numero || "•••• •••• •••• ••••"}
        </p>
      </div>

      {/* Pie de la tarjeta: Titular y Expiración */}
      <div className="relative z-10 flex items-end justify-between gap-4">
        <div className="min-w-0 max-w-[70%]">
          <p className="text-[8.5px] font-bold tracking-[0.16em] text-white/60 uppercase">
            Titular
          </p>
          <p className="mt-0.5 truncate text-[12px] font-semibold tracking-[0.06em] text-white uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
            {titular || "Nombre del titular"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8.5px] font-bold tracking-[0.16em] text-white/60 uppercase">
            Vence
          </p>
          <p className="nums mt-0.5 text-[12px] font-semibold tracking-wider text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
            {vencimiento || "MM/AA"}
          </p>
        </div>
      </div>
    </div>
  );
};

const Pagos = () => {
  const [metodos, setMetodos] = useState<PaymentMethod[]>([]);
  const [movimientos, setMovimientos] = useState<PaymentMovement[]>([]);
  const [filtro, setFiltro] = useState<FiltroTipo>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PaymentMovement | null>(null);
  const [detalleMovimiento, setDetalleMovimiento] = useState<PaymentMovement | null>(null);
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
      setMetodoSeleccionado((current) => {
        const principal = nextMethods.find((m) => m.es_principal);
        if (principal) return principal.id_metodo_pago;
        return nextMethods.some((m) => m.id_metodo_pago === current)
          ? current
          : nextMethods[0]?.id_metodo_pago ?? "";
      });
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Contadores por categoría para los filtros
  const contadores = useMemo(() => {
    return {
      Todos: movimientos.length,
      Pagados: movimientos.filter((m) => m.estado_pago === "pagado").length,
      Pendientes: movimientos.filter((m) => m.estado_pago === "pendiente").length,
      Reembolsos: movimientos.filter((m) => m.estado_pago === "reembolsado").length,
    };
  }, [movimientos]);

  // Filtrado de movimientos considerando pestaña y texto de búsqueda
  const visibles = useMemo(() => {
    return movimientos.filter((movement) => {
      if (filtro === "Pagados" && movement.estado_pago !== "pagado") return false;
      if (filtro === "Pendientes" && movement.estado_pago !== "pendiente") return false;
      if (filtro === "Reembolsos" && movement.estado_pago !== "reembolsado") return false;

      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const coincideMascota = movement.mascota.toLowerCase().includes(query);
        const coincidePaseador = movement.paseador.toLowerCase().includes(query);
        const coincideMetodo = movement.metodo_pago.toLowerCase().includes(query);
        const coincideId = movement.id_pago.toLowerCase().includes(query);
        return coincideMascota || coincidePaseador || coincideMetodo || coincideId;
      }

      return true;
    });
  }, [filtro, movimientos, busqueda]);

  // Estadísticas del resumen financiero
  const stats = useMemo(() => {
    const today = new Date();
    const paidThisMonth = movimientos.filter((movement) => {
      if (movement.estado_pago !== "pagado" || !movement.fecha_pago) return false;
      const date = new Date(movement.fecha_pago);
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    });

    const pendingMovements = movimientos.filter((m) => m.estado_pago === "pendiente");
    const refundedMovements = movimientos.filter((m) => m.estado_pago === "reembolsado");

    const nombreMes = new Intl.DateTimeFormat("es-CR", { month: "long" }).format(today);

    return {
      spent: paidThisMonth.reduce((sum, movement) => sum + movement.monto, 0),
      count: paidThisMonth.length,
      mesNombre: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
      pending: pendingMovements.reduce((sum, movement) => sum + movement.monto, 0),
      pendingCount: pendingMovements.length,
      refunded: refundedMovements.reduce((sum, movement) => sum + movement.monto, 0),
      refundedCount: refundedMovements.length,
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
        detalle: "Guardamos únicamente la marca y los últimos cuatro dígitos de forma segura.",
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
      await processPayment(pagoSeleccionado.id_paseo, metodoSeleccionado);
      const montoPagado = pagoSeleccionado.monto;
      setPagoSeleccionado(null);
      await load();
      aviso.ok("Pago completado", {
        detalle: `Se procesaron exitosamente ${colones(montoPagado)}.`,
      });
    } catch (cause) {
      setDialogError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["ID Transacción", "Servicio", "Mascota", "Paseador", "Fecha", "Método", "Estado", "Monto CRC"],
      ...visibles.map((movement) => [
        movement.id_pago,
        `Paseo (${movement.duracion_min} min)`,
        movement.mascota,
        movement.paseador,
        movement.fecha,
        movement.metodo_pago,
        estadoConfig[movement.estado_pago].label,
        String(movement.monto),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tuaniscan-pagos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const previewBrand = cardBrand(form.numero) ?? "";
  const previewNumber = formatCardNumber(form.numero);

  return (
    <Page>
      {/* Cabecera Principal */}
      <PageHeader
        title="Gestión de Pagos"
        subtitle="Monitorea tus comprobantes, abona paseos pendientes y administra tus métodos de pago."
        action={
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setDialogError("");
              setMostrarTarjeta(true);
            }}
          >
            <Plus size={15} strokeWidth={2} />
            Agregar tarjeta
          </button>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-[18px] bg-danger-wash px-5 py-4 text-[13px] font-medium text-danger shadow-sm"
        >
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tira de Métricas Financieras con Jerarquía Clara */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Gasto del Mes */}
        <div className="flex flex-col justify-between rounded-[18px] bg-surface p-5 shadow-sm transition-all duration-150 hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="rotulo text-ink-mute">Gasto de {stats.mesNombre}</span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-wash text-accent-deep">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="nums text-[28px] font-bold tracking-tight text-ink sm:text-[30px]">
              {colones(stats.spent)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
              <TrendingUp size={13} className="text-emerald-600" />
              <span>{stats.count} {stats.count === 1 ? "pago realizado" : "pagos realizados"}</span>
            </p>
          </div>
        </div>

        {/* Pendiente de Pago */}
        <div
          className={`flex flex-col justify-between rounded-[18px] bg-surface p-5 shadow-sm transition-all duration-150 hover:shadow-md ${
            stats.pending > 0 ? "ring-2 ring-amber-400/40 bg-gradient-to-b from-amber-50/40 to-surface" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rotulo text-ink-mute">Pendiente de cobro</span>
            <div
              className={`grid h-8 w-8 place-items-center rounded-full ${
                stats.pending > 0 ? "bg-amber-100 text-amber-900" : "bg-sunken text-ink-mute"
              }`}
            >
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`nums text-[28px] font-bold tracking-tight sm:text-[30px] ${
                stats.pending > 0 ? "text-amber-900" : "text-ink"
              }`}
            >
              {colones(stats.pending)}
            </p>
            <p className="mt-1 text-[12px] font-medium text-ink-soft">
              {stats.pendingCount > 0 ? (
                <span className="font-semibold text-amber-800">
                  {stats.pendingCount} {stats.pendingCount === 1 ? "paseo por abonar" : "paseos por abonar"}
                </span>
              ) : (
                "Al día con todos los paseos"
              )}
            </p>
          </div>
        </div>

        {/* Reembolsos */}
        <div className="flex flex-col justify-between rounded-[18px] bg-surface p-5 shadow-sm transition-all duration-150 hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="rotulo text-ink-mute">Total Reembolsado</span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <Banknote size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="nums text-[28px] font-bold tracking-tight text-emerald-700 sm:text-[30px]">
              {colones(stats.refunded)}
            </p>
            <p className="mt-1 text-[12px] font-medium text-ink-soft">
              {stats.refundedCount > 0
                ? `${stats.refundedCount} ${stats.refundedCount === 1 ? "reembolso emitido" : "reembolsos emitidos"}`
                : "Sin reembolsos registrados"}
            </p>
          </div>
        </div>
      </div>

      {/* Sección de Métodos de Pago */}
      <Section
        title="Tarjetas y Métodos Guardados"
        aside={
          metodos.length > 0 && (
            <span className="text-[12px] font-medium text-ink-soft">
              {metodos.length} {metodos.length === 1 ? "tarjeta activa" : "tarjetas activas"}
            </span>
          )
        }
        bodyClass="px-6 pb-6 pt-2"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] font-medium text-ink-soft">
            <Loader size={18} className="animate-spin text-accent" /> Cargando métodos de pago…
          </div>
        ) : metodos.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metodos.map((method) => (
              <div key={method.id_metodo_pago} className="flex flex-col items-center">
                <TarjetaVisual
                  marca={method.marca}
                  numero={`•••• •••• •••• ${method.ultimos4}`}
                  titular={method.titular}
                  vencimiento={`${String(method.exp_mes).padStart(2, "0")}/${String(method.exp_ano).slice(-2)}`}
                  esPrincipal={method.es_principal}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No tienes tarjetas registradas"
            hint="Agrega una tarjeta Visa o Mastercard para abonar los paseos de tus mascotas automáticamente."
            action={
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setDialogError("");
                  setMostrarTarjeta(true);
                }}
              >
                <Plus size={15} strokeWidth={2} />
                Registrar primera tarjeta
              </button>
            }
          />
        )}
      </Section>

      {/* Barra de Filtros, Búsqueda y Exportación */}
      <div className="flex flex-col gap-3 rounded-[18px] bg-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Pestañas de Filtros con contadores visuales */}
        <div
          role="group"
          aria-label="Filtrar movimientos"
          className="inline-flex flex-wrap gap-1 rounded-full bg-sunken p-1"
        >
          {(["Todos", "Pagados", "Pendientes", "Reembolsos"] as FiltroTipo[]).map((tab) => {
            const count = contadores[tab];
            const isSelected = filtro === tab;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setFiltro(tab)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-150 ease-out active:scale-[0.97] ${
                  isSelected
                    ? "bg-rail text-white shadow-sm"
                    : "text-ink-soft hover:bg-white/75 hover:text-ink"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : tab === "Pendientes" && count > 0
                        ? "bg-amber-200 text-amber-900"
                        : "bg-surface text-ink-mute"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Búsqueda rápida y botón Exportar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <input
              type="text"
              placeholder="Buscar por mascota o paseador…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-full bg-sunken py-1.5 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-mute focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
            />
          </div>

          <button
            type="button"
            className={btnSecondary}
            onClick={exportCsv}
            disabled={!visibles.length}
            title="Descargar historial en formato CSV"
          >
            <Download size={14} strokeWidth={1.9} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla de Movimientos / Transacciones */}
      <Section bodyClass="p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] font-medium text-ink-soft">
            <Loader size={18} className="animate-spin text-accent" /> Cargando historial de movimientos…
          </div>
        ) : visibles.length ? (
          <div className="overflow-x-auto overflow-y-hidden rounded-[18px]">
            <table className="w-full min-w-[700px] text-left">
              <caption className="sr-only">Historial de movimientos de pago</caption>
              <thead className="bg-sunken/80 border-b border-sunken">
                <tr>
                  <th scope="col" className="rotulo px-6 py-3.5 text-ink-mute">
                    Transacción / Mascota
                  </th>
                  <th scope="col" className="rotulo px-5 py-3.5 text-ink-mute">
                    Paseador
                  </th>
                  <th scope="col" className="rotulo px-5 py-3.5 text-ink-mute">
                    Fecha
                  </th>
                  <th scope="col" className="rotulo px-5 py-3.5 text-ink-mute">
                    Método
                  </th>
                  <th scope="col" className="rotulo px-5 py-3.5 text-ink-mute">
                    Estado
                  </th>
                  <th scope="col" className="rotulo px-5 py-3.5 text-right text-ink-mute">
                    Monto
                  </th>
                  <th scope="col" className="rotulo px-6 py-3.5 text-right text-ink-mute">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sunken/50 bg-surface">
                {visibles.map((movement) => {
                  const config = estadoConfig[movement.estado_pago];
                  const IconoEstado = config.icon;
                  const isReembolso = movement.estado_pago === "reembolsado";
                  const isPendiente = movement.estado_pago === "pendiente";

                  return (
                    <tr
                      key={movement.id_pago}
                      className="transition-colors duration-150 hover:bg-sunken/30"
                    >
                      {/* Mascota & Servicio */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep">
                            <PawPrint size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-semibold text-ink">
                              Paseo con {movement.mascota}
                            </p>
                            <p className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                              <span>{movement.duracion_min} minutos</span>
                              <span className="text-ink-mute">·</span>
                              <span className="nums text-[10.5px] text-ink-mute font-mono">
                                #{movement.id_pago.slice(0, 8)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Paseador */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-[12.5px] text-ink font-medium">
                          <User size={14} className="text-ink-mute" />
                          <span>{movement.paseador}</span>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="nums px-5 py-3.5 text-[12.5px] font-medium text-ink-soft whitespace-nowrap">
                        {fechaFormateada(movement.fecha)}
                      </td>

                      {/* Método de pago */}
                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-sunken/70 px-2.5 py-1 text-[12px] font-medium text-ink">
                          <CreditCard size={14} className="text-ink-soft" />
                          <span className="nums">{movement.metodo_pago}</span>
                        </div>
                      </td>

                      {/* Estado con alto contraste e icono */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${config.badgeClass}`}
                        >
                          <IconoEstado size={12} className="shrink-0" />
                          <span>{config.label}</span>
                        </span>
                      </td>

                      {/* Monto con jerarquía visual y signo claro */}
                      <td className="nums px-5 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={`text-[14px] font-bold ${
                            isReembolso
                              ? "text-emerald-700"
                              : isPendiente
                                ? "text-amber-900"
                                : "text-ink"
                          }`}
                        >
                          {isReembolso ? "+" : "−"}
                          {colones(movement.monto)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDetalleMovimiento(movement)}
                            className="inline-flex items-center gap-1 rounded-full p-2 text-ink-soft transition-colors hover:bg-sunken hover:text-ink active:scale-95"
                            title="Ver detalles del comprobante"
                            aria-label={`Ver detalles del paseo de ${movement.mascota}`}
                          >
                            <Eye size={15} />
                          </button>

                          {isPendiente && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full bg-rail px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all duration-150 hover:brightness-125 active:scale-95"
                              onClick={() => {
                                setDialogError("");
                                setPagoSeleccionado(movement);
                                const defaultCard =
                                  metodos.find((m) => m.es_principal)?.id_metodo_pago ??
                                  metodos[0]?.id_metodo_pago ??
                                  "";
                                setMetodoSeleccionado(defaultCard);
                              }}
                            >
                              <CreditCard size={13} />
                              Pagar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin transacciones en este filtro"
            hint={
              busqueda
                ? "No hay resultados que coincidan con el término buscado."
                : "Las operaciones de cobro y paseo aparecerán registradas aquí."
            }
          />
        )}
      </Section>

      {/* Modal: Agregar / Registrar Tarjeta */}
      {mostrarTarjeta && (
        <Dialog
          title="Registrar Método de Pago"
          ancho="max-w-[780px]"
          onClose={() => setMostrarTarjeta(false)}
        >
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.1fr] md:items-start">
            {/* Preview interactivo en tiempo real de la tarjeta */}
            <div className="flex flex-col items-center">
              <p className="rotulo mb-3 text-ink-mute self-start">Vista previa</p>
              <TarjetaVisual
                marca={previewBrand}
                numero={previewNumber}
                titular={form.titular}
                vencimiento={form.vencimiento}
                className="w-full"
              />
              <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-soft">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Cifrado seguro SSL de 256 bits</span>
              </div>
            </div>

            {/* Formulario de Registro */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] bg-accent-wash px-4 py-3 text-[12px] leading-relaxed text-accent-deep sm:col-span-2">
                <p className="font-semibold mb-1 flex items-center gap-1.5 text-accent-deep">
                  <CreditCard size={14} /> Tarjetas aceptadas:
                </p>
                <div className="grid grid-cols-2 gap-1 text-[11.5px] text-ink-soft">
                  <p>• <strong>Visa</strong> (inicia con 4)</p>
                  <p>• <strong>Mastercard</strong> (inicia con 51-55 o 22-27)</p>
                </div>
              </div>

              {/* Nombre del Titular */}
              <label className={`${fieldLabel} sm:col-span-2`}>
                Nombre y apellido del titular
                <input
                  autoComplete="cc-name"
                  className={input}
                  placeholder="Como aparece en la tarjeta"
                  value={form.titular}
                  onChange={(event) =>
                    setForm({ ...form, titular: event.target.value })
                  }
                />
              </label>

              {/* Número de Tarjeta */}
              <label className={`${fieldLabel} sm:col-span-2`}>
                <span className="flex items-center justify-between">
                  <span>Número de tarjeta</span>
                  <span className="nums text-[11px] font-medium normal-case text-ink-soft">
                    {cardDigits(form.numero).length}/{CARD_NUMBER_LENGTH} dígitos
                  </span>
                </span>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    autoComplete="cc-number"
                    maxLength={19}
                    className={`${input} pr-12`}
                    placeholder="•••• •••• •••• ••••"
                    value={form.numero}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        numero: formatCardNumber(event.target.value),
                      })
                    }
                    onPaste={(event) => {
                      event.preventDefault();
                      const pasted = event.clipboardData.getData("text");
                      setForm((prev) => ({
                        ...prev,
                        numero: formatCardNumber(pasted),
                      }));
                    }}
                  />
                  {previewBrand && (
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-accent-deep">
                      {previewBrand}
                    </span>
                  )}
                </div>
              </label>

              {/* Vencimiento */}
              <label className={fieldLabel}>
                Vencimiento
                <input
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  maxLength={5}
                  className={input}
                  placeholder="MM/AA"
                  value={form.vencimiento}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vencimiento: formatExpiryInput(event.target.value),
                    })
                  }
                />
              </label>

              {/* Código CVV */}
              <label className={fieldLabel}>
                Código CVV
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={4}
                  className={input}
                  placeholder="123"
                  value={form.cvv}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cvv: event.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                />
              </label>

              <p className="text-[11px] leading-relaxed text-ink-mute sm:col-span-2">
                🔒 Por seguridad, el número completo y CVV se validan en tu dispositivo pero nunca se almacenan en servidores.
              </p>

              {dialogError && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-[14px] bg-danger-wash px-4 py-2.5 text-[12px] font-medium text-danger sm:col-span-2"
                >
                  <AlertTriangle size={14} className="shrink-0" />
                  {dialogError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setMostrarTarjeta(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={saving}
                  onClick={() => void saveCard()}
                >
                  {saving && <Loader size={14} className="animate-spin" />}
                  Guardar tarjeta
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Modal: Confirmar y Procesar Pago de Paseo */}
      {pagoSeleccionado && (
        <Dialog
          title="Confirmar Pago de Paseo"
          onClose={() => setPagoSeleccionado(null)}
        >
          <div className="p-6">
            {/* Resumen del Paseo */}
            <div className="rounded-[18px] bg-sunken p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-wash px-2.5 py-0.5 text-[11px] font-semibold text-accent-deep">
                    <PawPrint size={12} /> Paseo canino
                  </span>
                  <p className="mt-1.5 text-[16px] font-bold text-ink">
                    Mascota: {pagoSeleccionado.mascota}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">
                    Paseador: <strong>{pagoSeleccionado.paseador}</strong> · Duración: {pagoSeleccionado.duracion_min} min
                  </p>
                  <p className="text-[12px] text-ink-mute">
                    Fecha del servicio: {fechaFormateada(pagoSeleccionado.fecha)}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-ink/10 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="rotulo text-ink-mute">Total a abonar</span>
                  <span className="nums text-[26px] font-bold text-ink">
                    {colones(pagoSeleccionado.monto)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[11.5px] text-ink-mute">
                  <span>Pago a paseador: {colones(pagoSeleccionado.monto - pagoSeleccionado.comision_plataforma)}</span>
                  <span>Comisión TuanisCan: {colones(pagoSeleccionado.comision_plataforma)}</span>
                </div>
              </div>
            </div>

            {/* Selección de Tarjeta */}
            {metodos.length ? (
              <fieldset className="mt-5 grid gap-2">
                <legend className="rotulo mb-2 text-ink-mute">
                  Selecciona la tarjeta para el cargo
                </legend>
                {metodos.map((method) => {
                  const isSelected = metodoSeleccionado === method.id_metodo_pago;
                  return (
                    <label
                      key={method.id_metodo_pago}
                      className={`flex cursor-pointer items-center gap-3.5 rounded-[16px] p-3.5 transition-all duration-150 ${
                        isSelected
                          ? "bg-accent-wash/60 ring-2 ring-accent border border-accent/40"
                          : "bg-sunken/80 hover:bg-sunken border border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="metodo-pago"
                        value={method.id_metodo_pago}
                        checked={isSelected}
                        onChange={() => setMetodoSeleccionado(method.id_metodo_pago)}
                        className="h-4 w-4 text-accent accent-accent"
                      />
                      <CreditCard size={18} className="text-ink" />
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-ink">
                          {method.marca} •••• {method.ultimos4}
                        </p>
                        <p className="text-[11px] text-ink-soft">{method.titular}</p>
                      </div>
                      <div className="text-right">
                        <span className="nums text-[11.5px] font-medium text-ink-mute">
                          {String(method.exp_mes).padStart(2, "0")}/{String(method.exp_ano).slice(-2)}
                        </span>
                        {method.es_principal && (
                          <p className="text-[10px] font-semibold text-accent-deep">Principal</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <div className="mt-5 rounded-[14px] bg-amber-50 border border-amber-200 p-4 text-[12.5px] text-amber-900">
                <p className="font-semibold">No tienes ninguna tarjeta activa</p>
                <p className="mt-1">Registra una tarjeta para continuar con el pago del paseo.</p>
              </div>
            )}

            {dialogError && (
              <p
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-[14px] bg-danger-wash px-4 py-2.5 text-[12px] font-medium text-danger"
              >
                <AlertTriangle size={14} className="shrink-0" />
                {dialogError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-sunken pt-4">
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                <ShieldCheck size={15} className="text-emerald-600" />
                <span>Transacción segura</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setPagoSeleccionado(null)}
                >
                  Cancelar
                </button>
                {!metodos.length ? (
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      setDialogError("");
                      setPagoSeleccionado(null);
                      setMostrarTarjeta(true);
                    }}
                  >
                    Agregar tarjeta
                  </button>
                ) : (
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={saving || !metodoSeleccionado}
                    onClick={() => void pay()}
                  >
                    {saving && <Loader size={14} className="animate-spin" />}
                    Confirmar {colones(pagoSeleccionado.monto)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Modal: Comprobante / Detalle de Movimiento */}
      {detalleMovimiento && (
        <Dialog
          title="Comprobante de Transacción"
          onClose={() => setDetalleMovimiento(null)}
        >
          <div className="p-6">
            <div className="flex items-center justify-between border-b border-sunken pb-4">
              <div>
                <span className="nums text-[12px] font-mono font-medium text-ink-mute">
                  ID: #{detalleMovimiento.id_pago}
                </span>
                <h4 className="mt-1 text-[17px] font-bold text-ink">
                  Paseo canino con {detalleMovimiento.mascota}
                </h4>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold uppercase ${
                  estadoConfig[detalleMovimiento.estado_pago].badgeClass
                }`}
              >
                {estadoConfig[detalleMovimiento.estado_pago].label}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-[13px]">
              <div className="flex justify-between py-1.5 border-b border-sunken/60">
                <span className="text-ink-soft">Paseador contratado:</span>
                <span className="font-semibold text-ink">{detalleMovimiento.paseador}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-sunken/60">
                <span className="text-ink-soft">Fecha del servicio:</span>
                <span className="font-semibold text-ink">
                  {fechaFormateada(detalleMovimiento.fecha)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-sunken/60">
                <span className="text-ink-soft">Duración del paseo:</span>
                <span className="font-semibold text-ink">
                  {detalleMovimiento.duracion_min} minutos
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-sunken/60">
                <span className="text-ink-soft">Método utilizado:</span>
                <span className="font-semibold text-ink">
                  {detalleMovimiento.metodo_pago}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-sunken/60">
                <span className="text-ink-soft">Tarifa neta del paseador:</span>
                <span className="nums font-medium text-ink">
                  {colones(detalleMovimiento.monto - detalleMovimiento.comision_plataforma)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-sunken/60">
                <span className="text-ink-soft">Comisión de servicio (TuanisCan):</span>
                <span className="nums font-medium text-ink">
                  {colones(detalleMovimiento.comision_plataforma)}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="rotulo text-ink-mute">Monto total:</span>
                <span className="nums text-[22px] font-bold text-ink">
                  {colones(detalleMovimiento.monto)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-sunken pt-4">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setDetalleMovimiento(null)}
              >
                Cerrar comprobante
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
};

export default Pagos;
