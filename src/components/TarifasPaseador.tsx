import { useEffect, useMemo, useState } from "react";
import type { ElementType, FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, Loader, Save, Timer } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { aviso } from "../lib/aviso";
import {
  RECARGOS_POR_DEFECTO,
  precioSegunCondiciones,
  type RecargosPaseador,
} from "../lib/precios";
import { updateWalkerPricing } from "../services/walkers.service";
import {
  EmptyState,
  Page,
  PageHeader,
  Section,
  btnPrimary,
  colones,
  input,
} from "./ui";

/* ─────────────────────────────────────────────────────────────
   TARIFAS DEL PASEADOR

   Dos columnas: a la izquierda lo que se configura, a la derecha lo
   que cobra con eso, en vivo. El panel de la derecha es navy —el
   mismo riel de la casa— porque es el resultado, no un campo más; y
   se queda quieto al hacer scroll para que cada cambio se vea sin ir
   a buscarlo.

   La pieza propia de esta pantalla es el reloj de 24 horas: el
   horario nocturno se pinta sobre el día entero, y así se entiende
   de un vistazo un rango que cruza la medianoche (19:00 a 06:00),
   que en dos campos de hora sueltos se lee al revés.

   `calcular_precio_paseo` en Supabase usa exactamente estos valores
   y la misma fórmula que `precioSegunCondiciones`.
   ───────────────────────────────────────────────────────────── */

interface Formulario {
  tarifa_base: string;
  recargo_nocturno: string;
  recargo_fin_semana: string;
  recargo_mismo_dia: string;
  nocturno_desde: string;
  nocturno_hasta: string;
}

const DURACIONES = [30, 45, 60, 90] as const;

const aFormulario = (tarifa: number | null, r: RecargosPaseador): Formulario => ({
  tarifa_base: tarifa ? String(tarifa) : "",
  recargo_nocturno: String(r.recargo_nocturno),
  recargo_fin_semana: String(r.recargo_fin_semana),
  recargo_mismo_dia: String(r.recargo_mismo_dia),
  nocturno_desde: r.nocturno_desde,
  nocturno_hasta: r.nocturno_hasta,
});

const aRecargos = (f: Formulario): RecargosPaseador => ({
  recargo_nocturno: Number(f.recargo_nocturno) || 0,
  recargo_fin_semana: Number(f.recargo_fin_semana) || 0,
  recargo_mismo_dia: Number(f.recargo_mismo_dia) || 0,
  nocturno_desde: f.nocturno_desde || RECARGOS_POR_DEFECTO.nocturno_desde,
  nocturno_hasta: f.nocturno_hasta || RECARGOS_POR_DEFECTO.nocturno_hasta,
});

/** Mismas reglas que el `check` de `paseadores`. */
const validar = (f: Formulario) => {
  const tarifa = Number(f.tarifa_base);
  if (!f.tarifa_base.trim() || !Number.isFinite(tarifa) || tarifa <= 0) {
    return "La tarifa base debe ser mayor a cero.";
  }
  const porcentajes = [
    ["nocturno", f.recargo_nocturno],
    ["de fin de semana", f.recargo_fin_semana],
    ["de mismo día", f.recargo_mismo_dia],
  ] as const;
  for (const [nombre, valor] of porcentajes) {
    const n = Number(valor);
    if (!valor.trim() || !Number.isFinite(n) || n < 0 || n > 100) {
      return `El recargo ${nombre} debe estar entre 0 % y 100 %.`;
    }
  }
  if (!f.nocturno_desde || !f.nocturno_hasta) {
    return "Indicá desde y hasta qué hora es tu horario nocturno.";
  }
  if (f.nocturno_desde === f.nocturno_hasta) {
    return "El horario nocturno no puede empezar y terminar a la misma hora.";
  }
  return null;
};

