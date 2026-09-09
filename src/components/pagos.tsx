import { useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
  Repeat,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet,
} from "../lib/iconos";
import { aviso, motivo } from "../lib/aviso";
import {
  CARD_NUMBER_LENGTH,
  cardBrand,
  cardDigits,
  formatCardNumber,
  isValidCardNumber,
  parseExpiry,
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
  FilterTabs,
  Page,
  PageHeader,
  Section,
  Table,
  btnPrimary,
  btnSecondary,
  colones,
  fieldLabel,
  input,
} from "./ui";

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

/* ── La tarjeta ──────────────────────────────────────────────── */

/** El grabado. Dos rosetones descentrados más una trama diagonal: al
    superponerse dan el moiré del torno de grabar. Va como valor y no
    como clase porque son tres capas con posiciones y pasos distintos,
    que es justo lo que una utilidad no puede expresar. */
const GUILLOCHE = [
  "repeating-radial-gradient(circle at 82% 14%, rgba(255,255,255,0.07) 0 1px, transparent 1px 6px)",
  "repeating-radial-gradient(circle at 16% 88%, rgba(255,255,255,0.055) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(64deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 5px)",
].join(", ");

/** El brillo del plástico. Una sola banda ancha en diagonal. Se
    desplaza al pasar el puntero, y eso no es adorno: en el diálogo de
    pago la tarjeta se elige, y el brillo es lo que dice que responde. */
const BRILLO =
  "linear-gradient(104deg, transparent 20%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0.03) 54%, transparent 72%)";

/** El repujado de los números. Luz arriba, sombra abajo: un píxel
    cada una, que es lo que hace la máquina de repujar. */
const REPUJADO = {
  textShadow: "0 1px 0 rgba(255,255,255,0.26), 0 -1px 1px rgba(0,0,0,0.5)",
};

interface TemaTarjeta {
  fondo: string;
  filete: string;
  logo: React.ReactNode;
}

const temaDe = (marca: string): TemaTarjeta => {
  const nombre = (marca || "").trim().toLowerCase();

  if (nombre.includes("visa")) {
    return {
      fondo: "bg-[linear-gradient(135deg,#0b2033_0%,#16405e_52%,#1f5e86_100%)]",
      filete: "ring-sky-300/25",
      logo: (
        <span className="select-none text-[19px] font-black italic tracking-wider text-white">
          VISA
        </span>
      ),
    };
  }

  if (nombre.includes("mastercard")) {
    return {
      fondo: "bg-[linear-gradient(135deg,#1a181c_0%,#2b262d_50%,#3d2e28_100%)]",
      filete: "ring-amber-300/25",
      logo: (
        <span className="flex select-none items-center -space-x-2.5" aria-label="Mastercard">
          <span className="h-6 w-6 rounded-full bg-[#eb001b] opacity-90" />
          <span className="h-6 w-6 rounded-full bg-[#f79e1b] opacity-90" />
        </span>
      ),
    };
  }

  /* La de la casa: el navy del riel abriendo al celeste del login. */
  return {
    fondo: "bg-[linear-gradient(135deg,#0f2a3a_0%,#1a4257_50%,#2e6584_100%)]",
    filete: "ring-accent/30",
    logo: (
      <span className="titular select-none text-[15px] font-bold tracking-tight text-white">
        TuanisCan
      </span>
    ),
  };
};

/** El chip EMV. Seis contactos en dos columnas con un puente al
    centro, que es el trazado real de la norma ISO/IEC 7816. */
