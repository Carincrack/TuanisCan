/* eslint-disable react-refresh/only-export-components */
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "../lib/iconos";

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

export const btnQuiet = `${pulsable} px-4 py-2 text-[13px] font-medium text-ink-soft hover:bg-sunken hover:text-ink`;

export const btnDanger = `${pulsable} bg-danger-wash px-5 py-2.5 text-[13px] text-danger hover:brightness-[0.97]`;

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

export const Page = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-2.5">{children}</div>
);

export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) => (
  <header
    className={`${surface} flex flex-wrap items-end justify-between gap-4 px-6 py-5`}
  >
    <div>
      <h2 className="titular text-[21px] text-ink">{title}</h2>
      <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>
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
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) => (
  <div
    role="group"
    aria-label={label}
    className="inline-flex flex-wrap gap-1 rounded-full bg-sunken p-1"
  >
    {options.map((o) => (
      <button
        key={o}
        type="button"
        aria-pressed={value === o}
        onClick={() => onChange(o)}
        className={`rounded-full px-4 py-2 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
          value === o
            ? "bg-rail text-white"
            : "text-ink-soft hover:bg-white/70 hover:text-ink"
        }`}
      >
        {o}
      </button>
    ))}
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

/** Dato etiquetado. Se usa en las tiras de métricas. */
export const Stat = ({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
}) => (
  <div className={`${surface} px-6 py-5`}>
    <p className="rotulo text-ink-mute">{etiqueta}</p>
    <p className="nums mt-2 text-[27px] leading-none font-semibold tracking-[-0.02em] text-ink">
      {valor}
    </p>
    {nota && <p className="mt-1.5 text-[12px] text-ink-soft">{nota}</p>}
  </div>
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
    el gris de la cabecera sale por las cuatro puntas. */
export const Table = ({
  columnas,
  children,
  caption,
}: {
  columnas: { label: string; align?: "right" }[];
  children: ReactNode;
  caption: string;
}) => (
  <div className="overflow-x-auto overflow-y-hidden rounded-[14px]">
    <table className="w-full min-w-[560px] text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-sunken">
        <tr>
          {columnas.map((c) => (
            <th
              key={c.label}
              scope="col"
              className={`rotulo px-6 py-3.5 text-ink-mute ${
                c.align === "right" ? "text-right" : ""
              }`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&>tr:nth-child(even)]:bg-sunken/60">{children}</tbody>
    </table>
  </div>
);

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
