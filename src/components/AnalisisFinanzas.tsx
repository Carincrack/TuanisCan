import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, User } from "../lib/iconos";
import { useTranslation } from "../hooks/useTranslation";
import { cubetasDe, dentroDe, limitesDe, moverPeriodo, type Escala, type Limites, type Periodo, type TipoPeriodo } from "../lib/periodos";
import type { AdminFinanceMovement } from "../services/payments.service";
import { Combo } from "./Combo";
import { FilterTabs, btnQuiet, colones, input, surface } from "./ui";

/* ─────────────────────────────────────────────────────────────
   EL ANÁLISIS DE FINANZAS

   Tres piezas para el admin, debajo de su encabezado:

   · LOS FILTROS: una sola fila arriba de todo —periodo, zona,
     paseador— y lo de abajo (cifras, gráficos, tabla) responde a los
     tres a la vez, así los números siempre coinciden.
   · EL COBRADO EN EL TIEMPO: columnas por hora, día, semana o mes según
     el largo del periodo. Una sola serie, así que no lleva leyenda: el
     título dice qué es. Pasar el puntero o el foco por una columna da
     su detalle, y «Ver tabla» da todo sin tener que pasar por encima.
   · EL COBRADO POR ZONA: barras horizontales, de mayor a menor, con el
     monto escrito al lado (nunca solo la barra).

   Todo en colones: es el precio del paseo, que es lo que suma igual
   pague el dueño en colones o en dólares. Lo cobrado en dólares, como
   dólares, está en la cifra «Cobrado por moneda».

   El turquesa oscuro (`accent-dark`) y no el turquesa de la marca: el
   de la marca no llega a 3:1 contra el blanco y una barra tiene que
   verse aunque se mire de reojo.
   ───────────────────────────────────────────────────────────── */

type Movimiento = AdminFinanceMovement;

/* ── Los filtros ─────────────────────────────────────────────── */