const ChipEmv = () => (
  <span
    className="relative block h-[26px] w-[34px] overflow-hidden rounded-[5px] bg-[linear-gradient(135deg,#f6e3ac_0%,#dcbc72_45%,#a8843c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_2px_rgba(0,0,0,0.35)]"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 34 26"
      className="absolute inset-0 h-full w-full text-[#6d5219]/55"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M0 8h11M23 8h11M0 18h11M23 18h11M11 0v26M23 0v26M11 13h12" />
    </svg>
  </span>
);

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
  const tema = temaDe(marca);

  return (
    <div
      className={`group relative flex aspect-[1.586/1] w-full max-w-[360px] flex-col justify-between overflow-hidden rounded-[20px] p-5 text-white ring-1 ${tema.filete} ${tema.fondo} shadow-[0_14px_30px_rgba(15,35,55,0.24)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(15,35,55,0.3)] ${className}`}
    >
      {/* El grabado */}
      <span
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{ backgroundImage: GUILLOCHE }}
        aria-hidden="true"
      />

      {/* El brillo, que se corre al pasar el puntero */}
      <span
        className="pointer-events-none absolute -inset-x-1/3 inset-y-0 transition-transform duration-700 ease-out group-hover:translate-x-[16%]"
        style={{ backgroundImage: BRILLO }}
        aria-hidden="true"
      />

      {/* Chip, contactless y marca */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ChipEmv />
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

        <div className="flex flex-col items-end gap-1.5">
          {tema.logo}
          {esPrincipal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
              <Star size={9} className="fill-[#f2c14e] text-[#f2c14e]" />
              Principal
            </span>
          )}
        </div>
      </div>

      {/* El número, repujado */}
      <p
        className="nums relative my-auto pt-2 text-[18px] font-medium tracking-[0.14em] text-white/95 sm:text-[20px]"
        style={REPUJADO}
      >
        {numero || "•••• •••• •••• ••••"}
      </p>

      {/* Titular y vencimiento */}
      <div className="relative flex items-end justify-between gap-4">
        <div className="min-w-0 max-w-[70%]">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/55">
            Titular
          </p>
          <p
            className="mt-0.5 truncate text-[12px] font-semibold uppercase tracking-[0.06em] text-white"
            style={REPUJADO}
          >
            {titular || "Nombre del titular"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/55">
            Vence
          </p>
          <p
            className="nums mt-0.5 text-[12px] font-semibold tracking-wider text-white"
            style={REPUJADO}
          >
            {vencimiento || "MM/AA"}
          </p>
        </div>
      </div>
    </div>
  );
};

/** La misma tarjeta en chico. Lleva el chip porque a este tamaño es
    lo único que la hace reconocible como tarjeta y no como cuadrito. */
const SelloTarjeta = ({
  marca,
  className = "h-6 w-9",
}: {
  marca: string;
  className?: string;
}) => (
  <span
    className={`relative inline-block shrink-0 overflow-hidden rounded-[4px] ring-1 ring-inset ring-white/15 ${temaDe(marca).fondo} ${className}`}
    aria-hidden="true"
  >
    <span className="absolute left-[14%] top-[26%] h-[30%] w-[22%] rounded-[1.5px] bg-[linear-gradient(135deg,#f6e3ac,#a8843c)]" />
  </span>
);

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

const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

