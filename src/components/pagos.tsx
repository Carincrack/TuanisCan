import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "boneyard-js/react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Loader,
  PawPrint,
  Repeat,
  Search,
  ShieldCheck,
  Wallet,
} from "../lib/iconos";
import { aviso, motivo } from "../lib/aviso";
import { useTranslation } from "../hooks/useTranslation";
import { useAlLlegarNotificacion } from "../lib/tiempoReal";
import { useTipoCambio } from "../hooks/useTipoCambio";
import { aDolares } from "../services/tipo-cambio.service";
import {
  listOwnerPayments,
  listPaymentMethods,
  retenerPagoConBilletera,
  retenerPagoConTarjeta,
  type DigitalWallet,
  type Moneda,
  type PaymentMethod,
  type PaymentMovement,
  type PaymentStatus,
} from "../services/payments.service";
import {
  Badge,
  Dialog,
  EmptyState,
  FilterTabs,
  NotificationButtonContext,
  Page,
  PageHeader,
  Section,
  Table,
  btnPrimary,
  btnSecondary,
  colones,
  dolares,
  montoCobrado,
} from "./ui";
import { SelloTarjeta } from "./tarjetaVisual";

/* ─────────────────────────────────────────────────────────────
   GESTIÓN DE PAGOS

   Esta pantalla se había ido del sistema. Traía la paleta cruda de
   Tailwind —`emerald-50`, `amber-100`, `rose-300`, `sky-900`,
   `cyan-400`— cuando la casa tiene sus propios lavados de estado, y
   con eso el verde de "pagado" no era el verde de "aprobado" del
   panel de administración, ni el ámbar de "pendiente" el de las
   verificaciones. Tenía además tabla propia, pestañas propias y su
   copia de `messageFrom`.

   Todo eso vuelve a las piezas compartidas. Lo único que se queda
   como pieza propia es la tarjeta, porque es la única de verdad:
   ninguna otra pantalla dibuja un objeto físico.
   ───────────────────────────────────────────────────────────── */

type FiltroTipo = "Todos" | "Pagados" | "Pendientes" | "Reembolsos";

type Tono = "ok" | "warn" | "danger" | "accent" | "neutral";

const DIGITAL_WALLETS: Array<{ id: string; nombre: DigitalWallet; clave: string }> = [
  { id: "wallet:paypal", nombre: "PayPal", clave: "paypal" },
  { id: "wallet:google-pay", nombre: "Google Pay", clave: "googlePay" },
  { id: "wallet:apple-pay", nombre: "Apple Pay", clave: "applePay" },
];

const estadoConfig: Record<
  PaymentStatus,
  { claveLabel: string; tono: Tono; icon: typeof CheckCircle2 }
> = {
  pagado: { claveLabel: "pagos.status.paid", tono: "ok", icon: CheckCircle2 },
  pendiente: { claveLabel: "pagos.status.pending", tono: "warn", icon: Clock },
  // Confirmado por el dueño: el monto está reservado y se cobra al
  // terminar el paseo. Turquesa, el color de lo que ya está en marcha.
  retenido: { claveLabel: "pagos.status.held", tono: "accent", icon: ShieldCheck },
  fallido: { claveLabel: "pagos.status.failed", tono: "danger", icon: AlertTriangle },
  // «Reembolso» y no «Reembolsado»: la insignia vive en una columna
  // de 115 px y la palabra larga no cabe sin partirse.
  reembolsado: { claveLabel: "pagos.status.refunded", tono: "accent", icon: Repeat },
};

/* ── Utilidades ──────────────────────────────────────────────── */

