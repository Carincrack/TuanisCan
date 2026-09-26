/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader, X } from "../lib/iconos";

/* ─────────────────────────────────────────────────────────────
   Piezas compartidas del sistema.

   Todo esto era plano y cuadrado: ni un radio, ni una sombra, ni un
   degradado, y la jerarquía la daban el fondo y el espaciado. La
   portada era lo contrario —píldoras, Archivo, discos de turquesa,
   sombras largas— y con el mismo logo parecían dos productos.

   Acá se cruzan. Las reglas del mundo nuevo:

     · Ningún control tiene esquina viva. Los botones son píldoras,
       igual que en `BotonAccion` de la portada. Las tarjetas llevan
       18 px de radio: redondas, pero no píldoras — a un bloque de
       contenido las esquinas muy blandas le quitan borde donde
       apoyar el ojo.
     · Los campos de formulario NO son píldoras. Un botón es una
       palabra corta centrada y la píldora lo abraza; un campo es una
       línea de texto que empieza a la izquierda, y con los extremos
       redondos el texto queda flotando lejos del borde. 14 px.
     · La acción fuerte es navy con texto blanco: 10.7:1. No es
       turquesa. El turquesa con blanco encima da 3.0:1 y con navy
       3.6:1, y ninguno pasa AA a 13 px; queda para discos, puntos y
       filetes, que es donde vive en la portada.
     · `active:scale(0.97)` en todo lo pulsable. Sin ese acuse de
       recibo la interfaz se siente muerta, y es lo primero que se
       nota al venir de la portada.

   Las clases `rotulo` y `titular` toman la letra Archivo y solo
   existen dentro de `.suave` (ver `index.css`).
   ───────────────────────────────────────────────────────────── */

/** Bloque de contenido. Blanco sobre el canvas del lienzo. */
export const surface = "bg-surface rounded-[18px]";

/* ── Botones ─────────────────────────────────────────────────── */

const pulsable =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,color,transform,filter] duration-150 ease-out active:scale-[0.97]";

export const btnPrimary = `${pulsable} bg-rail px-5 py-2.5 text-[13px] text-white hover:brightness-125`;

export const btnSecondary = `${pulsable} bg-sunken px-5 py-2.5 text-[13px] font-medium text-ink hover:brightness-[0.97]`;

/** Secundario compacto. Para las acciones que ACOMPAÑAN a una
    principal dentro de una tarjeta: a tamaño completo pesan lo mismo
    que ella, compiten por la mirada y estiran el pie de la tarjeta
    diez píxeles por fila. */
export const btnSecondaryCompacto = `${pulsable} bg-sunken px-3 py-2 text-[12px] font-medium text-ink hover:brightness-[0.97]`;

export const btnQuiet = `${pulsable} px-4 py-2 text-[13px] font-medium text-ink-soft hover:bg-sunken hover:text-ink`;

export const btnDanger = `${pulsable} bg-danger-wash px-5 py-2.5 text-[13px] text-danger hover:brightness-[0.97]`;

/** Peligro compacto: la pareja de `btnSecondaryCompacto` en una fila. */
export const btnDangerCompacto = `${pulsable} bg-danger-wash px-3 py-2 text-[12px] text-danger hover:brightness-[0.97]`;

/* ── Campos ──────────────────────────────────────────────────── */

export const input =
  "w-full rounded-[14px] bg-sunken px-4 py-2.5 text-[13.5px] text-ink transition-colors duration-150 placeholder:text-ink-mute focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-accent";

/** Etiqueta de campo. Envuelve al control:

      <label className={fieldLabel}>Zona <Combo … /></label>

    Toda la pinta la pone `.campo` en `index.css` y no una ristra de
    utilidades, porque hay que hacer dos cosas a la vez que Tailwind no
    puede desde una sola clase: dar versalitas de Archivo a la etiqueta
    y devolverle al control su propia letra. Sin lo segundo, las
    opciones del desplegable salen en mayúsculas. */