type CampoTarjeta = "titular" | "numero" | "vencimiento" | "cvv";

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
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PaymentMovement | null>(null);
  const [detalleMovimiento, setDetalleMovimiento] = useState<PaymentMovement | null>(null);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("");
  const [form, setForm] = useState({ titular: "", numero: "", vencimiento: "", cvv: "" });
  const [tocado, setTocado] = useState<Partial<Record<CampoTarjeta, boolean>>>({});

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

  /* Validación de la tarjeta. `payment-card.ts` ya traía Luhn y el
     control de vencimiento exportados y nadie los llamaba: la pantalla
     solo contaba dieciséis dígitos, así que un número inventado que
     empezara con 4 pasaba de largo y el error llegaba del servidor
     cuando ya era tarde. Va acá, pegado al campo, porque un aviso
     flotante no puede señalar cuál de los cuatro está mal. */
  const errores = useMemo(() => {
    const digitos = cardDigits(form.numero);
    const marca = cardBrand(form.numero);

    return {
      titular:
        form.titular.trim().length < 3 ? "Escribí el nombre como aparece en la tarjeta." : "",
      numero:
        digitos.length !== CARD_NUMBER_LENGTH
          ? `Faltan ${CARD_NUMBER_LENGTH - digitos.length} dígitos.`
          : !marca
            ? "Solo aceptamos Visa y Mastercard."
            : !isValidCardNumber(form.numero)
              ? "Ese número no existe. Revisá los dígitos."
              : "",
      vencimiento: !parseExpiry(form.vencimiento)
        ? "Fecha inválida o ya vencida. Usá MM/AA."
        : "",
      cvv: !/^\d{3,4}$/.test(form.cvv) ? "Son los tres dígitos del reverso." : "",
    } satisfies Record<CampoTarjeta, string>;
  }, [form]);

  const formValido = !Object.values(errores).some(Boolean);

  const marcar = (campo: CampoTarjeta) => () =>
    setTocado((prev) => ({ ...prev, [campo]: true }));

  const fallo = (campo: CampoTarjeta) => (tocado[campo] ? errores[campo] : "");

  const cerrarFormulario = () => {
    setMostrarTarjeta(false);
    setTocado({});
    setDialogError("");
  };

  const abrirFormulario = () => {
    setDialogError("");
    setTocado({});
    setMostrarTarjeta(true);
  };

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

  const saveCard = async () => {
    setTocado({ titular: true, numero: true, vencimiento: true, cvv: true });
    if (!formValido) return;

    setSaving(true);
    setDialogError("");
    try {
      await aviso.proceso(registerPaymentMethod(form), {
        esperando: "Registrando la tarjeta…",
        bien: "Tarjeta registrada",
        mal: "No se pudo registrar la tarjeta.",
      });
      setForm({ titular: "", numero: "", vencimiento: "", cvv: "" });
      cerrarFormulario();
      await load();
    } catch (cause) {
      setDialogError(motivo(cause));
    } finally {
      setSaving(false);
    }
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

  const previewBrand = cardBrand(form.numero) ?? "";
  const previewNumber = formatCardNumber(form.numero);
  const digitosPuestos = cardDigits(form.numero).length;

  return (
    <Page>
      <PageHeader
        title="Gestión de pagos"
        subtitle="Monitoreá tus comprobantes, aboná paseos pendientes y administrá tus métodos de pago."
        action={
          <button type="button" className={btnPrimary} onClick={abrirFormulario}>
            <Plus size={15} strokeWidth={2} />
            Agregar tarjeta
          </button>
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

      {/* ── Las tres cifras ── */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-[18px] bg-surface px-6 py-5">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">Gasto de {stats.mesNombre}</p>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-wash text-accent-deep">
              <Wallet size={16} />
            </span>
          </div>
          <p className="nums mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {colones(stats.spent)}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-soft">
            <TrendingUp size={13} className="text-ok" />
            {stats.count} {stats.count === 1 ? "pago realizado" : "pagos realizados"}
          </p>
        </div>

        {/* La única que puede pedir algo. Con deuda se levanta con el
            filete cálido; en cero se calla y se ve como las otras dos. */}
        <div
          className={`rounded-[18px] px-6 py-5 ${
            stats.pending > 0 ? "bg-warn-wash ring-1 ring-warn/25" : "bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">Pendiente de cobro</p>
            <span
              className={`grid h-8 w-8 place-items-center rounded-full ${
                stats.pending > 0 ? "bg-warn text-white" : "bg-sunken text-ink-mute"
              }`}
            >
              <Clock size={16} />
            </span>
          </div>
          <p
            className={`nums mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] ${
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

        <div className="rounded-[18px] bg-surface px-6 py-5">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo text-ink-mute">Total reembolsado</p>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ok-wash text-ok">
              <Banknote size={16} />
            </span>
          </div>
          <p className="nums mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-ok">
            {colones(stats.refunded)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {stats.refundedCount > 0
              ? `${stats.refundedCount} ${stats.refundedCount === 1 ? "reembolso emitido" : "reembolsos emitidos"}`
              : "Sin reembolsos registrados"}
          </p>
        </div>
      </div>

      {/* ── Las tarjetas ── */}
      <Section
        title="Tarjetas guardadas"
        aside={
          metodos.length > 0 && (
            <span className="text-[12px] text-ink-soft">
              {metodos.length} {metodos.length === 1 ? "tarjeta activa" : "tarjetas activas"}
            </span>
          )
        }
      >
        {loading ? (
          <Skeleton name="mascotas-rejilla" loading>
            <div />
          </Skeleton>
        ) : metodos.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metodos.map((method) => (
              <TarjetaVisual
                key={method.id_metodo_pago}
                marca={method.marca}
                numero={`•••• •••• •••• ${method.ultimos4}`}
                titular={method.titular}
                vencimiento={`${String(method.exp_mes).padStart(2, "0")}/${String(method.exp_ano).slice(-2)}`}
                esPrincipal={method.es_principal}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Todavía no tenés tarjetas"
            hint="Agregá una Visa o una Mastercard para abonar los paseos de tus mascotas."
            action={
              <button type="button" className={btnPrimary} onClick={abrirFormulario}>
                <Plus size={15} strokeWidth={2} />
                Registrar la primera
              </button>
            }
          />
        )}
      </Section>

      {/* ── Filtros y búsqueda ── */}
      <div className="flex flex-col gap-3 rounded-[18px] bg-surface p-4 md:flex-row md:items-center md:justify-between">
        <FilterTabs
          label="Filtrar movimientos"
          options={["Todos", "Pagados", "Pendientes", "Reembolsos"]}
          value={filtro}
          onChange={(v) => setFiltro(v as FiltroTipo)}
          cuentas={contadores}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
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
            className={btnSecondary}
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
            {/* ── De lg para arriba: la tabla ── */}
            <div className="hidden lg:block">
              <Table
                caption="Historial de movimientos de pago"
                min="min-w-[640px]"
                padX="px-4"
                columnas={[
                  { label: "Transacción", ancho: "w-[30%]" },
                  { label: "Fecha", ancho: "w-[13%]" },
                  { label: "Método", ancho: "w-[17%]" },
                  { label: "Estado", ancho: "w-[23%]" },
                  { label: "Monto", ancho: "w-[17%]", align: "right" },
                ]}
              >
                {visibles.map((movement) => (
                  <tr
                    key={movement.id_pago}
                    className="group transition-colors duration-150 hover:bg-accent-wash/40"
                  >
                    <td className="px-4 py-3">
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

                    <td className="nums px-4 py-3 text-[12px] whitespace-nowrap text-ink-soft">
                      {fechaCorta(movement.fecha)}
                    </td>

                    <td className="px-4 py-3">
                      <MetodoBreve metodo={movement.metodo_pago} />
                    </td>

                    <td className="px-4 py-3">
                      <EstadoInsignia estado={movement.estado_pago} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1.5">
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

            {/* ── Debajo de lg: la misma información, apilada ── */}
            <ul className="lg:hidden [&>li:nth-child(even)]:bg-sunken/60">
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

      {/* ── Registrar tarjeta ── */}
      {mostrarTarjeta && (
        <Dialog title="Registrar método de pago" ancho="max-w-[780px]" onClose={cerrarFormulario}>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.1fr] md:items-start">
            {/* La vista previa se arma sola mientras se escribe: es la
                forma más rápida de ver que el número quedó bien. */}
            <div>
              <p className="rotulo mb-3 text-ink-mute">Vista previa</p>
              <TarjetaVisual
                marca={previewBrand}
                numero={previewNumber}
                titular={form.titular}
                vencimiento={form.vencimiento}
                className="max-w-none"
              />
              <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-soft">
                <ShieldCheck size={16} className="text-ok" />
                Guardamos solo la marca y los últimos cuatro dígitos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] bg-accent-wash px-4 py-3 text-[12px] leading-relaxed text-accent-deep sm:col-span-2">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  <CreditCard size={14} />
                  Tarjetas aceptadas
                </p>
                <p className="text-[11.5px] text-ink-soft">
                  <strong>Visa</strong> (empieza con 4) y <strong>Mastercard</strong> (51-55 o
                  2221-2720).
                </p>
              </div>

              <label className={`${fieldLabel} sm:col-span-2`}>
                Nombre del titular
                <input
                  autoComplete="cc-name"
                  className={input}
                  placeholder="Como aparece en la tarjeta"
                  value={form.titular}
                  onBlur={marcar("titular")}
                  onChange={(event) => setForm({ ...form, titular: event.target.value })}
                />
                {fallo("titular") && (
                  <span className="mt-1 block text-[11.5px] font-medium text-danger">
                    {fallo("titular")}
                  </span>
                )}
              </label>

              <label className={`${fieldLabel} sm:col-span-2`}>
                <span className="flex items-center justify-between">
                  Número de tarjeta
                  <span className="nums text-[11px] font-medium normal-case text-ink-soft">
                    {digitosPuestos}/{CARD_NUMBER_LENGTH}
                  </span>
                </span>
                <span className="relative block">
                  <input
                    inputMode="numeric"
                    autoComplete="cc-number"
                    maxLength={19}
                    className={`${input} pr-24`}
                    placeholder="•••• •••• •••• ••••"
                    value={form.numero}
                    onBlur={marcar("numero")}
                    onChange={(event) =>
                      setForm({ ...form, numero: formatCardNumber(event.target.value) })
                    }
                    onPaste={(event) => {
                      event.preventDefault();
                      const pegado = event.clipboardData.getData("text");
                      setForm((prev) => ({ ...prev, numero: formatCardNumber(pegado) }));
                    }}
                  />
                  {previewBrand && (
                    <span className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[11px] font-semibold text-accent-deep">
                      <SelloTarjeta marca={previewBrand} className="h-4 w-[26px]" />
                      {previewBrand}
                    </span>
                  )}
                </span>
                {fallo("numero") && (
                  <span className="mt-1 block text-[11.5px] font-medium text-danger">
                    {fallo("numero")}
                  </span>
                )}
              </label>

              <label className={fieldLabel}>
                Vencimiento
                <input
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  maxLength={5}
                  className={input}
                  placeholder="MM/AA"
                  value={form.vencimiento}
                  onBlur={marcar("vencimiento")}
                  onChange={(event) =>
                    setForm({ ...form, vencimiento: formatExpiryInput(event.target.value) })
                  }
                />
                {fallo("vencimiento") && (
                  <span className="mt-1 block text-[11.5px] font-medium text-danger">
                    {fallo("vencimiento")}
                  </span>
                )}
              </label>

              <label className={fieldLabel}>
                Código de seguridad
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={4}
                  className={input}
                  placeholder="123"
                  value={form.cvv}
                  onBlur={marcar("cvv")}
                  onChange={(event) =>
                    setForm({ ...form, cvv: event.target.value.replace(/\D/g, "").slice(0, 4) })
                  }
                />
                {fallo("cvv") && (
                  <span className="mt-1 block text-[11.5px] font-medium text-danger">
                    {fallo("cvv")}
                  </span>
                )}
              </label>

              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-mute sm:col-span-2">
                <ShieldCheck size={14} className="mt-px shrink-0" />
                El número completo y el código se comprueban en tu dispositivo. No viajan ni se
                guardan.
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
                <button type="button" className={btnSecondary} onClick={cerrarFormulario}>
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
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      setPagoSeleccionado(null);
                      abrirFormulario();
                    }}
                  >
                    Agregar tarjeta
                  </button>
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
