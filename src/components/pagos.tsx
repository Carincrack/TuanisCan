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
  TrendingUp,
  Wallet,
} from "../lib/iconos";
import { aviso, motivo } from "../lib/aviso";
import {
  listOwnerPayments,
  listPaymentMethods,
  processPayment,
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

   ── La tarjeta ──

   Un rectángulo con degradado y esquinas redondas es lo que sale por
   defecto y se nota. Lo que hace que una tarjeta se lea como tarjeta
   son cuatro cosas que sí están en las de verdad:

     · El guilloché. El grabado de líneas finas que llevan las
       tarjetas y los billetes desde que existe la imprenta de
       seguridad. Acá son dos rosetones y una trama diagonal a muy
       poca opacidad: al cruzarse dan el moiré, que es exactamente lo
       que hace el torno de grabar.
     · La proporción. ID-1 de la norma ISO/IEC 7810 es 85,60 × 53,98
       mm, o sea 1,586. Antes estaba en 1,62 —la proporción áurea—,
       que es parecida pero no es la de ninguna tarjeta del mundo.
     · El chip. Un chip EMV tiene seis contactos en dos columnas con
       un puente al centro, no una cruz.
     · El relieve. Los números van repujados: luz arriba, sombra
       abajo. Dos sombras de texto de un píxel.

   El turquesa de la casa aparece donde aparece siempre —un filete,
   nada más—, y el navy es el mismo `--color-rail` del riel. La
   tarjeta se ve cara sin dejar de ser de este producto.

   ── Un objeto, tres tamaños ──

   La misma tarjeta aparece completa en la sección de métodos, en
   sello mediano al elegir con qué pagar, y en sello chico dentro de
   la tabla. Es lo que ata la pantalla: quien ve el sello chico en una
   fila reconoce cuál de sus tarjetas cobró.
   ───────────────────────────────────────────────────────────── */

type FiltroTipo = "Todos" | "Pagados" | "Pendientes" | "Reembolsos";

type Tono = "ok" | "warn" | "danger" | "accent" | "neutral";

const estadoConfig: Record<
  PaymentStatus,
  { label: string; tono: Tono; icon: typeof CheckCircle2 }
> = {
  pagado: { label: "Pagado", tono: "ok", icon: CheckCircle2 },
  pendiente: { label: "Pendiente", tono: "warn", icon: Clock },
  fallido: { label: "Fallido", tono: "danger", icon: AlertTriangle },
  // «Reembolso» y no «Reembolsado»: la insignia vive en una columna
  // de 115 px y la palabra larga no cabe sin partirse.
  reembolsado: { label: "Reembolso", tono: "accent", icon: Repeat },
};

/* ── Utilidades ──────────────────────────────────────────────── */

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

/** Fecha de fila. El año solo sale cuando NO es el corriente: en un
    historial donde casi todo pasó este año, repetir «2026» en cada
    fila es ruido, y además es el ancho que necesita el día. */
const fechaCorta = (fecha: string) => {
  const dia = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(dia.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    ...(dia.getFullYear() === new Date().getFullYear() ? {} : { year: "2-digit" }),
  }).format(dia);
};

/** «Visa •••• 4242» → «4242». El sello ya dice de qué marca es; la
    palabra al lado repite el dato y se come el ancho que necesitan los
    cuatro dígitos, que es lo único que distingue una tarjeta de otra
    cuando hay dos Visa guardadas. */
const ultimos4De = (metodo: string) => metodo.match(/(\d{4})\s*$/)?.[1] ?? "";

/** El estado, con su ícono. Se repite igual en la tabla y en la lista
    de mano, así que vive una sola vez. */
const EstadoInsignia = ({ estado }: { estado: PaymentStatus }) => {
  const config = estadoConfig[estado];
  const Icono = config.icon;

  return (
    <Badge tono={config.tono}>
      <span className="inline-flex items-center gap-1.5">
        <Icono size={12} className="shrink-0" />
        {config.label}
      </span>
    </Badge>
  );
};

/** El importe. Un reembolso ENTRA y todo lo demás SALE: el signo hace
    la mitad del trabajo y el color la otra mitad, porque el signo solo
    es un píxel de ancho y se pierde al barrer la columna. */
