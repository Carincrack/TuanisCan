import { useState } from "react";
import { ArrowRight, Loader, RefreshCw } from "../lib/iconos";
import { useTipoCambio } from "../hooks/useTipoCambio";
import { useTranslation } from "../hooks/useTranslation";
import { Section, colones, fieldLabel, input } from "./ui";

/* ─────────────────────────────────────────────────────────────
   EL TIPO DE CAMBIO DEL DÍA

   La consulta al Ministerio de Hacienda (`tipo-cambio.service.ts`) a
   la vista: compra y venta del día, de dónde salen y de qué fecha son,
   y un conversor para hacer la cuenta sin salir de la pantalla.

   El conversor usa el tipo de COMPRA: es el mismo con el que la app le
   cobra a un dueño que paga en dólares. Así, lo que se calcula acá es
   exactamente lo que se le reservaría.

   Los dos campos están atados: se escribe en uno y el otro se calcula.
   Se guarda solo el que se escribió; el otro sale de él cada vez, y
   nunca hay dos números que no cuadren.
   ───────────────────────────────────────────────────────────── */

/** «10 000», «22,31» o «22.31» → número. Espacios (también el duro,
    que `\s` incluye) y comas de miles fuera; la coma o el punto final
    es el decimal. */
const leerMonto = (texto: string) => {
  const limpio = texto.replace(/[\s₡$]/g, "").replace(",", ".");
  const numero = Number(limpio);
  return limpio !== "" && Number.isFinite(numero) && numero >= 0 ? numero : null;
};

const escribir = (numero: number, decimales: number, localeTag: string) =>
  numero.toLocaleString(localeTag, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export const TipoCambioDia = () => {
  const { t, localeTag } = useTranslation();
  const { tipo, cargando, fallo, reintentar } = useTipoCambio();
  const [escrito, setEscrito] = useState<{ lado: "crc" | "usd"; texto: string }>({ lado: "crc", texto: "10 000" });

  const monto = leerMonto(escrito.texto);
  const otro =
    tipo && monto !== null
      ? escrito.lado === "crc"
        ? escribir(Math.round((monto / tipo.compra) * 100) / 100, 2, localeTag)
        : escribir(Math.round(monto * tipo.compra), 0, localeTag)
      : "";
  const textoColones = escrito.lado === "crc" ? escrito.texto : otro;
  const textoDolares = escrito.lado === "usd" ? escrito.texto : otro;

  const fecha = tipo
    ? new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long" }).format(new Date(`${tipo.fecha}T12:00:00`))
    : "";

  return (
    <Section
      title={t("tipoCambio.title")}
      aside={
        <button
          type="button"
          onClick={() => void reintentar()}
          disabled={cargando}
          className="-my-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[12px] font-semibold text-accent-dark transition-colors duration-150 hover:bg-accent-wash disabled:opacity-50"
        >
          {cargando ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {t("tipoCambio.refresh")}
        </button>
      }
      bodyClass="px-6 pt-3 pb-5"
    >
      {tipo ? (
        <div className="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-10">
          <div>
            <dl className="flex gap-8">
              <div>
                <dt className="rotulo text-ink-mute">{t("tipoCambio.buy")}</dt>
                <dd className="nums mt-1 text-[24px] leading-none font-semibold tracking-[-0.02em] text-ink">{colones(tipo.compra)}</dd>
              </div>
              <div>
                <dt className="rotulo text-ink-mute">{t("tipoCambio.sell")}</dt>
                <dd className="nums mt-1 text-[24px] leading-none font-semibold tracking-[-0.02em] text-ink-soft">{colones(tipo.venta)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] text-ink-mute">
              {t("tipoCambio.source", { fuente: t(`pagos.rates.sources.${tipo.fuente}`), fecha })}
            </p>
          </div>

          {/* El conversor. En el teléfono los dos campos van uno al lado
              del otro igual: son cortos, y verlos juntos es la cuenta. */}
          <div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <label className={fieldLabel}>
                {t("tipoCambio.colones")}
                <input
                  className={`${input} nums`}
                  inputMode="decimal"
                  value={textoColones}
                  onChange={(e) => setEscrito({ lado: "crc", texto: e.target.value })}
                  aria-describedby="nota-conversor"
                />
              </label>
              <ArrowRight size={16} className="mb-3 text-ink-mute" aria-hidden />
              <label className={fieldLabel}>
                {t("tipoCambio.dollars")}
                <input
                  className={`${input} nums`}
                  inputMode="decimal"
                  value={textoDolares}
                  onChange={(e) => setEscrito({ lado: "usd", texto: e.target.value })}
                  aria-describedby="nota-conversor"
                />
              </label>
            </div>
            <p id="nota-conversor" className="mt-2 text-[12px] text-ink-mute">
              {t("tipoCambio.note")}
            </p>
          </div>
        </div>
      ) : cargando ? (
        <div className="flex items-center gap-2 py-2 text-[13px] text-ink-soft">
          <Loader size={14} className="animate-spin" /> {t("tipoCambio.loading")}
        </div>
      ) : fallo ? (
        <p className="py-2 text-[13px] text-warn">{t("tipoCambio.failed")}</p>
      ) : null}
    </Section>
  );
};
