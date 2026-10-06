import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "boneyard-js/react";
import { AlertTriangle, ArrowLeft, CreditCard, Loader, Plus, ShieldCheck, Trash2 } from "../lib/iconos";
import { aviso, motivo } from "../lib/aviso";
import { useTranslation } from "../hooks/useTranslation";
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
  const { t } = useTranslation();
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
      aviso.error(cause, { respaldo: t("tarjetas.errors.loadFailed") });
    } finally {
      setLoading(false);
    }
  }, [t]);

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
          ? t("tarjetas.errors.holderTooShort")
          : "",
      numero:
        digitos.length !== CARD_NUMBER_LENGTH
          ? t("tarjetas.errors.missingDigits", { count: CARD_NUMBER_LENGTH - digitos.length })
          : !marca
            ? t("tarjetas.errors.unsupportedBrand")
            : !isValidCardNumber(form.numero)
              ? t("tarjetas.errors.invalidNumber")
              : "",
      vencimiento: !parseExpiry(form.vencimiento)
        ? t("tarjetas.errors.invalidExpiry")
        : "",
      cvv: !/^\d{3,4}$/.test(form.cvv) ? t("tarjetas.errors.invalidCvv") : "",
    } satisfies Record<CampoTarjeta, string>;
  }, [form, t]);

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
        esperando: t("tarjetas.form.saving"),
        bien: t("tarjetas.form.saved"),
        mal: t("tarjetas.form.saveFailed"),
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
        esperando: t("tarjetas.delete.deleting"),
        bien: t("tarjetas.delete.deleted"),
        mal: t("tarjetas.delete.deleteFailed"),
      });
      setPorEliminar(null);
      await load();
    } catch (cause) {
      aviso.error(cause, { respaldo: t("tarjetas.delete.deleteFailed") });
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
        title={t("tarjetas.title")}
        subtitle={t("tarjetas.subtitle")}
        action={
          <div className="flex items-center gap-2.5">
            <Link to="/pagos" className={btnSecondary}>
              <ArrowLeft size={15} strokeWidth={2} />
              {t("tarjetas.backToPayments")}
            </Link>
            <button type="button" className={btnPrimary} onClick={abrirFormulario}>
              <Plus size={15} strokeWidth={2} />
              {t("tarjetas.addCard")}
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
        title={t("tarjetas.savedCards")}
        aside={
          metodos.length > 0 && (
            <span className="text-[12px] text-ink-soft">
              {metodos.length} {metodos.length === 1 ? t("tarjetas.countSingular") : t("tarjetas.countPlural")}
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
                      ? t("tarjetas.keepAtLeastOne")
                      : t("tarjetas.deleteCard")
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
            title={t("tarjetas.empty.title")}
            hint={t("tarjetas.empty.hint")}
            action={
              <button type="button" className={btnPrimary} onClick={abrirFormulario}>
                <Plus size={15} strokeWidth={2} />
                {t("tarjetas.empty.registerFirst")}
              </button>
            }
          />
        )}
      </Section>

      {/* ── Registrar tarjeta ── */}
      {mostrarTarjeta && (
        <Dialog title={t("tarjetas.form.dialogTitle")} ancho="max-w-[780px]" onClose={cerrarFormulario}>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.1fr] md:items-start">
            {/* La vista previa se arma sola mientras se escribe: es la
                forma más rápida de ver que el número quedó bien. */}
            <div>
              <p className="rotulo mb-3 text-ink-mute">{t("tarjetas.form.preview")}</p>
              <TarjetaVisual
                marca={previewBrand}
                numero={previewNumber}
                titular={form.titular}
                vencimiento={form.vencimiento}
                className="max-w-none"
              />
              <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-soft">
                <ShieldCheck size={16} className="text-ok" />
                {t("tarjetas.form.storageNotice")}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] bg-accent-wash px-4 py-3 text-[12px] leading-relaxed text-accent-deep sm:col-span-2">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <CreditCard size={14} />
                  {t("tarjetas.form.acceptedCards")}
                </div>
                <p className="text-[11.5px] text-ink-soft">
                  {t("tarjetas.form.acceptedCardsDetail")}
                </p>
              </div>

              <label className={`${fieldLabel} sm:col-span-2`}>
                {t("tarjetas.form.holderName")}
                <input
                  autoComplete="cc-name"
                  className={input}
                  placeholder={t("tarjetas.form.holderPlaceholder")}
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
                  {t("tarjetas.form.cardNumber")}
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
                {t("tarjetas.form.expiry")}
                <input
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  maxLength={5}
                  className={input}
                  placeholder={t("tarjetaVisual.expiresPlaceholder")}
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
                {t("tarjetas.form.securityCode")}
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

              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-mute sm:col-span-2">
                <ShieldCheck size={14} className="mt-px shrink-0" />
                {t("tarjetas.form.clientSideNotice")}
              </div>

              {dialogError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-[14px] bg-danger-wash px-4 py-2.5 text-[12px] font-medium text-danger sm:col-span-2"
                >
                  <AlertTriangle size={14} className="shrink-0" />
                  {dialogError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                <button type="button" className={btnSecondary} onClick={cerrarFormulario}>
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={saving}
                  onClick={() => void saveCard()}
                >
                  {saving && <Loader size={14} className="animate-spin" />}
                  {t("tarjetas.form.save")}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Eliminar tarjeta ── */}
      {porEliminar && (
        <Confirmar
          titulo={t("tarjetas.delete.title")}
          cuerpo={t("tarjetas.delete.body", { marca: porEliminar.marca, ultimos4: porEliminar.ultimos4 })}
          confirmar={t("tarjetas.delete.confirm")}
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