export const FiltrosFinanzas = ({
  periodo,
  onPeriodo,
  zona,
  zonas,
  onZona,
  paseador,
  paseadores,
  onPaseador,
}: {
  periodo: Periodo;
  onPeriodo: (periodo: Periodo) => void;
  zona: string;
  zonas: string[];
  onZona: (zona: string) => void;
  paseador: string;
  paseadores: string[];
  onPaseador: (paseador: string) => void;
}) => {
  const { t, localeTag } = useTranslation();
  const limites = limitesDe(periodo);
  const hayFiltros = periodo.tipo !== "todo" || zona !== "" || paseador !== "";

  const tipos: TipoPeriodo[] = ["todo", "dia", "semana", "mes", "rango"];
  const elegirTipo = (tipo: string) => onPeriodo({ ...periodo, tipo: tipo as TipoPeriodo });

  const dia = (valor: string, opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(localeTag, { timeZone: "UTC", ...opciones }).format(new Date(`${valor}T00:00:00Z`));
  const rotulo = (() => {
    if (!limites) return "";
    if (periodo.tipo === "dia") return dia(limites.desde, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    if (periodo.tipo === "mes") return dia(limites.desde, { month: "long", year: "numeric" });
    return `${dia(limites.desde, { day: "numeric", month: "short" })} – ${dia(limites.hasta, { day: "numeric", month: "short", year: "numeric" })}`;
  })();

  const flecha = "grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-[background-color,transform] duration-150 hover:bg-sunken active:scale-[0.94]";

  return (
    <section aria-label={t("admin.finances.filters.aria")} className={`${surface} flex flex-col gap-3 px-3 py-3 xl:flex-row xl:flex-wrap xl:items-center`}>
      <div className="-mx-3 overflow-x-auto px-3 xl:mx-0 xl:overflow-visible xl:px-0">
        <FilterTabs
          label={t("admin.finances.filters.period")}
          options={tipos.map((tipo) => ({ value: tipo, label: t(`admin.finances.filters.types.${tipo}`) }))}
          value={periodo.tipo}
          onChange={elegirTipo}
          desplazable
        />
      </div>

      {/* El periodo elegido: con flechas para día, semana y mes; con dos
          fechas para el rango. */}
      {(periodo.tipo === "dia" || periodo.tipo === "semana" || periodo.tipo === "mes") && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPeriodo(moverPeriodo(periodo, -1))} aria-label={t("admin.finances.filters.previous")} className={flecha}>
            <ChevronLeft size={18} />
          </button>
          <span className="nums min-w-[11rem] text-center text-[13px] font-semibold text-ink first-letter:uppercase" aria-live="polite">
            {rotulo}
          </span>
          <button type="button" onClick={() => onPeriodo(moverPeriodo(periodo, 1))} aria-label={t("admin.finances.filters.next")} className={flecha}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      {periodo.tipo === "rango" && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-ink-mute sm:flex-row sm:items-center sm:gap-2">
            {t("admin.finances.filters.from")}
            <input type="date" value={periodo.desde} max={periodo.hasta} onChange={(e) => e.target.value && onPeriodo({ ...periodo, desde: e.target.value })} className={`${input} nums py-2 sm:w-auto`} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-ink-mute sm:flex-row sm:items-center sm:gap-2">
            {t("admin.finances.filters.to")}
            <input type="date" value={periodo.hasta} min={periodo.desde} onChange={(e) => e.target.value && onPeriodo({ ...periodo, hasta: e.target.value })} className={`${input} nums py-2 sm:w-auto`} />
          </label>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:ml-auto xl:flex xl:items-center">
        <Combo
          value={zona}
          onChange={onZona}
          vacio
          placeholder={t("admin.finances.filters.allZones")}
          aria-label={t("admin.finances.filters.zone")}
          Icon={MapPin}
          options={zonas.map((z) => ({ value: z, label: z }))}
          className="xl:min-w-[180px]"
        />
        <Combo
          value={paseador}
          onChange={onPaseador}
          vacio
          placeholder={t("admin.finances.filters.allWalkers")}
          aria-label={t("admin.finances.filters.walker")}
          Icon={User}
          options={paseadores.map((p) => ({ value: p, label: p }))}
          className="xl:min-w-[200px]"
        />
        {hayFiltros && (
          <button
            type="button"
            className={`${btnQuiet} sm:col-span-2 xl:col-span-1`}
            onClick={() => {
              onPeriodo({ ...periodo, tipo: "todo" });
              onZona("");
              onPaseador("");
            }}
          >
            {t("admin.finances.filters.clear")}
          </button>
        )}
      </div>
    </section>
  );
};

/* ── El cobrado en el tiempo ─────────────────────────────────── */

/* Un tope «redondo» para el eje: 1, 2 o 5 por una potencia de diez,
   justo por encima del máximo. Así las rayas caen en números limpios. */
const topeRedondo = (maximo: number) => {
  if (maximo <= 0) return 1000;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const paso of [1, 2, 2.5, 5, 10]) if (paso * potencia >= maximo) return paso * potencia;
  return 10 * potencia;
};

/* ₡12 500 → «₡12,5 mil»; ₡1 250 000 → «₡1,25 M». Solo para el eje. */
const compacto = (valor: number, localeTag: string) =>
  `₡${new Intl.NumberFormat(localeTag, { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`;

export const CobradoEnElTiempo = ({ movimientos, limites }: { movimientos: Movimiento[]; limites: Limites | null }) => {
  const { t, localeTag } = useTranslation();
  const [verTabla, setVerTabla] = useState(false);
  const [activa, setActiva] = useState<number | null>(null);

  const pagados = useMemo(() => movimientos.filter((m) => m.estado_pago === "pagado"), [movimientos]);

  const serie = useMemo(() => {
    // Sin periodo («Todo»): de la primera a la última fecha con cobros.
    const fechas = pagados.map((m) => m.fecha).sort();
    const alcance = limites ?? (fechas.length ? { desde: fechas[0], hasta: fechas[fechas.length - 1] } : null);
    if (!alcance) return null;
    const { escala, cubetas } = cubetasDe(alcance, pagados.map((m) => m.hora_inicio?.slice(0, 2) ?? ""));
    const barras = cubetas.map((cubeta) => {
      const caen = pagados.filter((m) =>
        escala === "hora" ? m.hora_inicio?.slice(0, 2) === cubeta.clave : dentroDe(m.fecha, cubeta),
      );
      return {
        cubeta,
        cobrado: caen.reduce((suma, m) => suma + m.bruto, 0),
        comision: caen.reduce((suma, m) => suma + m.comision, 0),
        cuantos: caen.length,
      };
    });
    return { escala, barras };
  }, [pagados, limites]);

  const total = pagados.reduce((suma, m) => suma + m.bruto, 0);

  const fecha = (valor: string, opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(localeTag, { timeZone: "UTC", ...opciones }).format(new Date(`${valor}T00:00:00Z`));
  const nombreDe = (escala: Escala, clave: string, largo: boolean) => {
    if (escala === "hora") return `${clave}:00`;
    if (escala === "mes") return fecha(`${clave}-01`, { month: largo ? "long" : "short", ...(largo ? { year: "numeric" } : {}) });
    if (escala === "semana") return largo ? t("admin.finances.analysis.weekOf", { dia: fecha(clave, { day: "numeric", month: "short" }) }) : fecha(clave, { day: "numeric", month: "short" });
    return fecha(clave, largo ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric" });
  };

  const tope = topeRedondo(Math.max(0, ...(serie?.barras.map((b) => b.cobrado) ?? [0])));
  const rayas = [0, 0.5, 1].map((parte) => parte * tope);
  // Rótulos de abajo: unos pocos, repartidos, para que no se pisen.
  const cada = serie ? Math.max(1, Math.ceil(serie.barras.length / 8)) : 1;

  return (
    <section className={`${surface} flex min-w-0 flex-col px-5 py-5 sm:px-6`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="rotulo text-ink-mute">{t("admin.finances.analysis.overTime")}</h3>
          <p className="mt-1.5 text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink">{colones(total)}</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            {t(pagados.length === 1 ? "admin.finances.analysis.chargesOne" : "admin.finances.analysis.charges", { n: pagados.length })}
          </p>
        </div>
        {serie && pagados.length > 0 && (
          <button type="button" onClick={() => setVerTabla((v) => !v)} className={`${btnQuiet} -mr-2 px-3 py-1.5 text-[12.5px]`} aria-pressed={verTabla}>
            {t(verTabla ? "admin.finances.analysis.showChart" : "admin.finances.analysis.showTable")}
          </button>
        )}
      </div>

      {!serie || pagados.length === 0 ? (
        <p className="mt-6 grid min-h-[160px] place-items-center rounded-[14px] bg-sunken px-4 text-center text-[13px] text-ink-soft">
          {t("admin.finances.analysis.empty")}
        </p>
      ) : verTabla ? (
        <div className="mt-4 max-h-[260px] overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-ink-mute">
                <th className="py-1.5 font-semibold">{t("admin.finances.analysis.when")}</th>
                <th className="py-1.5 text-right font-semibold">{t("admin.finances.analysis.count")}</th>
                <th className="py-1.5 text-right font-semibold">{t("admin.finances.analysis.charged")}</th>
                <th className="py-1.5 text-right font-semibold">{t("admin.finances.analysis.commission")}</th>
              </tr>
            </thead>
            <tbody className="nums">
              {serie.barras.filter((b) => b.cuantos > 0).map((b) => (
                <tr key={b.cubeta.clave} className="border-t border-sunken">
                  <td className="py-1.5 text-ink first-letter:uppercase">{nombreDe(serie.escala, b.cubeta.clave, true)}</td>
                  <td className="py-1.5 text-right text-ink-soft">{b.cuantos}</td>
                  <td className="py-1.5 text-right font-semibold text-ink">{colones(b.cobrado)}</td>
                  <td className="py-1.5 text-right text-ink-soft">{colones(b.comision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 flex gap-2">
          {/* El eje: tres rayas en números limpios. */}
          <div className="nums relative w-12 shrink-0 text-right text-[10.5px] text-ink-mute" aria-hidden>
            {rayas.map((valor) => (
              <span key={valor} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - valor / tope) * 160}px` }}>
                {compacto(valor, localeTag)}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            {rayas.map((valor) => (
              <span key={valor} aria-hidden className="absolute inset-x-0 h-px bg-sunken" style={{ top: `${(1 - valor / tope) * 160}px` }} />
            ))}
            <ol className="relative flex h-[160px] items-end gap-[2px]" onMouseLeave={() => setActiva(null)}>
              {serie.barras.map((b, i) => {
                const etiqueta = `${nombreDe(serie.escala, b.cubeta.clave, true)}: ${colones(b.cobrado)}`;
                return (
                  /* La columna entera es el blanco del puntero, no solo la
                     barra: una barra baja sería imposible de alcanzar. */
                  <li
                    key={b.cubeta.clave}
                    tabIndex={0}
                    aria-label={etiqueta}
                    onMouseEnter={() => setActiva(i)}
                    onFocus={() => setActiva(i)}
                    onBlur={() => setActiva(null)}
                    className="group relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center rounded-[4px] outline-none focus-visible:bg-accent-wash/60"
                  >
                    <span
                      aria-hidden
                      className={`block w-full max-w-[24px] rounded-t-[4px] transition-[background-color] duration-150 ${
                        activa === i ? "bg-accent-deep" : "bg-accent-dark"
                      }`}
                      style={{ height: b.cobrado > 0 ? `${Math.max(2, (b.cobrado / tope) * 100)}%` : 0 }}
                    />
                    {activa === i && (
                      <span
                        role="tooltip"
                        /* Justo encima de la barra, no arriba de todo: se lee junto a lo que describe. */
                        style={{ bottom: `calc(${(b.cobrado / tope) * 100}% + 8px)` }}
                        className={`pointer-events-none absolute z-10 w-max max-w-[220px] rounded-[12px] bg-rail px-3 py-2 text-left text-[12px] text-white shadow-lg ${
                          i < serie.barras.length / 3 ? "left-0" : i > (serie.barras.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2"
                        }`}
                      >
                        <span className="nums block text-[14px] font-semibold">{colones(b.cobrado)}</span>
                        <span className="block text-rail-text first-letter:uppercase">{nombreDe(serie.escala, b.cubeta.clave, true)}</span>
                        <span className="nums mt-1 block text-rail-text">
                          {t(b.cuantos === 1 ? "admin.finances.analysis.chargesOne" : "admin.finances.analysis.charges", { n: b.cuantos })}
                          {" · "}
                          {t("admin.finances.analysis.commissionShort", { monto: colones(b.comision) })}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="nums mt-2 flex gap-[2px] text-[10.5px] text-ink-mute" aria-hidden>
              {serie.barras.map((b, i) => (
                <span key={b.cubeta.clave} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
                  {i % cada === 0 ? nombreDe(serie.escala, b.cubeta.clave, false) : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ── El cobrado por zona ─────────────────────────────────────── */

export const CobradoPorZona = ({ movimientos }: { movimientos: Movimiento[] }) => {
  const { t } = useTranslation();
  const filas = useMemo(() => {
    const porZona = new Map<string, { cobrado: number; cuantos: number }>();
    for (const m of movimientos) {
      if (m.estado_pago !== "pagado") continue;
      const zona = m.zona ?? "";
      const actual = porZona.get(zona) ?? { cobrado: 0, cuantos: 0 };
      porZona.set(zona, { cobrado: actual.cobrado + m.bruto, cuantos: actual.cuantos + 1 });
    }
    const ordenadas = [...porZona.entries()].map(([zona, v]) => ({ zona, ...v })).sort((a, b) => b.cobrado - a.cobrado);
    // Seis a la vista; el resto, juntas en «Otras zonas».
    if (ordenadas.length <= 6) return ordenadas;
    const resto = ordenadas.slice(5);
    return [
      ...ordenadas.slice(0, 5),
      { zona: "__otras", cobrado: resto.reduce((s, f) => s + f.cobrado, 0), cuantos: resto.reduce((s, f) => s + f.cuantos, 0) },
    ];
  }, [movimientos]);

  const total = filas.reduce((s, f) => s + f.cobrado, 0);
  const maximo = Math.max(1, ...filas.map((f) => f.cobrado));
  const nombre = (zona: string) => (zona === "__otras" ? t("admin.finances.analysis.otherZones") : zona || t("admin.finances.detail.noZone"));

  return (
    <section className={`${surface} flex min-w-0 flex-col px-5 py-5 sm:px-6`}>
      <h3 className="rotulo text-ink-mute">{t("admin.finances.analysis.byZone")}</h3>
      {filas.length === 0 ? (
        <p className="mt-4 grid min-h-[160px] place-items-center rounded-[14px] bg-sunken px-4 text-center text-[13px] text-ink-soft">
          {t("admin.finances.analysis.empty")}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {filas.map((fila) => (
            <li key={fila.zona}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-ink">{nombre(fila.zona)}</span>
                <span className="nums shrink-0 font-semibold text-ink">
                  {colones(fila.cobrado)}
                  <span className="ml-1.5 font-normal text-ink-mute">{Math.round((fila.cobrado / total) * 100)} %</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <div className="h-full rounded-full bg-accent-dark" style={{ width: `${(fila.cobrado / maximo) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