const fechaFormateada = (fecha: string, localeTag: string) => {
  try {
    return new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${fecha}T00:00:00`));
  } catch {
    return fecha;
  }
};

/** Fecha de fila. El año solo sale cuando NO es el corriente: en un
    historial donde casi todo pasó este año, repetir «2026» en cada
    fila es ruido, y además es el ancho que necesita el día. */
const fechaCorta = (fecha: string, localeTag: string) => {
  const dia = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(dia.getTime())) return fecha;

  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    ...(dia.getFullYear() === new Date().getFullYear() ? {} : { year: "2-digit" }),
  }).format(dia);
};

/** «12 oct 2026, 14:05»: cuándo se reservó o se cobró. */
const fechaHora = (valor: string, localeTag: string) =>
  new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(valor),
  );

/** «Visa •••• 4242» → «4242». El sello ya dice de qué marca es; la
    palabra al lado repite el dato y se come el ancho que necesitan los
    cuatro dígitos, que es lo único que distingue una tarjeta de otra
    cuando hay dos Visa guardadas. */
const ultimos4De = (metodo: string) => metodo.match(/(\d{4})\s*$/)?.[1] ?? "";

/** El estado, con su ícono. Se repite igual en la tabla y en la lista
    de mano, así que vive una sola vez. */
const EstadoInsignia = ({ estado }: { estado: PaymentStatus }) => {
  const { t } = useTranslation();
  const config = estadoConfig[estado];
  const Icono = config.icon;

  return (
    <Badge tono={config.tono}>
      <span className="inline-flex items-center gap-1.5">
        <Icono size={12} className="shrink-0" />
        {t(config.claveLabel)}
      </span>
    </Badge>
  );
};

/** El importe. Un reembolso ENTRA y todo lo demás SALE: el signo hace
    la mitad del trabajo y el color la otra mitad, porque el signo solo
    es un píxel de ancho y se pierde al barrer la columna.

    Va en la moneda en que se pagó. Un pago en dólares lleva debajo,
    chico, cuánto es en colones: es lo que vale el paseo y lo que suman
    las cifras de arriba. */
const Importe = ({
  movimiento,
  className = "text-[13.5px]",
}: {
  movimiento: PaymentMovement;
  className?: string;
}) => {
  const estado = movimiento.estado_pago;
  const enDolares = movimiento.moneda === "USD" && movimiento.monto_moneda != null;

  return (
    <span className="inline-flex flex-col items-end">
      <span
        className={`nums font-semibold whitespace-nowrap ${className} ${
          estado === "reembolsado" ? "text-ok" : estado === "pendiente" ? "text-warn" : "text-ink"
        }`}
      >
        {estado === "reembolsado" ? "+" : "−"}
        {montoCobrado(movimiento)}
      </span>
      {enDolares && (
        <span className="nums text-[11px] whitespace-nowrap text-ink-mute">{colones(movimiento.monto)}</span>
      )}
    </span>
  );
};

/** El método, en pequeño: el sello de la tarjeta más los cuatro
    dígitos. Si el texto no trae dígitos —un método viejo, otra
    pasarela— cae de vuelta a la cadena completa. */
const MetodoBreve = ({ metodo }: { metodo: string }) => {
  const ultimos = ultimos4De(metodo);

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-soft">
      {ultimos ? <SelloTarjeta marca={metodo} className="h-4 w-[26px]" /> : <Wallet size={15} className="shrink-0" />}
      <span className="nums truncate">{ultimos ? `•••• ${ultimos}` : metodo}</span>
    </span>
  );
};

/** El botón de cobrar. Es el único que queda en la fila y tiene que
    caber en la columna del importe, así que es el navy de la casa a
    tamaño de fila: misma píldora, mismo acuse al pulsar. */
const btnPagar =
  "inline-flex items-center gap-1.5 rounded-full bg-rail px-3 py-1 text-[11.5px] font-semibold text-white transition-[filter,transform] duration-150 ease-out hover:brightness-125 active:scale-[0.97]";

/* ── La pantalla ─────────────────────────────────────────────── */

const Pagos = () => {
  const { t, localeTag } = useTranslation();
  const [metodos, setMetodos] = useState<PaymentMethod[]>([]);
  const [movimientos, setMovimientos] = useState<PaymentMovement[]>([]);
  const [filtro, setFiltro] = useState<FiltroTipo>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PaymentMovement | null>(null);
  const [detalleMovimiento, setDetalleMovimiento] = useState<PaymentMovement | null>(null);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("CRC");
  /* El tipo de cambio se consulta recién cuando se abre la ventana de
     pago, no al entrar a la pantalla: la mayoría de las visitas son
     para ver comprobantes. */
  const tipoCambio = useTipoCambio(Boolean(pagoSeleccionado));

  const load = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
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
      setError(motivo(cause));
      aviso.error(cause, { respaldo: t("pagos.errors.loadFailed") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  /* El paseador aceptó (aparece el pago por confirmar) o el paseo
     terminó (se cobró): la lista se pone al día sin recargar. */
  useAlLlegarNotificacion(["pago", "paseo"], () => void load(true));

  const contadores = useMemo(
    () => ({
      Todos: movimientos.length,
      Pagados: movimientos.filter((m) => m.estado_pago === "pagado").length,
      Pendientes: movimientos.filter((m) => m.estado_pago === "pendiente" || m.estado_pago === "retenido").length,
      Reembolsos: movimientos.filter((m) => m.estado_pago === "reembolsado").length,
    }),
    [movimientos],
  );

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();

    return movimientos.filter((movement) => {
      if (filtro === "Pagados" && movement.estado_pago !== "pagado") return false;
      if (filtro === "Pendientes" && movement.estado_pago !== "pendiente" && movement.estado_pago !== "retenido") return false;
      if (filtro === "Reembolsos" && movement.estado_pago !== "reembolsado") return false;
      if (!query) return true;

      return (
        movement.mascota.toLowerCase().includes(query) ||
        movement.paseador.toLowerCase().includes(query) ||
        movement.metodo_pago.toLowerCase().includes(query) ||
        movement.id_pago.toLowerCase().includes(query) ||
        (movement.moneda ?? "CRC").toLowerCase().includes(query)
      );
    });
  }, [filtro, movimientos, busqueda]);

  const stats = useMemo(() => {
    const today = new Date();
    const paidThisMonth = movimientos.filter((movement) => {
      if (movement.estado_pago !== "pagado" || !movement.fecha_pago) return false;
      const date = new Date(movement.fecha_pago);
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    });

    const pendingMovements = movimientos.filter((m) => m.estado_pago === "pendiente");
    const heldMovements = movimientos.filter((m) => m.estado_pago === "retenido");
    const refundedMovements = movimientos.filter((m) => m.estado_pago === "reembolsado");
    const nombreMes = new Intl.DateTimeFormat(localeTag, { month: "long" }).format(today);

    return {
      spent: paidThisMonth.reduce((sum, movement) => sum + movement.monto, 0),
      count: paidThisMonth.length,
      mesNombre: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
      // Lo que falta cobrar: lo que hay que confirmar y lo ya reservado.
      pending: [...pendingMovements, ...heldMovements].reduce((sum, movement) => sum + movement.monto, 0),
      pendingCount: pendingMovements.length,
      heldCount: heldMovements.length,
      refunded: refundedMovements.reduce((sum, movement) => sum + movement.monto, 0),
      refundedCount: refundedMovements.length,
    };
  }, [movimientos, localeTag]);

  /** Abrir el cobro de una fila. Estaba en línea dentro del botón de
      la tabla; ahora lo llaman la tabla y la lista de mano, así que
      vive una sola vez. Llega elegida la tarjeta principal, que es la
      que quien paga espera encontrar puesta. */
  const abrirPago = (movimiento: PaymentMovement) => {
    setDialogError("");
    setMoneda("CRC");
    setPagoSeleccionado(movimiento);
    setMetodoSeleccionado(
      metodos.find((m) => m.es_principal)?.id_metodo_pago ?? metodos[0]?.id_metodo_pago ?? "",
    );
  };

  /* Llegar con el cobro ya abierto. El aviso «Tu paseo fue aceptado» y
     el botón de Paseos traen `?pagar=<id del paseo>`: cuando la lista
     terminó de cargar, se abre la ventana de ese paseo y el parámetro
     se borra de la dirección, para que recargar no la vuelva a abrir. */
  useEffect(() => {
    if (loading) return;
    const pagar = new URLSearchParams(window.location.search).get("pagar");
    if (!pagar) return;
    const movimiento = movimientos.find((m) => m.id_paseo === pagar && m.estado_pago === "pendiente");
    if (movimiento) {
      setDialogError("");
      setMoneda("CRC");
      setPagoSeleccionado(movimiento);
      setMetodoSeleccionado(
        metodos.find((m) => m.es_principal)?.id_metodo_pago ?? metodos[0]?.id_metodo_pago ?? "",
      );
    }
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [loading, movimientos, metodos]);

  /* Lo que se va a cobrar, en la moneda elegida. En dólares hace falta
     el tipo de cambio: sin él no hay monto y el botón queda apagado. */
  const enDolares = moneda === "USD";
  const montoDolares = pagoSeleccionado && tipoCambio.tipo ? aDolares(pagoSeleccionado.monto, tipoCambio.tipo) : null;
  const montoAPagar = pagoSeleccionado
    ? enDolares
      ? montoDolares != null ? dolares(montoDolares) : null
      : colones(pagoSeleccionado.monto)
    : null;

  const pay = async () => {
    if (!pagoSeleccionado || !metodoSeleccionado || !montoAPagar) return;
    if (enDolares && !tipoCambio.tipo) return;

    setSaving(true);
    setDialogError("");
    try {
      const cobraAhora = pagoSeleccionado.estado_paseo === "finalizado";
      const wallet = DIGITAL_WALLETS.find((option) => option.id === metodoSeleccionado);
      const conversion = enDolares && tipoCambio.tipo ? { tipoCambio: tipoCambio.tipo.compra } : undefined;
      const operation = wallet
        ? retenerPagoConBilletera(pagoSeleccionado.id_paseo, wallet.nombre, conversion)
        : retenerPagoConTarjeta(pagoSeleccionado.id_paseo, metodoSeleccionado, conversion);

      await aviso.proceso(operation, {
        esperando: t(cobraAhora ? "pagos.payDialog.payingNow" : "pagos.payDialog.paying", { monto: montoAPagar }),
        bien: t(cobraAhora ? "pagos.payDialog.paidNow" : "pagos.payDialog.paid", { monto: montoAPagar }),
        mal: t("pagos.payDialog.payFailed"),
      });
      setPagoSeleccionado(null);
      await load();
    } catch (cause) {
      setDialogError(motivo(cause));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        t("pagos.csv.transactionId"),
        t("pagos.csv.service"),
        t("pagos.csv.pet"),
        t("pagos.csv.walker"),
        t("pagos.csv.date"),
        t("pagos.csv.method"),
        t("pagos.csv.status"),
        t("pagos.csv.amount"),
        t("pagos.csv.currency"),
        t("pagos.csv.amountCharged"),
        t("pagos.csv.exchangeRate"),
      ],
      ...visibles.map((movement) => [
        movement.id_pago,
        t("pagos.csv.walkOf", { duracion: movement.duracion_min }),
        movement.mascota,
        movement.paseador,
        movement.fecha,
        movement.metodo_pago,
        t(estadoConfig[movement.estado_pago].claveLabel),
        String(movement.monto),
        movement.moneda ?? "CRC",
        String(movement.moneda === "USD" ? movement.monto_moneda ?? "" : movement.monto),
        movement.tipo_cambio != null ? String(movement.tipo_cambio) : "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const nombre = `tuaniscan-pagos-${new Date().toISOString().slice(0, 10)}.csv`;

    /* El enlace tiene que estar en el documento para que Firefox
       obedezca el clic. Suelto anda en Chrome y en Firefox no hace
       nada: ni descarga ni error. */
    const link = document.createElement("a");
    link.href = url;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    aviso.ok(
      `${visibles.length} ${t(visibles.length === 1 ? "pagos.exported.singular" : "pagos.exported.plural")}`,
      { detalle: t("pagos.exported.detail", { nombre }) },
    );
  };

  const botonNotificaciones = useContext(NotificationButtonContext);

  return (
    <Page wide>
      <PageHeader
        title={t("pagos.title")}
        subtitle={t("pagos.subtitle")}
        action={
          <div className="flex items-center gap-2.5">
            <Link to="/pagos/tarjetas" className={btnPrimary}>
              <CreditCard size={15} strokeWidth={2} />
              {t("pagos.manageCards")}
            </Link>
            {botonNotificaciones}
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-[18px] bg-danger-wash px-5 py-4 text-[13px] font-medium text-danger"
        >
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Las tres cifras ──
          Las tres iguales: blancas, mismo disco gris para el ícono y el
          monto en tinta. La de pendiente se levantaba entera en ámbar
          —fondo, filete, disco macizo y monto— y desde lejos parecía un
          error, no un dato. Ahora lo dice un punto ámbar junto al
          rótulo, el mismo de "Por cobrar" en Ganancias. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-surface px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">{t("pagos.stats.spentThisMonth", { mes: stats.mesNombre })}</p>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken text-ink-soft">
              <Wallet size={15} />
            </span>
          </div>
          <p className="nums mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {colones(stats.spent)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {stats.count} {t(stats.count === 1 ? "pagos.stats.paymentSingular" : "pagos.stats.paymentPlural")}
          </p>
        </div>

        <div className="rounded-[18px] bg-surface px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo flex items-center gap-1.5 text-ink-mute">
              {stats.pending > 0 && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warn" />}
              {t("pagos.stats.pendingToCollect")}
            </p>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken text-ink-soft">
              <Clock size={15} />
            </span>
          </div>
          <p className="nums mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {colones(stats.pending)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {stats.pendingCount > 0
              ? `${stats.pendingCount} ${t(stats.pendingCount === 1 ? "pagos.stats.walkSingularDue" : "pagos.stats.walkPluralDue")}`
              : stats.heldCount > 0
                ? t(stats.heldCount === 1 ? "pagos.stats.heldSingular" : "pagos.stats.heldPlural", { n: stats.heldCount })
                : t("pagos.stats.allUpToDate")}
          </p>
        </div>

        <div className="rounded-[18px] bg-surface px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">{t("pagos.stats.totalRefunded")}</p>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken text-ink-soft">
              <Banknote size={15} />
            </span>
          </div>
          <p className="nums mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {colones(stats.refunded)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {stats.refundedCount > 0
              ? `${stats.refundedCount} ${t(stats.refundedCount === 1 ? "pagos.stats.refundSingular" : "pagos.stats.refundPlural")}`
              : t("pagos.stats.noRefunds")}
          </p>
        </div>
      </div>

      {/* ── Sin tarjetas ──
          Con tarjetas guardadas esta franja repetía el "Gestionar
          tarjetas" de la cabecera. Queda solo para cuando no hay
          ninguna: ahí sí hace falta decirlo, porque sin tarjeta no se
          puede abonar un paseo. */}
      {!loading && !metodos.length && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface px-5 py-3.5">
          <span className="text-[13px] text-ink-soft">{t("pagos.cards.none")}</span>
          <Link to="/pagos/tarjetas" className={btnPrimary}>
            <CreditCard size={15} strokeWidth={2} />
            {t("pagos.cards.addCard")}
          </Link>
        </div>
      )}

      {/* ── Filtros y búsqueda ── */}
      <div className="flex flex-col gap-3 rounded-[18px] bg-surface p-3.5 lg:flex-row lg:items-center lg:gap-4">
        <div className="-mx-3.5 overflow-x-auto px-3.5 lg:mx-0 lg:shrink-0 lg:overflow-visible lg:px-0">
          <FilterTabs
            label={t("pagos.filters.label")}
            options={[
              { value: "Todos", label: t("pagos.filters.all") },
              { value: "Pagados", label: t("pagos.filters.paid") },
              { value: "Pendientes", label: t("pagos.filters.pending") },
              { value: "Reembolsos", label: t("pagos.filters.refunds") },
            ]}
            value={filtro}
            onChange={(v) => setFiltro(v as FiltroTipo)}
            cuentas={contadores}
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2.5 lg:flex-nowrap lg:justify-end">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <input
              type="search"
              placeholder={t("pagos.searchPlaceholder")}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-full bg-sunken py-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-mute focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
            />
          </div>

          <button
            type="button"
            className={`${btnSecondary} shrink-0`}
            onClick={exportCsv}
            disabled={!visibles.length}
            title={t("pagos.exportCsvTitle")}
          >
            <Download size={14} strokeWidth={1.9} />
            {t("pagos.exportCsv")}
          </button>
        </div>
      </div>

      {/* ── Los movimientos ── */}
      <Section bodyClass="p-0">
        {loading ? (
          <Skeleton name="admin-tabla" loading>
            <div />
          </Skeleton>
        ) : visibles.length ? (
          <>
            <div className="hidden md:block">
              <Table
                caption={t("pagos.table.caption")}
                min="min-w-[720px]"
                padX="px-4"
                columnas={[
                  { label: t("pagos.table.transaction"), ancho: "w-[32%]" },
                  { label: t("pagos.table.date"), ancho: "w-[12%]" },
                  { label: t("pagos.table.method"), ancho: "w-[16%]" },
                  { label: t("pagos.table.status"), ancho: "w-[16%]" },
                  { label: t("pagos.table.amount"), ancho: "w-[24%]", align: "right" },
                ]}
              >
                {visibles.map((movement) => (
                  <tr
                    key={movement.id_pago}
                    className="group transition-colors duration-150 hover:bg-accent-wash/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep">
                          <PawPrint size={15} />
                        </span>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetalleMovimiento(movement)}
                            title={t("pagos.table.viewReceiptTitle", { mascota: movement.mascota })}
                            className="block max-w-full truncate text-left text-[13.5px] font-semibold text-ink underline-offset-[3px] transition-colors duration-150 group-hover:underline hover:text-accent-deep"
                          >
                            {t("pagos.table.walkWith", { mascota: movement.mascota })}
                          </button>
                          <p className="truncate text-[11.5px] text-ink-soft">
                            <span className="nums">{movement.duracion_min} min</span> ·{" "}
                            {movement.paseador}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="nums px-4 py-2.5 text-[12px] whitespace-nowrap text-ink-soft">
                      {fechaCorta(movement.fecha, localeTag)}
                    </td>

                    <td className="px-4 py-2.5">
                      <MetodoBreve metodo={movement.metodo_pago} />
                    </td>

                    <td className="px-4 py-2.5">
                      <EstadoInsignia estado={movement.estado_pago} />
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        <Importe movimiento={movement} />

                        {movement.estado_pago === "pendiente" && (
                          <button
                            type="button"
                            className={btnPagar}
                            onClick={() => abrirPago(movement)}
                          >
                            <CreditCard size={12} />
                            {t("pagos.table.pay")}
                          </button>
                        )}
                        {movement.estado_pago === "retenido" && (
                          <span className="text-[11px] whitespace-nowrap text-ink-mute">{t("pagos.table.chargedAtEnd")}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>

            <ul className="md:hidden [&>li:nth-child(even)]:bg-sunken/60">
              {visibles.map((movement) => (
                <li key={movement.id_pago} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep">
                      <PawPrint size={16} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setDetalleMovimiento(movement)}
                        className="block max-w-full truncate text-left text-[13.5px] font-semibold text-ink transition-transform duration-150 ease-out active:scale-[0.99]"
                      >
                        {t("pagos.table.walkWith", { mascota: movement.mascota })}
                      </button>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-soft">
                        <span className="nums">{movement.duracion_min} min</span> ·{" "}
                        {movement.paseador}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <Importe movimiento={movement} className="text-[14px]" />
                      <p className="nums mt-0.5 text-[11px] text-ink-mute">
                        {fechaCorta(movement.fecha, localeTag)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
                    <EstadoInsignia estado={movement.estado_pago} />
                    <MetodoBreve metodo={movement.metodo_pago} />

                    {movement.estado_pago === "pendiente" && (
                      <button
                        type="button"
                        className={`${btnPagar} ml-auto`}
                        onClick={() => abrirPago(movement)}
                      >
                        <CreditCard size={12} />
                        {t("pagos.table.pay")}
                      </button>
                    )}
                    {movement.estado_pago === "retenido" && (
                      <span className="ml-auto text-[11px] text-ink-mute">{t("pagos.table.chargedAtEnd")}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title={t("pagos.empty.title")}
            hint={
              busqueda
                ? t("pagos.empty.withSearch")
                : t("pagos.empty.withoutSearch")
            }
          />
        )}
      </Section>

      {/* ── Confirmar el pago ── */}
      {pagoSeleccionado && (
        <Dialog title={t("pagos.payDialog.title")} onClose={() => setPagoSeleccionado(null)}>
          <div className="p-6">
            <div className="rounded-[18px] bg-sunken p-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-wash px-2.5 py-0.5 text-[11px] font-semibold text-accent-deep">
                <PawPrint size={12} />
                {t("pagos.payDialog.dogWalk")}
              </span>
              <p className="mt-2 text-[16px] font-semibold text-ink">{pagoSeleccionado.mascota}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {t("pagos.payDialog.withWalker", { paseador: pagoSeleccionado.paseador, duracion: pagoSeleccionado.duracion_min })}
              </p>
              <p className="text-[12px] text-ink-mute">
                {fechaFormateada(pagoSeleccionado.fecha, localeTag)}
              </p>

              <div className="mt-4 border-t border-ink/10 pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="rotulo text-ink-mute">{t("pagos.payDialog.totalToPay")}</span>
                  <span className="nums text-[26px] font-semibold tracking-[-0.02em] text-ink">
                    {montoAPagar ?? "—"}
                  </span>
                </div>
                {/* En dólares, lo que vale en colones y con qué tipo se
                    convirtió: el dueño ve la cuenta antes de confirmar. */}
                {enDolares && tipoCambio.tipo && (
                  <p className="nums mt-1 text-right text-[11.5px] text-ink-soft">
                    {t("pagos.payDialog.rateLine", {
                      colones: colones(pagoSeleccionado.monto),
                      tipo: colones(tipoCambio.tipo.compra),
                    })}
                  </p>
                )}
                <div className="mt-2 flex justify-between text-[11.5px] text-ink-mute">
                  <span>
                    {t("pagos.payDialog.toWalker", { monto: colones(pagoSeleccionado.monto - pagoSeleccionado.comision_plataforma) })}
                  </span>
                  <span>{t("pagos.payDialog.commission", { monto: colones(pagoSeleccionado.comision_plataforma) })}</span>
                </div>
              </div>
            </div>

            {/* ── En qué moneda ──
                Las mismas pestañas que filtran listas: dos opciones, una
                sola respuesta. Debajo, de dónde sale el tipo de cambio,
                o qué pasó si no se pudo consultar. */}
            <div className="mt-5">
              <p className="rotulo mb-2 text-ink-mute">{t("pagos.payDialog.currencyLabel")}</p>
              <FilterTabs
                label={t("pagos.payDialog.currencyLabel")}
                options={[
                  { value: "CRC", label: t("pagos.payDialog.currency.CRC") },
                  { value: "USD", label: t("pagos.payDialog.currency.USD") },
                ]}
                value={moneda}
                onChange={(valor) => setMoneda(valor as Moneda)}
              />
              {enDolares && (
                <div className="mt-2 text-[11.5px]" aria-live="polite">
                  {tipoCambio.tipo ? (
                    <p className="text-ink-mute">
                      {t("pagos.payDialog.rateSource", {
                        fecha: fechaCorta(tipoCambio.tipo.fecha, localeTag),
                        fuente: t(`pagos.rates.sources.${tipoCambio.tipo.fuente}`),
                      })}
                    </p>
                  ) : tipoCambio.fallo ? (
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-warn">
                      <AlertTriangle size={13} className="shrink-0" />
                      {t("pagos.payDialog.rateFailed")}
                      <button
                        type="button"
                        onClick={() => void tipoCambio.reintentar()}
                        className="font-semibold text-accent-deep underline underline-offset-2"
                      >
                        {t("pagos.payDialog.rateRetry")}
                      </button>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-ink-mute">
                      <Loader size={13} className="animate-spin" />
                      {t("pagos.payDialog.rateLoading")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Lo que pasa al confirmar, dicho antes de que lo haga. */}
            <p className="mt-4 flex items-start gap-2 rounded-[14px] bg-accent-wash/60 px-4 py-3 text-[12.5px] leading-relaxed text-accent-deep">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              {/* Un paseo que ya se hizo con el pago pendiente se cobra en
                  el acto; los demás se reservan y se cobran al terminar. */}
              {t(pagoSeleccionado.estado_paseo === "finalizado" ? "pagos.payDialog.chargeNowExplain" : "pagos.payDialog.holdExplain")}
            </p>

            {(metodos.length || DIGITAL_WALLETS.length) ? (
              <fieldset className="mt-5 grid gap-2">
                <legend className="rotulo mb-2 text-ink-mute">{t("pagos.payDialog.whichMethod")}</legend>
                {metodos.map((method) => {
                  const elegida = metodoSeleccionado === method.id_metodo_pago;

                  return (
                    <label
                      key={method.id_metodo_pago}
                      className={`flex cursor-pointer items-center gap-3.5 rounded-[16px] p-3.5 transition-[background-color,box-shadow] duration-150 ease-out ${
                        elegida
                          ? "bg-accent-wash ring-2 ring-accent"
                          : "bg-sunken hover:brightness-[0.97]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="metodo-pago"
                        value={method.id_metodo_pago}
                        checked={elegida}
                        onChange={() => setMetodoSeleccionado(method.id_metodo_pago)}
                        className="h-4 w-4 accent-accent"
                      />
                      <SelloTarjeta marca={method.marca} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink">
                          {method.marca} •••• {method.ultimos4}
                        </span>
                        <span className="block truncate text-[11px] text-ink-soft">
                          {method.titular}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="nums block text-[11.5px] text-ink-mute">
                          {String(method.exp_mes).padStart(2, "0")}/
                          {String(method.exp_ano).slice(-2)}
                        </span>
                        {method.es_principal && (
                          <span className="block text-[10px] font-semibold text-accent-deep">
                            {t("pagos.payDialog.principal")}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
                <p className="rotulo mt-3 text-ink-mute">{t("pagos.payDialog.walletsTitle")}</p>
                {DIGITAL_WALLETS.map((wallet) => {
                  const elegida = metodoSeleccionado === wallet.id;
                  return (
                    <label
                      key={wallet.id}
                      className={`flex cursor-pointer items-center gap-3.5 rounded-[16px] p-3.5 transition-[background-color,box-shadow] duration-150 ease-out ${
                        elegida ? "bg-accent-wash ring-2 ring-accent" : "bg-sunken hover:brightness-[0.97]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="metodo-pago"
                        value={wallet.id}
                        checked={elegida}
                        onChange={() => setMetodoSeleccionado(wallet.id)}
                        className="h-4 w-4 accent-accent"
                      />
                      <Wallet size={20} className="shrink-0 text-accent-deep" />
                      <span className="text-[13px] font-semibold text-ink">{t(`pagos.payDialog.wallets.${wallet.clave}`)}</span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <div className="mt-5 rounded-[14px] bg-warn-wash px-4 py-3.5 text-[12.5px] text-warn">
                <p className="font-semibold">{t("pagos.payDialog.noCards.title")}</p>
                <p className="mt-1">{t("pagos.payDialog.noCards.hint")}</p>
              </div>
            )}

            {dialogError && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-[14px] bg-danger-wash px-4 py-2.5 text-[12px] font-medium text-danger"
              >
                <AlertTriangle size={14} className="shrink-0" />
                {dialogError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-sunken pt-4">
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                <ShieldCheck size={15} className="text-ok" />
                {t("pagos.payDialog.secureTransaction")}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setPagoSeleccionado(null)}
                >
                  {t("pagos.payDialog.cancel")}
                </button>
                {metodos.length || DIGITAL_WALLETS.length ? (
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={saving || !metodoSeleccionado || !montoAPagar}
                    onClick={() => void pay()}
                  >
                    {saving && <Loader size={14} className="animate-spin" />}
                    {t(pagoSeleccionado.estado_paseo === "finalizado" ? "pagos.payDialog.payNow" : "pagos.payDialog.payAmount", { monto: montoAPagar ?? "" })}
                  </button>
                ) : (
                  <Link
                    to="/pagos/tarjetas"
                    className={btnPrimary}
                    onClick={() => setPagoSeleccionado(null)}
                  >
                    {t("pagos.payDialog.addCard")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── El comprobante ── */}
      {detalleMovimiento && (
        <Dialog title={t("pagos.receipt.title")} onClose={() => setDetalleMovimiento(null)}>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 border-b border-sunken pb-4">
              <div className="min-w-0">
                <span className="nums text-[12px] text-ink-mute">#{detalleMovimiento.id_pago}</span>
                <h4 className="titular mt-1 text-[17px] text-ink">
                  {t("pagos.table.walkWith", { mascota: detalleMovimiento.mascota })}
                </h4>
              </div>
              <Badge tono={estadoConfig[detalleMovimiento.estado_pago].tono}>
                {t(estadoConfig[detalleMovimiento.estado_pago].claveLabel)}
              </Badge>
            </div>

            <dl className="mt-4 text-[13px]">
              {[
                [t("pagos.receipt.walker"), detalleMovimiento.paseador],
                [t("pagos.receipt.serviceDate"), fechaFormateada(detalleMovimiento.fecha, localeTag)],
                [t("pagos.receipt.duration"), t("pagos.receipt.durationMinutes", { duracion: detalleMovimiento.duracion_min })],
                [t("pagos.receipt.methodUsed"), detalleMovimiento.metodo_pago],
                /* En dólares: con qué tipo se convirtió y cuánto es en
                   colones, que es lo que vale el paseo. */
                ...(detalleMovimiento.moneda === "USD" && detalleMovimiento.tipo_cambio != null
                  ? [
                      [t("pagos.receipt.currency"), t("pagos.receipt.currencyUSD")],
                      [t("pagos.receipt.exchangeRate"), colones(detalleMovimiento.tipo_cambio)],
                      [t("pagos.receipt.inColones"), colones(detalleMovimiento.monto)],
                    ]
                  : []),
                /* El rastro de la transacción, como en un comprobante de
                   banco: con qué referencia se autorizó, cuándo se
                   reservó y cuándo se cobró. */
                ...(detalleMovimiento.referencia
                  ? [[t("pagos.receipt.reference"), detalleMovimiento.referencia]]
                  : []),
                ...(detalleMovimiento.fecha_retencion
                  ? [[t("pagos.receipt.reservedOn"), fechaHora(detalleMovimiento.fecha_retencion, localeTag)]]
                  : []),
                ...(detalleMovimiento.fecha_pago && detalleMovimiento.estado_pago === "pagado"
                  ? [[t("pagos.receipt.chargedOn"), fechaHora(detalleMovimiento.fecha_pago, localeTag)]]
                  : []),
                [
                  t("pagos.receipt.walkerRate"),
                  colones(detalleMovimiento.monto - detalleMovimiento.comision_plataforma),
                ],
                [t("pagos.receipt.commission"), colones(detalleMovimiento.comision_plataforma)],
              ].map(([etiqueta, valor]) => (
                <div
                  key={etiqueta}
                  className="flex justify-between gap-4 border-b border-sunken py-2"
                >
                  <dt className="text-ink-soft">{etiqueta}</dt>
                  <dd className="text-right font-medium text-ink">{valor}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 pt-3">
                <dt className="rotulo text-ink-mute">{t("pagos.receipt.totalAmount")}</dt>
                <dd className="nums text-[22px] font-semibold tracking-[-0.02em] text-ink">
                  {montoCobrado(detalleMovimiento)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end border-t border-sunken pt-4">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setDetalleMovimiento(null)}
              >
                {t("pagos.receipt.close")}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
};

export default Pagos;