const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Horas que cubre el rango nocturno, cruce la medianoche o no. */
const horasNocturnas = (desde: string, hasta: string) => {
  const d = minutos(desde);
  const a = minutos(hasta);
  const total = d > a ? 1440 - d + a : a - d;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/* ── Piezas ─────────────────────────────────────────────────── */

/** El día entero como una barra. Lo nocturno va en navy —es de
    noche— y el resto en el hundido de siempre. Un rango que cruza la
    medianoche son dos tramos: del inicio al final del día y del
    principio del día hasta el fin. */
const RelojNocturno = ({ desde, hasta }: { desde: string; hasta: string }) => {
  const d = (minutos(desde) / 1440) * 100;
  const a = (minutos(hasta) / 1440) * 100;
  const tramos = d > a ? [[d, 100], [0, a]] : [[d, a]];

  return (
    <figure className="mt-4" aria-label={`Horario nocturno de ${desde} a ${hasta}`}>
      <div className="relative h-7 overflow-hidden rounded-[8px] bg-sunken">
        {/* Marcas de cada tres horas, apenas visibles, para leer la escala. */}
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute top-0 h-full w-px bg-ink/[0.06]"
            style={{ left: `${((i + 1) * 3 / 24) * 100}%` }}
          />
        ))}
        {tramos.map(([inicio, fin], i) => (
          <span
            key={i}
            aria-hidden
            className="absolute top-0 h-full bg-rail transition-[left,width] duration-300 ease-out"
            style={{ left: `${inicio}%`, width: `${Math.max(fin - inicio, 0)}%` }}
          />
        ))}
      </div>
      <div aria-hidden className="nums mt-1.5 flex justify-between text-[10.5px] text-ink-mute">
        {["00", "06", "12", "18", "24"].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </figure>
  );
};

const CampoPorcentaje = ({
  id,
  etiqueta,
  value,
  onChange,
}: {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const n = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={n}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${etiqueta} (deslizador)`}
        className="h-1.5 w-full min-w-[120px] cursor-pointer accent-rail"
      />
      <span className="relative block w-[88px] shrink-0">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${input} nums pr-8 text-right`}
        />
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] font-semibold text-ink-mute">
          %
        </span>
      </span>
    </div>
  );
};

/** Una fila por recargo, no una tarjeta: son tres respuestas a la
    misma pregunta y se leen de corrido. */
