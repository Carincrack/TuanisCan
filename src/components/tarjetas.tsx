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
  Badge,
  Confirmar,
  Dialog,
  EmptyState,
  NotificationButtonContext,
  Page,
  PageHeader,
  Section,
  btnPrimary,
  btnQuiet,
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

/** En qué punto de su vida está la tarjeta. Vence el ÚLTIMO día del
    mes impreso —una 12/28 sirve todo diciembre—, y se avisa desde dos
    meses antes, que es lo que tarda un banco en mandar el reemplazo. */
const estadoVencimiento = (metodo: PaymentMethod): "vigente" | "pronto" | "vencida" => {
  const fin = new Date(metodo.exp_ano, metodo.exp_mes, 0, 23, 59, 59);
  const hoy = new Date();
  if (fin < hoy) return "vencida";
  const enDosMeses = new Date(hoy.getFullYear(), hoy.getMonth() + 2, hoy.getDate());
  return fin <= enDosMeses ? "pronto" : "vigente";
};

const Tarjetas = () => {
  const { t, localeTag } = useTranslation();
  const mesVence = (metodo: PaymentMethod) =>
    new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" })
      .format(new Date(metodo.exp_ano, metodo.exp_mes - 1, 1))
      .replace(" de ", " ");
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
          <>
            {/* Cada tarjeta lleva DEBAJO su ficha: qué tarjeta es en
                palabras, cuándo vence y el botón para quitarla. El botón
                de borrar vivía ENCIMA de la tarjeta, en la esquina de
                arriba, y caía justo sobre el logo de la marca —con una
                sola tarjeta, además, se veía a medias porque no se
                puede borrar la última—. */}
            <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
              {metodos.map((method) => {
                const vence = estadoVencimiento(method);
                const unica = metodos.length <= 1;
                return (
                  <article key={method.id_metodo_pago} className="mx-auto flex w-full max-w-[360px] flex-col gap-3.5">
                    <TarjetaVisual
                      marca={method.marca}
                      numero={`•••• •••• •••• ${method.ultimos4}`}
                      titular={method.titular}
                      vencimiento={`${String(method.exp_mes).padStart(2, "0")}/${String(method.exp_ano).slice(-2)}`}
                    />
                    <div className="flex items-start justify-between gap-3 px-1">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink">
                          {t("tarjetas.card.endingIn", { marca: method.marca, ultimos4: method.ultimos4 })}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-soft">
                          {t("tarjetas.card.expiresOn", { fecha: mesVence(method) })}
                          {/* "Principal" vivía impreso en la cara de la tarjeta;
                              ninguna tarjeta real lo lleva. Es un dato de la app,
                              y va en la ficha de la app. */}
                          {method.es_principal && <Badge tono="accent">{t("tarjetas.card.primary")}</Badge>}
                          {vence !== "vigente" && (
                            <Badge tono={vence === "vencida" ? "danger" : "warn"}>
                              {vence === "vencida" ? t("tarjetas.card.expired") : t("tarjetas.card.expiresSoon")}
                            </Badge>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPorEliminar(method)}
                        disabled={unica}
                        title={unica ? t("tarjetas.keepAtLeastOne") : t("tarjetas.deleteCard")}
                        aria-label={`${t("tarjetas.deleteCard")}: ${t("tarjetas.card.endingIn", { marca: method.marca, ultimos4: method.ultimos4 })}`}
                        className={`${btnQuiet} shrink-0 px-3 py-1.5 text-[12.5px] hover:bg-danger-wash hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
                      >
                        <Trash2 size={14} />
                        {t("tarjetas.card.delete")}
                      </button>
                    </div>
                  </article>
                );
              })}

              {/* Agregar otra, en el lugar donde iría. */}
              <button
                type="button"
                onClick={abrirFormulario}
                className="mx-auto flex aspect-[1.586/1] w-full max-w-[360px] flex-col items-center justify-center gap-2.5 rounded-[20px] bg-sunken/70 text-ink-soft outline-2 -outline-offset-[10px] outline-ink-mute/25 outline-dashed transition-[background-color,color,transform] duration-150 ease-out hover:bg-sunken hover:text-ink active:scale-[0.98]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-rail">
                  <Plus size={18} strokeWidth={2} />
                </span>
                <span className="text-[13px] font-semibold">{t("tarjetas.addTile")}</span>
              </button>
            </div>

            {/* Lo que se preguntaba: el código de seguridad no se ve
                porque no existe en ningún lado. Dicho, no supuesto. */}
            <div className="mt-6 flex items-start gap-2 border-t border-sunken pt-4 text-[12px] leading-relaxed text-ink-soft">
              <ShieldCheck size={15} className="mt-px shrink-0 text-ok" aria-hidden />
              {t("tarjetas.securityNote")}
            </div>
          </>
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