export const fieldLabel = "campo";

export const colones = (n: number) => `₡${n.toLocaleString("es-CR")}`;

/* ── Estructura de página ────────────────────────────────────── */

/** `AppShell` centra el contenido en un carril angosto —cómodo para
    formularios y paneles chicos— pero una tabla densa como el
    directorio de usuarios necesita más aire. `<Page wide>` avisa a
    `AppShell`, por contexto, que ceda ese ancho extra solo mientras
    esta página esté montada; el resto del sistema no se entera. */
export const PageWidthContext = createContext<((wide: boolean) => void) | null>(null);

/** El botón de notificaciones vive en `AppShell` —ahí están el estado
    y el panel—, pero una página puede pedir mostrarlo dentro de su
    propio encabezado en vez de la franja superior del layout. Se pasa
    el botón ya armado (no la lógica) para no duplicar nada: quien lo
    consume solo lo coloca donde le convenga. */
export const NotificationButtonContext = createContext<ReactNode>(null);

export const Page = ({
  children,
  wide = false,
}: {
  children: ReactNode;
  /** Pide el carril ancho de `AppShell` para esta página. */
  wide?: boolean;
}) => {
  const setWide = useContext(PageWidthContext);

  useLayoutEffect(() => {
    setWide?.(wide);
    return () => setWide?.(false);
  }, [setWide, wide]);

  return <div className="flex flex-col gap-2.5">{children}</div>;
};

export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <header
    className={`${surface} flex flex-wrap ${subtitle ? "items-end" : "items-center"} justify-between gap-4 px-6 py-5`}
  >
    <div>
      <h2 className="titular text-[21px] text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>}
    </div>
    {action}
  </header>
);