const FilaRecargo = ({
  id,
  Icon,
  titulo,
  ayuda,
  value,
  onChange,
  children,
}: {
  id: string;
  Icon: ElementType;
  titulo: string;
  ayuda: string;
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) => (
  <div className="px-6 py-5">
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${Number(value) > 0 ? "bg-accent-wash text-accent-deep" : "bg-sunken text-ink-mute"}`}>
          <Icon size={16} strokeWidth={1.9} aria-hidden />
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="block text-[14px] font-semibold text-ink">
            {titulo}
          </label>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-mute">{ayuda}</p>
        </div>
      </div>
      <CampoPorcentaje id={id} etiqueta={titulo} value={value} onChange={onChange} />
    </div>
    {children}
  </div>
);

/** El resultado. Navy, fijo al hacer scroll, y con la duración y el
    "para hoy" como palancas para ver cualquier caso. */
const PanelPrecio = ({
  form,
  cambios,
  saving,
}: {
  form: Formulario;
  cambios: boolean;
  saving: boolean;
}) => {
  const [duracion, setDuracion] = useState<(typeof DURACIONES)[number]>(45);
  const [hoy, setHoy] = useState(false);
  const tarifa = Number(form.tarifa_base) || 0;
  const r = aRecargos(form);

  const celda = (finDeSemana: boolean, nocturno: boolean) =>
    precioSegunCondiciones(tarifa, r, duracion, { finDeSemana, nocturno, mismoDia: hoy });

  const filas = [
    { rotulo: "Entre semana", finDeSemana: false },
    { rotulo: "Fin de semana", finDeSemana: true },
  ];

  return (
    <aside className="rounded-[18px] bg-rail p-5 text-white lg:sticky lg:top-4 sm:p-6" aria-label="Lo que cobrás con esta configuración">
      <p className="text-[13px] text-rail-text">Lo que cobrás por un paseo de</p>

      <div role="group" aria-label="Duración del paseo" className="mt-2.5 grid grid-cols-4 gap-1 rounded-full bg-white/10 p-1">
        {DURACIONES.map((min) => (
          <button
            key={min}
            type="button"
            aria-pressed={duracion === min}
            onClick={() => setDuracion(min)}
            className={`nums rounded-full py-1.5 text-[12.5px] font-semibold transition-colors duration-150 ${
              duracion === min ? "bg-white text-rail" : "text-rail-text hover:text-white"
            }`}
          >
            {min} min
          </button>
        ))}
      </div>

      <table className="nums mt-5 w-full border-separate border-spacing-1.5 text-left">
        <caption className="sr-only">Precio según el día y la hora</caption>
        <thead>
          <tr>
            <td />
            <th scope="col" className="px-1 text-[11.5px] font-medium text-rail-mute">De día</th>
            <th scope="col" className="px-1 text-[11.5px] font-medium text-rail-mute">
              De noche
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.rotulo}>
              <th scope="row" className="w-[74px] pr-1 align-middle text-[12px] leading-tight font-medium text-rail-text">
                {fila.rotulo}
              </th>
              {[false, true].map((nocturno) => {
                const precio = celda(fila.finDeSemana, nocturno);
                const suma = precio.aplicados.reduce((t, a) => t + a.porcentaje, 0);
                return (
                  <td key={String(nocturno)} className="rounded-[12px] bg-white/[0.08] px-3 py-3 align-top">
                    <span className="block text-[19px] leading-none font-semibold tracking-[-0.01em]">
                      {colones(precio.total)}
                    </span>
                    <span className={`mt-1.5 block text-[11px] ${suma > 0 ? "text-accent" : "text-rail-mute"}`}>
                      {suma > 0 ? `+${suma} %` : "Tarifa base"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        role="switch"
        aria-checked={hoy}
        onClick={() => setHoy(!hoy)}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-[12px] bg-white/[0.06] px-3.5 py-2.5 text-left transition-colors hover:bg-white/10"
      >
        <span className="text-[12.5px] text-rail-text">
          Si lo piden para el mismo día
          <span className="nums ml-1 text-white">+{r.recargo_mismo_dia} %</span>
        </span>
        <span
          aria-hidden
          className={`relative inline-flex h-[20px] w-[34px] shrink-0 items-center rounded-full p-[3px] transition-colors ${hoy ? "bg-accent" : "bg-white/20"}`}
        >
          <span className={`h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${hoy ? "translate-x-3.5" : ""}`} />
        </span>
      </button>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p aria-live="polite" className="mb-3 text-[12px] text-rail-text">
          {cambios ? "Tenés cambios sin guardar." : "Esto es lo que ven los dueños hoy."}
        </p>
        <button
          type="submit"
          form="form-tarifas"
          disabled={saving || !cambios}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-rail transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-rail-text"
        >
          {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Guardando…" : "Guardar tarifas"}
        </button>
      </div>
    </aside>
  );
};

/* ── La pantalla ────────────────────────────────────────────── */

const TarifasPaseador = () => {
  const { user, getProfile } = useAuth();
  const [form, setForm] = useState<Formulario | null>(null);
  const [guardado, setGuardado] = useState<Formulario | null>(null);
  const [sinPerfil, setSinPerfil] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((perfil) => {
        if (!perfil?.paseador) {
          setSinPerfil(true);
          return;
        }
        const inicial = aFormulario(perfil.paseador.tarifa_base, perfil.paseador);
        setForm(inicial);
        setGuardado(inicial);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar tu tarifa."))
      .finally(() => setLoading(false));
  }, [getProfile]);

  const set = (campo: keyof Formulario) => (value: string) =>
    setForm((actual) => (actual ? { ...actual, [campo]: value } : actual));

  const cambios = Boolean(form && guardado && JSON.stringify(form) !== JSON.stringify(guardado));

  const duraciones = useMemo(() => {
    const tarifa = Number(form?.tarifa_base) || 0;
    return DURACIONES.filter((m) => m !== 45).map((m) => ({ min: m, precio: Math.round(tarifa * (m / 45)) }));
  }, [form?.tarifa_base]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !user) return;
    const problema = validar(form);
    if (problema) {
      setError(problema);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWalkerPricing(user.id, {
        tarifa_base: Number(form.tarifa_base),
        ...aRecargos(form),
      });
      setGuardado(form);
      aviso.ok("Tarifas guardadas", {
        detalle: "Las próximas solicitudes se calculan con estos valores.",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar las tarifas.");
      aviso.error(cause, { respaldo: "No se pudieron guardar las tarifas." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page wide>
      <PageHeader
        title="Tarifas"
        subtitle="Cuánto cobrás por paseo y cuánto de más según el horario y el día."
        action={
          form ? (
            <button
              type="submit"
              form="form-tarifas"
              disabled={saving || !cambios}
              className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Save size={15} />
              {saving ? "Guardando…" : "Guardar"}
            </button>
          ) : undefined
        }
      />

      {error && (
        <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      {loading && (
        <Section>
          <p role="status" className="flex items-center gap-2 px-6 py-8 text-[13px] text-ink-mute">
            <Loader size={15} className="animate-spin" /> Cargando tus tarifas…
          </p>
        </Section>
      )}

      {!loading && sinPerfil && (
        <Section>
          <EmptyState
            title="Todavía no tenés perfil de paseador"
            hint="Solicitalo desde Mi perfil; cuando lo tengas, acá definís tus tarifas."
            action={<Link to="/perfil" className={btnPrimary}>Ir a Mi perfil</Link>}
          />
        </Section>
      )}

      {form && (
        <form
          id="form-tarifas"
          onSubmit={submit}
          className="grid items-start gap-2.5 lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          <div className="flex min-w-0 flex-col gap-2.5">
            {/* ── La tarifa ── */}
            <Section title="Tarifa base" bodyClass="px-6 pt-3 pb-6">
              <label htmlFor="tarifa-base" className="block text-[13px] text-ink-soft">
                Lo que cobrás por un paseo de 45 minutos, sin recargos.
              </label>
              <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
                <span className="relative block w-full max-w-[240px]">
                  <span aria-hidden className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-[22px] font-semibold text-ink-mute">
                    ₡
                  </span>
                  <input
                    id="tarifa-base"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={form.tarifa_base}
                    onChange={(e) => set("tarifa_base")(e.target.value)}
                    className={`${input} nums py-3.5 pl-11 text-[26px] font-semibold tracking-[-0.01em]`}
                  />
                </span>
                <dl className="nums flex gap-6">
                  {duraciones.map((d) => (
                    <div key={d.min}>
                      <dt className="text-[11.5px] text-ink-mute">{d.min} min</dt>
                      <dd className="mt-0.5 text-[15px] font-semibold text-ink">{colones(d.precio)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Section>

            {/* ── Los recargos ── */}
            <Section title="Recargos" bodyClass="pt-1">
              <p className="px-6 text-[13px] leading-snug text-ink-soft">
                Se suman a tu tarifa cuando el paseo cae en esa condición. En 0 % no se cobra.
              </p>
              <div className="mt-1 divide-y divide-sunken">
                <FilaRecargo
                  id="recargo-nocturno"
                  Icon={Clock}
                  titulo="Horario nocturno"
                  ayuda="Paseos que empiezan dentro de tu horario nocturno."
                  value={form.recargo_nocturno}
                  onChange={set("recargo_nocturno")}
                >
                  <div className="mt-4 rounded-[14px] bg-sunken/50 p-4 sm:ml-12">
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="block">
                        <span className="mb-1 block text-[11.5px] text-ink-mute">Desde</span>
                        <input
                          type="time"
                          value={form.nocturno_desde}
                          onChange={(e) => set("nocturno_desde")(e.target.value)}
                          className={`${input} nums w-[130px] bg-surface`}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11.5px] text-ink-mute">Hasta</span>
                        <input
                          type="time"
                          value={form.nocturno_hasta}
                          onChange={(e) => set("nocturno_hasta")(e.target.value)}
                          className={`${input} nums w-[130px] bg-surface`}
                        />
                      </label>
                      <p className="nums pb-2.5 text-[12.5px] text-ink-soft">
                        {form.nocturno_desde && form.nocturno_hasta && form.nocturno_desde !== form.nocturno_hasta
                          ? `${horasNocturnas(form.nocturno_desde, form.nocturno_hasta)} con recargo`
                          : "Elegí un rango"}
                      </p>
                    </div>
                    <RelojNocturno
                      desde={form.nocturno_desde || RECARGOS_POR_DEFECTO.nocturno_desde}
                      hasta={form.nocturno_hasta || RECARGOS_POR_DEFECTO.nocturno_hasta}
                    />
                  </div>
                </FilaRecargo>

                <FilaRecargo
                  id="recargo-fin-semana"
                  Icon={CalendarDays}
                  titulo="Fin de semana"
                  ayuda="Sábados y domingos, a cualquier hora."
                  value={form.recargo_fin_semana}
                  onChange={set("recargo_fin_semana")}
                />

                <FilaRecargo
                  id="recargo-mismo-dia"
                  Icon={Timer}
                  titulo="Mismo día"
                  ayuda="Cuando te piden el paseo para hoy."
                  value={form.recargo_mismo_dia}
                  onChange={set("recargo_mismo_dia")}
                />
              </div>
            </Section>
          </div>

          <PanelPrecio form={form} cambios={cambios} saving={saving} />
        </form>
      )}
    </Page>
  );
};

export default TarifasPaseador;