const Importe = ({
  monto,
  estado,
  className = "text-[13.5px]",
}: {
  monto: number;
  estado: PaymentStatus;
  className?: string;
}) => (
  <span
    className={`nums font-semibold whitespace-nowrap ${className} ${
      estado === "reembolsado" ? "text-ok" : estado === "pendiente" ? "text-warn" : "text-ink"
    }`}
  >
    {estado === "reembolsado" ? "+" : "−"}
    {colones(monto)}
  </span>
);

/** El método, en pequeño: el sello de la tarjeta más los cuatro
    dígitos. Si el texto no trae dígitos —un método viejo, otra
    pasarela— cae de vuelta a la cadena completa. */
const MetodoBreve = ({ metodo }: { metodo: string }) => {
  const ultimos = ultimos4De(metodo);

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-soft">
      <SelloTarjeta marca={metodo} className="h-4 w-[26px]" />
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
      setError(motivo(cause));
      aviso.error(cause, { respaldo: "No se pudieron cargar tus pagos." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const contadores = useMemo(
    () => ({
      Todos: movimientos.length,
      Pagados: movimientos.filter((m) => m.estado_pago === "pagado").length,
      Pendientes: movimientos.filter((m) => m.estado_pago === "pendiente").length,
      Reembolsos: movimientos.filter((m) => m.estado_pago === "reembolsado").length,
    }),
    [movimientos],
  );

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();

    return movimientos.filter((movement) => {
      if (filtro === "Pagados" && movement.estado_pago !== "pagado") return false;
      if (filtro === "Pendientes" && movement.estado_pago !== "pendiente") return false;
      if (filtro === "Reembolsos" && movement.estado_pago !== "reembolsado") return false;
      if (!query) return true;

      return (
        movement.mascota.toLowerCase().includes(query) ||
        movement.paseador.toLowerCase().includes(query) ||
        movement.metodo_pago.toLowerCase().includes(query) ||
        movement.id_pago.toLowerCase().includes(query)
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

  /** Abrir el cobro de una fila. Estaba en línea dentro del botón de
      la tabla; ahora lo llaman la tabla y la lista de mano, así que
      vive una sola vez. Llega elegida la tarjeta principal, que es la
      que quien paga espera encontrar puesta. */
  const abrirPago = (movimiento: PaymentMovement) => {
    setDialogError("");
    setPagoSeleccionado(movimiento);
    setMetodoSeleccionado(
      metodos.find((m) => m.es_principal)?.id_metodo_pago ?? metodos[0]?.id_metodo_pago ?? "",
    );
  };

  const pay = async () => {
    if (!pagoSeleccionado || !metodoSeleccionado) return;

    setSaving(true);
    setDialogError("");
    try {
      const monto = pagoSeleccionado.monto;
      await aviso.proceso(processPayment(pagoSeleccionado.id_paseo, metodoSeleccionado), {
        esperando: `Cobrando ${colones(monto)}…`,
        bien: `Pago de ${colones(monto)} completado`,
        mal: "No se pudo procesar el pago.",
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
        "ID Transacción",
        "Servicio",
        "Mascota",
        "Paseador",
        "Fecha",
        "Método",
        "Estado",
        "Monto CRC",
      ],
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
      `${visibles.length} ${visibles.length === 1 ? "movimiento exportado" : "movimientos exportados"}`,
      { detalle: `Se descargó ${nombre}.` },
    );
  };

  const botonNotificaciones = useContext(NotificationButtonContext);

  return (
    <Page wide>
      <PageHeader
        title="Gestión de pagos"
        subtitle="Monitoreá tus comprobantes y aboná paseos pendientes."
        action={
          <div className="flex items-center gap-2.5">
            <Link to="/pagos/tarjetas" className={btnPrimary}>
              <CreditCard size={15} strokeWidth={2} />
              Gestionar tarjetas
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
          Antes a `py-5`, con el ícono y el importe compitiendo por
          altura. A `py-4` y con el importe un punto más chico caben
          las tres sin dejar de leerse de un vistazo. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-surface px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">Gasto de {stats.mesNombre}</p>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep">
              <Wallet size={15} />
            </span>
          </div>
          <p className="nums mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {colones(stats.spent)}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-soft">
            <TrendingUp size={13} className="text-ok" />
            {stats.count} {stats.count === 1 ? "pago realizado" : "pagos realizados"}
          </p>
        </div>

        {/* La única que puede pedir algo. Con deuda se levanta con un
            filete cálido apenas visible; en cero se calla y se ve como
            las otras dos. */}
        <div
          className={`rounded-[18px] px-5 py-4 ${
            stats.pending > 0 ? "bg-warn-wash/60 ring-1 ring-warn/20" : "bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">Pendiente de cobro</p>
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                stats.pending > 0 ? "bg-warn text-white" : "bg-sunken text-ink-mute"
              }`}
            >
              <Clock size={15} />
            </span>
          </div>
          <p
            className={`nums mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] ${
              stats.pending > 0 ? "text-warn" : "text-ink"
            }`}
          >
            {colones(stats.pending)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {stats.pendingCount > 0
              ? `${stats.pendingCount} ${stats.pendingCount === 1 ? "paseo por abonar" : "paseos por abonar"}`
              : "Al día con todos los paseos"}
          </p>
        </div>

        <div className="rounded-[18px] bg-surface px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">Total reembolsado</p>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ok-wash text-ok">
              <Banknote size={15} />
            </span>
          </div>
          <p className="nums mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] text-ok">
            {colones(stats.refunded)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {stats.refundedCount > 0
              ? `${stats.refundedCount} ${stats.refundedCount === 1 ? "reembolso emitido" : "reembolsos emitidos"}`
              : "Sin reembolsos registrados"}
          </p>
        </div>
      </div>

      {/* ── Las tarjetas ──
          Ya no se gestionan acá: la tarjeta grande, el guilloché y el
          formulario de alta viven en `/pagos/tarjetas`, su propia
          pantalla. Esta fila es solo un resumen —los sellos de lo que
          hay guardado— con la salida hacia allá; cargar el formulario
          entero para quien solo viene a ver el historial era el peso
          de más que esta pantalla no necesitaba. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface px-5 py-3.5">
        {loading ? (
          <Skeleton name="mascotas-rejilla" loading>
            <div />
          </Skeleton>
        ) : metodos.length ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-ink-soft">
                {metodos.length} {metodos.length === 1 ? "tarjeta guardada" : "tarjetas guardadas"}
              </span>
              <div className="flex -space-x-1.5">
                {metodos.map((method) => (
                  <SelloTarjeta
                    key={method.id_metodo_pago}
                    marca={method.marca}
                    className="h-6 w-9 ring-2 ring-surface"
                  />
                ))}
              </div>
            </div>
            <Link to="/pagos/tarjetas" className={btnSecondary}>
              <CreditCard size={14} strokeWidth={1.9} />
              Gestionar tarjetas
            </Link>
          </>
        ) : (
          <>
            <span className="text-[13px] text-ink-soft">Todavía no tenés tarjetas guardadas.</span>
            <Link to="/pagos/tarjetas" className={btnPrimary}>
              <CreditCard size={15} strokeWidth={2} />
              Agregar tarjeta
            </Link>
          </>
        )}
      </div>

      {/* ── Filtros y búsqueda ──
          Los cuatro filtros a `w-fit` no piden más que su contenido:
          es el buscador el que crece y se lleva el ancho que sobra. En
          `lg` para arriba entran los seis controles en una sola fila;
          antes de eso se reparten en dos, y en móvil las pestañas
          ruedan de lado en vez de partirse. */}
      <div className="flex flex-col gap-3 rounded-[18px] bg-surface p-3.5 lg:flex-row lg:items-center lg:gap-4">
        <div className="-mx-3.5 overflow-x-auto px-3.5 lg:mx-0 lg:shrink-0 lg:overflow-visible lg:px-0">
          <FilterTabs
            label="Filtrar movimientos"
            options={["Todos", "Pagados", "Pendientes", "Reembolsos"]}
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
              placeholder="Buscar por mascota o paseador…"
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
            title="Descargar el historial en formato CSV"
          >
            <Download size={14} strokeWidth={1.9} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Los movimientos ──

          La tabla traía siete columnas a `px-6`. Suena inofensivo
          hasta que se mide el hueco donde vive: con el riel anclado y
          la columna de contexto abierta, a `main` le quedan unos 650
          px. Siete columnas gastan 336 solo en calles, quedan 314 para
          el contenido, y ahí no entra ni «REEMBOLSADO» ni una fecha
          con año. El reparto automático hace entonces lo único que
          puede —partir las palabras en dos—, cada fila pasa a medir un
          alto distinto, la cabecera deja de caer encima de su columna
          y la tabla se ve rota. Eso era lo que se rompía.

          Tres decisiones, en este orden:

            1. Menos columnas. El paseador no es un dato aparte del
               movimiento: es DEL movimiento, y baja a la segunda línea
               junto a la duración, que es donde se lee sin buscarlo.
               Y el botón de ver deja de ocupar una columna entera para
               un ícono: el título de la fila ES el botón.
            2. Reparto fijo. Las cinco que quedan llevan ancho
               declarado, así que la tabla ya no depende del contenido:
               ninguna fila puede empujar a otra.
            3. Debajo de `lg` no hay tabla. Ahí el hueco baja de 500 px
               y no hay reparto que salve cinco columnas; rodar una
               tabla de lado es justamente lo que se siente roto. Los
               mismos datos se apilan en fichas, con el importe donde
               estaba: arriba a la derecha. */}
      <Section bodyClass="p-0">
        {loading ? (
          <Skeleton name="admin-tabla" loading>
            <div />
          </Skeleton>
        ) : visibles.length ? (
          <>
            {/* ── De md para arriba: la tabla ── El carril ancho le
                deja a `main` bastante más de los 650 px originales,
                así que la tabla entra desde `md` y no solo desde
                `lg`. Filas a `py-2.5`: un dato por línea no necesita
                los 12 px de antes para respirar. */}
            <div className="hidden md:block">
              <Table
                caption="Historial de movimientos de pago"
                min="min-w-[720px]"
                padX="px-4"
                columnas={[
                  { label: "Transacción", ancho: "w-[32%]" },
                  { label: "Fecha", ancho: "w-[12%]" },
                  { label: "Método", ancho: "w-[16%]" },
                  { label: "Estado", ancho: "w-[16%]" },
                  { label: "Monto", ancho: "w-[24%]", align: "right" },
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
                            title={`Ver el comprobante · Paseo con ${movement.mascota}`}
                            className="block max-w-full truncate text-left text-[13.5px] font-semibold text-ink underline-offset-[3px] transition-colors duration-150 group-hover:underline hover:text-accent-deep"
                          >
                            Paseo con {movement.mascota}
                          </button>
                          <p className="truncate text-[11.5px] text-ink-soft">
                            <span className="nums">{movement.duracion_min} min</span> ·{" "}
                            {movement.paseador}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="nums px-4 py-2.5 text-[12px] whitespace-nowrap text-ink-soft">
                      {fechaCorta(movement.fecha)}
                    </td>

                    <td className="px-4 py-2.5">
                      <MetodoBreve metodo={movement.metodo_pago} />
                    </td>

                    <td className="px-4 py-2.5">
                      <EstadoInsignia estado={movement.estado_pago} />
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        <Importe monto={movement.monto} estado={movement.estado_pago} />

                        {movement.estado_pago === "pendiente" && (
                          <button
                            type="button"
                            className={btnPagar}
                            onClick={() => abrirPago(movement)}
                          >
                            <CreditCard size={12} />
                            Pagar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>

            {/* ── Debajo de md: la misma información, apilada ── */}
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
                        Paseo con {movement.mascota}
                      </button>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-soft">
                        <span className="nums">{movement.duracion_min} min</span> ·{" "}
                        {movement.paseador}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <Importe
                        monto={movement.monto}
                        estado={movement.estado_pago}
                        className="text-[14px]"
                      />
                      <p className="nums mt-0.5 text-[11px] text-ink-mute">
                        {fechaCorta(movement.fecha)}
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
                        Pagar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title="Sin movimientos en este filtro"
            hint={
              busqueda
                ? "Ningún movimiento coincide con lo que buscaste."
                : "Los cobros y los paseos van a aparecer registrados acá."
            }
          />
        )}
      </Section>

      {/* ── Confirmar el pago ── */}
      {pagoSeleccionado && (
        <Dialog title="Confirmar pago del paseo" onClose={() => setPagoSeleccionado(null)}>
          <div className="p-6">
            <div className="rounded-[18px] bg-sunken p-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-wash px-2.5 py-0.5 text-[11px] font-semibold text-accent-deep">
                <PawPrint size={12} />
                Paseo canino
              </span>
              <p className="mt-2 text-[16px] font-semibold text-ink">{pagoSeleccionado.mascota}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                Con {pagoSeleccionado.paseador} · {pagoSeleccionado.duracion_min} minutos
              </p>
              <p className="text-[12px] text-ink-mute">
                {fechaFormateada(pagoSeleccionado.fecha)}
              </p>

              <div className="mt-4 border-t border-ink/10 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="rotulo text-ink-mute">Total a abonar</span>
                  <span className="nums text-[26px] font-semibold tracking-[-0.02em] text-ink">
                    {colones(pagoSeleccionado.monto)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[11.5px] text-ink-mute">
                  <span>
                    Al paseador{" "}
                    {colones(pagoSeleccionado.monto - pagoSeleccionado.comision_plataforma)}
                  </span>
                  <span>Comisión {colones(pagoSeleccionado.comision_plataforma)}</span>
                </div>
              </div>
            </div>

            {metodos.length ? (
              <fieldset className="mt-5 grid gap-2">
                <legend className="rotulo mb-2 text-ink-mute">Con cuál cobramos</legend>
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
                            Principal
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <div className="mt-5 rounded-[14px] bg-warn-wash px-4 py-3.5 text-[12.5px] text-warn">
                <p className="font-semibold">No tenés ninguna tarjeta activa</p>
                <p className="mt-1">Registrá una para poder abonar el paseo.</p>
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

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-sunken pt-4">
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                <ShieldCheck size={15} className="text-ok" />
                Transacción segura
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setPagoSeleccionado(null)}
                >
                  Cancelar
                </button>
                {metodos.length ? (
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={saving || !metodoSeleccionado}
                    onClick={() => void pay()}
                  >
                    {saving && <Loader size={14} className="animate-spin" />}
                    Pagar {colones(pagoSeleccionado.monto)}
                  </button>
                ) : (
                  <Link
                    to="/pagos/tarjetas"
                    className={btnPrimary}
                    onClick={() => setPagoSeleccionado(null)}
                  >
                    Agregar tarjeta
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── El comprobante ── */}
      {detalleMovimiento && (
        <Dialog title="Comprobante" onClose={() => setDetalleMovimiento(null)}>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 border-b border-sunken pb-4">
              <div className="min-w-0">
                <span className="nums text-[12px] text-ink-mute">#{detalleMovimiento.id_pago}</span>
                <h4 className="titular mt-1 text-[17px] text-ink">
                  Paseo con {detalleMovimiento.mascota}
                </h4>
              </div>
              <Badge tono={estadoConfig[detalleMovimiento.estado_pago].tono}>
                {estadoConfig[detalleMovimiento.estado_pago].label}
              </Badge>
            </div>

            <dl className="mt-4 text-[13px]">
              {[
                ["Paseador", detalleMovimiento.paseador],
                ["Fecha del servicio", fechaFormateada(detalleMovimiento.fecha)],
                ["Duración", `${detalleMovimiento.duracion_min} minutos`],
                ["Método utilizado", detalleMovimiento.metodo_pago],
                [
                  "Tarifa del paseador",
                  colones(detalleMovimiento.monto - detalleMovimiento.comision_plataforma),
                ],
                ["Comisión TuanisCan", colones(detalleMovimiento.comision_plataforma)],
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
                <dt className="rotulo text-ink-mute">Monto total</dt>
                <dd className="nums text-[22px] font-semibold tracking-[-0.02em] text-ink">
                  {colones(detalleMovimiento.monto)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end border-t border-sunken pt-4">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setDetalleMovimiento(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
};

export default Pagos;
