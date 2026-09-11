import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "boneyard-js/react";
import { AlertTriangle, ArrowLeft, CreditCard, Loader, Plus, ShieldCheck, Trash2 } from "../lib/iconos";
import { aviso, motivo } from "../lib/aviso";
import {
  CARD_NUMBER_LENGTH,
  cardBrand,
  cardDigits,
  formatCardNumber,
  isValidCardNumber,
  parseExpiry,
  sanitizeCardholderName,
} from "../lib/payment-card";
import {
  deletePaymentMethod,
  listPaymentMethods,
  registerPaymentMethod,
  type PaymentMethod,
} from "../services/payments.service";
import {
  Confirmar,
  Dialog,
  EmptyState,
  NotificationButtonContext,
  Page,
  PageHeader,
  Section,
  btnPrimary,
  btnSecondary,
  fieldLabel,
  input,
} from "./ui";
import { SelloTarjeta, TarjetaVisual } from "./tarjetaVisual";

/* ─────────────────────────────────────────────────────────────
   MÉTODOS DE PAGO

   Vivía dentro de `pagos.tsx`, junto con el historial de movimientos.
   Las dos cosas crecían por separado —un cambio en la validación de
   la tarjeta no tenía nada que ver con la tabla de transacciones— y
   compartir archivo obligaba a cargar el formulario de alta, sus
   cuatro validaciones y la rejilla de tarjetas para quien solo venía
   a revisar un cobro. Ahora `pagos.tsx` solo LEE los métodos que hay
   —para armar el selector de "con cuál cobramos"— y esta pantalla es
   la única que los da de alta.

   La tarjeta visual —guilloché, chip EMV, proporción ISO— vive en
   `tarjetaVisual.tsx`, compartida con `pagos.tsx` para el sello chico
   de la tabla y del selector de pago.
   ───────────────────────────────────────────────────────────── */

const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/** Para número, vencimiento y CVV: la tecla ni se deja aparecer si no es
    un dígito. `formatCardNumber`/`formatExpiryInput` ya limpiaban el
    valor después, pero eso deja ver la letra un instante y permite
    pegar cualquier cosa por el medio del número a golpe de tecla. */
const soloDigitos = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const teclasControl = [
    "Backspace",
    "Delete",
    "Tab",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];
  if (teclasControl.includes(event.key)) return;
  if (!/^\d$/.test(event.key)) event.preventDefault();
};

type CampoTarjeta = "titular" | "numero" | "vencimiento" | "cvv";

const Tarjetas = () => {
  const [metodos, setMetodos] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [form, setForm] = useState({ titular: "", numero: "", vencimiento: "", cvv: "" });
  const [tocado, setTocado] = useState<Partial<Record<CampoTarjeta, boolean>>>({});
  const [porEliminar, setPorEliminar] = useState<PaymentMethod | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMetodos(await listPaymentMethods());
    } catch (cause) {
      setError(motivo(cause));
      aviso.error(cause, { respaldo: "No se pudieron cargar tus tarjetas." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        form.titular.trim().length < 3
          ? "Escribí el nombre como aparece en la tarjeta, solo letras."
          : "",
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

  /** Nunca se edita una tarjeta: no es común ni seguro cambiar el número
      o la marca de algo ya guardado. Borrar sí, pero el sistema no
      puede quedarse sin ninguna, así que el botón se apaga cuando
      queda la última —el mismo límite que impone la función en la
      base de datos, aquí solo para no dejar clicar algo que va a
      rebotar con un error. */
  const eliminarTarjeta = async () => {
    if (!porEliminar) return;

    setEliminando(true);
    try {
      await aviso.proceso(deletePaymentMethod(porEliminar.id_metodo_pago), {
        esperando: "Eliminando la tarjeta…",
        bien: "Tarjeta eliminada",
        mal: "No se pudo eliminar la tarjeta.",
      });
      setPorEliminar(null);
      await load();
    } catch (cause) {
      aviso.error(cause, { respaldo: "No se pudo eliminar la tarjeta." });
    } finally {
      setEliminando(false);
    }
  };

  const previewBrand = cardBrand(form.numero) ?? "";
  const previewNumber = formatCardNumber(form.numero);
  const digitosPuestos = cardDigits(form.numero).length;

  const botonNotificaciones = useContext(NotificationButtonContext);

  return (
    <Page wide>
      <PageHeader
        title="Métodos de pago"
        subtitle="Registrá y administrá las tarjetas con las que abonás los paseos."
        action={
          <div className="flex items-center gap-2.5">
            <Link to="/pagos" className={btnSecondary}>
              <ArrowLeft size={15} strokeWidth={2} />
              Volver a pagos
            </Link>
            <button type="button" className={btnPrimary} onClick={abrirFormulario}>
              <Plus size={15} strokeWidth={2} />
              Agregar tarjeta
            </button>
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {metodos.map((method) => (
              <div key={method.id_metodo_pago} className="relative mx-auto w-full max-w-[360px]">
                <TarjetaVisual
                  marca={method.marca}
                  numero={`•••• •••• •••• ${method.ultimos4}`}
                  titular={method.titular}
                  vencimiento={`${String(method.exp_mes).padStart(2, "0")}/${String(method.exp_ano).slice(-2)}`}
                  esPrincipal={method.es_principal}
                />
                <button
                  type="button"
                  onClick={() => setPorEliminar(method)}
                  disabled={metodos.length <= 1}
                  title={
                    metodos.length <= 1
                      ? "Debés conservar al menos una tarjeta"
                      : "Eliminar tarjeta"
                  }
                  className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-[background-color,transform] duration-150 ease-out hover:bg-danger active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
                  onChange={(event) =>
                    setForm({ ...form, titular: sanitizeCardholderName(event.target.value) })
                  }
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
                    onKeyDown={soloDigitos}
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
                  onKeyDown={soloDigitos}
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
                  onKeyDown={soloDigitos}
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

      {/* ── Eliminar tarjeta ── */}
      {porEliminar && (
        <Confirmar
          titulo="¿Eliminar esta tarjeta?"
          cuerpo={
            <>
              Vas a eliminar la {porEliminar.marca} terminada en{" "}
              <strong className="nums">{porEliminar.ultimos4}</strong>. Esta acción no se puede
              deshacer.
            </>
          }
          confirmar="Eliminar"
          tono="peligro"
          ocupado={eliminando}
          onConfirmar={() => void eliminarTarjeta()}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </Page>
  );
};

export default Tarjetas;