/** Bloque blanco con título opcional. */
export const Section = ({
  title,
  aside,
  children,
  bodyClass = "px-6 py-5",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  bodyClass?: string;
}) => (
  <section className={surface}>
    {(title || aside) && (
      <div className="flex items-center justify-between gap-4 px-6 pt-5">
        {title && <h3 className="rotulo text-ink-mute">{title}</h3>}
        {aside}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

/* ── Controles ───────────────────────────────────────────────── */

/** Filtros mutuamente excluyentes. El estado vive en el padre.

    Van dentro de una pista hundida en vez de pegados unos a otros:
    con píldoras sueltas no se lee que son un solo control con una
    sola respuesta posible. */
export const FilterTabs = ({
  options,
  value,
  onChange,
  label,
  cuentas,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
  /** Cuántos elementos cae en cada opción. Opcional: sin esto las
      pestañas son solo etiquetas. Con esto se ve de un vistazo si
      vale la pena entrar a una —una pestaña en cero no se pulsa—. */
  cuentas?: Record<string, number>;
}) => (
  <div
    role="group"
    aria-label={label}
    className="inline-flex flex-wrap gap-1 rounded-full bg-sunken p-1"
  >
    {options.map((o) => {
      const activa = value === o;
      const cuenta = cuentas?.[o];

      return (
        <button
          key={o}
          type="button"
          aria-pressed={activa}
          onClick={() => onChange(o)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
            activa
              ? "bg-rail text-white"
              : "text-ink-soft hover:bg-white/70 hover:text-ink"
          }`}
        >
          {o}
          {cuenta !== undefined && (
            <span
              className={`nums rounded-full px-1.5 text-[11px] font-semibold ${
                activa ? "bg-white/20 text-white" : "bg-surface text-ink-mute"
              }`}
            >
              {cuenta}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

type Tono = "ok" | "warn" | "danger" | "accent" | "neutral";

const tonoClases: Record<Tono, string> = {
  ok: "bg-ok-wash text-ok",
  warn: "bg-warn-wash text-warn",
  danger: "bg-danger-wash text-danger",
  accent: "bg-accent-wash text-accent-deep",
  neutral: "bg-neutral-wash text-ink-soft",
};

export const Badge = ({ tono, children }: { tono: Tono; children: ReactNode }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] uppercase ${tonoClases[tono]}`}
  >
    {children}
  </span>
);

/** Dato etiquetado. Se usa en las tiras de métricas.

    `parte` es opcional y dibuja un filete debajo con la proporción
    —un número entre 0 y 1—. Es para el dato que es PARTE de otro:
    «9 cuentas activas de 9» merece verse como una barra llena, y
    «3 dueños de 9» como un tercio. Un total no lo lleva, porque un
    total no es parte de nada. Turquesa porque es un filete, que es
    donde vive el turquesa en esta casa. */
export const Stat = ({
  etiqueta,
  valor,
  nota,
  parte,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  parte?: number;
}) => (
  <div className={`${surface} px-6 py-5`}>
    <p className="rotulo text-ink-mute">{etiqueta}</p>
    <p className="nums mt-2 text-[27px] leading-none font-semibold tracking-[-0.02em] text-ink">
      {valor}
    </p>
    {nota && <p className="mt-1.5 text-[12px] text-ink-soft">{nota}</p>}
    {parte !== undefined && (
      <div className="mt-3.5 h-[3px] w-full overflow-hidden rounded-full bg-sunken" aria-hidden="true">
        <div
          className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, parte))})` }}
        />
      </div>
    )}
  </div>
);

/* ── Interruptor ─────────────────────────────────────────────── */

/** Un interruptor de dos posiciones. Para lo que está encendido o
    apagado y nada más: una cuenta activa, un aviso que se manda o no.

    Es un `<button role="switch">` y no un `<input type="checkbox">`
    disfrazado: el estado lo pone quien lo usa y el clic solo AVISA.
    Así quien lo monta puede meter una confirmación en medio —para
    inactivar una cuenta hay que preguntar— sin que el interruptor se
    mueva antes de tiempo y luego tenga que volver.

    Mide 38 × 22. La perilla viaja 16 px con la curva del cajón de
    iOS, que frena suave al llegar: la misma que usa `anim-slide-left`.
    Encendido es navy, el mismo de la píldora activa de `FilterTabs`
    y de la paginación: en esta casa lo que está elegido o encendido
    es navy, sin excepción. Apagado es el lavado neutro. */
export const Interruptor = ({
  activo,
  etiqueta,
  onCambio,
  deshabilitado = false,
  ocupado = false,
}: {
  activo: boolean;
  /** Para el lector de pantalla y el tooltip. Decí QUÉ enciende. */
  etiqueta: string;
  onCambio: () => void;
  deshabilitado?: boolean;
  /** Mientras el cambio viaja al servidor. Se apaga y late. */
  ocupado?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={activo}
    aria-label={etiqueta}
    title={etiqueta}
    disabled={deshabilitado || ocupado}
    onClick={onCambio}
    className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-[background-color,transform] duration-200 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:active:scale-100 ${
      activo ? "bg-rail" : "bg-neutral-wash"
    } ${deshabilitado ? "opacity-45" : ""} ${ocupado ? "animate-pulse cursor-wait" : ""}`}
  >
    <span
      className={`h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(20,36,46,0.28)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        activo ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

/** El vacío. `action` es opcional y sirve para el vacío que tiene
    salida: cuando lo que no hay resultados es por un filtro, la forma
    de arreglarlo va acá, no en la frase. */
export const EmptyState = ({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) => (
  <div className="rounded-[14px] bg-sunken px-6 py-12 text-center">
    <p className="text-[14px] font-semibold text-ink">{title}</p>
    <p className="mt-1 text-[13px] text-ink-soft">{hint}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

/** Tabla administrativa: cabecera hundida y filas cebra, cero líneas.

    El `overflow-hidden` del envoltorio no es por el scroll: es lo que
    recorta la cabecera hundida contra las esquinas redondas. Sin él
    el gris de la cabecera sale por las cuatro puntas.

    ── El reparto de las columnas ──

    Sin `ancho`, la tabla se reparte sola —`table-auto`— y el navegador
    le da a cada columna lo que su contenido pida. Eso funciona
    mientras todas midan parecido. En cuanto una trae un importe y otra
    una insignia larga, el reparto automático le roba ancho a la que ya
    iba justa y el texto se parte en dos líneas: la fila de al lado
    queda más alta, la cabecera se desalinea y la tabla se ve rota.

    Con `ancho` en las columnas la tabla pasa a `table-fixed`: el
    reparto queda decidido de antemano, no depende del contenido y
    ninguna fila puede descuadrar a la de arriba. */
export const Table = ({
  columnas,
  children,
  caption,
  min = "min-w-[560px]",
  padX = "px-6",
}: {
  columnas: {
    label: string;
    align?: "right";
    /** Ancho de la columna en clases: `w-[30%]`, `w-[120px]`. Basta
        con que UNA lo traiga para que toda la tabla pase a reparto
        fijo, así que o lo llevan todas o no lo lleva ninguna. */
    ancho?: string;
    /** Columna sin rótulo visible —la de los botones—. La etiqueta
        sigue existiendo para quien navega a ciegas: se oculta, no se
        borra. */
    muda?: boolean;
  }[];
  children: ReactNode;
  caption: string;
  /** Ancho mínimo antes de que la tabla ruede de lado. */
  min?: string;
  /** Calle horizontal de las celdas. Cinco columnas a `px-6` gastan
      240 px solo en aire, y cuando el hueco disponible ronda los 650
      eso es más de un tercio de la tabla. */
  padX?: string;
}) => {
  const fijo = columnas.some((c) => c.ancho);

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-[14px]">
      <table className={`w-full ${min} text-left ${fijo ? "table-fixed" : ""}`}>
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sunken">
          <tr>
            {columnas.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={`rotulo ${padX} py-3.5 whitespace-nowrap text-ink-mute ${
                  c.ancho ?? ""
                } ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.muda ? <span className="sr-only">{c.label}</span> : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-sunken/60">{children}</tbody>
      </table>
    </div>
  );
};

/* ── Paginación ──────────────────────────────────────────────── */

/** Qué números de página se muestran. Hasta siete, todos. Con más,
    la primera, la última y la actual con una vecina a cada lado; los
    huecos se marcan con puntos suspensivos. Quinientas zonas son
    cincuenta páginas, y cincuenta píldoras en fila no son una
    paginación, son una regla. */
const paginasVisibles = (actual: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const cerca = new Set([1, total, actual - 1, actual, actual + 1]);
  const lista: (number | "…")[] = [];

  for (let n = 1; n <= total; n++) {
    if (cerca.has(n)) lista.push(n);
    else if (lista[lista.length - 1] !== "…") lista.push("…");
  }

  return lista;
};

/** Disco de Anterior / Siguiente. */
const btnPaso =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-ink transition-[background-color,transform,filter] duration-150 ease-out hover:brightness-[0.97] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

/** Píldora de número dentro de la pista. */
const btnNumero = (activa: boolean) =>
  `nums inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[12.5px] font-semibold transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
    activa ? "bg-rail text-white" : "text-ink-soft hover:bg-white/70 hover:text-ink"
  }`;

/** El pie de una tabla paginada.

    Va cosido a la tabla: se monta como ÚLTIMO hijo de una `Section`
    con `bodyClass=""` y toma la cabecera hundida como fondo, con las
    esquinas de abajo redondeadas para cerrar la tarjeta. No es un
    bloque aparte, porque el conteo y los números son parte de la
    tabla, no otra cosa que vive debajo.

    Anterior y Siguiente son discos. Los números viven en una pista
    hundida con píldoras, igual que `FilterTabs`: un solo control con
    una sola respuesta, y la activa en navy como todo lo que está
    elegido en esta casa. En mano, la pista se cambia por «3 / 12».

    Se muestra aun con una sola página, para que el conteo no
    desaparezca y reaparezca al filtrar. */
export const Paginacion = ({
  actual,
  total,
  onCambiar,
  desde,
  hasta,
  cuantos,
  nombre,
  etiqueta,
}: {
  /** Página actual, desde 1. */
  actual: number;
  /** Cuántas páginas hay. */
  total: number;
  onCambiar: (pagina: number) => void;
  /** Primer y último elemento visibles, desde 1, y el total de la
      lista: «1–8 de 203». */
  desde: number;
  hasta: number;
  cuantos: number;
  /** Singular y plural de lo que se cuenta: `["usuario", "usuarios"]`. */
  nombre: [string, string];
  /** Para el lector de pantalla: «Paginación de usuarios». */
  etiqueta: string;
}) => {
  const ultima = Math.max(1, total);
  const pagina = Math.min(Math.max(1, actual), ultima);

  return (
    <nav
      aria-label={etiqueta}
      className="flex flex-wrap items-center justify-between gap-3 rounded-b-[18px] bg-sunken/50 px-4 py-3 sm:px-5"
    >
      <p className="nums text-[12px] text-ink-mute">
        <span className="font-medium text-ink-soft">
          {cuantos ? desde : 0}–{hasta}
        </span>{" "}
        de <span className="font-medium text-ink-soft">{cuantos}</span>{" "}
        {cuantos === 1 ? nombre[0] : nombre[1]}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={pagina === 1}
          onClick={() => onCambiar(pagina - 1)}
          className={btnPaso}
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>

        <span className="nums px-1 text-[12.5px] text-ink-mute sm:hidden">
          <span className="font-medium text-ink-soft">{pagina}</span> / {ultima}
        </span>

        <div className="hidden items-center gap-1 rounded-full bg-sunken p-1 sm:inline-flex">
          {paginasVisibles(pagina, ultima).map((numero, i) =>
            numero === "…" ? (
              <span
                key={`hueco-${i}`}
                className="inline-flex h-7 w-7 items-center justify-center text-[12.5px] text-ink-mute"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={numero}
                type="button"
                aria-current={numero === pagina ? "page" : undefined}
                aria-label={`Página ${numero}`}
                onClick={() => onCambiar(numero)}
                className={btnNumero(numero === pagina)}
              >
                {numero}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          aria-label="Página siguiente"
          disabled={pagina === ultima}
          onClick={() => onCambiar(pagina + 1)}
          className={btnPaso}
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
};

/* ── Diálogos ────────────────────────────────────────────────── */

/** Ventana modal.

    Estaba copiada palabra por palabra en `mascotas` y en
    `mascotasPerdidas`, y `paseadores` se había armado la suya a mano
    —sin Escape, sin cerrar al tocar el fondo, sin frenar el scroll de
    atrás—. Acá vive una sola, y las otras dos pueden cambiar el
    `const Dialog = …` local por este import cuando toque.

    Tres detalles que no se ven pero se sienten:

      · El fondo es un `<button>` de verdad, no un `<div onClick>`.
        Así queda en el orden de tabulación y lo alcanza el teclado.
      · El scroll del documento se bloquea mientras está abierta. Sin
        eso, rodar la rueda sobre el fondo mueve la página de atrás y
        la ventana parece despegarse.
      · Al cerrar, el foco vuelve a donde estaba. Quien abrió con el
        teclado no queda tirado al principio del documento.

    `onClose` entra por referencia y no como dependencia del efecto:
    casi siempre llega como flecha en línea, y usarla directo
    reengancharía el listener y volvería a tocar el scroll en cada
    render. */
export const Dialog = ({
  title,
  onClose,
  children,
  ancho = "max-w-[560px]",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Ancho máximo del panel, en clases. Un formulario de dos columnas
      pide más aire que una confirmación de una línea. */
  ancho?: string;
}) => {
  const titleId = useId();
  const cerrar = useRef(onClose);

  useEffect(() => {
    cerrar.current = onClose;
  });

  useEffect(() => {
    const devolver = document.activeElement as HTMLElement | null;
    const previo = document.body.style.overflow;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrar.current();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", alTeclear);
      devolver?.focus?.();
    };
  }, []);

  /* La clase `suave` en la envoltura no es decorativa. El portal
     cuelga de `document.body`, o sea FUERA del `<div class="suave">`
     de `AppShell`, y ahí dentro se pierden las reglas del mundo: el
     radio por defecto de `bg-surface`, la barra de desplazamiento
     fina, las versalitas de `rotulo`. Sin esto la ventana sale
     cuadrada y con el scroll gris del sistema. */
  return createPortal(
    <div className="suave fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => cerrar.current()}
        className="anim-fade absolute inset-0 bg-rail/70 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`anim-rise relative max-h-[92dvh] w-full ${ancho} overflow-hidden overflow-y-auto rounded-[18px] bg-surface`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-rail px-5 py-4">
          <h2 id={titleId} className="titular text-[16px] text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => cerrar.current()}
            aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-rail-text transition-[background-color,color,transform] duration-150 ease-out hover:bg-rail-hover hover:text-white active:scale-[0.94]"
          >
            <X size={17} />
          </button>
        </header>

        {children}
      </section>
    </div>,
    document.body,
  );
};

/** Confirmación de una acción.

    Sustituye a `window.confirm`, que el navegador dibuja a su manera:
    letra del sistema, botones cuadrados, pegado al borde de arriba de
    la ventana. Encima bloquea el hilo —nada se puede pintar mientras
    está abierto, ni un indicador de espera— y en el móvil aparece con
    el nombre del dominio encima, que en una aplicación instalada se
    lee como un aviso del navegador y no del producto.

    Lo importante no es que sea más lindo: es que acá se puede decir
    QUÉ va a pasar. `confirm` da una línea y dos botones que dicen
    "Aceptar" y "Cancelar"; esto tiene cuerpo para explicar la
    consecuencia y un botón que la nombra.

    Mientras `ocupado` está puesto no se cierra ni por Escape ni
    tocando el fondo: la petición ya salió. */
export const Confirmar = ({
  titulo,
  cuerpo,
  confirmar = "Confirmar",
  cancelar = "Cancelar",
  tono = "normal",
  ocupado = false,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  cuerpo: ReactNode;
  confirmar?: string;
  cancelar?: string;
  /** `peligro` para lo que borra o no se puede deshacer. */
  tono?: "normal" | "peligro";
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) => (
  <Dialog
    title={titulo}
    ancho="max-w-[440px]"
    onClose={() => {
      if (!ocupado) onCancelar();
    }}
  >
    <div className="px-6 py-5">
      <p className="text-[13.5px] leading-relaxed text-ink-soft">{cuerpo}</p>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={ocupado}
          onClick={onCancelar}
          className={`${btnSecondary} w-full disabled:opacity-50 sm:w-auto`}
        >
          {cancelar}
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={onConfirmar}
          className={`${tono === "peligro" ? btnDanger : btnPrimary} w-full disabled:cursor-wait disabled:opacity-60 sm:w-auto`}
        >
          {ocupado && <Loader size={14} className="animate-spin" />}
          {confirmar}
        </button>
      </div>
    </div>
  </Dialog>
);

/* ── Imágenes ficticias ──────────────────────────────────────── */

/** Foto de maqueta. Los archivos viven en public/mock/. */
export const MockPhoto = ({
  src,
  alt,
  className = "aspect-[4/3]",
}: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    className={`w-full rounded-[14px] bg-sunken object-cover ${className}`}
  />
);

/** Avatar con iniciales. Sin foto: es una maqueta. */
export const Avatar = ({
  nombre,
  size = 40,
}: {
  nombre: string;
  size?: number;
}) => {
  const iniciales = nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-rail font-semibold text-white"
    >
      {iniciales}
    </span>
  );
};
